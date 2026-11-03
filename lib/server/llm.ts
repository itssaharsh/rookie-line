// The model phrases an answer only when the trainee asks something the scenario did not
// plan for. It never states a fact: code scrubs any number it writes and the engine
// falls back to a scripted line when it is slow, empty or odd.
import type { LlmRequest, Scenario } from "@/lib/engine/types";
import { bandOf } from "@/lib/engine/voice-text";

export const LLM_URL = "https://llm-gateway.assemblyai.com/v1/chat/completions";
export const LLM_MODEL = "qwen3.5-4b-32k-fast";
export const LLM_TIMEOUT_MS = 2500;

const STYLE = {
  high: "You are terrified. Speak in short, broken bursts: start a word and restart it, say 'uh', shout ONE word in capitals. At most 16 words.",
  mid: "You are scared but trying to hold it together. One or two short sentences, maybe one 'uh'. At most 18 words.",
  low: "You are shaken but steady now. One or two plain sentences. At most 18 words.",
} as const;

export function systemPrompt(s: Scenario, panic: number): string {
  const band = bandOf(panic);
  return [
    `You are ${s.caller.name}, ${s.caller.age}, on the phone with a 911 call-taker. Your ${s.patient.relation} ${s.patient.name}, ${s.patient.age}, ${s.title.toLowerCase() === "cardiac arrest" ? "grabbed his chest and collapsed in the kitchen; he is gasping and does not respond" : "is in danger"}.`,
    "Answer only the call-taker's last question, as yourself, in spoken words.",
    "Never say any number, address, street, phone number, time or date. If asked for one, say you just told them or that you don't know.",
    "No stage directions, no brackets, no emojis, no quotes. Never say you are an AI or a simulation.",
    "If you would not know the answer, say so and beg them to send help.",
    STYLE[band],
  ].join(" ");
}

export function cleanReply(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim()
    .replace(/^[a-z]+\s*:\s*/i, "") // "Maria:" / "Caller:"
    .split("\n")[0]
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/(\.\.\.\s*){2,}/g, "... ") // collapse runs of ellipses
    .trim();
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export async function callerLine(
  req: LlmRequest,
  s: Scenario,
  apiKey: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs = LLM_TIMEOUT_MS,
): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const history = req.history.slice(-6).map((h) => ({
      role: h.who === "trainee" ? ("user" as const) : ("assistant" as const),
      content: h.text.slice(0, 400),
    }));
    const res = await fetchImpl(LLM_URL, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 60,
        temperature: 0.7,
        messages: [{ role: "system", content: systemPrompt(s, req.panic) }, ...history, { role: "user", content: req.question.slice(0, 400) }],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = cleanReply(data.choices?.[0]?.message?.content ?? "");
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
