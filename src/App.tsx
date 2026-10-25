import { useEffect, useRef, useState } from 'preact/hooks';
import {
  Frame,
  PAGE_SIZE,
  anyCausesLeft,
  becausePhrase,
  causeKindById,
  causeKindsFor,
  checkInRecord,
  copingFor,
  crumbs,
  describePoint,
  familyOf,
  feelingPhrase,
  go,
  halfOf,
  initialFrame,
  noneOfThese,
  pickCause,
  pickCauseKind,
  pickFamily,
  pickFlavor,
  pickLadder,
  pickSize,
  pickStart,
  remainingCauses,
  sentence,
  spherePoint,
  toCauses,
  vocab
} from './flow';
import type { IconName } from './content/types';
import { Screen } from './components/Chrome';
import { Icon } from './components/Icon';
import { HoldButton } from './components/HoldButton';
import { Sphere } from './components/Sphere';
import { choiceVars, hueOf } from './feel';
import { GrownUps } from './GrownUps';
import { Explore } from './Explore';
import { CheckIn, saveCheckIn, updateCheckIn } from './storage';
import { onBusy, onIdleAtStart } from './updates';
import { Welcome } from './Welcome';
import { loadPrefs, markWelcomeSeen, savePrefs, shouldShowWelcome } from './prefs';

/** A tapped choice fills softly and holds for a breath before moving on. */
const HOLD_MS = 250;

