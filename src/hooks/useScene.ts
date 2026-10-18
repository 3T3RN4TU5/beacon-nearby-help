import { useMemo } from 'react';
import { PANEL_GUTTER, PANEL_WIDTH, TOPBAR_HEIGHT, sheetHeights } from '@/components/layout';
import { useNearby, useRoute, type CategoryResult, type RankedPlace } from '@/data/queries';
import type { CategoryId } from '@/config/categories';
import type { Insets } from '@/map/camera';
import { useApp } from '@/store/app';
import { useIsDesktop, useViewport } from './useMediaQuery';

export function findPlace(
  results: Record<CategoryId, CategoryResult> | null,
  id: string,
): RankedPlace | null {
  if (!results) return null;
  for (const r of Object.values(results)) {
    const hit = r.places.find((p) => p.id === id);
    if (hit) return hit;
  }
  return null;
}

/** The data both the map and the panel render from; TanStack Query dedupes the requests. */
export function useScene() {
  const anchor = useApp((s) => s.anchor);
  const mode = useApp((s) => s.mode);
  const view = useApp((s) => s.view);
  const nearby = useNearby(anchor, mode);
  const selected = useMemo(
    () => (view.kind === 'place' ? findPlace(nearby.results, view.placeId) : null),
    [view, nearby.results],
  );
  const route = useRoute(anchor, selected, mode);
  return { anchor, mode, view, nearby, selected, route };
}

/** Screen area covered by UI, so the camera centres things in the visible part of the map. */
export function useMapInsets(): Insets {
  const phase = useApp((s) => s.phase);
  const sheet = useApp((s) => s.sheet);
  const desktop = useIsDesktop();
  const { width, height } = useViewport();

  return useMemo(() => {
    if (phase !== 'active') {
      // Landing: push the globe right (desktop) or up (mobile) to make room for the headline.
      return desktop
        ? { top: 0, right: 0, bottom: 0, left: Math.round(Math.min(width * 0.5, 700)) }
        : { top: 0, right: 0, left: 0, bottom: Math.round(height * 0.46) };
    }
    if (desktop)
      return { top: TOPBAR_HEIGHT, right: 72, bottom: PANEL_GUTTER, left: PANEL_GUTTER * 2 + PANEL_WIDTH };
    const h = sheetHeights(height);
    return { top: 56, right: 0, left: 0, bottom: Math.min(h[sheet], Math.round(height * 0.6)) };
  }, [phase, sheet, desktop, width, height]);
}
