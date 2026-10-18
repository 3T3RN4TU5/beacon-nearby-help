import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Lock, Trash2, X } from 'lucide-react';
import type { UnitsPref } from '@/lib/format';
import { useApp, type ThemePref } from '@/store/app';
import { Wordmark } from './Logo';
import { Button, IconButton } from './ui/Button';
import { Segmented } from './ui/Segmented';
import { SectionLabel } from './ui/primitives';

const SOURCES: { name: string; role: string; href: string; licence: string }[] = [
  {
    name: 'OpenStreetMap',
    role: 'Places, roads and addresses',
    href: 'https://www.openstreetmap.org/copyright',
    licence: 'ODbL',
  },
  {
    name: 'Overpass API',
    role: 'Nearby place search',
    href: 'https://overpass-api.de/',
    licence: 'Free service',
  },
  {
    name: 'OSRM / FOSSGIS',
    role: 'Routes and travel times',
    href: 'https://project-osrm.org/',
    licence: 'Free service',
  },
  {
    name: 'Open-Meteo',
    role: 'Forecast and air quality',
    href: 'https://open-meteo.com/',
    licence: 'CC BY 4.0',
  },
  {
    name: 'OpenFreeMap',
    role: 'Vector map tiles',
    href: 'https://openfreemap.org/',
    licence: 'Free service',
  },
  {
    name: 'NASA GIBS',
    role: 'Black Marble night lights',
    href: 'https://earthdata.nasa.gov/gibs',
    licence: 'Public domain',
  },
  {
    name: 'Nominatim · Photon',
    role: 'Addresses and place search',
    href: 'https://nominatim.org/',
    licence: 'ODbL data',
  },
];

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const units = useApp((s) => s.units);
  const setUnits = useApp((s) => s.setUnits);
  const clearLocalData = useApp((s) => s.clearLocalData);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[88vh] w-[min(92vw,520px)] overflow-y-auto rounded-3xl border border-line-strong bg-surface p-0 text-fg shadow-panel backdrop:bg-canvas/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between">
          <Wordmark />
          <IconButton label="Close" size="sm" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>

        <p className="text-sm leading-relaxed text-muted">
          Beacon shows the nearest hospital, police station, pharmacy and fuel with routes, travel time and
          road-weather alerts. It runs entirely on free, open data — no accounts, no ads, no AI, no tracking.
        </p>

        <section className="flex flex-col gap-3">
          <SectionLabel>Preferences</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Theme</span>
              <Segmented<ThemePref>
                label="Theme"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'system', label: 'Auto' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Units</span>
              <Segmented<UnitsPref>
                label="Units"
                value={units}
                onChange={setUnits}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'metric', label: 'km' },
                  { value: 'imperial', label: 'mi' },
                ]}
              />
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <SectionLabel>Privacy</SectionLabel>
          <p className="flex gap-2.5 text-sm leading-relaxed text-muted">
            <Lock size={16} className="mt-0.5 shrink-0 text-accent-ink" />
            Your position is sent only to the public map and weather services listed below, rounded where
            possible, to answer “what is near me”. Contacts, medical ID and preferences stay in this browser.
            There is no Beacon server.
          </p>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  clearLocalData();
                  localStorage.removeItem('beacon-cache');
                  setConfirmClear(false);
                  onClose();
                }}
              >
                Yes, erase everything
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="self-start" onClick={() => setConfirmClear(true)}>
              <Trash2 size={14} /> Clear data stored on this device
            </Button>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <SectionLabel>Open data & services</SectionLabel>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {SOURCES.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-raised"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{s.name}</span>
                    <span className="block text-xs text-muted">{s.role}</span>
                  </span>
                  <span className="hud text-subtle">{s.licence}</span>
                  <ExternalLink size={13} className="text-subtle" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <p className="hud text-subtle">v{__APP_VERSION__} · Map data © OpenStreetMap contributors</p>
      </div>
    </dialog>
  );
}
