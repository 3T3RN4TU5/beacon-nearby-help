import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useApp } from '@/store/app';

/** Transient message for things that go wrong after results are already on screen. */
export function NoticeToast() {
  const notice = useApp((s) => s.notice);
  const dismiss = useApp((s) => s.dismissNotice);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(dismiss, 7000);
    return () => clearTimeout(t);
  }, [notice, dismiss]);

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          key={notice.message}
          role={notice.tone === 'error' ? 'alert' : 'status'}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={cn(
            'fixed top-[76px] left-1/2 z-50 flex w-[min(calc(100vw-24px),460px)] -translate-x-1/2 items-start gap-3 rounded-2xl border bg-surface px-4 py-3 shadow-panel',
            notice.tone === 'error' ? 'border-warn/40' : 'border-line-strong',
          )}
        >
          {notice.tone === 'error' ? (
            <TriangleAlert size={17} className="mt-0.5 shrink-0 text-warn" />
          ) : (
            <Info size={17} className="mt-0.5 shrink-0 text-accent-ink" />
          )}
          <p className="min-w-0 flex-1 text-sm leading-snug">{notice.message}</p>
          <button type="button" aria-label="Dismiss" onClick={dismiss} className="text-subtle hover:text-fg">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