export function App() {
  const [stack, setStack] = useState<Frame[]>([initialFrame()]);
  const [grownUps, setGrownUps] = useState(false);
  // Explore feelings: a side door off home. Its pages are never saved.
  const [exploring, setExploring] = useState(false);
  // Decided once per app launch, never mid-session.
  const [welcome, setWelcome] = useState(() => shouldShowWelcome());
  const [pending, setPending] = useState<string | null>(null);
  // "Saved" note on the start screen after Finish; gone on the next tap.
  const [savedNote, setSavedNote] = useState(false);
  // The check-in being recorded. Kept outside the stack so Back never un-saves it.
  const checkInId = useRef<string | null>(null);
  // Whether that save worked, so "Saved" is only ever shown when it's true.
  const [recorded, setRecorded] = useState(false);
  const prevLen = useRef(1);
  const frame = stack[stack.length - 1];
  const dir: 'fwd' | 'back' = stack.length >= prevLen.current ? 'fwd' : 'back';
  useEffect(() => {
    prevLen.current = stack.length;
  }, [stack.length]);

  const push = (f: Frame) => {
    setSavedNote(false);
    setStack((s) => [...s, f]);
  };
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const jumpTo = (index: number) => setStack((s) => s.slice(0, index + 1));
  const help = () => push(go(frame, { kind: 'help' }));
  /** Choose: show the pick for a moment, then go. Extra taps are ignored. */
  const pick = (id: string, next: Frame) => {
    if (pending) return;
    setPending(id);
    window.setTimeout(() => {
      setPending(null);
      push(next);
    }, HOLD_MS);
  };

  const canBack = stack.length > 1;
  const viewKey = `${stack.length}:${JSON.stringify(frame.view)}`;
  const atStart = !grownUps && !exploring && stack.length === 1;
  useEffect(() => {
    if (atStart) onIdleAtStart();
    else onBusy();
  }, [atStart]);

  /**
   * Save the check-in as soon as there is something worth keeping (the card,
   * a calm-down, a call for help, or the safety card), then keep updating
   * that same entry. Back to the first question starts a new one.
   */
  const record = (f: Frame, extra: Partial<CheckIn> = {}) => {
    const helpOnly = f.view.kind === 'help' && !f.mood && f.causes.length === 0;
    const { coping, ...base } = checkInRecord(f, f.coping);
    const fields = {
      ...base,
      ...(helpOnly ? { sentences: ['I need help.'] } : {}),
      // Only ever add a coping choice; a frame from before it was made must not erase it.
      ...(coping ? { coping } : {}),
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
    if (k === 'card' || k === 'cope' || k === 'safety') record(frame);
    else if (k === 'help') record(frame, { askedHelp: true });
  }, [viewKey, grownUps]);

  const finish = () => {
    setSavedNote(recorded);
    setStack([initialFrame()]);
  };

  if (grownUps) return <GrownUps onClose={() => setGrownUps(false)} />;

  if (exploring) {
    return (
      <Explore
        onClose={() => setExploring(false)}
        onHelp={() => {
          // Help is a check-in event wherever it's asked for, so it's saved.
          setExploring(false);
          help();
        }}
        onCheckIn={(s) => {
          // "I feel this now": a fresh check-in, never an update to an earlier one.
          checkInId.current = null;
          setRecorded(false);
          setSavedNote(false);
          setExploring(false);
          setStack(s);
        }}
      />
    );
  }

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
  const sphere = <Sphere point={spherePoint(frame)} description={describePoint(frame)} />;
  const common = {
    onBack: canBack ? back : undefined,
    onHelp: help,
    crumbs: crumbs(stack).map((c) => ({ label: c.label, onSelect: () => jumpTo(c.index) })),
    viewKey,
    dir,
    hue: hueOf(frame)
  };

  const opt = (id: string, label: string, next: Frame, extra: OptionExtras = {}) => (
    <Option key={id} id={id} label={label} picked={pending === id} onPick={() => pick(id, next)} {...extra} />
  );

  /** Stop answering any time after the first question: straight to the card. */
  const finishQuestions = (
    <button type="button" class="btn-link" onClick={() => push(go(frame, { kind: 'card' }))}>
      Finish questions
    </button>
  );

  switch (v.kind) {
    case 'start':
      return (
        <Screen
          {...common}
          title={vocab.start.title}
          visual={sphere}
          notice={!canBack && savedNote ? 'Saved. Thanks for checking in.' : undefined}
        >
          <ul class="choices choices-start" role="list">
            {opt('good', vocab.halves.good.label, pickStart(frame, 'good'), { icon: 'good', tone: 'good' })}
            {opt('calm', vocab.start.calm.label, pickStart(frame, 'calm'), { icon: 'calm', tone: 'calm' })}
            {opt('notgood', vocab.halves.notgood.label, pickStart(frame, 'notgood'), { icon: 'notgood', tone: 'notgood' })}
          </ul>
          <SkipButton label={vocab.start.unsure.label} onClick={() => pick('unsure', pickStart(frame, 'unsure'))} />
          {!canBack && (
            <div class="home-more">
              <button
                type="button"
                class="btn-link"
                onClick={() => {
                  setSavedNote(false);
                  setExploring(true);
                }}
              >
                Explore feelings
              </button>
            </div>
          )}
          {!canBack && (
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

    case 'family': {
      const half = halfOf(frame)!;
      return (
        <Screen {...common} title="Which feeling?" visual={sphere}>
          <ul class="choices" role="list">
            {half.families.map((f) => opt(f.id, f.label, pickFamily(frame, f.id), { swatch: f.hue }))}
          </ul>
          <SkipButton label="Not sure" onClick={() => push(toCauses(frame))} />
          {finishQuestions}
        </Screen>
      );
    }

    case 'word': {
      const fam = familyOf(frame)!;
      return (
        <Screen {...common} title={`What kind of ${fam.adjective}?`} visual={sphere}>
          <ul class="choices" role="list" aria-label="From a little to a lot">
            {fam.ladder.map((w) => opt(w.id, w.label, pickLadder(frame, w), { size: w.size, hue: fam.hue }))}
          </ul>
          {fam.flavors.length > 0 && (
            <>
              <h2 class="h2 sub">Or a different kind</h2>
              <ul class="choices" role="list">
                {fam.flavors.map((w) => opt(w.id, w.label, pickFlavor(frame, w), { hue: fam.hue }))}
              </ul>
            </>
          )}
          <SkipButton label="Not sure" onClick={() => push(toCauses(frame))} />
          {finishQuestions}
        </Screen>
      );
    }

    case 'size':
      return (
        <Screen {...common} title={vocab.size.title} visual={sphere}>
          <ul class="choices" role="list">
            {vocab.size.options.map((o) =>
              opt(`size-${o.size}`, o.label, pickSize(frame, o.size), { size: o.size, hue: familyOf(frame)?.hue })
            )}
          </ul>
          <SkipButton label={vocab.size.skip} onClick={() => push(pickSize(frame, null))} />
          {finishQuestions}
        </Screen>
      );

    case 'causeKind': {
      const kinds = causeKindsFor(frame).filter((k) => remainingCauses(frame, k.id).length > 0);
      const first = frame.causes.length === 0;
      return (
        <Screen {...common} title={first ? 'What made it happen?' : 'What else?'} visual={sphere}>
          <ul class="choices" role="list">
            {kinds.map((k) => opt(k.id, k.label, pickCauseKind(frame, k.id)))}
          </ul>
          <SkipButton
            label={first ? 'Not sure why' : "No, that's all"}
            onClick={() => push(go(frame, { kind: 'card' }))}
          />
          {finishQuestions}
        </Screen>
      );
    }

    case 'causeList': {
      const kind = causeKindById(v.causeKind);
      const left = remainingCauses(frame, kind.id);
      const shown = left.slice(v.page * PAGE_SIZE, v.page * PAGE_SIZE + PAGE_SIZE);
      const more = left.length > (v.page + 1) * PAGE_SIZE;
      return (
        <Screen {...common} title={kind.title} visual={sphere}>
          <ul class="choices" role="list">
            {shown.map((c) => opt(c.id, c.label, pickCause(frame, c)))}
          </ul>
          {more && (
            <button
              type="button"
              class="btn-more"
              onClick={() => push(go(frame, { kind: 'causeList', causeKind: kind.id, page: v.page + 1 }))}
            >
              More choices
            </button>
          )}
          <SkipButton label="None of these" onClick={() => push(noneOfThese(frame))} />
          {finishQuestions}
        </Screen>
      );
    }

    case 'more':
      return (
        <Screen {...common} title="Anything else?" visual={sphere}>
          <SentenceCard frame={frame} live />
          <div class="pair">
            {anyCausesLeft(frame) &&
              opt('add', 'Add another', go(frame, { kind: 'causeKind' }), { variant: 'pair' })}
            {opt('done', "That's all", go(frame, { kind: 'card' }), { variant: 'pair' })}
          </div>
        </Screen>
      );

    case 'safety':
      return (
        <Screen viewKey={viewKey} dir={dir} title="I need a grown-up I trust" hideTitle variant="inverse">
          <div class="show-card help-card">
            <p>I need a grown-up I trust.</p>
            <p>Please come.</p>
          </div>
          <button type="button" class="btn-close" onClick={() => push(go(frame, { kind: 'more' }))}>
            Close
          </button>
        </Screen>
      );

    case 'card': {
      const coping = copingFor(frame);
      return (
        <Screen {...common} crumbs={undefined} title="My feeling card" visual={sphere}>
          <SentenceCard frame={frame} />
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

    case 'show':
      return (
        <Screen viewKey={viewKey} dir={dir} title="Show card" hideTitle variant="inverse">
          <div class="show-card">
            <p>{sentence(frame)}</p>
          </div>
          <button type="button" class="btn-close" onClick={back}>
            Close
          </button>
        </Screen>
      );

    case 'cope-list': {
      const set = copingFor(frame) ?? vocab.coping.default;
      return (
        // Calming down moves the screen toward calm, like the dot drifting home.
        <Screen {...common} crumbs={undefined} hue="calm" title="Try one?" visual={sphere}>
          <ul class="choices" role="list">
            {set.items.map((id) => {
              const item = vocab.coping.items[id];
              const next =
                item.action === 'help'
                  ? go(frame, { kind: 'help' }, { coping: id })
                  : go(frame, { kind: 'cope', itemId: id }, { coping: id });
              return opt(`cope-${id}`, item.label, next);
            })}
          </ul>
          <SkipButton label="No thanks" onClick={back} />
        </Screen>
      );
    }

    case 'cope': {
      const item = vocab.coping.items[v.itemId];
      return (
        <Screen
          {...common}
          crumbs={undefined}
          hue="calm"
          title={item.label}
          visual={item.breathing ? undefined : sphere}
        >
          {item.breathing && <Breathing frame={frame} />}
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
        <Screen {...common} title="That's OK. What would help?" visual={sphere}>
          <ul class="choices" role="list">
            {opt('ns-body', 'Check my body', pickCauseKind(frame, 'body'))}
            {opt('ns-feel', 'Check my feelings', go(frame, { kind: 'start' }, { mood: null }))}
            {opt('ns-calm', 'Take a calm break', go(frame, { kind: 'cope-list' }))}
            <li>
              <button type="button" class="choice text-only" onClick={help}>
                <span class="choice-label">I need help</span>
                <span class="chev" aria-hidden="true">›</span>
              </button>
            </li>
            <li>
              <button type="button" class="choice text-only" onClick={() => setExploring(true)}>
                <span class="choice-label">Look at feelings</span>
                <span class="chev" aria-hidden="true">›</span>
              </button>
            </li>
            {opt('ns-save', 'Just save it', go(frame, { kind: 'card' }))}
          </ul>
        </Screen>
      );

    case 'help':
      return (
        <Screen viewKey={viewKey} dir={dir} title="I need help" hideTitle variant="inverse">
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

// ---------- Pieces ----------

interface OptionExtras {
  icon?: IconName;
  tone?: 'good' | 'calm' | 'notgood';
  /** Family color dot (always next to the word, never alone). */
  swatch?: string;
  /** Size dot 1–3 (distance from calm). */
  size?: number;
  /** Family hue: colors the button by specificity (see feel.ts). */
  hue?: string;
  variant?: 'pair';
}

function Option(props: { id: string; label: string; picked: boolean; onPick: () => void } & OptionExtras) {
  const { label, picked, onPick, icon, tone, swatch, size, hue, variant } = props;
  const colors = swatch ? choiceVars(swatch) : hue ? choiceVars(hue, { size }) : undefined;
  const cls = [
    'choice',
    icon ? 'has-icon' : 'text-only',
    tone ? `tone-${tone}` : '',
    variant === 'pair' ? 'choice-pair' : '',
    picked ? 'is-picked' : '',
    colors ? 'is-colored' : ''
  ].join(' ');
  const button = (
    <button
      type="button"
      class={cls}
      style={colors}
      aria-pressed={picked ? 'true' : undefined}
      onClick={onPick}
    >
      {icon && <Icon name={icon} size={44} />}
      {swatch && <span class="swatch" aria-hidden="true" style={{ background: `var(--c-${swatch}-fill3)` }} />}
      {size && <span class={`dot dot-${size}`} aria-hidden="true" />}
      <span class="choice-label">{label}</span>
      {!icon && variant !== 'pair' && <span class="chev" aria-hidden="true">›</span>}
    </button>
  );
  return variant === 'pair' ? button : <li>{button}</li>;
}

function SkipButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" class="skip" onClick={onClick}>
      {label}
    </button>
  );
}

/** The growing sentence: feeling first, then "because …". */
function SentenceCard({ frame, live = false }: { frame: Frame; live?: boolean }) {
  const because = becausePhrase(frame);
  return (
    <div class="feeling-card" role="group" aria-label="My feeling card" aria-live={live ? 'polite' : undefined}>
      <p class="card-feeling">
        {feelingPhrase(frame)}
        {because ? '' : '.'}
      </p>
      {because && <p class="card-because" key={because}>{because}.</p>}
    </div>
  );
}

/**
 * Breathing guide: the sphere breathes slowly and the child's dot drifts
 * home to calm. With Reduce Motion it is still by default and moves one
 * step closer each time the child taps "Next breath".
 */
function Breathing({ frame }: { frame: Frame }) {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState(0);
  return (
    <div class="breathing">
      <Sphere
        point={spherePoint(frame)}
        description={reduce && step >= 4 ? 'Your dot is home, at calm.' : 'Your dot is floating home to calm.'}
        homeward
        paused={paused}
        step={reduce ? step : undefined}
      />
      {reduce ? (
        <button type="button" class="btn-small" onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={step >= 4}>
          {step >= 4 ? 'Your dot is home' : 'Next breath'}
        </button>
      ) : (
        <button type="button" class="btn-small" aria-pressed={paused} onClick={() => setPaused(!paused)}>
          {paused ? 'Start again' : 'Stop'}
        </button>
      )}
    </div>
  );
}
