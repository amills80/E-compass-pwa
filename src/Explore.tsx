import { useEffect, useRef, useState } from 'preact/hooks';
import type { Family, HalfId } from './content/types';
import { Frame, WordPick, copingFor, exploreFrame, familyOf, halfOf, spherePoint, stackForFeeling, vocab, wordOf } from './flow';
import { Screen } from './components/Chrome';
import { Sphere } from './components/Sphere';
import { choiceVars, hueOf } from './feel';

/**
 * Explore feelings: a quiet side door off the home screen and the "I'm not
 * sure" menu. Same path as the check-in (half → family → word) so browsing
 * is practice for checking in. Nothing here is saved to history.
 */

type ExploreView =
  | { kind: 'list' }
  | { kind: 'family'; half: HalfId; family: string }
  | { kind: 'feeling'; half: HalfId; family: string; word: WordPick }
  | { kind: 'calm' };

interface Props {
  /** Back from the first Explore page: return to where the child came from. */
  onClose: () => void;
  onHelp: () => void;
  /** "I feel this now": start a check-in with this feeling already chosen. */
  onCheckIn: (stack: Frame[]) => void;
}

const SIZE_WORD = { 1: 'small', 2: 'medium', 3: 'big' } as const;
const DISTANCE = { 1: 'Close to calm.', 2: 'Partway out from calm.', 3: 'Far from calm.' } as const;

export function Explore({ onClose, onHelp, onCheckIn }: Props) {
  const [stack, setStack] = useState<ExploreView[]>([{ kind: 'list' }]);
  const prevLen = useRef(1);
  const dir: 'fwd' | 'back' = stack.length >= prevLen.current ? 'fwd' : 'back';
  useEffect(() => {
    prevLen.current = stack.length;
  }, [stack.length]);

  const v = stack[stack.length - 1];
  const push = (next: ExploreView) => setStack((s) => [...s, next]);
  const back = () => (stack.length > 1 ? setStack((s) => s.slice(0, -1)) : onClose());

  const frame =
    v.kind === 'list'
      ? exploreFrame(null)
      : v.kind === 'calm'
        ? exploreFrame('calm')
        : exploreFrame(v.half, v.family, v.kind === 'feeling' ? v.word : null);

  const common = {
    onBack: back,
    onHelp,
    viewKey: `explore:${stack.length}:${JSON.stringify(v)}`,
    dir,
    hue: hueOf(frame),
    visual: <Sphere point={spherePoint(frame)} description={describe(frame)} />
  };

  const familyChoice = (half: HalfId, f: Family) => (
    <Choice key={f.id} label={f.label} swatch={f.hue} onClick={() => push({ kind: 'family', half, family: f.id })} />
  );

  switch (v.kind) {
    case 'list':
      return (
        <Screen {...common} title="Explore feelings">
          <p class="lede">Tap a feeling to see what it can be like.</p>
          <h2 class="h2 sub">Good feelings</h2>
          <ul class="choices" role="list">
            {vocab.halves.good.families.map((f) => familyChoice('good', f))}
          </ul>
          <h2 class="h2 sub">In the middle</h2>
          <ul class="choices" role="list">
            <Choice label={vocab.start.calm.label} onClick={() => push({ kind: 'calm' })} />
          </ul>
          <h2 class="h2 sub">Not good feelings</h2>
          <ul class="choices" role="list">
            {vocab.halves.notgood.families.map((f) => familyChoice('notgood', f))}
          </ul>
        </Screen>
      );

    case 'family': {
      const fam = familyOf(frame)!;
      const word = (w: WordPick) => push({ kind: 'feeling', half: v.half, family: v.family, word: w });
      return (
        <Screen {...common} title={`${fam.label} feelings`}>
          <h2 class="h2 sub">From a little to a lot</h2>
          <ul class="choices" role="list">
            {fam.ladder.map((w) => (
              <Choice key={w.id} label={w.label} size={w.size} hue={fam.hue} onClick={() => word({ kind: 'ladder', id: w.id })} />
            ))}
          </ul>
          {fam.flavors.length > 0 && (
            <>
              <h2 class="h2 sub">Other kinds</h2>
              <ul class="choices" role="list">
                {fam.flavors.map((w) => (
                  <Choice key={w.id} label={w.label} hue={fam.hue} onClick={() => word({ kind: 'flavor', id: w.id })} />
                ))}
              </ul>
            </>
          )}
        </Screen>
      );
    }

    case 'calm':
      return (
        <FeelingPage
          common={common}
          title={vocab.start.calm.label}
          place="The center of all feelings. Every feeling can float home here."
          signals={vocab.explore?.signals.calm}
          helps={[]}
          onCheckIn={() => onCheckIn(stackForFeeling('calm'))}
        />
      );

    case 'feeling': {
      const fam = familyOf(frame)!;
      const { ladder, flavor } = wordOf(frame);
      const place = ladder
        ? `A ${SIZE_WORD[ladder.size]} ${fam.adjective} feeling. ${DISTANCE[ladder.size]}`
        : `A kind of ${fam.adjective}. It can be a little or a lot.`;
      const helps = (copingFor(frame)?.items ?? []).map((id) => vocab.coping.items[id].label);
      return (
        <FeelingPage
          common={common}
          title={(ladder ?? flavor)!.label}
          place={place}
          signals={vocab.explore?.signals[fam.id]}
          helps={helps}
          onCheckIn={() => onCheckIn(stackForFeeling(v.half, v.family, v.word))}
        />
      );
    }
  }
}

