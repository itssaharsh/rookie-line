// The sample call for the first screen, the ?state= views and the "Hear a sample call"
// player: the real engine run on a scripted trainee, timed to the AssemblyAI audio clips
// rendered by scripts/render-sample.mts. Always labelled as a sample.
import { score } from "@/lib/engine/score";
import type { CallState } from "@/lib/engine/types";
import { cardiac } from "@/lib/scenarios/cardiac";
import manifest from "./sample-manifest.json";
import { SAMPLE_SCRIPT, runSample, type ScriptStep } from "./sample-script";

export interface SampleTurn {
  who: "caller" | "trainee";
  text: string;
  t: number;
  dur: number;
  src: string;
  cutAt?: number;
}

export const sampleManifest = manifest as { note: string; callerVoice: string; traineeVoice: string; endT: number; turns: SampleTurn[] };

/** The script, timed to when each trainee clip starts. */
const timed: ScriptStep[] = SAMPLE_SCRIPT.map((s, i) => ({
  ...s,
  t: sampleManifest.turns.filter((x) => x.who === "trainee")[i]?.t ?? (i + 1) * 5000,
}));

export const sampleEnded = runSample(timed, timed.length, sampleManifest.endT);
export const sampleCard = score(sampleEnded, cardiac);
/** mid-call: after the trainee read the address back */
export const sampleLive = runSample(timed, 2);

/** The call's state after the trainee turns that have finished by `t`. */
const traineeEnds = sampleManifest.turns.filter((x) => x.who === "trainee").map((x) => x.t + x.dur);
const states: CallState[] = timed.map((_, i) => runSample(timed, i));
export function sampleStateAt(t: number): CallState {
  const k = traineeEnds.filter((end) => end <= t).length;
  return k >= timed.length ? runSample(timed, timed.length) : states[k];
}
