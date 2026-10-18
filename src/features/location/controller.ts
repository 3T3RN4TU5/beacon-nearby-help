import { useApp } from '@/store/app';
import { GeoError, acquirePosition } from './geolocate';

let cancelActive: (() => void) | null = null;

/**
 * "Locate me": show results for the first fix straight away, then let GPS refine the position in
 * place. A large correction re-runs the search (see refineFix); small ones just move the dot.
 */
export function locateMe(): void {
  cancelActive?.();
  cancelActive = null;
  const app = useApp.getState();
  app.startLocating();
  let first = true;

  try {
    cancelActive = acquirePosition({
      onFix: ({ lat, lon, accuracy, heading }) => {
        const s = useApp.getState();
        if (first) {
          first = false;
          if (s.phase === 'landing') return cancelLocate(); // user cancelled while waiting
          s.setOrigin({ lat, lon, accuracy, heading, source: 'gps', at: Date.now() });
          s.setLocateStatus('refining');
        } else {
          s.refineFix({ lat, lon, accuracy, heading });
        }
      },
      onDone: () => {
        cancelActive = null;
        useApp.getState().setLocateStatus('idle');
      },
      onError: (error) => {
        cancelActive = null;
        useApp.getState().failLocating(error.kind);
      },
    });
  } catch (error) {
    app.failLocating(error instanceof GeoError ? error.kind : 'unavailable');
  }
}

export function cancelLocate(): void {
  cancelActive?.();
  cancelActive = null;
  useApp.getState().cancelLocating();
}
