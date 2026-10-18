import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { CATEGORIES, PRIMARY_CATEGORIES, SECONDARY_CATEGORIES } from '@/config/categories';
import type { CategoryResult, RankedPlace } from '@/data/queries';
import { useResolvedTheme } from '@/hooks/useEnvironment';
import { useMapInsets, useScene } from '@/hooks/useScene';
import { formatDuration } from '@/lib/format';
import { boundsOf, haversine, locationKey, type LatLng } from '@/lib/geo';
import { useApp, type View } from '@/store/app';
import { initialZoom } from './camera';
import { MapMarker } from './MapMarker';
import { useMap } from './context';
import { OriginMarker, PlaceMarker } from './markers';
import { ensureOverlays, setAccuracy, setRouteTheme, showRoute } from './overlays';

interface MarkerSpec {
  place: RankedPlace;
  emphasis: 'selected' | 'nearest' | 'normal' | 'dim';
  badge?: string;
}

function markersFor(results: Record<string, CategoryResult> | null, view: View): MarkerSpec[] {
  if (!results) return [];
  if (view.kind === 'overview') {
    return [
      ...PRIMARY_CATEGORIES.flatMap((id) =>
        results[id]!.places.slice(0, 3).map((place, i): MarkerSpec => ({
          place,
          emphasis: i === 0 ? 'nearest' : 'normal',
          badge: i === 0 ? formatDuration(place.travel.duration) : undefined,
        })),
      ),
      ...SECONDARY_CATEGORIES.flatMap((id) =>
        results[id]!.places.slice(0, 1).map((place): MarkerSpec => ({ place, emphasis: 'dim' })),
      ),
    ];
  }
  if (view.kind === 'category') {
    return results[view.category]!.places.slice(0, 40).map((place, i) => ({
      place,
      emphasis: i === 0 ? 'nearest' : 'normal',
      badge: i === 0 ? formatDuration(place.travel.duration) : undefined,
    }));
  }
  const all = Object.values(results).flatMap((r) => r.places);
  const selected = all.find((p) => p.id === view.placeId);
  if (!selected) return [];
  return [
    { place: selected, emphasis: 'selected' },
    ...results[selected.category]!.places.filter((p) => p.id !== selected.id)
      .slice(0, 12)
      .map((place): MarkerSpec => ({ place, emphasis: 'dim' })),
  ];
}

