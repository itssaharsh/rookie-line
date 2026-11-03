// The caller's mind. Code decides what she knows, how scared she is and what she
// says; a model only phrases answers to questions the scenario did not plan for.
import type {
  Agitator, CalmCue, CallerReply, CallEvent, CallState, Intent, LlmRequest, Scenario, TraineeMeta,
} from "./types";
import { hear } from "./intents";
import { lineFor, rng, scrubModelLine, stress, bandOf } from "./voice-text";

export const PANIC_MIN = 2;
export const PANIC_MAX = 10;
const SILENCE_MS = 8000;

/** Order in which she answers when one sentence asks several things. */
const PRIORITY: Intent[] = [
  "mismatch_address", "readback_address", "mismatch_callback", "readback_callback",
  "ask_address", "ask_callback", "ask_what_happened", "ask_breathing", "ask_conscious",
  "instruct_cpr", "instruct_position", "ask_with_him", "ask_door", "ask_age",
  "ask_caller_name", "ask_patient_name",
];

export function startCall(s: Scenario, seed = Date.now()): CallState {
  return {
    scenarioId: s.id,
    panic: s.startPanic,
    panicTrace: [{ t: 0, panic: s.startPanic }],
    turns: [],
    events: [{ kind: "answered", t: 0 }],
    given: { address: false, callback: false },
    verified: { address: false, callback: false },
    asked: {},
    cprStarted: false,
    helpReassured: false,
    calmUsed: [],
    seed,
    ended: false,
  };
}

/** What she says the moment the line is answered. */
export function openingLine(state: CallState, s: Scenario): { state: CallState; reply: CallerReply } {
  const r = rng(state.seed);
  const speak = lineFor(s.opening, s, state.panic, r);
  return {
    state: { ...state, turns: [...state.turns, { t: 0, who: "caller", text: speak, panic: state.panic, source: "bank" }] },
    reply: { speak, source: "bank", panic: state.panic, intents: [], calm: [], agitators: [] },
  };
}

export type TurnResult =
  | { kind: "reply"; state: CallState; reply: CallerReply }
  | { kind: "model"; state: CallState; request: LlmRequest; pending: Pending };

export interface Pending {
  calm: CalmCue[];
  agitators: Agitator[];
  t: number;
}

function clamp(n: number) {
  return Math.max(PANIC_MIN, Math.min(PANIC_MAX, n));
}

/** The panic rules. Returns the change and the events that explain it. */
export function panicChange(
  state: CallState,
  calm: CalmCue[],
  agitators: Agitator[],
  intents: Intent[],
): { delta: number; reasons: { kind: "calm" | "agitated"; detail: string; d: number }[] } {
  const reasons: { kind: "calm" | "agitated"; detail: string; d: number }[] = [];
  // each calming cue counts at most twice in a call; at most -2 a turn from cues
  const fresh = calm.filter((c) => state.calmUsed.filter((u) => u === c).length < 2);
  const cueDrop = Math.min(2, fresh.length);
  if (cueDrop > 0) reasons.push({ kind: "calm", detail: fresh.join(", "), d: -cueDrop });
  if (intents.includes("help_coming") && !state.helpReassured)
    reasons.push({ kind: "calm", detail: "help is on the way", d: -1 });
  if (intents.includes("readback_address") && !state.verified.address)
    reasons.push({ kind: "calm", detail: "address confirmed", d: -1 });
  if (intents.includes("instruct_cpr") && !state.cprStarted)
    reasons.push({ kind: "calm", detail: "something to do with her hands", d: -1 });
  for (const a of agitators) {
    const detail =
      a === "calm_down" ? "told to calm down" : a === "talked_over" ? "talked over" : a === "silence" ? "silence on the line" : "asked again for what she said";
    reasons.push({ kind: "agitated", detail, d: +1 });
  }
  return { delta: reasons.reduce((sum, r) => sum + r.d, 0), reasons };
}

