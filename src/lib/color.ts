export type RGBA = [r: number, g: number, b: number, a: number];
export type HSLA = [h: number, s: number, l: number, a: number];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Parses #hex, rgb()/rgba() and hsl()/hsla() strings (comma or space separated). Returns null otherwise. */
export function parseColor(input: string): RGBA | null {
  const s = input.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const fn = /^(rgba?|hsla?)\(([^)]+)\)$/.exec(s);
  if (!fn) return null;
  const parts = fn[2]!
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map((p) => (p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p)));
  if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return null;
  const [a, b, c, alpha = 1] = parts as [number, number, number, number?];
  if (fn[1]!.startsWith('rgb')) return [a, b, c, alpha];
  // hsl: percentages already divided by 100 above
  return [...hslToRgb([a, b, c, alpha]).slice(0, 3), alpha] as RGBA;
}

export function rgbToHsl([r, g, b, a]: RGBA): HSLA {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l, a];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l, a];
}

export function hslToRgb([h, s, l, a]: HSLA): RGBA {
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255), a];
}

export const toCss = ([r, g, b, a]: RGBA) =>
  a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${+a.toFixed(3)})`;

export interface TintOptions {
  hue: number;
  /** Maps original saturation to output saturation. */
  saturation: (s: number) => number;
  /** Maps original lightness to output lightness. */
  lightness?: (l: number) => number;
}

/** Re-hue a colour while keeping its tonal value, so a style's hierarchy survives a palette change. */
export function tint(color: string, { hue, saturation, lightness = (l) => l }: TintOptions): string {
  const rgba = parseColor(color);
  if (!rgba) return color;
  const [, s, l, a] = rgbToHsl(rgba);
  return toCss(hslToRgb([hue, clamp01(saturation(s)), clamp01(lightness(l)), a]));
}
