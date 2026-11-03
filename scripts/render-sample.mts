// Renders the sample call: the engine's scripted run, both sides voiced by AssemblyAI's
// text-to-speech, saved as MP3 clips with a timeline in public/sample/manifest.json.
// Usage: npx tsx scripts/render-sample.mts   (reads ASSEMBLYAI_API_KEY from .env.local)
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { SAMPLE_SCRIPT, runSample } from "../lib/sample-script";

const key = (process.env.ASSEMBLYAI_API_KEY ?? readFileSync(".env.local", "utf8").match(/ASSEMBLYAI_API_KEY=(\S+)/)?.[1] ?? "").trim();
if (!key) throw new Error("ASSEMBLYAI_API_KEY missing");

const CALLER_VOICE = "aai-hailey";
const TRAINEE_VOICE = "aai-peter"; // soft-spoken, even: a dispatcher
const GAP_AFTER_CALLER = 700; // ms of quiet before the trainee answers her
const REPLY_LATENCY = 800; // ms from the trainee's last word to hers (measured 0.78-0.86 s)
const CUT_AT = 0.55; // a talked-over line is cut a little past half way

async function tts(text: string, voice: string): Promise<{ mp3: Buffer; ms: number }> {
  const res = await fetch("https://tts.us.assemblyai.com/v1/speech", {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: voice, container: "wav", stream: false }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}: ${await res.text()}`);
  const wav = Buffer.from(await res.arrayBuffer());
  // WAV in, MP3 out (the HTTP route returns whole files as WAV or raw PCM)
  const tmp = `/tmp/rl-sample-${process.pid}.wav`;
  writeFileSync(tmp, wav);
  const mp3 = execFileSync("ffmpeg", ["-loglevel", "error", "-i", tmp, "-codec:a", "libmp3lame", "-b:a", "64k", "-f", "mp3", "pipe:1"]);
  unlinkSync(tmp);
  return { mp3, ms: Number(res.headers.get("x-tts-audio-duration-ms")) };
}

// texts do not depend on times, so a run with placeholder times gives the lines to voice
const draft = runSample(SAMPLE_SCRIPT.map((s, i) => ({ ...s, t: (i + 1) * 5000 })));
const turns = draft.turns.filter((t) => t.text);
mkdirSync("public/sample", { recursive: true });

const out: { who: "caller" | "trainee"; text: string; t: number; dur: number; src: string; cutAt?: number }[] = [];
let t = 0;
for (let i = 0; i < turns.length; i++) {
  const turn = turns[i];
  const voice = turn.who === "caller" ? CALLER_VOICE : TRAINEE_VOICE;
  const { mp3, ms } = await tts(turn.text, voice);
  const src = `/sample/${String(i).padStart(2, "0")}-${turn.who}.mp3`;
  writeFileSync(`public${src}`, mp3);
  if (turn.who === "trainee") {
    const prev = out.at(-1)!;
    const script = SAMPLE_SCRIPT[out.filter((x) => x.who === "trainee").length];
    if (script.talkedOver) {
      t = prev.t + Math.round(prev.dur * CUT_AT);
      const words = prev.text.split(/\s+/).length;
      prev.cutAt = Math.max(1, Math.round(words * CUT_AT));
    } else t = prev.t + prev.dur + GAP_AFTER_CALLER;
  } else if (out.length) {
    const prev = out.at(-1)!;
    t = prev.t + prev.dur + REPLY_LATENCY;
  }
  out.push({ who: turn.who, text: turn.text, t, dur: ms, src });
  console.log(`${(t / 1000).toFixed(1)}s ${turn.who.padEnd(7)} ${ms} ms  ${turn.text}`);
}
const last = out.at(-1)!;
const manifest = {
  note: "Sample call: both sides are AssemblyAI text-to-speech; the trainee's lines are scripted.",
  callerVoice: CALLER_VOICE,
  traineeVoice: TRAINEE_VOICE,
  endT: last.t + last.dur + 1200,
  turns: out,
};
writeFileSync("lib/sample-manifest.json", JSON.stringify(manifest, null, 2));
console.log(`wrote ${out.length} clips; call length ${(manifest.endT / 1000).toFixed(1)} s`);
