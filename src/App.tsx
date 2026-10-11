import { useEffect, useRef, useState } from 'preact/hooks';
import {
  Frame,
  choose,
  copingFor,
  crumbs,
  getNode,
  go,
  initialFrame,
  sentences,
  skip,
  toneOf,
  vocab
} from './flow';
import { Screen } from './components/Chrome';
import { Icon } from './components/Icon';
import { HoldButton } from './components/HoldButton';
import { GrownUps } from './GrownUps';
import { CheckIn, saveCheckIn, updateCheckIn } from './storage';
import { onBusy, onIdleAtStart } from './updates';
import { Welcome } from './Welcome';
import { loadPrefs, markWelcomeSeen, savePrefs, shouldShowWelcome } from './prefs';

export function App() {
  const [stack, setStack] = useState<Frame[]>([initialFrame()]);
  const [grownUps, setGrownUps] = useState(false);
  // Decided once per app launch, never mid-session.
  const [welcome, setWelcome] = useState(() => shouldShowWelcome());
  // "Saved" note on the start screen after Finish; gone on the next tap.
  const [savedNote, setSavedNote] = useState(false);
  // The check-in being recorded. Kept outside the stack so Back never un-saves it.
  const checkInId = useRef<string | null>(null);
  // Whether that save worked, so "Saved" is only ever shown when it's true.
  const [recorded, setRecorded] = useState(false);
  const frame = stack[stack.length - 1];
  const push = (f: Frame) => {
    setSavedNote(false);
    setStack((s) => [...s, f]);
  };
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const jumpTo = (index: number) => setStack((s) => s.slice(0, index + 1));
  const help = () => push(go(frame, { kind: 'help' }));
  const canBack = stack.length > 1;
  const viewKey = `${stack.length}:${JSON.stringify(frame.view)}`;

  const atStart = !grownUps && stack.length === 1;
  useEffect(() => {
    if (atStart) onIdleAtStart();
    else onBusy();
  }, [atStart]);

  /**
   * Save the check-in as soon as there is something worth keeping (the card,
   * a calm-down, or a call for help), then keep updating that same entry.
   * Back to the first question starts a new one.
   */
  const record = (f: Frame, extra: Partial<CheckIn> = {}) => {
    const helpOnly = f.view.kind === 'help' && f.picked.length === 0 && !f.mood;
    const fields = {
      mood: f.mood ?? 'unsure',
      choiceIds: f.picked.map((p) => p.choice.id),
      labels: f.picked.map((p) => p.choice.label),
      sentences: helpOnly ? ['I need help.'] : sentences(f),
      size: f.size?.label ?? null,
      // Only ever add a coping choice; a frame from before it was made must not erase it.
      ...(f.coping ? { coping: f.coping } : {}),
      ...extra
    };
    if (checkInId.current && updateCheckIn(checkInId.current, fields)) return setRecorded(true);
    checkInId.current = saveCheckIn({ coping: null, ...fields })?.id ?? null;
    setRecorded(checkInId.current !== null);
  };

  useEffect(() => {
    if (grownUps) return;
    if (stack.length === 1) {
      checkInId.current = null;
      setRecorded(false);
    }
    const k = frame.view.kind;
    if (k === 'card' || k === 'cope') record(frame);
    else if (k === 'help') record(frame, { askedHelp: true });
  }, [viewKey, grownUps]);

  const finish = () => {
    setSavedNote(recorded);
    setStack([initialFrame()]);
  };

  if (grownUps) return <GrownUps onClose={() => setGrownUps(false)} />;

  if (welcome && stack.length === 1) {
    return (
      <Welcome
        viewKey="welcome"
        onStart={() => {
          // Shown once. Grown-ups can turn it back on.
          savePrefs({ ...loadPrefs(), showWelcome: false });
          markWelcomeSeen();
          setWelcome(false);
        }}
      />
    );
  }

  const v = frame.view;
  const common = {
    onBack: canBack ? back : undefined,
    onHelp: help,
    crumbs: crumbs(stack).map((c) => ({ label: c.label, onSelect: () => jumpTo(c.index) })),
    tone: toneOf(frame),
    viewKey
  };
  const comfy = frame.mood === 'comfortable';

  switch (v.kind) {
    case 'node': {
      const node = getNode(v.nodeId);
      const isStart = node.id === vocab.start && !canBack;
      const withIcons = node.choices.some((c) => c.icon);
      return (
        <Screen
          {...common}
          title={node.title}
          notice={isStart && savedNote ? 'Saved. Thanks for checking in.' : undefined}
        >
          <ul class={`choices ${node.layout === 'big' ? 'choices-big' : ''}`} role="list">
            {node.choices.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  class={`choice ${c.tone ? `tone-${c.tone}` : ''} ${withIcons ? 'has-icon' : 'text-only'}`}
                  onClick={() => push(choose(frame, node, c))}
                >
                  {c.icon && <Icon name={c.icon} size={node.layout === 'big' ? 72 : 52} />}
                  <span class="choice-label">{c.label}</span>
                  {!c.icon && <span class="chev" aria-hidden="true">›</span>}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" class="skip" onClick={() => push(skip(frame, node))}>
            {node.skip.label}
          </button>
          {node.id !== vocab.start && (
            <button
              type="button"
              class="btn-link"
              onClick={() => push(go(frame, { kind: 'card' }, { queue: [] }))}
            >
              Finish questions
            </button>
          )}
          {isStart && (
            <div class="grownup-gate">
              <HoldButton
                label="Grown-ups"
                onComplete={() => {
                  setSavedNote(false);
                  setGrownUps(true);
                }}
              />
            </div>
          )}
        </Screen>
      );
    }

    case 'size':
      return (
        <Screen {...common} title={vocab.size.title}>
          <ul class="choices" role="list">
            {vocab.size.options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  class="choice size-choice"
                  onClick={() => push(go(frame, { kind: 'card' }, { size: o }))}
                >
                  <span class={`dot dot-${o.level}`} aria-hidden="true" />
                  <span class="choice-label">{o.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" class="skip" onClick={() => push(go(frame, { kind: 'card' }, { size: null }))}>
            {vocab.size.skip}
          </button>
        </Screen>
      );

    case 'card': {
      const lines = sentences(frame);
      const coping = copingFor(frame);
      return (
        <Screen {...common} crumbs={undefined} title="My feeling card">
          <div class="feeling-card" role="group" aria-label="My feeling card">
            {lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
            {frame.size && <p class="card-size">{frame.size.label}.</p>}
          </div>
          {recorded && <p class="saved-tag">Saved</p>}
          <div class="actions">
            <button type="button" class="btn-primary" onClick={() => push(go(frame, { kind: 'show' }))}>
              Show someone
            </button>
            {coping && (
              <button type="button" class="choice text-only" onClick={() => push(go(frame, { kind: 'cope-list' }))}>
                <span class="choice-label">{coping.cardLabel}</span>
                <span class="chev" aria-hidden="true">›</span>
              </button>
            )}
            <button type="button" class="btn-quiet" onClick={finish}>
              Finish
            </button>
          </div>
        </Screen>
      );
    }

    case 'show': {
      const lines = sentences(frame);
      return (
        <Screen viewKey={viewKey} title="Show card" hideTitle variant="inverse">
          <div class="show-card">
            {lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
            {frame.size && <p>{frame.size.label}.</p>}
          </div>
          <button type="button" class="btn-close" onClick={back}>
            Close
          </button>
        </Screen>
      );
    }

    case 'cope-list': {
      const set = copingFor(frame) ?? vocab.coping.default;
      return (
        <Screen {...common} crumbs={undefined} title="Try one?">
          <ul class="choices" role="list">
            {set.items.map((id) => {
              const item = vocab.coping.items[id];
              return (
                <li key={id}>
                  <button
                    type="button"
                    class="choice text-only"
                    onClick={() =>
                      push(
                        item.action === 'help'
                          ? go(frame, { kind: 'help' }, { coping: id })
                          : go(frame, { kind: 'cope', itemId: id }, { coping: id })
                      )
                    }
                  >
                    <span class="choice-label">{item.label}</span>
                    <span class="chev" aria-hidden="true">›</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" class="skip" onClick={back}>
            No thanks
          </button>
        </Screen>
      );
    }

    case 'cope': {
      const item = vocab.coping.items[v.itemId];
      return (
        <Screen {...common} crumbs={undefined} title={item.label}>
          {item.breathing && <Breathing />}
          <ol class="steps">
            {item.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div class="actions">
            <button type="button" class="btn-primary" onClick={finish}>
              I feel better
            </button>
            {/* The calm-down list is always the screen before this one. */}
            <button type="button" class="choice text-only" onClick={back}>
              <span class="choice-label">Try something else</span>
              <span class="chev" aria-hidden="true">›</span>
            </button>
            <button type="button" class="choice text-only" onClick={() => push(go(frame, { kind: 'show' }))}>
              <span class="choice-label">Show my card</span>
              <span class="chev" aria-hidden="true">›</span>
            </button>
          </div>
        </Screen>
      );
    }

    case 'notsure':
      return (
        <Screen {...common} title="That's OK. What would help?">
          <ul class="choices" role="list">
            <NotSureOption
              label="Check my body"
              onClick={() => push(go(frame, { kind: 'node', nodeId: comfy ? 'c-body' : 'u-body' }))}
            />
            <NotSureOption
              label="Check my feelings"
              onClick={() => push(go(frame, { kind: 'node', nodeId: comfy ? 'c-feel' : 'u-feel' }))}
            />
            <NotSureOption label="Take a calm break" onClick={() => push(go(frame, { kind: 'cope-list' }))} />
            <NotSureOption label="I need help" onClick={help} />
            <NotSureOption label="Just save it" onClick={() => push(go(frame, { kind: 'card' }))} />
          </ul>
        </Screen>
      );

    case 'help':
      return (
        <Screen viewKey={viewKey} title="I need help" hideTitle variant="inverse">
          <div class="show-card help-card">
            <p>I need help.</p>
            <p>Please come.</p>
          </div>
          <button type="button" class="btn-close" onClick={back}>
            Close
          </button>
        </Screen>
      );
  }
}

function NotSureOption({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" class="choice text-only" onClick={onClick}>
        <span class="choice-label">{label}</span>
        <span class="chev" aria-hidden="true">›</span>
      </button>
    </li>
  );
}

/** Breathing guide. Paused by default when Reduce Motion is on. */
function Breathing() {
  const reduce =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [paused, setPaused] = useState(reduce);
  return (
    <div class="breathing">
      <div class={`breath-circle ${paused ? 'paused' : ''}`} aria-hidden="true" />
      <button type="button" class="btn-small" aria-pressed={paused} onClick={() => setPaused(!paused)}>
        {paused ? 'Start the circle' : 'Stop the circle'}
      </button>
    </div>
  );
}