type ScreenCommon = {
  hue: string | null;
  onBack: () => void;
  onHelp: () => void;
  viewKey: string;
  dir: 'fwd' | 'back';
  visual: preact.ComponentChildren;
};

function FeelingPage(props: {
  common: ScreenCommon;
  title: string;
  place: string;
  signals?: string[];
  helps: string[];
  onCheckIn: () => void;
}) {
  const { common, title, place, signals, helps, onCheckIn } = props;
  return (
    <Screen {...common} title={title}>
      <p class="lede">{place}</p>
      {signals && signals.length > 0 && (
        <section aria-labelledby="signals-h">
          <h2 id="signals-h" class="h2">You might notice</h2>
          <ul class="explore-list" role="list">
            {signals.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      {helps.length > 0 && (
        <section aria-labelledby="helps-h">
          <h2 id="helps-h" class="h2">What can help</h2>
          <ul class="explore-list" role="list">
            {helps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      <div class="actions">
        <button type="button" class="btn-primary" onClick={onCheckIn}>
          I feel this now
        </button>
      </div>
    </Screen>
  );
}

function Choice(props: { label: string; onClick: () => void; swatch?: string; size?: number; hue?: string }) {
  const { label, onClick, swatch, size, hue } = props;
  const colors = swatch ? choiceVars(swatch) : hue ? choiceVars(hue, { size }) : undefined;
  return (
    <li>
      <button
        type="button"
        class={`choice text-only${colors ? ' is-colored' : ''}`}
        style={colors}
        onClick={onClick}
      >
        {swatch && <span class="swatch" aria-hidden="true" style={{ background: `var(--c-${swatch}-fill3)` }} />}
        {size && <span class={`dot dot-${size}`} aria-hidden="true" />}
        <span class="choice-label">{label}</span>
        <span class="chev" aria-hidden="true">›</span>
      </button>
    </li>
  );
}

/** Where a feeling sits on the sphere, for screen readers. */
function describe(f: Frame): string {
  if (f.mood === 'calm') return 'Calm sits at the center of the sphere.';
  const half = halfOf(f);
  const fam = familyOf(f);
  if (!half || !fam) return 'The feelings sphere. Calm is at the center.';
  const where = `the ${half.label.toLowerCase()} half, ${fam.label.toLowerCase()} family`;
  if (!f.size) return `This feeling sits in ${where}.`;
  return `This feeling sits in ${where}, ${DISTANCE[f.size].toLowerCase().replace('.', '')}.`;
}
