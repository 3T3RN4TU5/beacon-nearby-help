import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'accent' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-raised text-muted border-line',
  ok: 'bg-ok/12 text-ok border-ok/25',
  warn: 'bg-warn/12 text-warn border-warn/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
  accent: 'bg-accent/15 text-accent-ink border-accent/30',
  info: 'bg-police/12 text-police border-police/25',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[11px] leading-none font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden className={cn('animate-shimmer rounded-md bg-line-strong', className)} {...props} />
  );
}

/** Hazard-tape progress strip used while live data is loading. */
export function HazardBar({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      className={cn('h-[3px] w-full overflow-hidden rounded-full bg-raised', className)}
    >
      <div className="h-full w-full animate-hazard hazard-stripes opacity-80" />
    </div>
  );
}

export function SectionLabel({
  children,
  className,
  right,
}: {
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h3 className="hud text-subtle">{children}</h3>
      {right}
    </div>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-raised/50', className)} {...props} />;
}
