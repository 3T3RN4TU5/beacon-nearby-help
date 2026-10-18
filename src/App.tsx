import { useEffect, useState } from 'react';
import { CATEGORIES, PRIMARY_CATEGORIES } from '@/config/categories';
import { AboutDialog } from '@/components/AboutDialog';
import { Landing } from '@/components/Landing';
import { Panel } from '@/components/panel/Panel';
import { TopBar } from '@/components/TopBar';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { useResolvedTheme } from '@/hooks/useEnvironment';
import { useLocate, useTracking } from '@/hooks/useLocate';
import { useScene } from '@/hooks/useScene';
import { formatDuration } from '@/lib/format';
import { MapControls } from '@/map/MapControls';
import { MapScene } from '@/map/MapScene';
import { MapView } from '@/map/MapView';
import { useApp, type Panel as PanelId } from '@/store/app';

const PANELS: PanelId[] = ['nearby', 'weather', 'sos'];

/** Home-screen shortcuts open with ?panel=sos|weather: jump straight there and locate. */
function useLaunchShortcut() {
  const locate = useLocate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const panel = params.get('panel') as PanelId | null;
    if (!panel || !PANELS.includes(panel)) return;
    const { lastOrigin, setOrigin, setPanel } = useApp.getState();
    if (lastOrigin) setOrigin({ ...lastOrigin, at: Date.now() });
    setPanel(panel);
    void locate();
    window.history.replaceState(null, '', window.location.pathname);
  }, [locate]);
}

/** Screen-reader summary once results arrive (the visual UI shows the same data). */
function ResultsAnnouncer() {
  const { nearby } = useScene();
  const results = nearby.results;
  const text = results
    ? PRIMARY_CATEGORIES.map((id) => {
        const p = results[id].nearest;
        return p
          ? `${CATEGORIES[id].label}: ${p.name}, ${formatDuration(p.travel.duration)}`
          : `No ${CATEGORIES[id].label.toLowerCase()} found`;
      }).join('. ')
    : '';
  return (
    <p className="sr-only" aria-live="polite">
      {text}
    </p>
  );
}

export function App() {
  useResolvedTheme();
  useTracking();
  useLaunchShortcut();
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-canvas">
      <MapView>
        <MapScene />
        <MapControls />
      </MapView>
      <Landing />
      <TopBar onAbout={() => setAboutOpen(true)} />
      <Panel />
      <ResultsAnnouncer />
      <UpdatePrompt />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
