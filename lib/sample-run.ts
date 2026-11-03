// A sample call for the first screen and the ?state= views: the real engine run on a
// scripted trainee, so every number on it comes from the same rules a live call uses.
// It is always labelled as a sample.
import { startCall, openingLine, traineeTurn, endCall } from "@/lib/engine/call";
import { score } from "@/lib/engine/score";
import type { CallState } from "@/lib/engine/types";
import { cardiac } from "@/lib/scenarios/cardiac";

const SCRIPT: [number, string, boolean?][] = [
  [4200, "911, what's the address of your emergency?"],
  [9800, "Maria, I'm with you. Help is on the way. Is that 417 Maple Court?", true],
  [15600, "What's the number you're calling from?"],
  [22400, "555 0142?"],
  [27100, "Is he breathing?"],
  [33900, "Listen to me. Put him flat on his back."],
  [39800, "Put the heel of your hand in the center of his chest and push hard and fast."],
];

function run(upTo = SCRIPT.length, endAt?: number): CallState {
  let st = openingLine(startCall(cardiac, 20261103), cardiac).state;
  for (const [t, text, talkedOver] of SCRIPT.slice(0, upTo)) {
    const r = traineeTurn(st, cardiac, text, { t, talkedOver });
    if (r.kind === "reply") st = r.state;
  }
  return endAt !== undefined ? endCall(st, endAt) : st;
}

export const sampleEnded = run(SCRIPT.length, 52_000);
export const sampleCard = score(sampleEnded, cardiac);
/** mid-call: after the trainee read the address back */
export const sampleLive = run(2);
