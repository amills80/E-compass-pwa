// Check-in flow (v2, the emotion sphere): Good · Calm · Not good → family →
// word (size ladder or flavor) → optional causes with "Anything else?" → card.
// Frames are immutable: going forward pushes a new frame, Back pops one, so
// Back is always an exact undo (including the last cause added).

import vocabJson from './content/vocabulary.json';
import type { Cause, CauseKind, CopingSet, Family, FlavorWord, Half, HalfId, LadderWord, Mood, Vocabulary } from './content/types';

export const vocab = vocabJson as unknown as Vocabulary;
export type { Mood };

export type View =
  | { kind: 'start' }
  | { kind: 'family' }
  | { kind: 'word' }
  | { kind: 'size' }
  | { kind: 'causeKind' }
  | { kind: 'causeList'; causeKind: string; page: number }
  | { kind: 'more' }
  | { kind: 'safety' }
  | { kind: 'card' }
  | { kind: 'show' }
  | { kind: 'cope-list' }
  | { kind: 'cope'; itemId: string }
  | { kind: 'notsure' }
  | { kind: 'help' };

export type WordPick = { kind: 'ladder'; id: string } | { kind: 'flavor'; id: string };

export interface Frame {
  view: View;
  mood: Mood | null;
  family: string | null;
  word: WordPick | null;
  size: 1 | 2 | 3 | null;
  causes: string[];
  coping: string | null;
  safety: boolean;
}

export const PAGE_SIZE = 4;

export const initialFrame = (): Frame => ({
  view: { kind: 'start' },
  mood: null,
  family: null,
  word: null,
  size: null,
  causes: [],
  coping: null,
  safety: false
});

export const go = (frame: Frame, view: View, patch: Partial<Frame> = {}): Frame => ({ ...frame, ...patch, view });

// ---------- Lookups ----------

export const halfOf = (f: Frame): Half | null =>
  f.mood === 'good' || f.mood === 'notgood' ? vocab.halves[f.mood] : null;

export const familyOf = (f: Frame): Family | null => halfOf(f)?.families.find((x) => x.id === f.family) ?? null;

export function wordOf(f: Frame): { ladder?: LadderWord; flavor?: FlavorWord } {
  const fam = familyOf(f);
  if (!fam || !f.word) return {};
  if (f.word.kind === 'ladder') return { ladder: fam.ladder.find((w) => w.id === f.word!.id) };
  return { flavor: fam.flavors.find((w) => w.id === f.word!.id) };
}

const allCauses: Map<string, { cause: Cause; kind: CauseKind }> = new Map(
  vocab.causeKinds.flatMap((kind) => kind.causes.map((cause) => [cause.id, { cause, kind }] as const))
);

export const causeById = (id: string) => allCauses.get(id)?.cause;

export function causeKindById(id: string): CauseKind {
  const k = vocab.causeKinds.find((x) => x.id === id);
  if (!k) throw new Error(`Unknown cause kind: ${id}`);
  return k;
}

/** Cause kinds in the order that fits the mood: good things first when things are good. */
export function causeKindsFor(f: Frame): CauseKind[] {
  const order = f.mood === 'good' || f.mood === 'calm'
    ? ['good-things', 'body', 'senses', 'hard']
    : ['body', 'senses', 'hard', 'good-things'];
  return order.map(causeKindById);
}

/** Causes of a kind the child hasn't picked yet. */
export const remainingCauses = (f: Frame, kindId: string): Cause[] =>
  causeKindById(kindId).causes.filter((c) => !f.causes.includes(c.id));

export const anyCausesLeft = (f: Frame): boolean =>
  vocab.causeKinds.some((k) => remainingCauses(f, k.id).length > 0);

// ---------- Transitions ----------

