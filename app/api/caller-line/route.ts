import { headers } from "next/headers";
import { callerLine } from "@/lib/server/llm";
import { allow, clientIp } from "@/lib/server/ratelimit";
import { scenarios } from "@/lib/scenarios";
import type { LlmRequest } from "@/lib/engine/types";

// The caller's answer to a question the scenario did not plan for.
// Returns { line: string | null }; null means "use a scripted line".
export async function POST(request: Request) {
  const h = await headers();
  if (!allow(`line:${clientIp(h)}`, 60, 10 * 60_000)) return Response.json({ line: null, limited: true }, { status: 429 });
  let body: LlmRequest;
  try {
    body = (await request.json()) as LlmRequest;
  } catch {
    return Response.json({ line: null }, { status: 400 });
  }
  const s = scenarios.find((x) => x.id === body?.scenarioId);
  if (!s || typeof body.question !== "string" || body.question.length > 400 || !Array.isArray(body.history)) {
    return Response.json({ line: null }, { status: 400 });
  }
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) return Response.json({ line: null });
  const panic = Math.max(0, Math.min(10, Number(body.panic) || 9));
  const line = await callerLine({ ...body, panic }, s, key);
  return Response.json({ line }, { headers: { "Cache-Control": "no-store" } });
}
