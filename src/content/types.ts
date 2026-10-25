// Shape of the vocabulary file (v2: the emotion sphere).
// Plain JSON so the same content can drive a native rebuild or a caregiver
// customization screen later. See the design spec: "E-Compass Design Spec:
// Emotion Sphere & Calm Flow".

export type HalfId = 'good' | 'notgood';
export type Mood = HalfId | 'calm' | 'unsure';
export type IconName = 'good' | 'calm' | 'notgood' | 'hand';

/** A word on a family's size ladder. Picking it picks the size too. */
export interface LadderWord {
  id: string;
  label: string;
  /** 1 = small, 2 = medium, 3 = big (distance from calm on the sphere). */
  size: 1 | 2 | 3;
  /** Feeling part of the sentence, without the full stop: "I feel worried". */
  phrase: string;
}

/** A kind of a feeling (lonely is a kind of sad), not a size. */
export interface FlavorWord {
  id: string;
  label: string;
  /** Adjective used in the sentence: "lonely" → "I feel very lonely". */
  adjective: string;
}

export interface Family {
  id: string;
  label: string;
  /** Adjective for "I feel …" when the child stops at the family. */
  adjective: string;
  /** Position around the wheel, degrees clockwise from the top. */
  angle: number;
  /** Palette hue name: var(--c-<hue>-…) in src/palette.css. */
  hue: string;
  ladder: [LadderWord, LadderWord, LadderWord];
  flavors: FlavorWord[];
}

export interface Half {
  id: HalfId;
  label: string;
  icon: IconName;
  /** Sentence when the child stops at the half: "I feel good". */
  phrase: string;
  families: Family[];
}

export interface Cause {
  id: string;
  label: string;
  /** Phrase after "because": "my head hurts". */
  phrase: string;
  /** Opens the "I need a grown-up" card and marks the check-in. */
  safety?: boolean;
}

export interface CauseKind {
  id: string;
  label: string;
  /** Title of the list screen. */
  title: string;
  causes: Cause[];
}

export interface CopingItem {
  id: string;
  label: string;
  steps: string[];
  /** 'help' opens the "I need help" card instead of steps. */
  action?: 'help';
  /** Shows the breathing guide (the dot drifting home to calm). */
  breathing?: boolean;
}

export interface CopingSet {
  /** Button label on the feeling card, e.g. "Help me feel better". */
  cardLabel: string;
  items: string[];
}

export interface Vocabulary {
  version: 2;
  start: {
    title: string;
    calm: { label: string; icon: IconName; phrase: string };
    unsure: { label: string; phrase: string };
  };
  halves: Record<HalfId, Half>;
  size: {
    title: string;
    options: { size: 1 | 2 | 3; label: string; modifier: string }[];
    skip: string;
  };
  causeKinds: CauseKind[];
  coping: {
    items: Record<string, CopingItem>;
    /**
     * Keys are family ids, "<family>:<size>" for a specific size,
     * or cause ids. The most specific feeling match wins, then causes.
     */
    match: Record<string, CopingSet>;
    default: CopingSet;
  };
  /** Content for the Explore pages. Optional: pages show what exists. */
  explore?: Explore;
}

/** Explore content. Body signals, never faces: see the README. */
export interface Explore {
  /** True while the wording is waiting for OT/SLP review. */
  draft: boolean;
  /** "You might notice…" lines, keyed by family id or "calm". */
  signals: Record<string, string[]>;
}
