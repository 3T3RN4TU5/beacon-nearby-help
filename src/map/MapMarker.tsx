import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Marker, type PositionAnchor } from 'maplibre-gl';
import { useMap } from './context';

interface MapMarkerProps {
  lng: number;
  lat: number;
  anchor?: PositionAnchor;
  zIndex?: number;
  children: ReactNode;
}

/**
 * A MapLibre DOM marker whose content is rendered by React through a portal, so markers can use
 * components, state and Motion animations like any other UI.
 */
export function MapMarker({ lng, lat, anchor = 'bottom', zIndex = 0, children }: MapMarkerProps) {
  const map = useMap();
  const [element] = useState(() => document.createElement('div'));
  const marker = useRef<Marker | null>(null);

  useEffect(() => {
    if (!map) return;
    const m = new Marker({ element, anchor }).setLngLat([lng, lat]).addTo(map);
    marker.current = m;
    return () => {
      m.remove();
      marker.current = null;
    };
    // Position updates are handled below; recreating on every move would restart animations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, element, anchor]);

  useEffect(() => {
    marker.current?.setLngLat([lng, lat]);
  }, [lng, lat]);

  // Runs after the creation effect above (same commit), so a recreated marker gets its z-index too.
  useEffect(() => {
    marker.current?.getElement().style.setProperty('z-index', String(zIndex));
  }, [map, zIndex]);

  return createPortal(children, element);
}
