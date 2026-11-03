// How scared she sounds is decided here, in code. The panic level picks the band of
// hand-written lines, then adds stumbles the TTS reads as written: false starts
// ("he's- he's"), stutters ("c-can't"), a shouted word in capitals, fillers ("uh"),
// and a cut-off ("--"). Low panic gets clean, steady sentences.
import type { Band, BandedLine, Scenario } from "./types";

export function bandOf(panic: number): Band {
  if (panic >= 8) return "high";
  if (panic >= 5) return "mid";
  return "low";
}

/** Small seeded PRNG so a call replays the same way in tests. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10_000) / 10_000;
  };
}

export function pick<T>(xs: T[], r: () => number): T {
  return xs[Math.floor(r() * xs.length) % xs.length];
}

/** The facts as she says them at this panic level. The model never writes these. */
export function factsFor(s: Scenario, band: Band) {
  const a = s.facts.address;
  const digitsDashed = a.digits.split("").join("-");
  const addr =
    band === "high"
      ? `${digitsDashed} ${a.street}-- ${a.street} ${a.suffix}`
      : band === "mid"
        ? `${digitsDashed} ${a.street} ${a.suffix}`
        : `${a.written}`;
  return {
    ADDRESS: addr,
    CALLBACK: s.facts.callback.written,
    PATIENT: s.patient.name,
    CALLER: s.caller.name,
    AGE: String(s.patient.age),
  };
}

export function fill(text: string, s: Scenario, band: Band): string {
  const f = factsFor(s, band) as Record<string, string>;
  return text.replace(/\{([A-Z]+)\}/g, (_, k: string) => f[k] ?? "");
}

/** Extra stumbles on top of the written line, scaled by panic (only at the top of the scale). */
export function stress(text: string, panic: number, r: () => number): string {
  if (panic < 9) return text;
  let out = text;
  // one more filler after the first comma, half the time
  if (r() < 0.5) out = out.replace(/, /, ", uh, ");
  // end on a cut-off instead of a full stop, a third of the time
  if (r() < 0.33 && /[.!]$/.test(out)) out = out.replace(/[.!]$/, " --");
  return out;
}

export function lineFor(bank: BandedLine, s: Scenario, panic: number, r: () => number): string {
  const band = bandOf(panic);
  const options = bank[band].length ? bank[band] : bank.mid.length ? bank.mid : bank.low;
  return stress(fill(pick(options, r), s, band), panic, r);
}

/** Replace any number the model wrote, and any address-like run, with nothing: facts come from code. */
export function scrubModelLine(text: string): string {
  return text
    .replace(/[*_#`]/g, "")
    .replace(/\[[^\]]*\]|\([^)]*\)/g, "") // stage directions
    .replace(/\b\d+(?:[\s,.\-–]\d+)*\b/g, "") // digits the model invented ("67", "555-0142", "20 mg")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}
