import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Phone } from 'lucide-react';
import { PRIMARY_CATEGORIES, CATEGORIES, type CategoryId } from '@/config/categories';
import { usePlaceLabel } from '@/data/queries';
import { primaryLine } from '@/features/emergency/numbers';
import { googleMapsSearchLink, telHref } from '@/features/emergency/share';
import { useApp } from '@/store/app';
import { CategorySign } from '../CategoryIcon';

/** How long to wait on the free map-data servers before offering a way out. */
const PATIENCE_MS = 10_000;

/** Phrases Google Maps understands worldwide. */
const SEARCH_TERMS: Partial<Record<CategoryId, string>> = {
  hospital: 'hospital',
  police: 'police station',
  pharmacy: 'pharmacy',
  fuel: 'fuel station',
};

/**
 * The free Overpass servers are sometimes saturated. Nobody in an emergency should be stuck
 * watching a spinner, so after a short wait (or on failure) offer the emergency number and
 * one-tap searches in Google Maps for the same spot, while Beacon keeps retrying.
 */
export function SlowDataFallback({ failed = false }: { failed?: boolean }) {
  const anchor = useApp((s) => s.anchor);
  const { data: label } = usePlaceLabel(anchor);
  const [visible, setVisible] = useState(failed);

  useEffect(() => {
    if (failed) return;
    const t = setTimeout(() => setVisible(true), PATIENCE_MS);
    return () => clearTimeout(t);
  }, [failed]);

  if (!(visible || failed) || !anchor) return null;
  const emergency = primaryLine(label?.countryCode);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 rounded-2xl border border-warn/30 bg-warn/6 p-3.5"
      aria-label="Alternatives while map data loads"
    >
      <p className="text-sm leading-relaxed">
        <span className="font-semibold">
          {failed ? 'Map data is unavailable right now.' : 'Map data is slow right now.'}
        </span>{' '}
        <span className="text-muted">
          {failed ? 'You can still:' : 'Beacon keeps trying — meanwhile you can:'}
        </span>
      </p>
      <a
        href={telHref(emergency.number)}
        className="flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-bold text-white"
      >
        <Phone size={16} /> Call {emergency.number}
      </a>
      <div className="grid grid-cols-2 gap-2">
        {PRIMARY_CATEGORIES.map((id) => (
          <a
            key={id}
            href={googleMapsSearchLink(SEARCH_TERMS[id] ?? CATEGORIES[id].label, anchor)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface/60 px-3 py-2 text-[13px] font-semibold hover:bg-raised"
          >
            <CategorySign id={id} size="xs" />
            <span className="min-w-0 flex-1 truncate">{CATEGORIES[id].plural}</span>
            <ExternalLink size={12} className="shrink-0 text-subtle" />
          </a>
        ))}
      </div>
      <p className="text-[11px] text-subtle">Opens Google Maps search around your location.</p>
    </motion.section>
  );
}
