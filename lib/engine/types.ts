// Shared types for the caller engine. Everything here is plain data so the engine
// runs the same in the browser, in tests and on the server.

export type Band = "high" | "mid" | "low"; // panic 8-10, 5-7, 0-4

/** One line the caller can say, written per panic band. Placeholders: {ADDRESS} {CALLBACK} {PATIENT} {CALLER}. */
export type BandedLine = Record<Band, string[]>;

export type Intent =
  | "ask_address"
  | "ask_callback"
  | "ask_what_happened"
  | "ask_breathing"
  | "ask_conscious"
  | "ask_age"
  | "ask_caller_name"
  | "ask_patient_name"
  | "ask_with_him"
  | "ask_door"
  | "instruct_position"
  | "instruct_cpr"
  | "help_coming"
  | "readback_address"
  | "readback_callback"
  | "mismatch_address"
  | "mismatch_callback";

export type CalmCue = "name" | "with_you" | "breathe" | "listen" | "praise" | "slow_down";
export type Agitator = "calm_down" | "talked_over" | "silence" | "repeat";

export interface Scenario {
  id: string;
  line: number;
  title: string;
  brief: string;
  language: "english" | "spanish";
  voiceId: string;
  caller: { name: string; age: number; relation: string };
  patient: { name: string; age: number; relation: string };
  facts: {
    address: { digits: string; street: string; suffix: string; written: string };
    callback: { digits: string; written: string };
  };
  startPanic: number;
  /** what she says the moment the line is answered */
  opening: BandedLine;
  bank: Partial<Record<Intent, BandedLine>> & {
    filler: BandedLine; // trainee said nothing she can answer
    fallback: BandedLine; // model unavailable for an unplanned question
    repeat: BandedLine; // asked again for something she already said
    cpr_running: BandedLine; // after compressions started
    talked_over: BandedLine; // short protest when cut off (optional prefix)
  };
  checklist: { id: ChecklistId; label: string }[];
}

export type ChecklistId = "address" | "callback" | "what_happened" | "breathing" | "cpr";

export type EventKind =
  | "answered"
  | "address_given"
  | "address_verified"
  | "address_mismatch"
  | "callback_given"
  | "callback_verified"
  | "callback_mismatch"
  | "what_happened"
  | "asked_breathing"
  | "asked_conscious"
  | "cpr_instructed"
  | "help_reassured"
  | "talked_over"
  | "calm"
  | "agitated"
  | "llm_turn"
  | "ended";

export interface CallEvent {
  kind: EventKind;
  t: number; // ms since the line was answered
  detail?: string;
  panicDelta?: number;
}

export interface Turn {
  t: number;
  who: "trainee" | "caller";
  text: string; // what was said (caller: the text sent to the voice)
  panic?: number; // caller turns: panic when the line was written
  cutAt?: number; // caller turns: index of the last word heard before the trainee cut in
  source?: "bank" | "model" | "fallback";
}

export interface CallState {
  scenarioId: string;
  panic: number;
  panicTrace: { t: number; panic: number }[];
  turns: Turn[];
  events: CallEvent[];
  given: { address: boolean; callback: boolean };
  verified: { address: boolean; callback: boolean };
  asked: Partial<Record<Intent, number>>; // how many times each question was asked
  cprStarted: boolean;
  helpReassured: boolean;
  calmUsed: CalmCue[];
  seed: number;
  ended: boolean;
}

export interface TraineeMeta {
  t: number; // ms since answer
  talkedOver?: boolean; // the trainee started talking while she was speaking
  silenceMs?: number; // how long the trainee was silent before this turn
}

export interface CallerReply {
  /** text sent to the TTS (disfluency included, facts substituted) */
  speak: string;
  source: "bank" | "model" | "fallback";
  panic: number;
  intents: Intent[];
  calm: CalmCue[];
  agitators: Agitator[];
}

export interface LlmRequest {
  scenarioId: string;
  panic: number;
  question: string;
  history: { who: "trainee" | "caller"; text: string }[];
}
