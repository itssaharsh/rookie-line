// The scripted trainee for the sample call. The engine decides everything the caller says.
import { startCall, openingLine, traineeTurn, endCall } from "@/lib/engine/call";
import type { CallState } from "@/lib/engine/types";
import { cardiac } from "@/lib/scenarios/cardiac";

export interface ScriptStep {
  text: string;
  t: number;
  talkedOver?: boolean;
}

export const SAMPLE_SEED = 20261103;

export const SAMPLE_SCRIPT: ScriptStep[] = [
  { t: 0, text: "911, what's the address of your emergency?" },
  { t: 0, text: "Maria, I'm with you. Help is on the way. Is that 417 Maple Court?", talkedOver: true },
  { t: 0, text: "What's the number you're calling from?" },
  { t: 0, text: "555 0142?" },
  { t: 0, text: "Is he breathing?" },
  { t: 0, text: "Listen to me. Put him flat on his back." },
  { t: 0, text: "Put the heel of your hand in the center of his chest and push hard and fast." },
];

/** Run the engine over the script; `upTo` trainee turns, optionally ended at `endAt`. */
export function runSample(steps: ScriptStep[], upTo = steps.length, endAt?: number): CallState {
  let st = openingLine(startCall(cardiac, SAMPLE_SEED), cardiac).state;
  for (const s of steps.slice(0, upTo)) {
    const r = traineeTurn(st, cardiac, s.text, { t: s.t, talkedOver: s.talkedOver });
    if (r.kind === "reply") st = r.state;
  }
  return endAt !== undefined ? endCall(st, endAt) : st;
}
