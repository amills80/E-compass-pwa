// Quiet updates: a new version downloads in the background and is applied
// only when the app is idle on the start screen — never mid check-in.
import { registerSW } from 'virtual:pwa-register';

let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;
let waiting = false;
let idle = false;

export function initUpdates() {
  if (!('serviceWorker' in navigator)) return;
  applyUpdate = registerSW({
    onNeedRefresh() {
      waiting = true;
      if (idle && document.visibilityState === 'visible') void applyUpdate?.(true);
    },
    onRegisteredSW(_url, reg) {
      // Check for a new version whenever the app comes back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg?.update();
      });
    }
  });

  // iOS often resumes home-screen apps instead of relaunching them,
  // so also apply a waiting update when resumed on the start screen.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && idle && waiting) void applyUpdate?.(true);
  });
}

/** Called by the app when it lands on the start screen. */
export function onIdleAtStart() {
  idle = true;
  if (waiting) void applyUpdate?.(true);
}

/** Called when a check-in begins. */
export function onBusy() {
  idle = false;
}
