import { Info, Moon, Sun, WifiOff } from 'lucide-react';
import { useOnline, useResolvedTheme } from '@/hooks/useEnvironment';
import { cn } from '@/lib/cn';
import { useApp } from '@/store/app';
import { Wordmark } from './Logo';
import { IconButton } from './ui/Button';

export function TopBar({ onAbout }: { onAbout: () => void }) {
  const theme = useResolvedTheme();
  const setTheme = useApp((s) => s.setTheme);
  const goHome = useApp((s) => s.goHome);
  const phase = useApp((s) => s.phase);
  const online = useOnline();

  return (
    <header
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 lg:px-5',
        'bg-gradient-to-b from-canvas/85 via-canvas/40 to-transparent',
      )}
    >
      <button
        type="button"
        onClick={goHome}
        className="pointer-events-auto rounded-xl"
        aria-label="Beacon home"
        disabled={phase === 'landing'}
      >
        <Wordmark />
      </button>

      <div className="pointer-events-auto flex items-center gap-1.5">
        <span
          className={cn(
            'mr-1 hidden h-8 items-center gap-2 rounded-full border px-3 hud sm:flex',
            online ? 'border-line bg-glass text-muted backdrop-blur' : 'border-warn/40 bg-warn/10 text-warn',
          )}
          role="status"
        >
          {online ? (
            <>
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-ok" />
                <span className="relative inline-flex size-1.5 rounded-full bg-ok" />
              </span>
              Live open data
            </>
          ) : (
            <>
              <WifiOff size={12} /> Offline · cached
            </>
          )}
        </span>
        <IconButton
          label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          variant="outline"
          size="sm"
          className="bg-glass backdrop-blur"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>
        <IconButton
          label="About, privacy & settings"
          variant="outline"
          size="sm"
          className="bg-glass backdrop-blur"
          onClick={onAbout}
        >
          <Info size={16} />
        </IconButton>
      </div>
    </header>
  );
}
