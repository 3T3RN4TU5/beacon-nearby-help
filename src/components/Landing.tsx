import { useEffect, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { ArrowRight, History, LocateFixed, Phone, ShieldAlert, TriangleAlert } from 'lucide-react';
import { PRIMARY_CATEGORIES, SECONDARY_CATEGORIES, CATEGORIES } from '@/config/categories';
import { guessCountryCode, primaryLine } from '@/features/emergency/numbers';
import { telHref } from '@/features/emergency/share';
import type { GeoErrorKind } from '@/features/location/geolocate';
import { useNow } from '@/hooks/useEnvironment';
import { useLocate } from '@/hooks/useLocate';
import { useMapInsets } from '@/hooks/useScene';
import { formatRelativeTime } from '@/lib/format';
import { useApp } from '@/store/app';
import { CategorySign } from './CategoryIcon';
import { LocationSearch } from './LocationSearch';
import { Button } from './ui/Button';

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const line: Variants = {
  hidden: { y: '105%' },
  show: { y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
};

const GEO_ERRORS: Record<GeoErrorKind, { title: string; body: string }> = {
  denied: {
    title: 'Location access is blocked',
    body: 'Allow location for this site in your browser settings (the lock icon beside the address), then try again — or search for a place below.',
  },
  unavailable: {
    title: 'No location fix',
    body: 'Your device did not return a position. Check that location services are switched on, or search for a place.',
  },
  timeout: {
    title: 'Location is taking too long',
    body: 'GPS can be slow indoors. Move near a window and retry, or search for a place.',
  },
  insecure: {
    title: 'Location needs a secure connection',
    body: 'Open Beacon over https:// to use GPS. You can still search for a place below.',
  },
  unsupported: {
    title: 'This browser cannot share location',
    body: 'Search for a place instead — everything else works the same.',
  },
};

export function Landing() {
  const phase = useApp((s) => s.phase);
  return (
    <AnimatePresence>
      {phase !== 'active' && (
        <motion.section
          key="landing"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, delay: 0.2 } }}
          className="pointer-events-none absolute inset-0 z-10"
        >
          {/* Scrim: readable copy on the left (desktop) / bottom (mobile), globe untouched on the other side. */}
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/80 to-transparent lg:bg-gradient-to-r lg:from-canvas lg:via-canvas/75 lg:to-transparent lg:to-[62%]" />
          <div className="absolute inset-0 grain" />
          <AnimatePresence>
            {phase === 'locating' ? <LocatingOverlay key="radar" /> : <Hero key="hero" />}
          </AnimatePresence>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function Hero() {
  const locate = useLocate();
  const geoError = useApp((s) => s.geoError);
  const lastOrigin = useApp((s) => s.lastOrigin);
  const setOrigin = useApp((s) => s.setOrigin);
  const now = useNow(60_000);
  const [showSearch, setShowSearch] = useState(false);
  const [emergency] = useState(() => primaryLine(guessCountryCode()));

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: 20, filter: 'blur(4px)', transition: { duration: 0.35 } }}
      className="pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-full flex-col gap-5 overflow-y-auto px-5 pt-24 pb-[max(28px,env(safe-area-inset-bottom))] sm:px-8 lg:top-0 lg:right-auto lg:w-[min(52vw,700px)] lg:justify-center-safe lg:gap-6 lg:px-12 lg:pb-12 xl:px-16"
    >
      <motion.p variants={rise} className="flex items-center gap-2 hud text-muted">
        <span className="size-1.5 rounded-full bg-accent" />
        Open data · No sign-up · No tracking
      </motion.p>

      <h1 className="text-[clamp(2.6rem,11vw,4rem)] leading-[0.9] font-extrabold tracking-[-0.045em] lg:text-[clamp(3.25rem,5.4vw,5.75rem)]">
        <span className="block overflow-hidden pb-[0.06em]">
          <motion.span variants={line} className="block">
            Nearest help,
          </motion.span>
        </span>
        <span className="block overflow-hidden pb-[0.06em]">
          <motion.span variants={line} className="block text-accent-ink">
            one tap away.
          </motion.span>
        </span>
      </h1>

      <motion.p variants={rise} className="max-w-[34rem] text-[15px] leading-relaxed text-muted sm:text-base">
        Beacon finds the closest hospital, police station, pharmacy and fuel around you, ranks them by{' '}
        <span className="text-fg">real travel time</span>, routes you there — and warns you about weather on
        the road.
      </motion.p>

      <motion.div variants={rise} className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {geoError && <GeoErrorCard kind={geoError} onSearch={() => setShowSearch(true)} />}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="xl" onClick={locate} className="min-w-52 flex-1 sm:flex-none">
            <LocateFixed size={20} strokeWidth={2.4} />
            {geoError ? 'Try again' : 'Locate me'}
          </Button>
          {!showSearch && (
            <Button
              variant="outline"
              size="xl"
              onClick={() => setShowSearch(true)}
              className="flex-1 sm:flex-none"
            >
              Search a place
            </Button>
          )}
        </div>

        {showSearch && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
            <LocationSearch autoFocus />
          </motion.div>
        )}

        <p className="text-xs text-subtle">
          Your location is used on this device only to query open map data — never stored on a server.
        </p>
        <a
          href={telHref(emergency.number)}
          className="flex items-center gap-2 self-start rounded-lg text-sm font-semibold text-danger underline-offset-4 hover:underline"
        >
          <Phone size={14} strokeWidth={2.5} /> In immediate danger? Call {emergency.number}
        </a>
      </motion.div>

      {lastOrigin && (
        <motion.button
          variants={rise}
          type="button"
          onClick={() => setOrigin({ ...lastOrigin, at: Date.now() })}
          className="group flex max-w-md items-center gap-3 rounded-xl border border-line bg-raised/50 px-3.5 py-2.5 text-left transition-colors hover:border-line-strong"
        >
          <History size={16} className="shrink-0 text-subtle" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              Use last location{lastOrigin.label ? ` · ${lastOrigin.label}` : ''}
            </span>
            <span className="block hud text-subtle">Checked {formatRelativeTime(lastOrigin.at, now)}</span>
          </span>
          <ArrowRight size={16} className="text-subtle transition-transform group-hover:translate-x-0.5" />
        </motion.button>
      )}

      <motion.ul
        variants={rise}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1"
        aria-label="What Beacon finds"
      >
        {PRIMARY_CATEGORIES.map((id) => (
          <li key={id} className="flex items-center gap-2">
            <CategorySign id={id} size="xs" />
            <span className="hud text-muted">{CATEGORIES[id].label}</span>
          </li>
        ))}
        <li className="hud text-subtle">
          + {SECONDARY_CATEGORIES.map((id) => CATEGORIES[id].label.toLowerCase()).join(', ')}
        </li>
      </motion.ul>
    </motion.div>
  );
}

