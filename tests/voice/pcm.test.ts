import { describe, it, expect } from "vitest";
import { base64ToInt16, int16ToFloat32, toPcm16k, wordsStarted, estimateWordsHeard } from "@/lib/voice/pcm";

describe("pcm helpers", () => {
  it("decodes base64 little-endian PCM16", () => {
    const i16 = new Int16Array([0, 1000, -1000, 32767]);
    const b64 = Buffer.from(i16.buffer).toString("base64");
    expect(Array.from(base64ToInt16(b64))).toEqual([0, 1000, -1000, 32767]);
    expect(int16ToFloat32(new Int16Array([16384]))[0]).toBeCloseTo(0.5);
  });
  it("downsamples 48 kHz to 16 kHz", () => {
    const sine = new Float32Array(4800).map((_, i) => Math.sin((2 * Math.PI * 440 * i) / 48000) * 0.5);
    const out = toPcm16k(sine, 48000);
    expect(out.length).toBe(1600);
    expect(Math.max(...Array.from(out))).toBeGreaterThan(10000);
  });
});

describe("caption timing (AC-4, AC-11)", () => {
  const words = [
    { word: "It's-", start: 100, end: 300 },
    { word: "it's", start: 320, end: 500 },
    { word: "4-1-7", start: 600, end: 1400 },
    { word: "Maple", start: 1500, end: 1900 },
  ];
  it("counts the words that have started", () => {
    expect(wordsStarted(words, 50)).toBe(0);
    expect(wordsStarted(words, 650)).toBe(3);
    expect(wordsStarted(words, 5000)).toBe(4);
  });
  it("estimates words heard when timings are missing", () => {
    expect(estimateWordsHeard("one two three four", 0, 1000)).toBe(0);
    expect(estimateWordsHeard("one two three four", 500, 1000)).toBe(2);
    expect(estimateWordsHeard("one two three four", 1000, 1000)).toBe(4);
  });
});