export function traineeTurn(state: CallState, s: Scenario, text: string, meta: TraineeMeta): TurnResult {
  const heard = hear(text, s);
  const agitators: Agitator[] = [...heard.agitators];
  if (meta.talkedOver) agitators.push("talked_over");
  if ((meta.silenceMs ?? 0) > SILENCE_MS) agitators.push("silence");
  // asking for something she already gave, after it was confirmed
  const repeatAsk =
    (heard.intents.includes("ask_address") && state.verified.address) ||
    (heard.intents.includes("ask_callback") && state.verified.callback);
  if (repeatAsk) agitators.push("repeat");

  let next: CallState = {
    ...state,
    turns: [...state.turns, { t: meta.t, who: "trainee", text }],
    asked: { ...state.asked },
  };
  for (const i of heard.intents) next.asked[i] = (next.asked[i] ?? 0) + 1;

  if (heard.unplanned && !state.cprStarted) {
    return {
      kind: "model",
      state: next,
      pending: { calm: heard.calm, agitators, t: meta.t },
      request: {
        scenarioId: s.id,
        panic: state.panic,
        question: text,
        history: next.turns.slice(-6).map((x) => ({ who: x.who, text: x.text })),
      },
    };
  }
  const applied = applyPanic(next, heard.calm, agitators, heard.intents, meta.t);
  next = applied.state;
  const r = rng(next.seed + next.turns.length * 7919);
  const parts: string[] = [];
  const events: CallEvent[] = [];

  if (meta.talkedOver && next.panic >= 8 && r() < 0.5) parts.push(lineFor(s.bank.talked_over, s, next.panic, r));
  if (heard.intents.includes("help_coming") && s.bank.help_coming) parts.push(lineFor(s.bank.help_coming, s, next.panic, r));

  const answers = PRIORITY.filter((i) => heard.intents.includes(i)).slice(0, 2);
  for (const i of answers) {
    const bank = s.bank[i];
    if (!bank) continue;
    if (i === "ask_address" && next.given.address && (next.asked.ask_address ?? 0) > 1)
      parts.push(lineFor(s.bank.repeat, s, next.panic, r));
    parts.push(lineFor(bank, s, next.panic, r));
  }
  if (!parts.length) {
    parts.push(lineFor(next.cprStarted ? s.bank.cpr_running : s.bank.filler, s, next.panic, r));
  }

  // what this turn established
  const t = meta.t;
  const once = (kind: CallEvent["kind"], cond: boolean, detail?: string) => {
    if (cond && !next.events.some((e) => e.kind === kind)) events.push({ kind, t, detail });
  };
  once("address_given", answers.includes("ask_address") || answers.includes("mismatch_address"));
  once("callback_given", answers.includes("ask_callback") || answers.includes("mismatch_callback"));
  once("address_verified", heard.intents.includes("readback_address"), s.facts.address.written);
  once("callback_verified", heard.intents.includes("readback_callback"), s.facts.callback.written);
  once("what_happened", heard.intents.includes("ask_what_happened"));
  once("asked_breathing", heard.intents.includes("ask_breathing"));
  once("asked_conscious", heard.intents.includes("ask_conscious"));
  once("cpr_instructed", heard.intents.includes("instruct_cpr"));
  once("help_reassured", heard.intents.includes("help_coming"));
  if (heard.intents.includes("mismatch_address")) events.push({ kind: "address_mismatch", t, detail: text });
  if (heard.intents.includes("mismatch_callback")) events.push({ kind: "callback_mismatch", t, detail: text });
  if (meta.talkedOver) events.push({ kind: "talked_over", t });

  const speak = parts.filter(Boolean).join(" ");
  next = {
    ...next,
    events: [...next.events, ...events],
    given: {
      address: next.given.address || events.some((e) => e.kind === "address_given"),
      callback: next.given.callback || events.some((e) => e.kind === "callback_given"),
    },
    verified: {
      address: next.verified.address || heard.intents.includes("readback_address"),
      callback: next.verified.callback || heard.intents.includes("readback_callback"),
    },
    cprStarted: next.cprStarted || heard.intents.includes("instruct_cpr"),
    helpReassured: next.helpReassured || heard.intents.includes("help_coming"),
    turns: [...next.turns, { t, who: "caller", text: speak, panic: next.panic, source: "bank" }],
  };
  return {
    kind: "reply",
    state: next,
    reply: { speak, source: "bank", panic: next.panic, intents: heard.intents, calm: heard.calm, agitators },
  };
}

function applyPanic(state: CallState, calm: CalmCue[], agitators: Agitator[], intents: Intent[], t: number) {
  const { delta, reasons } = panicChange(state, calm, agitators, intents);
  const panic = clamp(state.panic + delta);
  const events: CallEvent[] = reasons.map((r) => ({ kind: r.kind, t, detail: r.detail, panicDelta: r.d }));
  return {
    state: {
      ...state,
      panic,
      calmUsed: [...state.calmUsed, ...calm],
      panicTrace: panic === state.panic && state.panicTrace.length ? state.panicTrace : [...state.panicTrace, { t, panic }],
      events: [...state.events, ...events],
    },
  };
}

/** Finish a turn the model answered. null = the model failed or timed out. */
export function modelTurn(state: CallState, s: Scenario, pending: Pending, modelText: string | null): { state: CallState; reply: CallerReply } {
  const applied = applyPanic(state, pending.calm, pending.agitators, [], pending.t);
  let next = applied.state;
  const r = rng(next.seed + next.turns.length * 104729);
  const cleaned = modelText ? scrubModelLine(modelText) : "";
  const usable = cleaned.split(/\s+/).filter(Boolean).length >= 2 && cleaned.length <= 220;
  const speak = usable ? stress(cleaned, next.panic, r) : lineFor(s.bank.fallback, s, next.panic, r);
  const source = usable ? "model" : "fallback";
  next = {
    ...next,
    events: [...next.events, { kind: "llm_turn", t: pending.t, detail: source }],
    turns: [...next.turns, { t: pending.t, who: "caller", text: speak, panic: next.panic, source }],
  };
  return { state: next, reply: { speak, source, panic: next.panic, intents: [], calm: pending.calm, agitators: pending.agitators } };
}

/** The trainee cut her off: remember which word she got to, for the captions and the record. */
export function markCut(state: CallState, wordIndex: number): CallState {
  const turns = [...state.turns];
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].who === "caller") {
      turns[i] = { ...turns[i], cutAt: wordIndex };
      break;
    }
  }
  return { ...state, turns };
}

export function endCall(state: CallState, t: number): CallState {
  if (state.ended) return state;
  return { ...state, ended: true, events: [...state.events, { kind: "ended", t }] };
}

export { bandOf };
