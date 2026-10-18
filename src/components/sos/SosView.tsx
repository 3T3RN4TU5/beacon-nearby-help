import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import { Check, Copy, MessageSquare, Phone, Share2, Siren as SirenIcon } from 'lucide-react';
import { usePlaceLabel } from '@/data/queries';
import { emergencyLines, primaryLine, type LineKind } from '@/features/emergency/numbers';
import {
  buildLocationMessage,
  copyText,
  shareText,
  smsHref,
  telHref,
  whatsappHref,
} from '@/features/emergency/share';
import { Siren } from '@/features/emergency/siren';
import { useScene } from '@/hooks/useScene';
import { cn } from '@/lib/cn';
import { useApp } from '@/store/app';
import { Button, ButtonLink } from '../ui/Button';
import { SectionLabel } from '../ui/primitives';
import { AlarmOverlay } from './AlarmOverlay';
import { ContactsCard } from './ContactsCard';
import { HoldButton } from './HoldButton';
import { MedicalCard } from './MedicalCard';
import { useUnits } from '@/hooks/useUnits';

const KIND_COLOR: Partial<Record<LineKind, string>> = {
  police: 'text-police',
  ambulance: 'text-hospital',
  fire: 'text-fire',
  women: 'text-repair',
  road: 'text-fuel',
};

const regionName = (cc?: string) => {
  if (!cc) return undefined;
  try {
    return new Intl.DisplayNames(undefined, { type: 'region' }).of(cc);
  } catch {
    return cc;
  }
};

export function SosView() {
  const origin = useApp((s) => s.origin);
  const anchor = useApp((s) => s.anchor);
  const units = useUnits();
  const label = usePlaceLabel(anchor);
  const { nearby } = useScene();
  const [siren] = useState(() => new Siren());
  const [alarm, setAlarm] = useState(false);
  const stopAlarm = useCallback(() => setAlarm(false), []);
  const [copied, setCopied] = useState(false);

  const cc = label.data?.countryCode;
  const { lines, known } = emergencyLines(cc);
  const primary = primaryLine(cc);
  const others = lines.filter((l) => l !== primary);
  const hospital = nearby.results?.hospital.nearest;

  const message = useMemo(
    () =>
      origin
        ? buildLocationMessage({
            origin,
            accuracy: origin.accuracy,
            placeLabel: origin.source === 'search' ? origin.label : label.data?.label,
            nearestHospital: hospital ? { name: hospital.name, distance: hospital.travel.distance } : null,
            units,
          })
        : '',
    [origin, label.data?.label, hospital, units],
  );

  return (
    <div className="flex flex-col gap-5 px-4 py-4 sm:px-5">
      <section className="flex flex-col gap-2">
        <a
          href={telHref(primary.number)}
          className="group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-danger px-5 py-4 text-white shadow-[0_18px_40px_-18px_var(--danger)] transition-transform active:scale-[0.98]"
        >
          <span
            className="absolute inset-x-0 top-0 h-1 animate-hazard hazard-stripes opacity-60 [--accent:white]"
            aria-hidden
          />
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15">
            <Phone size={24} strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block hud text-white/75">
              {primary.label}
              {regionName(cc) ? ` · ${regionName(cc)}` : ''}
            </span>
            <span className="block text-[28px] leading-tight font-extrabold tracking-tight">
              Call {primary.number}
            </span>
          </span>
        </a>
        {others.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {others.map((l) => (
              <a
                key={`${l.number}-${l.label}`}
                href={telHref(l.number)}
                className="flex items-center gap-3 rounded-xl border border-line bg-raised/50 px-3 py-2.5 transition-colors hover:border-line-strong"
              >
                <Phone size={15} className={cn('shrink-0', KIND_COLOR[l.kind] ?? 'text-muted')} />
                <span className="min-w-0">
                  <span className="block font-mono text-[17px] leading-tight font-semibold">{l.number}</span>
                  <span className="block truncate text-[11px] text-muted">{l.label}</span>
                </span>
              </a>
            ))}
          </div>
        )}
        <p className="text-[11px] leading-relaxed text-subtle">
          {known
            ? 'Numbers for your current country. 112 also works from most mobile phones worldwide.'
            : 'Country not recognised — 112 connects to emergency services from most mobile phones worldwide.'}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Share my location</SectionLabel>
        <pre className="max-h-36 overflow-auto rounded-xl border border-line bg-sunken p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-muted">
          {message}
        </pre>
        <div className="grid grid-cols-4 gap-2">
          <Button variant="primary" size="md" className="col-span-2" onClick={() => void shareText(message)}>
            <Share2 size={16} /> Share
          </Button>
          <ButtonLink href={whatsappHref(message)} external size="md" aria-label="Send on WhatsApp">
            <MessageSquare size={16} className="text-ok" />
            <span className="sr-only sm:not-sr-only">WhatsApp</span>
          </ButtonLink>
          <ButtonLink href={smsHref(message)} size="md" aria-label="Send as SMS">
            SMS
          </ButtonLink>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={async () => {
            if ((await copyText(message)) === 'copied') {
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }
          }}
        >
          {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}{' '}
          {copied ? 'Copied' : 'Copy text'}
        </Button>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Attention alarm</SectionLabel>
        <HoldButton
          label="Hold to sound the alarm"
          onStart={() => void siren.prime().catch(() => undefined)}
          onComplete={() => setAlarm(true)}
          className="h-14 rounded-2xl border border-danger/40 bg-danger/10 text-[15px] font-bold text-danger"
        >
          <SirenIcon size={18} /> Hold to sound alarm
        </HoldButton>
        <p className="text-[11px] text-subtle">
          Plays a loud siren and flashes the screen to draw attention. Tap anywhere to stop.
        </p>
      </section>

      <ContactsCard message={message} />
      <MedicalCard />

      {createPortal(
        <AnimatePresence>{alarm && <AlarmOverlay siren={siren} onStop={stopAlarm} />}</AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
