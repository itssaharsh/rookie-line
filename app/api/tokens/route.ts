import { headers } from "next/headers";
import { mintSttToken, mintTtsToken, SESSION_CAP_SECONDS } from "@/lib/server/assemblyai";
import { allow, clientIp } from "@/lib/server/ratelimit";

// Temporary tokens for one practice call: the browser opens both voices with these.
export async function GET() {
  const h = await headers();
  const ip = clientIp(h);
  if (!allow(`tokens:${ip}`, 20, 10 * 60_000) || !allow("tokens:all", 300, 24 * 60 * 60_000)) {
    return Response.json({ error: "Too many calls from here. Try again in a few minutes." }, { status: 429 });
  }
  try {
    const [stt, tts] = await Promise.all([mintSttToken(), mintTtsToken()]);
    return Response.json(
      { stt, tts, sessionCapSeconds: SESSION_CAP_SECONDS },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("token mint failed", err instanceof Error ? err.message : err);
    return Response.json({ error: "The line is unavailable right now." }, { status: 503 });
  }
}