export function pickStart(f: Frame, choice: Mood): Frame {
  if (choice === 'unsure') return go(f, { kind: 'notsure' }, { mood: 'unsure' });
  if (choice === 'calm') return go(f, { kind: 'causeKind' }, { mood: 'calm' });
  return go(f, { kind: 'family' }, { mood: choice });
}

export const pickFamily = (f: Frame, familyId: string): Frame => go(f, { kind: 'word' }, { family: familyId });

export const pickLadder = (f: Frame, w: LadderWord): Frame =>
  go(f, { kind: 'causeKind' }, { word: { kind: 'ladder', id: w.id }, size: w.size });

export const pickFlavor = (f: Frame, w: FlavorWord): Frame => go(f, { kind: 'size' }, { word: { kind: 'flavor', id: w.id } });

export const pickSize = (f: Frame, size: 1 | 2 | 3 | null): Frame => go(f, { kind: 'causeKind' }, { size });

export const toCauses = (f: Frame): Frame => go(f, { kind: 'causeKind' });

export const pickCauseKind = (f: Frame, kindId: string): Frame => go(f, { kind: 'causeList', causeKind: kindId, page: 0 });

export function pickCause(f: Frame, cause: Cause): Frame {
  const next = { causes: [...f.causes, cause.id], safety: f.safety || !!cause.safety };
  return go(f, cause.safety ? { kind: 'safety' } : { kind: 'more' }, next);
}

/** "None of these" on a cause list. */
export const noneOfThese = (f: Frame): Frame => go(f, f.causes.length ? { kind: 'more' } : { kind: 'card' });

// ---------- Sentence ----------

export function feelingPhrase(f: Frame): string {
  if (f.mood === 'calm') return vocab.start.calm.phrase;
  const half = halfOf(f);
  if (!half) return vocab.start.unsure.phrase;
  const fam = familyOf(f);
  if (!fam) return half.phrase;
  const { ladder, flavor } = wordOf(f);
  if (ladder) return ladder.phrase;
  const modifier = vocab.size.options.find((o) => o.size === f.size)?.modifier ?? '';
  return `I feel ${modifier}${flavor ? flavor.adjective : fam.adjective}`;
}

