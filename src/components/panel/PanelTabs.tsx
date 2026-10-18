import { motion } from 'motion/react';
import { CloudSun, Navigation, Siren } from 'lucide-react';
import { useRoadWeather } from '@/data/useRoadWeather';
import { SEVERITY_RANK } from '@/features/weather/alerts';
import { cn } from '@/lib/cn';
import { useApp, type Panel } from '@/store/app';

const SEVERITY_DOT = {
  info: 'bg-police',
  advisory: 'bg-warn',
  warning: 'bg-fire',
  danger: 'bg-danger',
} as const;

export function PanelTabs() {
  const panel = useApp((s) => s.panel);
  const setPanel = useApp((s) => s.setPanel);
  const anchor = useApp((s) => s.anchor);
  const { alerts } = useRoadWeather(anchor);
  const top = alerts.reduce<(typeof alerts)[number] | null>(
    (worst, a) => (!worst || SEVERITY_RANK[a.severity] > SEVERITY_RANK[worst.severity] ? a : worst),
    null,
  );

  const tabs: { id: Panel; label: string; icon: React.ReactNode }[] = [
    { id: 'nearby', label: 'Nearby', icon: <Navigation size={15} /> },
    { id: 'weather', label: 'Weather', icon: <CloudSun size={15} /> },
    { id: 'sos', label: 'SOS', icon: <Siren size={15} /> },
  ];

  return (
    <div role="tablist" aria-label="Panels" className="flex gap-1 px-3 sm:px-4">
      {tabs.map((t) => {
        const active = panel === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => setPanel(t.id)}
            className={cn(
              'relative flex h-11 flex-1 items-center justify-center gap-1.5 text-[13px] font-semibold transition-colors',
              active ? 'text-fg' : 'text-subtle hover:text-muted',
              t.id === 'sos' && (active ? 'text-danger' : 'text-danger/75 hover:text-danger'),
            )}
          >
            {t.icon}
            {t.label}
            {t.id === 'weather' && top && top.severity !== 'info' && (
              <span className="relative ml-0.5 flex size-2" aria-label={`${alerts.length} weather alerts`}>
                <span
                  className={cn(
                    'absolute inline-flex size-full animate-ping-slow rounded-full',
                    SEVERITY_DOT[top.severity],
                  )}
                />
                <span
                  className={cn('relative inline-flex size-2 rounded-full', SEVERITY_DOT[top.severity])}
                />
              </span>
            )}
            {active && (
              <motion.span
                layoutId="tab-underline"
                className={cn(
                  'absolute inset-x-3 -bottom-px h-[2px] rounded-full',
                  t.id === 'sos' ? 'bg-danger' : 'bg-accent',
                )}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
