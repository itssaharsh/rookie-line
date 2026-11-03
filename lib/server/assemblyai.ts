// Server-only helpers for AssemblyAI. The API key never leaves the server:
// the browser gets short-lived tokens and talks to AssemblyAI directly.
import "server-only";

const TTS_TOKEN_URL = "https://token.us.assemblyai.com/v1/token";
const STT_TOKEN_URL = "https://streaming.assemblyai.com/v3/token";
const TTS_HTTP_URL = "https://tts.us.assemblyai.com/v1/speech";

export const TOKEN_TTL_SECONDS = 600; // window to open the session
export const SESSION_CAP_SECONDS = 300; // a practice call never needs more than five minutes

function apiKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("ASSEMBLYAI_API_KEY is not set");
  return key;
}

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await p(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

export async function mintTtsToken(): Promise<string> {
  return withTimeout(async (signal) => {
    const res = await fetch(TTS_TOKEN_URL, {
      method: "POST",
      headers: { Authorization: apiKey(), "Content-Type": "application/json" },
      body: JSON.stringify({
        product: "tts",
        expires_in_seconds: TOKEN_TTL_SECONDS,
        max_session_duration_seconds: SESSION_CAP_SECONDS,
      }),
      signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`tts token ${res.status}`);
    const data = (await res.json()) as { token?: string };
    if (!data.token) throw new Error("tts token missing");
    return data.token;
  }, 8000);
}

export async function mintSttToken(): Promise<string> {
  return withTimeout(async (signal) => {
    const url = `${STT_TOKEN_URL}?expires_in_seconds=${TOKEN_TTL_SECONDS}&max_session_duration_seconds=${SESSION_CAP_SECONDS}`;
    const res = await fetch(url, { headers: { Authorization: apiKey() }, signal, cache: "no-store" });
    if (!res.ok) throw new Error(`stt token ${res.status}`);
    const data = (await res.json()) as { token?: string };
    if (!data.token) throw new Error("stt token missing");
    return data.token;
  }, 8000);
}

/** One real TTS call, for the live probe. Returns the audio duration in ms. */
export async function ttsHealth(): Promise<number> {
  return withTimeout(async (signal) => {
    const res = await fetch(TTS_HTTP_URL, {
      method: "POST",
      headers: { Authorization: apiKey(), "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Line check.", voice_id: "aai-jane", container: "wav", stream: false }),
      signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    await res.arrayBuffer();
    return Number(res.headers.get("x-tts-audio-duration-ms") ?? 0);
  }, 10000);
}
