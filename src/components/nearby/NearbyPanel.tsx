import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useApp } from '@/store/app';
import { CategoryList } from './CategoryList';
import { Overview } from './Overview';
import { PlaceDetail } from './PlaceDetail';

/** Drill-down navigation inside the Nearby tab: overview → category → place. */
export function NearbyPanel() {
  const view = useApp((s) => s.view);
  const reduced = useReducedMotion();
  const depth = view.kind === 'overview' ? 0 : view.kind === 'category' ? 1 : 2;
  const key =
    view.kind === 'overview' ? 'o' : view.kind === 'category' ? `c:${view.category}` : `p:${view.placeId}`;

  return (
    <AnimatePresence mode="wait" initial={false} custom={depth}>
      <motion.div
        key={key}
        initial={{ opacity: 0, x: reduced ? 0 : 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: reduced ? 0 : -16 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {view.kind === 'overview' && <Overview />}
        {view.kind === 'category' && <CategoryList category={view.category} />}
        {view.kind === 'place' && <PlaceDetail placeId={view.placeId} from={view.from} />}
      </motion.div>
    </AnimatePresence>
  );
}
