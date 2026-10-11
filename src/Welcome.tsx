import { Screen } from './components/Chrome';
import { isInstalled } from './prefs';
import { InstallSteps } from './InstallSteps';

interface Props {
  viewKey: string;
  onStart: () => void;
}

/**
 * First-launch greeting, shown once. Written for the grown-up setting things
 * up, in short sentences a child can follow if it's read aloud. One tap to
 * start; no timers, no motion. Grown-ups can turn it back on.
 */
export function Welcome({ viewKey, onStart }: Props) {
  const installed = isInstalled();

  return (
    <Screen viewKey={viewKey} title="Welcome to E‑Feels">
      <p class="lede">A calm way to find and share how you feel.</p>
      <ul class="welcome-points">
        <li>Tap how you feel. Go one small step at a time.</li>
        <li>
          Tap <strong>Back</strong> to change an answer. “Not sure” is always OK.
        </li>
        <li>Show your feeling card to a grown-up, or try a calm-down idea.</li>
        <li>Check-ins stay on this device. Nothing is sent anywhere.</li>
      </ul>

      <div class="actions">
        <button type="button" class="btn-primary" onClick={onStart}>
          Start
        </button>
        <p class="meta center">This shows once. Grown-ups can turn it back on in the Grown-ups area.</p>
      </div>

      {!installed && (
        <section class="install-tip" aria-labelledby="install-h">
          <h2 id="install-h" class="h2">For grown-ups: add it to your Home Screen</h2>
          <InstallSteps />
        </section>
      )}
    </Screen>
  );
}
