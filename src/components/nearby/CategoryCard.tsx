import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { CATEGORIES } from '@/config/categories';
import type { CategoryResult } from '@/data/queries';
import { formatDistance } from '@/lib/format';
import { useApp } from '@/store/app';
import { CategorySign } from '../CategoryIcon';
import { Badge } from '../ui/primitives';
import { DistanceText, OpeningBadge, TravelFigure } from './shared';
import { useUnits } from '@/hooks/useUnits';

/** One-tap summary tile: the single best option for a category, with time, distance and status. */
export function CategoryCard({ result }: { result: CategoryResult }) {
  const openPlace = useApp((s) => s.openPlace);
  const openCategory = useApp((s) => s.openCategory);
  const units = useUnits();
  const def = CATEGORIES[result.id];
  const nearest = result.nearest;
  const more = result.places.length - 1;

  return (
    <motion.article
      variants={{ hidden: { opacity: 0, y: 12, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="group relative flex min-h-[148px] flex-col overflow-hidden rounded-2xl border border-line bg-raised/60 p-3 transition-colors hover:border-line-strong"
    >
      {/* signage-colour edge, like the reflective band on a road sign */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: def.color }}
      />

      <div className="flex items-start justify-between gap-2">
        <CategorySign id={result.id} size="md" className={nearest ? '' : 'opacity-60 grayscale'} />
        {nearest?.emergency && <Badge tone="danger">ER</Badge>}
      </div>

      <p className="mt-3 hud" style={{ color: `var(--color-${def.id})` }}>
        {def.label}
      </p>

      {nearest ? (
        <>
          <button
            type="button"
            onClick={() => openPlace(nearest.id)}
            className="mt-0.5 line-clamp-2 text-left text-[14px] leading-snug font-semibold tracking-tight after:absolute after:inset-0"
          >
            {nearest.name}
          </button>
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <TravelFigure travel={nearest.travel} />
            <DistanceText metres={nearest.travel.distance} />
          </div>
          <div className="relative z-10 mt-2 flex min-h-5 items-center justify-between gap-2">
            <OpeningBadge spec={nearest.openingHours} />
            {more > 0 && (
              <button
                type="button"
                onClick={() => openCategory(result.id)}
                className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold text-muted hover:text-fg"
              >
                +{more} <ArrowUpRight size={12} />
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="mt-1 text-[13px] leading-snug text-muted">
          None found within {formatDistance(result.searchedRadius ?? def.maxRadius, units)}
        </p>
      )}
    </motion.article>
  );
}
