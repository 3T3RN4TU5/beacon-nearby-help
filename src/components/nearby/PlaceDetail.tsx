import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Accessibility,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  CornerUpLeft,
  CornerUpRight,
  ExternalLink,
  Flag,
  Globe,
  Navigation,
  Phone,
  RotateCw,
  Share2,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { CATEGORIES, type CategoryId } from '@/config/categories';
import { navigationLinks, googleMapsLink, shareText, telHref } from '@/features/emergency/share';
import type { Maneuver } from '@/features/routing/instructions';
import { useNow } from '@/hooks/useEnvironment';
import { useOpeningStatus } from '@/hooks/useOpeningStatus';
import { useScene } from '@/hooks/useScene';
import { cn } from '@/lib/cn';
import { formatDistance } from '@/lib/format';
import { useApp } from '@/store/app';
import { CategorySign } from '../CategoryIcon';
import { Button, ButtonLink, IconButton } from '../ui/Button';
import { Badge, HazardBar, SectionLabel } from '../ui/primitives';
import { MODE_WORD } from './labels';
import { DistanceText, OpeningBadge, TravelFigure, TravelModeSwitch } from './shared';
import { useUnits } from '@/hooks/useUnits';

function maneuverIcon(m: Maneuver): LucideIcon {
  if (m.type === 'depart') return Navigation;
  if (m.type === 'arrive') return Flag;
  if (m.type === 'roundabout' || m.type === 'rotary' || m.type === 'roundabout turn') return RotateCw;
  if (m.modifier === 'uturn') return Undo2;
  if (m.modifier?.includes('left')) return CornerUpLeft;
  if (m.modifier?.includes('right')) return CornerUpRight;
  return ArrowUp;
}

