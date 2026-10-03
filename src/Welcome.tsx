import { useState } from 'preact/hooks';
import { Screen } from './components/Chrome';
import { isInstalled } from './prefs';

interface Props {
  viewKey: string;
  onHelp: () => void;
  /** Called with true when "Don't show this again" was checked. */
  onStart: (dontShowAgain: boolean) => void;
}

/**
 * First-launch greeting. Written for the grown-up setting things up, in
 * short sentences a child can follow if it's read aloud. One tap to start;
 * no timers, no motion.
 */
export function Welcome({ viewKey, onHelp, onStart }: Props) {
  const [dontShow, setDontShow] = useState(false);
  const installed = isInstalled();

  return (
    <Screen viewKey={viewKey} title="Welcome to E‑Compass" onHelp={onHelp}>
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
        <label class="check-row">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow((e.currentTarget as HTMLInputElement).checked)}
          />
          <span>Don’t show this again</span>
        </label>
        <button type="button" class="btn-primary" onClick={() => onStart(dontShow)}>
          Start
        </button>
        <p class="meta center">Grown-ups can turn this back on in the Grown-ups area.</p>
      </div>

      {!installed && (
        <section class="install-tip" aria-labelledby="install-h">
          <h2 id="install-h" class="h2">For grown-ups: add it to your Home Screen</h2>
          <ol>
            <li>
              Tap the <strong>Share</strong> button in Safari.
            </li>
            <li>
              Choose <strong>Add to Home Screen</strong>.
            </li>
            <li>Open E-Compass from the new icon. It then works offline and keeps its history.</li>
          </ol>
        </section>
      )}
    </Screen>
  );
}
