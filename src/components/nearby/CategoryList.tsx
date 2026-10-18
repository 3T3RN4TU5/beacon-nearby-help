import { motion } from 'motion/react';
import { ArrowLeft, Phone } from 'lucide-react';
import { CATEGORIES, type CategoryId } from '@/config/categories';
import type { RankedPlace } from '@/data/queries';
import { telHref } from '@/features/emergency/share';
import { useScene } from '@/hooks/useScene';
import { formatDistance } from '@/lib/format';
import { useApp } from '@/store/app';
import { CategorySign } from '../CategoryIcon';
import { IconButton } from '../ui/Button';
import { Badge } from '../ui/primitives';
import { MODE_WORD } from './labels';
import { DistanceText, OpeningBadge, TravelFigure, TravelModeSwitch } from './shared';
import { useUnits } from '@/hooks/useUnits';

export function CategoryList({ category }: { category: CategoryId }) {
  const back = useApp((s) => s.back);
  const units = useUnits();
  const { nearby, mode } = useScene();
  const result = nearby.results?.[category];
  const def = CATEGORIES[category];

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-3">
        <IconButton label="Back to overview" size="sm" variant="outline" onClick={back}>
          <ArrowLeft size={16} />
        </IconButton>
        <CategorySign id={category} size="md" />
        <div className="min-w-0">
          <h2 className="text-lg leading-tight font-bold tracking-tight">{def.plural}</h2>
          <p className="hud text-subtle">
            {result?.places.length ?? 0} found · within{' '}
            {formatDistance(result?.searchedRadius ?? def.maxRadius, units)} · by {MODE_WORD[mode]} time
          </p>
        </div>
      </div>
      <TravelModeSwitch />
      {result && result.places.length > 0 ? (
        <motion.ol
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.035 } } }}
          className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-raised/40"
        >
          {result.places.map((p, i) => (
            <PlaceRow key={p.id} place={p} index={i} category={category} />
          ))}
        </motion.ol>
      ) : (
        <p className="rounded-2xl border border-line px-4 py-6 text-center text-sm text-muted">
          Nothing found in this area.
        </p>
      )}
    </div>
  );
}

function PlaceRow({ place, index, category }: { place: RankedPlace; index: number; category: CategoryId }) {
  const openPlace = useApp((s) => s.openPlace);
  return (
    <motion.li
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className="relative flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-raised"
    >
      <span className="w-5 shrink-0 text-center font-mono text-[11px] text-subtle">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => openPlace(place.id, category)}
          className="block w-full truncate text-left text-sm font-semibold after:absolute after:inset-0"
        >
          {place.name}
        </button>
        <p className="mt-0.5 truncate text-xs text-muted">
          {place.subtype}
          {place.address ? ` · ${place.address}` : ''}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {place.emergency && <Badge tone="danger">Emergency dept</Badge>}
          <OpeningBadge spec={place.openingHours} />
          {place.features?.slice(0, 3).map((f) => (
            <Badge key={f}>{f}</Badge>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <TravelFigure travel={place.travel} size="sm" />
        <DistanceText metres={place.travel.distance} className="text-[11px]" />
      </div>
      {place.phone && (
        <a
          href={telHref(place.phone)}
          aria-label={`Call ${place.name}`}
          className="relative z-10 grid size-9 shrink-0 place-items-center rounded-xl border border-line-strong text-ok hover:bg-ok/10"
        >
          <Phone size={15} />
        </a>
      )}
    </motion.li>
  );
}
