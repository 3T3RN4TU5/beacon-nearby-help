/** Shared layout metrics: the map camera must know exactly how much of the screen the UI covers. */
export const PANEL_WIDTH = 408;
export const PANEL_GUTTER = 16;
export const TOPBAR_HEIGHT = 68;

export function sheetHeights(viewportHeight: number) {
  return {
    peek: 188,
    half: Math.round(viewportHeight * 0.55),
    full: viewportHeight - 60,
  };
}