export function PlaceDetail({ from }: { placeId: string; from?: CategoryId }) {
  const back = useApp((s) => s.back);
  const units = useUnits();
  const anchor = useApp((s) => s.anchor);
  const { selected: place, route, mode } = useScene();
  const [shared, setShared] = useState<string | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const opening = useOpeningStatus(place?.openingHours);
  const now = useNow(30_000);

  if (!place) {
    return (
      <div className="flex flex-col items-start gap-3 px-5 py-6">
        <p className="text-sm text-muted">This place is no longer in the results for your location.</p>
        <Button size="sm" onClick={back}>
          <ArrowLeft size={14} /> Back
        </Button>
      </div>
    );
  }

  const def = CATEGORIES[place.category];
  const travel = route.data
    ? { duration: route.data.duration, distance: route.data.distance, estimated: false }
    : place.travel;
  const arrival = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(now + travel.duration * 1000),
  );
  const links = navigationLinks(anchor, place, mode);

  const share = async () => {
    const text = [place.name, place.address, googleMapsLink(place)].filter(Boolean).join('\n');
    const outcome = await shareText(text, place.name);
    setShared(outcome === 'copied' ? 'Copied' : outcome === 'shared' ? 'Shared' : null);
    setTimeout(() => setShared(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2">
        <IconButton label="Back" size="sm" variant="outline" onClick={back}>
          <ArrowLeft size={16} />
        </IconButton>
        <span className="hud text-subtle">{from ? CATEGORIES[from].plural : 'Nearby'} / Details</span>
      </div>

      <header className="flex items-start gap-3.5">
        <CategorySign id={place.category} size="lg" />
        <div className="min-w-0">
          <p className="hud" style={{ color: def.color }}>
            {place.subtype}
            {place.brand && place.brand !== place.name ? ` · ${place.brand}` : ''}
          </p>
          <h2 className="mt-1 text-[22px] leading-[1.15] font-bold tracking-tight text-balance">
            {place.name}
          </h2>
          {place.address && <p className="mt-1 text-sm text-muted">{place.address}</p>}
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {place.emergency && <Badge tone="danger">Emergency department</Badge>}
        <OpeningBadge spec={place.openingHours} showUnknown />
        {place.wheelchair === 'yes' && (
          <Badge tone="info">
            <Accessibility size={11} /> Accessible
          </Badge>
        )}
        {place.features?.map((f) => (
          <Badge key={f}>{f}</Badge>
        ))}
      </div>

      <div className="grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-raised/50">
        <Stat label={`${MODE_WORD[mode]} time`}>
          <TravelFigure travel={travel} size="lg" />
        </Stat>
        <Stat label="Distance">
          <DistanceText metres={travel.distance} className="text-xl font-semibold text-fg" />
        </Stat>
        <Stat label="Arrive">
          <span className="font-mono text-xl font-semibold tabular-nums">{arrival}</span>
        </Stat>
      </div>

      <TravelModeSwitch />

      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <ButtonLink href={links.google} external variant="primary" size="lg">
          <Navigation size={18} strokeWidth={2.4} /> Navigate
        </ButtonLink>
        {place.phone && (
          <ButtonLink
            href={telHref(place.phone)}
            variant="outline"
            size="lg"
            aria-label={`Call ${place.name}`}
          >
            <Phone size={17} className="text-ok" /> Call
          </ButtonLink>
        )}
        <Button variant="outline" size="lg" onClick={share} aria-label="Share this place">
          {shared ? <Check size={17} className="text-ok" /> : <Share2 size={17} />}
          <span className="sr-only sm:not-sr-only">{shared ?? 'Share'}</span>
        </Button>
      </div>
      <p className="-mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        Open in:
        <a
          href={links.apple}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-fg hover:underline"
        >
          Apple Maps
        </a>
        <a
          href={links.osm}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-fg hover:underline"
        >
          OpenStreetMap
        </a>
      </p>

      <section className="rounded-2xl border border-line bg-raised/40">
        <button
          type="button"
          onClick={() => setStepsOpen((v) => !v)}
          aria-expanded={stepsOpen}
          className="flex w-full items-center justify-between gap-3 px-4 py-3"
        >
          <span className="hud text-subtle">
            Turn-by-turn{route.data ? ` · ${route.data.steps.length} steps` : ''}
          </span>
          {route.isFetching ? (
            <span className="hud text-subtle">Routing…</span>
          ) : (
            <ChevronDown
              size={16}
              className={cn('text-subtle transition-transform', stepsOpen && 'rotate-180')}
            />
          )}
        </button>
        {route.isFetching && <HazardBar className="rounded-none" label="Calculating route" />}
        {route.isError && (
          <p className="border-t border-line px-4 py-3 text-xs text-muted">
            The routing server is busy, so times are straight-line estimates. Navigation apps above still
            work.
          </p>
        )}
        <AnimatePresence initial={false}>
          {stepsOpen && route.data && (
            <motion.ol
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-line"
            >
              {route.data.steps.map((step, i) => {
                const Icon = maneuverIcon(step.maneuver);
                return (
                  <li
                    key={i}
                    className="flex items-start gap-3 px-4 py-2.5 not-last:border-b not-last:border-line/60"
                  >
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-sunken text-accent-ink">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-snug">{step.instruction}</span>
                    {step.distance > 0 && (
                      <span className="shrink-0 font-mono text-[11px] text-subtle">
                        {formatDistance(step.distance, units)}
                      </span>
                    )}
                  </li>
                );
              })}
            </motion.ol>
          )}
        </AnimatePresence>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Details</SectionLabel>
        <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-raised/40 text-sm">
          {place.phone && (
            <Row icon={Phone} label="Phone">
              <a href={telHref(place.phone)} className="font-mono text-fg hover:underline">
                {place.phone}
              </a>
            </Row>
          )}
          <Row icon={Clock} label="Hours">
            {place.openingHours ? (
              <span className="font-mono text-xs break-words text-fg">{place.openingHours}</span>
            ) : (
              <span className="text-muted">Not listed — call ahead</span>
            )}
            {opening.state === 'unknown' && place.openingHours && (
              <span className="mt-0.5 block text-xs text-subtle">Complex schedule; check before you go.</span>
            )}
          </Row>
          {place.website && (
            <Row icon={Globe} label="Website">
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-fg hover:underline"
              >
                {place.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </Row>
          )}
          {place.operator && place.operator !== place.name && (
            <Row icon={Flag} label="Operator">
              <span className="text-fg">{place.operator}</span>
            </Row>
          )}
        </dl>
      </section>

      <a
        href={`https://www.openstreetmap.org/${place.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-subtle hover:text-muted"
      >
        <ExternalLink size={12} /> Wrong or missing info? Fix it on OpenStreetMap
      </a>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      <span className="hud text-subtle">{label}</span>
      {children}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon size={15} className="mt-0.5 shrink-0 text-subtle" aria-hidden />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
