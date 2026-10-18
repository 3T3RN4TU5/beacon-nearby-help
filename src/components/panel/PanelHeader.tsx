import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LocateFixed, MapPin, Search, X } from 'lucide-react';
import { usePlaceLabel } from '@/data/queries';
import { useNow } from '@/hooks/useEnvironment';
import { useLocate } from '@/hooks/useLocate';
import { formatDistance, formatRelativeTime } from '@/lib/format';
import { formatCoordinates } from '@/lib/geo';
import { useApp } from '@/store/app';
import { LocationSearch } from '../LocationSearch';
import { IconButton } from '../ui/Button';
import { Skeleton } from '../ui/primitives';
import { useUnits } from '@/hooks/useUnits';

export function PanelHeader({ compact = false }: { compact?: boolean }) {
  const origin = useApp((s) => s.origin);
  const anchor = useApp((s) => s.anchor);
  const units = useUnits();
  const label = usePlaceLabel(anchor);
  const locate = useLocate();
  const now = useNow(30_000);
  const [searching, setSearching] = useState(false);

  if (!origin) return null;
  const title = origin.source === 'search' ? origin.label : label.data?.label;

  return (
    <div className={compact ? 'px-4 pt-1.5 pb-2' : 'px-5 pt-4 pb-3'}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent-ink">
          <MapPin size={16} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="hud text-subtle">{origin.source === 'gps' ? 'You are near' : 'Showing help near'}</p>
          {title ? (
            <h2 className="truncate text-[17px] leading-tight font-bold tracking-tight">{title}</h2>
          ) : label.isError ? (
            <h2 className="truncate text-[17px] leading-tight font-bold tracking-tight">
              {formatCoordinates(origin, 3)}
            </h2>
          ) : (
            <Skeleton className="mt-1 h-5 w-48" />
          )}
          <p className="mt-0.5 truncate font-mono text-[11px] text-subtle">
            {formatCoordinates(origin)}
            {origin.accuracy ? ` · ±${formatDistance(origin.accuracy, units)}` : ''} ·{' '}
            {formatRelativeTime(origin.at, now)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton
            label={searching ? 'Close search' : 'Search another place'}
            size="sm"
            onClick={() => setSearching((v) => !v)}
          >
            {searching ? <X size={16} /> : <Search size={16} />}
          </IconButton>
          <IconButton label="Use my current location" size="sm" onClick={locate}>
            <LocateFixed size={16} />
          </IconButton>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {searching && (
          <motion.div
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
