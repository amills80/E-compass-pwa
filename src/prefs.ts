// Device preferences, kept separate from check-in history so resetting one
// never touches the other. Stored on this device only.

export interface Prefs {
  /** Show the welcome screen when the app is opened. */
  showWelcome: boolean;
}

// Old app name kept on purpose, like the check-ins key in storage.ts.
const KEY = 'ecompass.prefs.v1';
/** Set once the welcome is dismissed, so it isn't shown again in the same
 *  session (e.g. after a quiet update reloads the app). */
const SESSION_KEY = 'ecompass.welcomeSeen';

export const defaultPrefs: Prefs = { showWelcome: true };

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : { ...defaultPrefs };
  } catch {
    return { ...defaultPrefs };
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: preference lasts for this session only */
  }
}

export function resetPrefs(): Prefs {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to do */
  }
  return { ...defaultPrefs };
}

export function shouldShowWelcome(): boolean {
  let seen = false;
  try {
    seen = sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    /* ignore */
  }
  return loadPrefs().showWelcome && !seen;
}

export function markWelcomeSeen(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** True when running from the home screen rather than a Safari tab. */
export function isInstalled(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || matchMedia('(display-mode: standalone)').matches;
}
