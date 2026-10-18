import { Bike, Car, ChevronRight, Footprints } from 'lucide-react';
import type { TravelMode } from '@/config/endpoints';
import type { Travel } from '@/data/queries';
import { useRoadWeather } from '@/data/useRoadWeather';
import { useOpeningStatus } from '@/hooks/useOpeningStatus';
import { cn } from '@/lib/cn';
import { distanceParts, durationParts, formatWallClock } from '@/lib/format';
import { useApp } from '@/store/app';
import { ALERT_ICONS, SEVERITY_STYLE } from '../weather/alertStyle';
import { Segmented } from '../ui/Segmented';
import { Badge } from '../ui/primitives';
import { useUnits } from '@/hooks/useUnits';

export function TravelModeSwitch({ className }: { className?: string }) {
  const mode = useApp((s) => s.mode);
  const setMode = useApp((s) => s.setMode);
  return (
    <Segmented<TravelMode>
      label="Travel mode"
      value={mode}
      onChange={setMode}
      className={className}
      options={[
        { value: 'driving', label: 'Drive', icon: <Car size={15} /> },
        { value: 'cycling', label: 'Cycle', icon: <Bike size={15} /> },
        { value: 'walking', label: 'Walk', icon: <Footprints size={15} /> },
      ]}
    />
  );
}

const DAY_NAMES: Record<string, string> = {
  Mo: 'Mon',
  Tu: 'Tue',
  We: 'Wed',
  Th: 'Thu',
  Fr: 'Fri',
  Sa: 'Sat',
  Su: 'Sun',
};

export function OpeningBadge({ spec, showUnknown = false }: { spec?: string; showUnknown?: boolean }) {
  const status = useOpeningStatus(spec);
  if (status.state === 'open') {
    if (status.always) return <Badge tone="ok">Open 24/7</Badge>;
    if (status.closingSoon)
      return <Badge tone="warn">Closes {formatWallClock(status.closesAt ?? '00:00')}</Badge>;
    return (
      <Badge tone="ok">Open{status.closesAt ? ` · till ${formatWallClock(status.closesAt)}` : ''}</Badge>
    );
  }
  if (status.state === 'closed') {
    const when = status.opensAt ? formatWallClock(status.opensAt) : '';
    const day =
      status.opensOn === 'today'
        ? ''
        : status.opensOn === 'tomorrow'
          ? 'tomorrow '
          : `${DAY_NAMES[status.opensOn ?? ''] ?? ''} `;
    return <Badge tone="danger">Closed{when ? ` · opens ${day}${when}` : ''}</Badge>;
  }
  return showUnknown ? <Badge>Hours not listed</Badge> : null;
}

const FIGURE_SIZES = { sm: 'text-lg', md: 'text-[26px]', lg: 'text-[34px]' } as const;

export function TravelFigure({
  travel,
  size = 'md',
  className,
}: {
  travel: Travel;
  size?: keyof typeof FIGURE_SIZES;
  className?: string;
}) {
  const d = durationParts(travel.duration);
  return (
    <span
      className={cn('inline-flex items-baseline gap-1', className)}
      title={travel.estimated ? 'Estimated — routing unavailable' : undefined}
    >
      {travel.estimated && <span className="font-mono text-muted">≈</span>}
      <span
        className={cn('font-mono leading-none font-semibold tracking-tight tabular-nums', FIGURE_SIZES[size])}
      >
        {d.value}
      </span>
      <span className="text-xs font-semibold text-muted">{d.unit}</span>
    </span>
  );
}

export function DistanceText({ metres, className }: { metres: number; className?: string }) {
  const units = useUnits();
  const d = distanceParts(metres, units);
  return (
    <span className={cn('font-mono text-[13px] text-muted tabular-nums', className)}>
      {d.value}
      <span className="ml-0.5 text-[11px]">{d.unit}</span>
    </span>
  );
}

/** Most severe road-weather alert, surfaced on the Nearby tab when it matters. */
export function WeatherBanner() {
  const anchor = useApp((s) => s.anchor);
  const setPanel = useApp((s) => s.setPanel);
  const { alerts } = useRoadWeather(anchor);
  const top = alerts[0];
  if (!top || (top.severity !== 'warning' && top.severity !== 'danger')) return null;
  const style = SEVERITY_STYLE[top.severity];
  const Icon = ALERT_ICONS[top.kind];
  return (
    <button
      type="button"
      onClick={() => setPanel('weather')}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left',
        style.bg,
        style.border,
      )}
    >
      <Icon size={18} className={cn('shrink-0', style.text)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{top.title}</span>
        <span className="block truncate hud text-subtle">
          {style.label}
          {top.metric ? ` · ${top.metric}` : ''}
          {alerts.length > 1 ? ` · +${alerts.length - 1} more` : ''}
        </span>
      </span>
      <ChevronRight size={16} className="text-subtle transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
