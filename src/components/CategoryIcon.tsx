import { Cross, Flame, Fuel, Pill, PlugZap, Shield, Wrench, type LucideIcon } from 'lucide-react';
import { CATEGORIES, type CategoryId } from '@/config/categories';
import { cn } from '@/lib/cn';

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  hospital: Cross,
  police: Shield,
  pharmacy: Pill,
  fuel: Fuel,
  fire: Flame,
  ev: PlugZap,
  repair: Wrench,
};

const SIZES = {
  xs: { box: 'size-5 rounded-[5px]', icon: 12 },
  sm: { box: 'size-7 rounded-[7px]', icon: 15 },
  md: { box: 'size-9 rounded-[9px]', icon: 18 },
  lg: { box: 'size-12 rounded-xl', icon: 24 },
};

/** A category rendered as a road sign: signage colour plate, ink pictogram. */
export function CategorySign({
  id,
  size = 'md',
  className,
}: {
  id: CategoryId;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[id];
  const s = SIZES[size];
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center text-[#0a0d05] shadow-[inset_0_0_0_1.5px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.35)]',
        s.box,
        className,
      )}
      style={{ backgroundColor: CATEGORIES[id].color }}
    >
      <Icon size={s.icon} strokeWidth={2.4} />
    </span>
  );
}