function GeoErrorCard({ kind, onSearch }: { kind: GeoErrorKind; onSearch: () => void }) {
  const { title, body } = GEO_ERRORS[kind];
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      role="alert"
      className="overflow-hidden"
    >
      <div className="flex gap-3 rounded-xl border border-warn/30 bg-warn/8 p-3.5">
        {kind === 'denied' ? (
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warn" />
        ) : (
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warn" />
        )}
        <div className="text-sm">
          <p className="font-semibold text-fg">{title}</p>
          <p className="mt-1 leading-relaxed text-muted">{body}</p>
          <button
            type="button"
            onClick={onSearch}
            className="mt-2 font-semibold text-accent-ink underline-offset-4 hover:underline"
          >
            Search instead
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/** Radar sweep over the globe while the device acquires a fix. */
function LocatingOverlay() {
  const cancel = useApp((s) => s.cancelLocating);
  const insets = useMapInsets();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08, transition: { duration: 0.4 } }}
      className="pointer-events-auto absolute grid place-items-center"
      style={{ top: 0, right: insets.right, bottom: insets.bottom, left: insets.left }}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-7">
        <div className="relative size-[min(64vw,260px)]">
          {[1, 0.72, 0.44].map((s) => (
            <span
              key={s}
              className="absolute inset-0 m-auto rounded-full border border-accent/20"
              style={{ width: `${s * 100}%`, height: `${s * 100}%` }}
            />
          ))}
          <span className="absolute inset-0 m-auto h-px w-full bg-accent/10" />
          <span className="absolute inset-0 m-auto h-full w-px bg-accent/10" />
          <span
            className="absolute inset-0 animate-radar rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgb(214 255 61 / 0) 290deg, rgb(214 255 61 / 0.38) 360deg)',
            }}
          />
          <span className="absolute inset-0 m-auto grid size-5 place-items-center">
            <span className="absolute size-5 animate-ping-slow rounded-full bg-accent/60" />
            <span className="size-3 rounded-full bg-accent shadow-[0_0_24px_var(--accent)]" />
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="hud text-accent-ink">
            Acquiring position<span className="animate-blink">_</span>
          </p>
          <p className="font-mono text-2xl text-fg tabular-nums">00:{String(elapsed).padStart(2, '0')}</p>
          <p className="h-5 text-sm text-muted">
            {elapsed >= 6 ? 'Indoors? Moving near a window helps.' : 'Allow location when your browser asks.'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}
