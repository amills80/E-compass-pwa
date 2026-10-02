import vocabJson from './content/vocabulary.json';
import type { Choice, CopingSet, Group, QuestionNode, SizeOption, Vocabulary } from './content/types';

export const vocab = vocabJson as unknown as Vocabulary;

/** Every screen the child can be on. */
export type View =
  | { kind: 'node'; nodeId: string }
  | { kind: 'size' }
  | { kind: 'card' }
  | { kind: 'show' }
  | { kind: 'cope-list' }
  | { kind: 'cope'; itemId: string }
  | { kind: 'notsure' }
  | { kind: 'help' }
  | { kind: 'saved' };

export type Mood = 'comfortable' | 'uncomfortable' | 'unsure';

export interface Picked {
  choice: Choice;
  group: Group;
}

/**
 * One entry in the navigation stack. Frames are immutable: going forward
 * pushes a new frame, Back pops one. That makes Back an exact undo,
 * including the "Both" queue and any choices made.
 */
export interface Frame {
  view: View;
  picked: Picked[];
  queue: string[];
  mood: Mood | null;
  size: SizeOption | null;
  coping: string | null;
}

export const initialFrame = (): Frame => ({
  view: { kind: 'node', nodeId: vocab.start },
  picked: [],
  queue: [],
  mood: null,
  size: null,
  coping: null
});

export function getNode(id: string): QuestionNode {
  const n = vocab.nodes[id];
  if (!n) throw new Error(`Unknown node: ${id}`);
  return n;
}

/** Turn a destination (node id or token) into the next frame. */
function resolve(dest: string, base: Frame): Frame {
  switch (dest) {
    case '@continue': {
      if (base.queue.length > 0) {
        const [nextId, ...rest] = base.queue;
        return { ...base, queue: rest, view: { kind: 'node', nodeId: nextId } };
      }
      return { ...base, view: { kind: 'size' } };
    }
    case '@size':
      return { ...base, queue: [], view: { kind: 'size' } };
    case '@card':
      return { ...base, view: { kind: 'card' } };
    case '@notsure':
      return { ...base, mood: base.mood ?? 'unsure', view: { kind: 'notsure' } };
    case '@help':
      return { ...base, view: { kind: 'help' } };
    default:
      return { ...base, view: { kind: 'node', nodeId: dest } };
  }
}

export function choose(frame: Frame, node: QuestionNode, choice: Choice): Frame {
  const picked = [...frame.picked, { choice, group: choice.group ?? node.group }];
  const mood: Mood | null =
    choice.id === 'comfortable' || choice.id === 'uncomfortable' ? choice.id : frame.mood;
  const queue = choice.then ? [...choice.then, ...frame.queue] : frame.queue;
  return resolve(choice.next ?? '@continue', { ...frame, picked, mood, queue });
}

export function skip(frame: Frame, node: QuestionNode): Frame {
  return resolve(node.skip.next, frame);
}

export function go(frame: Frame, view: View, patch: Partial<Frame> = {}): Frame {
  return { ...frame, ...patch, view };
}

/** Build the feeling-card sentences from what was picked. */
export function sentences(frame: Frame): string[] {
  const deepest = (g: Group) =>
    [...frame.picked].reverse().find((p) => p.group === g && p.choice.phrase)?.choice.phrase;
  const body = deepest('body');
  const feel = deepest('feel');
  const out = [body, feel].filter(Boolean) as string[];
  if (out.length === 0) {
    out.push(deepest('mood') ?? vocab.fallback[frame.mood ?? 'unsure']);
  }
  return out;
}

/** Which calm-down set fits best: the deepest picked choice with a match. */
export function copingFor(frame: Frame): CopingSet | null {
  for (const p of [...frame.picked].reverse()) {
    const m = vocab.coping.match[p.choice.id];
    if (m) return m;
  }
  if (frame.mood === 'comfortable') return null;
  return vocab.coping.default;
}

/** Short labels for the "path so far" chips. */
export function crumbs(frame: Frame): string[] {
  const labels = frame.picked.map((p) => p.choice.label);
  if (frame.size) labels.push(frame.size.label);
  return labels.slice(-3);
}

export function toneOf(frame: Frame): 'comfortable' | 'uncomfortable' | 'neutral' {
  return frame.mood === 'comfortable' || frame.mood === 'uncomfortable' ? frame.mood : 'neutral';
}
