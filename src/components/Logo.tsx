import { cn } from '@/lib/cn';

/** Beacon mark: a mast with a light radiating two signal arcs. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={cn('size-8', className)}>
      <rect width="64" height="64" rx="15" className="fill-[#07090c]" />
      <rect
        x=".75"
        y=".75"
        width="62.5"
        height="62.5"
        rx="14.25"
        stroke="rgb(255 255 255 / .1)"
        strokeWidth="1.5"
      />
      <g stroke="#d6ff3d" strokeLinecap="round" strokeWidth="4.5">
        <path d="M14.7 27.5a20 20 0 0 1 34.6 0" opacity=".55" />
        <path d="M21.6 31.5a12 12 0 0 1 20.8 0" />
        <path d="M32 43.5v8.5" />
      </g>
      <circle cx="32" cy="37.5" r="5.5" fill="#d6ff3d" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-extrabold tracking-[-0.03em]">Beacon</span>
        <span className="mt-0.5 hud text-[8.5px] text-subtle">Nearby help</span>
      </span>
    </span>
  );
}
