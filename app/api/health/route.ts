import { connection } from "next/server";
import { ttsHealth } from "@/lib/server/assemblyai";

// Live probe: one real text-to-speech call. Returns "tts ok" only when audio came back.
export async function GET() {
  await connection();
  try {
    const ms = await ttsHealth();
    if (ms <= 0) throw new Error("no audio");
    return new Response(`tts ok (${ms} ms of audio)\n`, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return new Response(`tts down: ${err instanceof Error ? err.message : "error"}\n`, { status: 503 });
  }
}
