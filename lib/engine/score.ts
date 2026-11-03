// The scorecard: every number is computed from the call's own events.
import type { CallState, EventKind, Scenario } from "./types";

export interface ScoreRow {
  id: string;
  ok: boolean | null; // null = information only
  label: string;
  t?: number; // ms since answer
}

export interface Scorecard {
  scenarioId: string;
  durationMs: number;
  addressConfirmedMs: number | null;
  rows: ScoreRow[];
  panicStart: number;
  panicEnd: number;
  talkedOver: number;
  mismatches: number;
  panicReasons: { t: number; detail: string; delta: number }[];
}

const first = (s: CallState, k: EventKind) => s.events.find((e) => e.kind === k)?.t;

export function fmt(ms: number): string {
  const sec = Math.round(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function score(state: CallState, s: Scenario): Scorecard {
  const end = state.events.find((e) => e.kind === "ended")?.t ?? state.turns.at(-1)?.t ?? 0;
  const addr = first(state, "address_verified");
  const cb = first(state, "callback_verified");
  const breathing = first(state, "asked_breathing");
  const cpr = first(state, "cpr_instructed");
  const what = first(state, "what_happened");
  const talkedOver = state.events.filter((e) => e.kind === "talked_over").length;
  const mismatches = state.events.filter((e) => e.kind === "address_mismatch" || e.kind === "callback_mismatch").length;
  const rows: ScoreRow[] = [
    { id: "address", ok: addr !== undefined, label: addr !== undefined ? "Address read back and confirmed" : state.given.address ? "Address heard but never read back" : "Never got the address", t: addr },
    { id: "callback", ok: cb !== undefined, label: cb !== undefined ? "Callback number read back" : state.given.callback ? "Callback number heard but never read back" : "No callback number", t: cb },
    { id: "what_happened", ok: what !== undefined, label: what !== undefined ? "Asked what happened" : "Never asked what happened", t: what },
    { id: "breathing", ok: breathing !== undefined, label: breathing !== undefined ? "Asked if he's breathing" : "Never asked if he's breathing", t: breathing },
    { id: "cpr", ok: cpr !== undefined, label: cpr !== undefined ? "Started CPR instructions" : "No CPR instructions", t: cpr },
  ];
  if (mismatches) rows.push({ id: "mismatch", ok: null, label: `Read a number back wrong ${mismatches === 1 ? "once" : `${mismatches} times`}` });
  rows.push({ id: "talked_over", ok: null, label: talkedOver ? `Talked over her ${talkedOver === 1 ? "once" : `${talkedOver} times`}` : "Never talked over her" });
  return {
    scenarioId: s.id,
    durationMs: end,
    addressConfirmedMs: addr ?? null,
    rows,
    panicStart: state.panicTrace[0]?.panic ?? s.startPanic,
    panicEnd: state.panic,
    talkedOver,
    mismatches,
    panicReasons: state.events
      .filter((e) => (e.kind === "calm" || e.kind === "agitated") && e.panicDelta)
      .map((e) => ({ t: e.t, detail: e.detail ?? "", delta: e.panicDelta ?? 0 })),
  };
}
