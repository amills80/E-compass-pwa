// Shape of the vocabulary file. Kept platform-neutral (plain JSON) so the same
// content can drive a native rebuild or a caregiver customization screen later.

/** Special destinations a choice can point to instead of a node id. */
export type Token = '@continue' | '@size' | '@card' | '@notsure' | '@help';

export type Group = 'mood' | 'body' | 'feel';

export type IconName = 'comfortable' | 'uncomfortable' | 'body' | 'feelings' | 'both' | 'hand';

export interface Choice {
  id: string;
  label: string;
  /** Only used on the first questions, where pictures generalize well. */
  icon?: IconName;
  /** Sentence fragment for the feeling card, e.g. "My tummy hurts." */
  phrase?: string;
  /** Overrides the node's group for sentence building. */
  group?: Group;
  /** Visual tone. Never the only cue: word (and icon) always carry meaning. */
  tone?: 'comfortable' | 'uncomfortable';
  /** Where to go next. Defaults to '@continue'. */
  next?: string;
  /** Destinations queued for later, e.g. "Both" visits body, then feelings. */
  then?: string[];
}

export interface QuestionNode {
  id: string;
  title: string;
  group: Group;
  /** 'big' = two large icon rows (first question). */
  layout?: 'big' | 'list';
  choices: Choice[];
  skip: { label: string; next: string };
}

export interface SizeOption {
  id: string;
  label: string;
  /** 1–3, drives the dot size. */
  level: 1 | 2 | 3;
}

export interface CopingItem {
  id: string;
  label: string;
  steps: string[];
  /** 'help' opens the "I need help" card instead of steps. */
  action?: 'help';
  /** Shows the breathing guide. */
  breathing?: boolean;
}

export interface CopingSet {
  /** Button label on the feeling card, e.g. "Help me feel better". */
  cardLabel: string;
  items: string[];
}

export interface Vocabulary {
  version: number;
  start: string;
  nodes: Record<string, QuestionNode>;
  size: { title: string; options: SizeOption[]; skip: string };
  /** Fallback sentences when nothing more specific was chosen. */
  fallback: Record<'comfortable' | 'uncomfortable' | 'unsure', string>;
  coping: {
    items: Record<string, CopingItem>;
    /** Choice id → coping set. The deepest matching choice wins. */
    match: Record<string, CopingSet>;
    default: CopingSet;
  };
}
