import { useRef, useState, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { cn } from '@/lib/cn';

interface HoldButtonProps {
  onComplete: () => void;
  /** Runs synchronously inside the initial gesture (e.g. to unlock audio). */
  onStart?: () => void;
  durationMs?: number;
  children: ReactNode;
  className?: string;
  label: string;
}

/**
 * Press-and-hold to confirm: prevents a pocket tap from blasting an alarm, without a modal.
 * Works with pointer and keyboard (hold Space/Enter).
 */
export function HoldButton({
  onComplete,
  onStart,
  durationMs = 1200,
  children,
  className,
  label,
}: HoldButtonProps) {
  const progress = useMotionValue(0);
  const width = useTransform(progress, (p) => `${p * 100}%`);
  const controls = useRef<ReturnType<typeof animate> | null>(null);
  const [holding, setHolding] = useState(false);

  const begin = () => {
    onStart?.();
    setHolding(true);
    controls.current?.stop();
    controls.current = animate(progress, 1, {
      duration: (durationMs / 1000) * (1 - progress.get()),
      ease: 'linear',
      onComplete: () => {
        setHolding(false);
        progress.set(0);
        onComplete();
      },
    });
  };
  const cancel = () => {
    setHolding(false);
    controls.current?.stop();
    controls.current = animate(progress, 0, { duration: 0.25 });
  };

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        begin();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') cancel();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn('relative touch-none overflow-hidden select-none', className)}
    >
      <motion.span aria-hidden className="absolute inset-y-0 left-0 bg-white/20" style={{ width }} />
      <span
        className={cn(
          'relative flex items-center justify-center gap-2 transition-transform',
          holding && 'scale-[0.98]',
        )}
      >
        {children}
      </span>
    </button>
  );
}