export function joinCauses(phrases: string[]): string {
  if (phrases.length <= 1) return phrases[0] ?? '';
  return `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
}

export function becausePhrase(f: Frame): string {
  const phrases = f.causes.map((id) => causeById(id)?.phrase).filter(Boolean) as string[];
  return phrases.length ? `because ${joinCauses(phrases)}` : '';
}

/** The whole sentence, e.g. "I feel annoyed because my head hurts." */
export function sentence(f: Frame): string {
  const because = becausePhrase(f);
  return `${feelingPhrase(f)}${because ? ` ${because}` : ''}.`;
}

// ---------- Sphere position ----------

export interface SpherePoint {
  view: 'side' | 'top';
  half: HalfId | null;
  calm: boolean;
  /** Degrees clockwise from the top (top view). */
  angle: number;
  /** 0 = calm center … 1 = surface. */
  dist: number;
  hue: string | null;
}

const DIST = { none: 0.35, 1: 0.45, 2: 0.68, 3: 0.9 } as const;

export function spherePoint(f: Frame): SpherePoint {
  const half = halfOf(f);
  const fam = familyOf(f);
  if (!half || !fam) {
    return { view: 'side', half: half?.id ?? null, calm: f.mood === 'calm', angle: 0, dist: half ? 0.5 : 0, hue: null };
  }
  return { view: 'top', half: half.id, calm: false, angle: fam.angle, dist: f.size ? DIST[f.size] : DIST.none, hue: fam.hue };
}

/** Plain-language description of the sphere for screen readers. */
export function describePoint(f: Frame): string {
  if (f.mood === 'calm') return 'Your feeling is at the center: calm.';
  const half = halfOf(f);
  if (!half) return 'Your feeling starts at the center, calm.';
  const fam = familyOf(f);
  if (!fam) return `Your feeling is in the ${half.label.toLowerCase()} half.`;
  const far = f.size === 3 ? 'far from calm' : f.size === 1 ? 'close to calm' : f.size === 2 ? 'partway out from calm' : 'near calm';
  return `Your feeling: ${half.label.toLowerCase()}, ${fam.label.toLowerCase()} family, ${far}.`;
}

// ---------- Chips, coping ----------

/**
 * The "path so far": each answer's label plus the stack index of the
 * question it was given on, so tapping it jumps straight back there
 * (answers after it are cleared). The stack is a linear history, so that
 * question is the frame just before the first one holding the answer.
 */
export function crumbs(stack: Frame[]): { label: string; index: number }[] {
  const f = stack[stack.length - 1];
  const at = (test: (x: Frame) => boolean) => stack.findIndex(test) - 1;
  const out: { label: string; index: number }[] = [];
  if (f.mood === 'calm') out.push({ label: vocab.start.calm.label, index: at((x) => x.mood === 'calm') });
  const half = halfOf(f);
  if (half) out.push({ label: half.label, index: at((x) => x.mood === half.id) });
  const fam = familyOf(f);
  if (fam) out.push({ label: fam.label, index: at((x) => x.family === fam.id) });
  const { ladder, flavor } = wordOf(f);
  if (ladder || flavor) out.push({ label: (ladder ?? flavor)!.label, index: at((x) => x.word !== null) });
  if (flavor) {
    const s = vocab.size.options.find((o) => o.size === f.size);
    if (s) out.push({ label: s.label, index: at((x) => x.size !== null) });
  }
  f.causes.forEach((id, k) => {
    const c = causeById(id);
    if (c) out.push({ label: c.label, index: at((x) => x.causes.length > k) });
  });
  return out.filter((c) => c.index >= 0);
}

export function copingFor(f: Frame): CopingSet | null {
  const m = vocab.coping.match;
  const feeling = f.family ? m[`${f.family}:${f.size}`] ?? m[f.family] : undefined;
  const fromCauses = f.causes.map((id) => m[id]).filter(Boolean) as CopingSet[];
  const sets = [feeling, ...fromCauses].filter(Boolean) as CopingSet[];
  if (sets.length === 0) {
    return f.mood === 'notgood' || f.mood === 'unsure' ? vocab.coping.default : null;
  }
  const items: string[] = [];
  if (f.safety) items.push('grown-up');
  for (const s of sets) for (const i of s.items) if (!items.includes(i)) items.push(i);
  return { cardLabel: sets[0].cardLabel, items: items.slice(0, 4) };
}

/** Values saved with a finished check-in. */
export function checkInRecord(f: Frame, coping: string | null) {
  const fam = familyOf(f);
  const { ladder, flavor } = wordOf(f);
  const word = ladder ?? flavor;
  return {
    mood: f.mood ?? 'unsure',
    choiceIds: [f.mood ?? 'unsure', fam?.id, word?.id, ...f.causes].filter(Boolean) as string[],
    labels: crumbsAll(f),
    sentences: [sentence(f)],
    size: vocab.size.options.find((o) => o.size === f.size)?.label ?? null,
    coping,
    feeling: { half: halfOf(f)?.id ?? null, family: fam?.id ?? null, word: word?.id ?? null, size: f.size },
    causes: f.causes,
    safety: f.safety
  };
}

function crumbsAll(f: Frame): string[] {
  const out: string[] = [];
  const half = halfOf(f);
  out.push(f.mood === 'calm' ? vocab.start.calm.label : half ? half.label : vocab.start.unsure.label);
  const fam = familyOf(f);
  if (fam) out.push(fam.label);
  const { ladder, flavor } = wordOf(f);
  if (ladder) out.push(ladder.label);
  if (flavor) out.push(flavor.label);
  for (const id of f.causes) {
    const c = causeById(id);
    if (c) out.push(c.label);
  }
  return out;
}
