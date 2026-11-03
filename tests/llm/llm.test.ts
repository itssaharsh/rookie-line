import { describe, it, expect } from "vitest";
import { callerLine, cleanReply, systemPrompt } from "@/lib/server/llm";
import { cardiac } from "@/lib/scenarios/cardiac";

const req = { scenarioId: "cardiac", panic: 9, question: "Does he take any medication?", history: [] };
const ok = (content: string) =>
  (async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })) as never;

describe("LLM fallback (AC-7)", () => {
  it("returns the model's line, cleaned", async () => {
    const line = await callerLine(req, cardiac, "k", ok("<think>hmm</think>Maria: \"He- he takes heart pills, I think!\""));
    expect(line).toBe("He- he takes heart pills, I think!");
  });
  it("returns null on an HTTP error", async () => {
    const line = await callerLine(req, cardiac, "k", (async () => new Response("no", { status: 400 })) as never);
    expect(line).toBeNull();
  });
  it("returns null when the model is slower than the timeout", async () => {
    const slow = ((_: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted"))))) as never;
    const t0 = Date.now();
    const line = await callerLine(req, cardiac, "k", slow, 50);
    expect(line).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1000);
  });
  it("the prompt forbids numbers and changes with panic", () => {
    expect(systemPrompt(cardiac, 9)).toMatch(/Never say any number/);
    expect(systemPrompt(cardiac, 9)).toMatch(/terrified/);
    expect(systemPrompt(cardiac, 3)).toMatch(/steady/);
    expect(cleanReply("Caller: okay\nsecond line")).toBe("okay");
  });
});
