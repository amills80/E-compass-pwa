// Check-in history. Stays on this device only: no account, no network.
// On iOS, a home-screen web app keeps its own storage (separate from Safari),
// which is deleted if the app icon is removed.

import type { Mood } from './flow';

export interface CheckIn {
  id: string;
  /** ISO timestamp */
  at: string;
  mood: Mood;
  /** Choice ids in order, for future analysis/customization. */
  choiceIds: string[];
  /** Choice labels in order, for display. */
  labels: string[];
  sentences: string[];
  size: string | null;
  coping: string | null;
}

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
