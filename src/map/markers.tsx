import { motion } from 'motion/react';
import { CategorySign } from '@/components/CategoryIcon';
import { CATEGORIES, type CategoryId } from '@/config/categories';
import { cn } from '@/lib/cn';

export function OriginMarker({ heading }: { heading?: number | null }) {
  return (
    <div className="pointer-events-none relative grid size-7 place-items-center" aria-label="Your location">
      {heading != null && (
        <span
          className="absolute size-20 origin-center"
          style={{
            transform: `rotate(${heading}deg)`,
            background: 'conic-gradient(from -28deg at 50% 50%, rgb(214 255 61 / 0.45), transparent 56deg)',
            maskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
          }}
        />
      )}
      <span className="absolute size-7 animate-ping-slow rounded-full bg-accent/45" />
      <span className="absolute size-7 animate-ping-slow rounded-full bg-accent/30 [animation-delay:1.3s]" />
      <span className="relative size-[18px] rounded-full bg-accent shadow-[0_0_0_3px_var(--canvas),0_4px_14px_rgb(0_0_0/0.5)]" />
    </div>
  );
}

interface PlaceMarkerProps {
  category: CategoryId;
  name: string;
  badge?: string;
  emphasis: 'selected' | 'nearest' | 'normal' | 'dim';
  delay?: number;
  onSelect: () => void;
}

/** A road sign on a post: category plate, thin pole, base dot. */
export function PlaceMarker({ category, name, badge, emphasis, delay = 0, onSelect }: PlaceMarkerProps) {
  const selected = emphasis === 'selected';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      // Distinct from the panel card's button so screen readers don't hear two identical buttons.
      aria-label={`${name}, ${CATEGORIES[category].label.toLowerCase()} on map`}
      className="group relative flex flex-col items-center outline-none"
    >
      {(badge || selected) && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.15 }}
          className={cn(
            'absolute bottom-full mb-1.5 max-w-44 truncate rounded-md border px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-lg',
            selected
              ? 'border-accent/40 bg-accent text-accent-fg'
              : 'border-line-strong bg-glass text-fg backdrop-blur',
          )}
        >
          {selected ? name : badge}
        </motion.span>
      )}
      <motion.span
        initial={{ scale: 0.2, y: -14, opacity: 0 }}
        animate={{
          scale: selected ? 1.22 : emphasis === 'nearest' ? 1.08 : emphasis === 'dim' ? 0.82 : 0.94,
          y: 0,
          opacity: emphasis === 'dim' ? 0.55 : 1,
        }}
        whileHover={{ scale: selected ? 1.26 : 1.14 }}
        transition={{ type: 'spring', stiffness: 420, damping: 20, delay }}
        className="relative block"
      >
        <CategorySign
          id={category}
          size="sm"
          className={cn(
            'shadow-[0_0_0_2px_var(--canvas),0_6px_16px_rgb(0_0_0/0.45)]',
            selected && 'shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--accent),0_8px_20px_rgb(0_0_0/0.5)]',
          )}
        />
      </motion.span>
      <motion.span
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: delay + 0.08, duration: 0.25 }}
        className="h-2.5 w-[2px] origin-top bg-fg/55"
      />
      <span className="size-1.5 rounded-full bg-fg/60 shadow-[0_0_0_2px_var(--canvas)]" />
    </button>
  );
}