export function MapScene() {
  const map = useMap()!;
  const theme = useResolvedTheme();
  const reduced = useReducedMotion() ?? false;
  const insets = useMapInsets();
  const phase = useApp((s) => s.phase);
  const origin = useApp((s) => s.origin);
  const tracking = useApp((s) => s.tracking);
  const adjusting = useApp((s) => s.adjusting);
  const openPlace = useApp((s) => s.openPlace);
  const { anchor, view, nearby, selected, route } = useScene();
  const results = nearby.results;

  // The anchor whose fly-in has finished; framing waits for it so it doesn't cut the flight short.
  const anchorKey = anchor ? locationKey(anchor, 5) : null;
  const [introFor, setIntroFor] = useState<string | null>(null);
  const introDone = introFor !== null && introFor === anchorKey;
  const prevAnchor = useRef<LatLng | null>(null);
  const insetsRef = useRef(insets);
  useLayoutEffect(() => {
    insetsRef.current = insets;
  }, [insets]);

  /* ---------- overlays survive theme (style) swaps ---------- */
  const overlayState = useRef({
    origin,
    route: null as [number, number][] | null,
    color: '#d6ff3d',
    destination: undefined as LatLng | undefined,
  });
  useEffect(() => {
    const install = () => {
      // isStyleLoaded() stays false while tiles stream in, so just try: addSource throws only
      // until the style JSON itself is applied, and the next 'styledata' event retries.
      try {
        if (ensureOverlays(map, theme)) {
          setAccuracy(map, overlayState.current.origin);
          const { route: coords, color, destination } = overlayState.current;
          showRoute(map, coords, color, { animate: false, destination });
        }
        setRouteTheme(map, theme);
      } catch {
        /* style not ready yet */
      }
    };
    install();
    map.on('styledata', install);
    return () => {
      map.off('styledata', install);
    };
  }, [map, theme]);

  useEffect(() => {
    overlayState.current.origin = origin;
    setAccuracy(map, origin);
  }, [map, origin]);

  /* ---------- idle globe rotation on the landing screen ---------- */
  useEffect(() => {
    if (phase !== 'landing' || reduced) return;
    let raf = 0;
    let last = performance.now();
    let paused = false;
    let resume: ReturnType<typeof setTimeout> | undefined;
    const pause = () => {
      paused = true;
      clearTimeout(resume);
    };
    const unpause = () => {
      clearTimeout(resume);
      resume = setTimeout(() => (paused = false), 2500);
    };
    const tick = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      if (!paused && !map.isMoving() && map.getZoom() < 4) {
        const c = map.getCenter();
        map.jumpTo({ center: [c.lng + dt * 3.2, c.lat] });
      }
      raf = requestAnimationFrame(tick);
    };
    map.on('mousedown', pause);
    map.on('touchstart', pause);
    map.on('wheel', pause);
    map.on('mouseup', unpause);
    map.on('touchend', unpause);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resume);
      map.off('mousedown', pause);
      map.off('touchstart', pause);
      map.off('wheel', pause);
      map.off('mouseup', unpause);
      map.off('touchend', unpause);
    };
  }, [map, phase, reduced]);

  /* ---------- keep camera padding equal to the UI chrome ---------- */
  useEffect(() => {
    // On the landing screen the idle spin would cancel an animated change, so apply it at once.
    if (phase !== 'active' || reduced) map.setPadding(insets);
    else if (!map.isMoving()) map.easeTo({ padding: insets, duration: 500 });
  }, [map, insets, reduced, phase]);

  /* ---------- landing ⇄ located transitions ---------- */
  useEffect(() => {
    if (phase === 'landing') {
      prevAnchor.current = null;
      if (map.getZoom() > 3) {
        map.flyTo({
          zoom: initialZoom(),
          pitch: 0,
          bearing: 0,
          padding: insetsRef.current,
          duration: reduced ? 0 : 2400,
        });
      }
      return;
    }
    if (phase !== 'active' || !anchor) return;

    const previous = prevAnchor.current;
    prevAnchor.current = anchor;
    const center: [number, number] = [anchor.lon, anchor.lat];
    const key = locationKey(anchor, 5);
    // Registered before moving: jumpTo fires moveend synchronously.
    const done = () => setIntroFor(key);
    map.once('moveend', done);

    const target = { center, zoom: 14.6, pitch: 52, bearing: -16, padding: insetsRef.current };
    if (previous && map.isMoving()) {
      // GPS corrected the fix while the fly-in was still running: retarget the same flight,
      // otherwise an ease from mid-air would leave the map stuck zoomed out.
      if (reduced) map.jumpTo(target);
      else map.flyTo({ ...target, duration: 1600, essential: true });
    } else if (previous && haversine(previous, anchor) < 30_000) {
      // Small hops (live tracking, refinement, nearby search) glide…
      map.easeTo({ center, padding: insetsRef.current, duration: reduced ? 0 : 1200 });
    } else {
      // …a new place flies in from the globe.
      if (reduced) map.jumpTo(target);
      else map.flyTo({ ...target, duration: 3800, curve: 1.55, essential: true });
    }
    return () => {
      map.off('moveend', done);
    };
  }, [map, phase, anchor, reduced]);

  /* ---------- frame what matters for the current view ---------- */
  const markers = useMemo(() => markersFor(results, view), [results, view]);
  const frameKey = useMemo(() => {
    if (view.kind === 'place')
      return `place:${view.placeId}:${route.data ? route.data.coordinates.length : 0}`;
    return `${view.kind}:${markers
      .filter((m) => m.emphasis !== 'dim')
      .map((m) => m.place.id)
      .slice(0, 12)
      .join(',')}`;
  }, [view, markers, route.data]);

  useEffect(() => {
    // Never move the camera under the user while they are placing the pin by hand.
    if (phase !== 'active' || !introDone || !anchor || adjusting) return;
    let points: LatLng[];
    if (view.kind === 'place') {
      if (!selected) return;
      points = route.data ? route.data.coordinates.map(([lon, lat]) => ({ lon, lat })) : [anchor, selected];
    } else {
      const focus = markers.filter((m) => m.emphasis !== 'dim').slice(0, view.kind === 'category' ? 8 : 12);
      if (focus.length === 0) return;
      points = [anchor, ...focus.map((m) => m.place)];
    }
    const bounds = boundsOf(points);
    if (!bounds) return;
    map.fitBounds(bounds, {
      padding: 56,
      maxZoom: 16.2,
      pitch: view.kind === 'place' ? 50 : 40,
      bearing: map.getBearing(),
      duration: reduced ? 0 : 1300,
      essential: true,
    });
    // frameKey captures the inputs that should trigger a re-frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, frameKey, introDone, phase, reduced]);

  /* ---------- follow mode ---------- */
  useEffect(() => {
    if (tracking && !adjusting && origin && phase === 'active' && view.kind === 'overview') {
      map.easeTo({ center: [origin.lon, origin.lat], duration: reduced ? 0 : 800 });
    }
  }, [map, tracking, adjusting, origin, phase, view.kind, reduced]);

  /* ---------- route line ---------- */
  useEffect(() => {
    const coords = view.kind === 'place' && route.data ? route.data.coordinates : null;
    const color = selected ? CATEGORIES[selected.category].color : '#d6ff3d';
    const destination = selected ? { lat: selected.lat, lon: selected.lon } : undefined;
    overlayState.current = { ...overlayState.current, route: coords, color, destination };
    return showRoute(map, coords, color, { animate: !reduced, destination });
  }, [map, view.kind, route.data, selected, reduced]);

  const locateCategory = view.kind === 'category' ? view.category : undefined;

  return (
    <>
      {phase === 'active' && origin && (
        <MapMarker lng={origin.lon} lat={origin.lat} anchor="center" zIndex={5}>
          <OriginMarker heading={origin.heading} />
        </MapMarker>
      )}
      {phase === 'active' &&
        markers.map(({ place, emphasis, badge }, i) => (
          <MapMarker
            key={place.id}
            lng={place.lon}
            lat={place.lat}
            zIndex={emphasis === 'selected' ? 30 : emphasis === 'nearest' ? 20 : emphasis === 'dim' ? 1 : 10}
          >
            <PlaceMarker
              category={place.category}
              name={place.name}
              badge={badge}
              emphasis={emphasis}
              delay={reduced ? 0 : Math.min(i, 16) * 0.045}
              onSelect={() => openPlace(place.id, locateCategory)}
            />
          </MapMarker>
        ))}
    </>
  );
}
