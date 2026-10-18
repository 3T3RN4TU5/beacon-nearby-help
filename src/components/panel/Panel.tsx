import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import { useIsDesktop, useViewport } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { useApp, type SheetSnap } from '@/store/app';
import { PANEL_GUTTER, PANEL_WIDTH, TOPBAR_HEIGHT, sheetHeights } from '../layout';
import { NearbyPanel } from '../nearby/NearbyPanel';
import { SosView } from '../sos/SosView';
import { WeatherView } from '../weather/WeatherView';
import { PanelHeader } from './PanelHeader';
import { PanelTabs } from './PanelTabs';

export function Panel() {
  const phase = useApp((s) => s.phase);
  const desktop = useIsDesktop();
  return (
    <AnimatePresence>
      {phase === 'active' && (desktop ? <DesktopPanel key="d" /> : <MobileSheet key="m" />)}
    </AnimatePresence>
  );
}

function PanelBody() {
  const panel = useApp((s) => s.panel);
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={panel}
        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduced ? 0 : -6 }}
        transition={{ duration: 0.18 }}
      >
        {panel === 'nearby' && <NearbyPanel />}
        {panel === 'weather' && <WeatherView />}
        {panel === 'sos' && <SosView />}
      </motion.div>
    </AnimatePresence>
  );
}

function DesktopPanel() {
  return (
    <motion.aside
      initial={{ x: -PANEL_WIDTH - 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1, transition: { delay: 0.5, type: 'spring', stiffness: 220, damping: 30 } }}
      exit={{ x: -PANEL_WIDTH - 40, opacity: 0, transition: { duration: 0.3 } }}
      className="fixed z-20 flex flex-col overflow-hidden rounded-[22px] border border-line-strong bg-glass shadow-panel backdrop-blur-xl"
      style={{ top: TOPBAR_HEIGHT, left: PANEL_GUTTER, bottom: PANEL_GUTTER, width: PANEL_WIDTH }}
      aria-label="Nearby help"
    >
      <div className="shrink-0 border-b border-line">
        <PanelHeader />
        <PanelTabs />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <PanelBody />
      </div>
    </motion.aside>
  );
}

const SNAPS: SheetSnap[] = ['peek', 'half', 'full'];

/** Draggable bottom sheet with peek / half / full snap points (drag the header to resize). */
function MobileSheet() {
  const { height: vh } = useViewport();
  const sheet = useApp((s) => s.sheet);
  const setSheet = useApp((s) => s.setSheet);
  const controls = useDragControls();
  const heights = sheetHeights(vh);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(150);
  const offsetFor = (snap: SheetSnap) => heights.full - heights[snap];

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.section
      initial={{ y: heights.full }}
      animate={{ y: offsetFor(sheet), transition: { type: 'spring', stiffness: 340, damping: 36 } }}
      exit={{ y: heights.full, transition: { duration: 0.3 } }}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: offsetFor('peek') }}
      dragElastic={0.04}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        // Project the release point with velocity, then snap to the nearest stop.
        const current = offsetFor(sheet) + info.offset.y + info.velocity.y * 0.18;
        const next = SNAPS.reduce((best, snap) =>
          Math.abs(offsetFor(snap) - current) < Math.abs(offsetFor(best) - current) ? snap : best,
        );
        setSheet(next);
      }}
      className="fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[26px] border-t border-line-strong bg-glass shadow-panel backdrop-blur-xl"
      style={{ height: heights.full }}
      aria-label="Nearby help"
    >
      <div
        ref={headerRef}
        onPointerDown={(e) => controls.start(e)}
        className="shrink-0 touch-none border-b border-line"
      >
        <button
          type="button"
          aria-label={sheet === 'full' ? 'Collapse panel' : 'Expand panel'}
          onClick={() => setSheet(sheet === 'full' ? 'half' : 'full')}
          className="mx-auto mt-2.5 mb-0.5 block h-1.5 w-11 rounded-full bg-line-strong"
        />
        <PanelHeader compact />
        <PanelTabs />
      </div>
      <div
        className={cn('min-h-0 overflow-y-auto overscroll-contain safe-bottom')}
        style={{ height: Math.max(0, heights[sheet] - headerHeight) }}
      >
        <PanelBody />
      </div>
    </motion.section>
  );
}

export function PanelSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('px-4 py-4 sm:px-5', className)}>{children}</section>;
}
