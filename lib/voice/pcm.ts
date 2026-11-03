// Pure audio and timing helpers, shared by the voice clients and covered by tests.

export function base64ToInt16(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
}

export function int16ToFloat32(i16: Int16Array): Float32Array<ArrayBuffer> {
  const out = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) out[i] = i16[i] / 32768;
  return out;
}

/** Downsample mono float audio to 16 kHz little-endian PCM16 (box filter + linear pick). */
export function toPcm16k(input: Float32Array, inRate: number): Int16Array {
  const ratio = inRate / 16000;
  const n = Math.floor(input.length / ratio);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    const v = end > start ? sum / (end - start) : input[start] ?? 0;
    out[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  }
  return out;
}

export interface WordTiming {
  word: string;
  start: number; // ms from the start of this line's audio
  end: number;
}

/** How many words have started playing after `elapsedMs` of this line. */
export function wordsStarted(words: WordTiming[], elapsedMs: number): number {
  let n = 0;
  for (const w of words) if (w.start <= elapsedMs) n++;
  return n;
}

/** Without word timings, estimate how many words were heard from the share of audio played. */
export function estimateWordsHeard(text: string, playedMs: number, totalMs: number): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (!totalMs || totalMs <= 0) return 0;
  const share = Math.max(0, Math.min(1, playedMs / totalMs));
  // weight by characters: long words take longer
  const total = words.reduce((s, w) => s + w.length + 1, 0);
  let acc = 0;
  for (let i = 0; i < words.length; i++) {
    acc += words[i].length + 1;
    if (acc / total > share) return i;
  }
  return words.length;
}

/** RMS level 0..1 of a block, for the voice meter. */
export function level(block: Float32Array): number {
  let s = 0;
  for (let i = 0; i < block.length; i++) s += block[i] * block[i];
  return Math.min(1, Math.sqrt(s / Math.max(1, block.length)) * 4);
}
