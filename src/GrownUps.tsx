import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CheckIn, clearCheckIns, loadCheckIns } from './storage';

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const moodWord = { comfortable: 'Comfortable', uncomfortable: 'Uncomfortable', unsure: 'Not sure' } as const;

export function GrownUps({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<CheckIn[]>(() => loadCheckIns());
  const [confirming, setConfirming] = useState(false);
  const h1 = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = 'Check-ins · E-Compass';
    h1.current?.focus({ preventScroll: true });
  }, []);

  // Last 7 days, oldest first, counted by mood.
  const week = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today.getTime() - (6 - i) * DAY);
      return { date: d, comfortable: 0, uncomfortable: 0, unsure: 0 };
    });
    const byKey = new Map(days.map((d) => [dayKey(d.date), d]));
    for (const c of items) {
      const slot = byKey.get(dayKey(new Date(c.at)));
      if (slot) slot[c.mood] += 1;
    }
    return days;
  }, [items]);
  const max = Math.max(1, ...week.map((d) => d.comfortable + d.uncomfortable + d.unsure));

  const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
  const dayLong = new Intl.DateTimeFormat(undefined, { weekday: 'long' });

  return (
    <div class="screen grown">
      <header class="topbar">
        <button type="button" class="btn-back" onClick={onClose}>
          <span aria-hidden="true">←</span> Back
        </button>
      </header>
      <main class="content">
        <h1 ref={h1} tabIndex={-1} class="q-title">
          Check-ins
        </h1>
        <p class="meta">Saved only on this device.</p>

        <section aria-labelledby="week-h">
          <h2 id="week-h" class="h2">Last 7 days</h2>
          <ul class="week" role="list">
            {week.map((d) => {
              const total = d.comfortable + d.uncomfortable + d.unsure;
              const desc = `${dayLong.format(d.date)}: ${total} check-in${total === 1 ? '' : 's'}${
                total ? ` (${d.comfortable} comfortable, ${d.uncomfortable} uncomfortable, ${d.unsure} not sure)` : ''
              }`;
              return (
                <li key={d.date.toISOString()} class="week-day" aria-label={desc}>
                  <div class="week-bar" aria-hidden="true">
                    {(['uncomfortable', 'unsure', 'comfortable'] as const).map((m) =>
                      d[m] ? <span key={m} class={`seg seg-${m}`} style={{ height: `${(d[m] / max) * 100}%` }} /> : null
                    )}
                  </div>
                  <span class="week-label" aria-hidden="true">
                    {dayFmt.format(d.date)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p class="legend" aria-hidden="true">
            <span class="key key-comfortable" /> Comfortable <span class="key key-uncomfortable" /> Uncomfortable{' '}
            <span class="key key-unsure" /> Not sure
          </p>
        </section>

        <section aria-labelledby="list-h">
          <h2 id="list-h" class="h2">All check-ins</h2>
          {items.length === 0 ? (
            <p class="meta">No check-ins yet.</p>
          ) : (
            <ul class="history" role="list">
              {items.map((c) => (
                <li key={c.id} class={`history-row mood-${c.mood}`}>
                  <p class="history-main">{c.sentences.join(' ')}</p>
                  <p class="meta">
                    {fmt.format(new Date(c.at))} · {moodWord[c.mood]}
                    {c.size ? ` · ${c.size}` : ''}
                    {c.coping ? ` · Tried: ${c.coping.replace(/-/g, ' ')}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {items.length > 0 && (
          <section class="danger" aria-labelledby="del-h">
            <h2 id="del-h" class="sr-only">Delete history</h2>
            {!confirming ? (
              <button type="button" class="btn-secondary" onClick={() => setConfirming(true)}>
                Delete all check-ins
              </button>
            ) : (
              <div role="alert" class="confirm">
                <p>Delete all {items.length} check-ins from this device? This can't be undone.</p>
                <div class="confirm-actions">
                  <button
                    type="button"
                    class="btn-danger"
                    onClick={() => {
                      clearCheckIns();
                      setItems([]);
                      setConfirming(false);
                    }}
                  >
                    Delete all
                  </button>
                  <button type="button" class="btn-secondary" onClick={() => setConfirming(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <p class="meta version">E-Compass v{__APP_VERSION__}</p>
      </main>
    </div>
  );
}
