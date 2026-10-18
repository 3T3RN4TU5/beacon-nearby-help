import { motion } from 'motion/react';
import { ChevronRight, RefreshCw, ServerCrash } from 'lucide-react';
import { CATEGORIES, PRIMARY_CATEGORIES, SECONDARY_CATEGORIES } from '@/config/categories';
import type { CategoryResult } from '@/data/queries';
import { useScene } from '@/hooks/useScene';
import { formatDistance } from '@/lib/format';
import { useApp, useSearchStatus } from '@/store/app';
import { CategorySign } from '../CategoryIcon';
import { Button } from '../ui/Button';
import { HazardBar, SectionLabel, Skeleton } from '../ui/primitives';
import { CategoryCard } from './CategoryCard';
import { SlowDataFallback } from './SlowDataFallback';
import { MODE_WORD } from './labels';
import { DistanceText, TravelFigure, TravelModeSwitch, WeatherBanner } from './shared';
import { useUnits } from '@/hooks/useUnits';

export function Overview() {
  const { nearby, mode } = useScene();
  const { results, placesQuery, refining } = nearby;
  const radius = useSearchStatus((s) => s.radius);
  const units = useUnits();

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
      <TravelModeSwitch />
      <WeatherBanner />

      {placesQuery.isPending && (
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <HazardBar label="Searching nearby" />
          <p className="hud text-muted">
            Scanning {radius ? formatDistance(radius, units) : 'nearby'} radius · OpenStreetMap
          </p>
          <SlowDataFallback />
          <div className="grid grid-cols-2 gap-2.5">
            {PRIMARY_CATEGORIES.map((id) => (
              <Skeleton key={id} className="h-[148px] rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {placesQuery.isError && !results && (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-raised/40 px-5 py-8 text-center"
          role="alert"
        >
          <ServerCrash size={26} className="text-warn" />
          <div>
            <p className="font-semibold">Map data servers are busy</p>
            <p className="mt-1 text-sm text-muted">
              The free OpenStreetMap servers didn&apos;t answer in time. In an emergency, use the SOS tab to
              call for help.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => placesQuery.refetch()}
            disabled={placesQuery.isFetching}
          >
            <RefreshCw size={14} className={placesQuery.isFetching ? 'animate-spin' : ''} />
            {placesQuery.isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </div>
      )}
      {placesQuery.isError && !results && <SlowDataFallback failed />}

      {results && (
        <>
          <SectionLabel
            right={
              refining ? (
                <span className="flex items-center gap-1.5 hud text-subtle">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent" /> Ranking by road
                </span>
              ) : (
                <span className="hud text-subtle">by {MODE_WORD[mode]} time</span>
              )
            }
          >
            Closest help
          </SectionLabel>
          <motion.div
            className="grid grid-cols-2 gap-2.5"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          >
            {PRIMARY_CATEGORIES.map((id) => (
              <CategoryCard key={id} result={results[id]} />
            ))}
          </motion.div>

          <SectionLabel className="mt-2">Also nearby</SectionLabel>
          <ul className="-mt-1 flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-raised/40">
            {SECONDARY_CATEGORIES.map((id) => (
              <SecondaryRow key={id} result={results[id]} />
            ))}
          </ul>

          <p className="text-xs leading-relaxed text-subtle">
            Places come from OpenStreetMap volunteers and can be incomplete. In an emergency, call ahead — or
            use{' '}
            <button
              type="button"
              className="font-semibold text-danger underline-offset-2 hover:underline"
              onClick={() => useApp.getState().setPanel('sos')}
            >
              SOS
            </button>
            .
          </p>
        </>
      )}
    </div>
  );
}

function SecondaryRow({ result }: { result: CategoryResult }) {
  const openCategory = useApp((s) => s.openCategory);
  const units = useUnits();
  const def = CATEGORIES[result.id];
  const nearest = result.nearest;
  return (
    <li>
      <button
        type="button"
        disabled={!nearest}
        onClick={() => openCategory(result.id)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-raised disabled:opacity-60"
      >
        <CategorySign id={result.id} size="sm" className={nearest ? '' : 'grayscale'} />
        <span className="min-w-0 flex-1">
          <span className="block hud" style={{ color: `var(--color-${def.id})` }}>
            {def.label}
          </span>
          <span className="block truncate text-sm font-semibold">
            {nearest
              ? nearest.name
              : `None within ${formatDistance(result.searchedRadius ?? def.maxRadius, units)}`}
          </span>
        </span>
        {nearest && (
          <span className="flex flex-col items-end">
            <TravelFigure travel={nearest.travel} size="sm" />
            <DistanceText metres={nearest.travel.distance} className="text-[11px]" />
          </span>
        )}
        <ChevronRight size={16} className="shrink-0 text-subtle" />
      </button>
    </li>
  );
}
