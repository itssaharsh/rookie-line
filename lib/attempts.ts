// The previous attempt per scenario, kept in this browser only, so the scorecard can
// compare. Every read and write is guarded: private windows can refuse storage.
import type { Scorecard } from "@/lib/engine/score";

const KEY = "rookie-line:attempts:v1";

export interface Attempt {
  at: string; // ISO time the call ended
  card: Scorecard;
}

function readAll(): Record<string, Attempt[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Attempt[]>;
  } catch {
    return {};
  }
}

export function previousAttempt(scenarioId: string): Attempt | null {
  const list = readAll()[scenarioId] ?? [];
  return list.at(-1) ?? null;
}

const listeners = new Set<() => void>();

/** For useSyncExternalStore: re-render when an attempt is saved. */
export function subscribeAttempts(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function attemptsSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function lastCardFrom(raw: string, scenarioId: string): Scorecard | null {
  try {
    const all = JSON.parse(raw || "{}") as Record<string, Attempt[]>;
    return all[scenarioId]?.at(-1)?.card ?? null;
  } catch {
    return null;
  }
}

export function saveAttempt(card: Scorecard): Attempt | null {
  const all = readAll();
  const prev = (all[card.scenarioId] ?? []).at(-1) ?? null;
  all[card.scenarioId] = [...(all[card.scenarioId] ?? []), { at: new Date().toISOString(), card }].slice(-10);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage blocked: no comparison next time */
  }
  listeners.forEach((l) => l());
  return prev;
}
