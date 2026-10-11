// Check-in history. Stays on this device only: no account, no network.
// On iOS, a home-screen web app keeps its own storage (separate from Safari),
// which is deleted if the app icon is removed.

import type { Mood } from './content/types';

/** v1 records used comfortable/uncomfortable; they map onto good/notgood. */
export type StoredMood = Mood | 'comfortable' | 'uncomfortable';

export interface CheckIn {
  id: string;
  /** ISO timestamp */
  at: string;
  mood: StoredMood;
  /** Choice ids in order, for future analysis/customization. */
  choiceIds: string[];
  /** Choice labels in order, for display. */
  labels: string[];
  sentences: string[];
  size: string | null;
  coping: string | null;
  /** The child opened the "I need help" card during this check-in. */
  askedHelp?: boolean;
  /** v2: where the feeling sits on the sphere. */
  feeling?: { half: string | null; family: string | null; word: string | null; size: number | null };
  /** v2: cause ids, in the order the child picked them (not a ranking). */
  causes?: string[];
  /** v2: a safety cause was picked ("someone hurt or scared me"). */
  safety?: boolean;
}

/** Normalize legacy moods so history and charts use one set. */
export function moodOf(c: CheckIn): Mood {
  if (c.mood === 'comfortable') return 'good';
  if (c.mood === 'uncomfortable') return 'notgood';
  return c.mood;
}

// Named from the app's old name (E-Compass). Don't rename: devices already
// using the app would lose their history.
const KEY = 'ecompass.checkins.v1';

function safeRead(): CheckIn[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CheckIn[]) : [];
  } catch {
    return [];
  }
}

function safeWrite(list: CheckIn[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function loadCheckIns(): CheckIn[] {
  return safeRead().sort((a, b) => b.at.localeCompare(a.at));
}

export function saveCheckIn(c: Omit<CheckIn, 'id' | 'at'>): CheckIn | null {
  const entry: CheckIn = {
    ...c,
    id: (crypto.randomUUID?.() ?? String(Date.now())) as string,
    at: new Date().toISOString()
  };
  const ok = safeWrite([entry, ...safeRead()]);
  return ok ? entry : null;
}

/** Merge changes into a saved check-in. Returns false if it no longer exists. */
export function updateCheckIn(id: string, patch: Partial<Omit<CheckIn, 'id' | 'at'>>): boolean {
  const list = safeRead();
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return false;
  list[i] = { ...list[i], ...patch };
  return safeWrite(list);
}

export function clearCheckIns(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/** Ask the browser to keep our data even under storage pressure. */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* best effort */
  }
}
