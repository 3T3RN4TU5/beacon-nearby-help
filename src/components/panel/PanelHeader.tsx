import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crosshair, LoaderCircle, LocateFixed, MapPin, Search, TriangleAlert, X } from 'lucide-react';
import { usePlaceLabel } from '@/data/queries';
import { useNow } from '@/hooks/useEnvironment';
import { useLocate } from '@/hooks/useLocate';
import { useUnits } from '@/hooks/useUnits';
import { cn } from '@/lib/cn';
import { formatDistance, formatRelativeTime } from '@/lib/format';
import { formatCoordinates } from '@/lib/geo';
import { useApp } from '@/store/app';
import { LocationSearch } from '../LocationSearch';
import { IconButton } from '../ui/Button';
import { Skeleton } from '../ui/primitives';

/** Beyond this, results can be for the wrong neighbourhood: tell the user and offer a fix. */
const APPROXIMATE_M = 500;

const KICKER = { gps: 'You are near', pin: 'Pinned location', search: 'Showing help near' } as const;

export function PanelHeader({ compact = false }: { compact?: boolean }) {
  const origin = useApp((s) => s.origin);
  const anchor = useApp((s) => s.anchor);
  const locateStatus = useApp((s) => s.locateStatus);
  const setAdjusting = useApp((s) => s.setAdjusting);
  const units = useUnits();
  const label = usePlaceLabel(anchor);
  const locate = useLocate();
  const now = useNow(30_000);
  const [searching, setSearching] = useState(false);

  if (!origin) return null;
  const title = origin.source === 'search' ? origin.label : label.data?.label;
  const accuracy = origin.source === 'gps' ? origin.accuracy : undefined;
  const approximate = accuracy !== undefined && accuracy > APPROXIMATE_M && locateStatus !== 'refining';

  return (
    <div className={compact ? 'px-4 pt-1.5 pb-2' : 'px-5 pt-4 pb-3'}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent-ink">
          <MapPin size={16} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="hud text-subtle">{KICKER[origin.source]}</p>
          {title ? (
            <h2 className="truncate text-[17px] leading-tight font-bold tracking-tight">{title}</h2>
          ) : label.isError ? (
            <h2 className="truncate text-[17px] leading-tight font-bold tracking-tight">
              {formatCoordinates(origin, 3)}
            </h2>
          ) : (
            <Skeleton className="mt-1 h-5 w-48" />
          )}
          <p className="mt-0.5 truncate font-mono text-[11px] text-subtle" aria-live="polite">
            {formatCoordinates(origin)}
            {accuracy !== undefined && (
              <span className={cn(approximate && 'text-warn')}> · ±{formatDistance(accuracy, units)}</span>
            )}
            {locateStatus === 'refining' ? (
              <span className="text-accent-ink"> · improving accuracy…</span>
            ) : (
              <> · {formatRelativeTime(origin.at, now)}</>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <IconButton
            label={searching ? 'Close search' : 'Search another place'}
            size="sm"
            onClick={() => setSearching((v) => !v)}
          >
            {searching ? <X size={16} /> : <Search size={16} />}
          </IconButton>
          <IconButton label="Adjust my location on the map" size="sm" onClick={() => setAdjusting(true)}>
            <Crosshair size={16} />
          </IconButton>
          <IconButton
            label={locateStatus === 'locating' ? 'Finding your location…' : 'Use my current location'}
            size="sm"
            onClick={locate}
            disabled={locateStatus === 'locating'}
            aria-busy={locateStatus !== 'idle'}
          >
            {locateStatus === 'locating' ? (
              <LoaderCircle size={16} className="animate-spin text-accent-ink" />
            ) : (
              <LocateFixed
                size={16}
                className={cn(locateStatus === 'refining' && 'animate-pulse text-accent-ink')}
              />
            )}
          </IconButton>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {approximate && (
          <motion.div
            key="approx"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-warn/30 bg-warn/8 px-3 py-2">
              <TriangleAlert size={15} className="shrink-0 text-warn" />
              <p className="min-w-0 flex-1 text-xs leading-snug text-muted">
                <span className="font-semibold text-fg">Approximate location.</span> Your device only knows
                where you are to ±{formatDistance(accuracy ?? 0, units)}.
              </p>
              <button
                type="button"
                onClick={() => setAdjusting(true)}
                className="shrink-0 rounded-lg bg-warn/15 px-2.5 py-1.5 text-xs font-semibold text-warn hover:bg-warn/25"
              >
                Set exact spot
              </button>
            </div>
          </motion.div>
        )}
        {searching && (
          <motion.div
            key="search"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-visible"
          >
            <LocationSearch autoFocus className="mt-3" onPicked={() => setSearching(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
