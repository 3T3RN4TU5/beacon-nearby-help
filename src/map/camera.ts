/** Open the globe facing the user's part of the world, guessed from their time zone (no permission needed). */
export function initialCenter(): [number, number] {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  if (/^Asia\/(Kolkata|Calcutta)/.test(tz)) return [79, 21];
  if (/^Asia\/(Karachi|Dhaka|Kathmandu|Colombo|Thimphu)/.test(tz)) return [80, 24];
  if (/^Asia\/(Dubai|Riyadh|Qatar|Muscat|Kuwait|Bahrain|Tehran)/.test(tz)) return [50, 24];
  if (tz.startsWith('Europe/')) return [12, 48];
  if (/^America\/(Sao_Paulo|Argentina|Santiago|Bogota|Lima)/.test(tz)) return [-60, -15];
  if (tz.startsWith('America/')) return [-92, 34];
  if (tz.startsWith('Australia/') || tz === 'Pacific/Auckland') return [140, -28];
  if (tz.startsWith('Africa/')) return [20, 5];
  if (tz.startsWith('Asia/')) return [108, 25];
  return [20, 20];
}

/**
 * Zoom at which the globe fills ~88% of the area left free by the landing copy.
 * MapLibre's globe radius is worldSize / 2π = 512·2^z / 2π ≈ 81.5·2^z px.
 */
export function initialZoom(): number {
  if (typeof window === 'undefined') return 1.75;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const desktop = w >= 1024;
  const freeW = desktop ? w - Math.min(w * 0.5, 700) : w;
  const freeH = desktop ? h : h * 0.54;
  const radius = 0.44 * Math.min(freeW, freeH);
  return Math.min(2.6, Math.max(0.6, Math.log2(radius / 81.5)));
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
