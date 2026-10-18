import type { TravelMode } from '@/config/endpoints';
import { formatCoordinates, type LatLng } from '@/lib/geo';
import { formatDistance, type Units } from '@/lib/format';

const fixed = (p: LatLng) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;

export const googleMapsLink = (p: LatLng) => `https://maps.google.com/?q=${fixed(p)}`;
export const osmLink = (p: LatLng) =>
  `https://www.openstreetmap.org/?mlat=${p.lat.toFixed(6)}&mlon=${p.lon.toFixed(6)}#map=17/${p.lat.toFixed(5)}/${p.lon.toFixed(5)}`;

export const telHref = (number: string) => `tel:${number.replace(/[^\d+*#]/g, '')}`;

/** `?&body=` is the form both iOS and Android SMS apps accept. */
export const smsHref = (body: string, number = '') =>
  `sms:${number.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(body)}`;

export const whatsappHref = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export function navigationLinks(origin: LatLng | null, dest: LatLng, mode: TravelMode) {
  const gMode = mode === 'walking' ? 'walking' : mode === 'cycling' ? 'bicycling' : 'driving';
  const osmEngine = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bike' : 'car';
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${fixed(dest)}&travelmode=${gMode}`,
    apple: `https://maps.apple.com/?daddr=${fixed(dest)}&dirflg=${mode === 'walking' ? 'w' : 'd'}`,
    osm: origin
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_${osmEngine}&route=${fixed(origin)}%3B${fixed(dest)}`
      : osmLink(dest),
  };
}

export interface LocationMessageInput {
  origin: LatLng;
  accuracy?: number;
  placeLabel?: string;
  nearestHospital?: { name: string; distance: number } | null;
  units?: Units;
  urgent?: boolean;
}

export function buildLocationMessage({
  origin,
  accuracy,
  placeLabel,
  nearestHospital,
  units = 'metric',
  urgent = true,
}: LocationMessageInput): string {
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
  return [
    urgent ? 'I need help. This is my current location:' : 'My current location:',
    placeLabel,
    `${formatCoordinates(origin, 5)}${accuracy ? ` (±${formatDistance(accuracy, units)})` : ''}`,
    googleMapsLink(origin),
    nearestHospital
      ? `Nearest hospital: ${nearestHospital.name}, ${formatDistance(nearestHospital.distance, units)} away`
      : null,
    `Sent ${time} via Beacon`,
  ]
    .filter(Boolean)
    .join('\n');
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Native share sheet where available (mobile), clipboard otherwise. */
export async function shareText(text: string, title = 'My location'): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  return copyText(text);
}

export async function copyText(text: string): Promise<'copied' | 'failed'> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
