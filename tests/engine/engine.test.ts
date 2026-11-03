import { describe, it, expect } from "vitest";
import { digitRuns } from "@/lib/engine/numbers";
import { hear } from "@/lib/engine/intents";
import { startCall, openingLine, traineeTurn, modelTurn, markCut, endCall } from "@/lib/engine/call";
import { score } from "@/lib/engine/score";
import { bandOf, scrubModelLine, factsFor } from "@/lib/engine/voice-text";
import { cardiac } from "@/lib/scenarios/cardiac";
import type { CallState } from "@/lib/engine/types";

const s = cardiac;
function reply(state: CallState, text: string, t: number, meta: Record<string, unknown> = {}) {
  const r = traineeTurn(state, s, text, { t, ...meta });
  if (r.kind !== "reply") throw new Error(`expected a planned reply for: ${text}`);
  return r;
}

describe("numbers: read-backs in every way people say them", () => {
  it.each([
    ["Is that 417 Maple Court?", "417"],
    ["four one seven Maple", "417"],
    ["four seventeen Maple Court", "417"],
    ["four hundred seventeen", "417"],
    ["four hundred and seventeen maple", "417"],
    ["4-1-7 Maple Court", "417"],
    ["4 1 7", "417"],
    ["cuatro uno siete", "417"],
  ])("%s -> %s", (text, digits) => {
    expect(digitRuns(text)).toContain(digits);
  });
  it("reads a phone number with oh for zero", () => {
    expect(digitRuns("five five five oh one four two")).toContain("5550142");
    expect(digitRuns("555-0142")).toContain("5550142");
  });
  it("keeps two numbers joined by 'and' apart", () => {
    expect(digitRuns("417 and 555-0142")).toEqual(["417", "5550142"]);
  });
  it("does not turn ordinary words into numbers", () => {
    expect(digitRuns("is he breathing? stay on the line with me")).toEqual([]);
  });
});

describe("intents", () => {
  it("hears the standard greeting as an address question, not a read-back", () => {
    for (const g of ["911, what's the address of your emergency?", "911, what is the address", "Nine one one, what is the address of your emergency?"]) {
      const h = hear(g, s).intents;
      expect(h).toContain("ask_address");
      expect(h).not.toContain("mismatch_address");
    }
  });
  it("a correct read-back verifies; a wrong one is a mismatch", () => {
    expect(hear("Okay Maria, 417 Maple Court, is that right?", s).intents).toContain("readback_address");
    const wrong = hear("I have 471 Maple Court", s).intents;
    expect(wrong).toContain("mismatch_address");
    expect(wrong).not.toContain("readback_address");
  });
  it("hears calming cues and the bare 'calm down'", () => {
    const h = hear("Maria, I'm here with you. Take a deep breath.", s);
    expect(h.calm).toEqual(expect.arrayContaining(["name", "with_you", "breathe"]));
    expect(hear("Ma'am you need to calm down", s).agitators).toContain("calm_down");
  });
  it("marks an unplanned question for the model", () => {
    expect(hear("Does he take any medication?", s).unplanned).toBe(true);
    expect(hear("okay", s).unplanned).toBe(false);
  });
});

describe("panic: code decides how scared she sounds (AC-6)", () => {
  it("calming lowers panic and the next line is written in a calmer band", () => {
    let st = startCall(s, 42);
    expect(bandOf(st.panic)).toBe("high");
    let r = reply(st, "Maria, I'm with you, take a breath. Help is on the way.", 5000);
    st = r.state;
    expect(st.panic).toBe(6); // 9 - 2 (cues) - 1 (help coming)
    expect(bandOf(st.panic)).toBe("mid");
    r = reply(st, "What's the address?", 9000);
    expect(r.reply.speak).toContain("4-1-7 Maple Court");
    expect(r.reply.speak).not.toMatch(/[A-Z]{3,}/); // no shouted word in the mid band
  });
  it("talking over her and 'calm down' raise it", () => {
    let st = startCall(s, 1);
    st = { ...st, panic: 6 };
    const r = reply(st, "Calm down, ma'am", 3000, { talkedOver: true });
    expect(r.state.panic).toBe(8);
    expect(r.state.events.filter((e) => e.kind === "agitated")).toHaveLength(2);
  });
  it("never goes below the floor while he is not breathing", () => {
    let st = startCall(s, 3);
    for (let i = 0; i < 8; i++) st = reply(st, "Maria, I'm with you, breathe, listen to me, you're doing great", 1000 * (i + 1)).state;
    expect(st.panic).toBeGreaterThanOrEqual(2);
  });
});

describe("facts are held by code (AC-5)", () => {
  it("the address comes out exactly, digit by digit when panicked", () => {
    expect(factsFor(s, "high").ADDRESS).toContain("4-1-7 Maple");
    let st = startCall(s, 7);
    const r = reply(st, "911, what's the address of your emergency?", 2000);
    expect(r.reply.speak).toMatch(/4-1-7 Maple/);
    st = r.state;
    expect(st.given.address).toBe(true);
    const ok = reply(st, "417 Maple Court?", 6000);
    expect(ok.state.verified.address).toBe(true);
    expect(ok.state.events.find((e) => e.kind === "address_verified")?.t).toBe(6000);
  });
  it("a wrong read-back gets corrected and is not verified", () => {
    let st = reply(startCall(s, 8), "What's your address?", 2000).state;
    const bad = reply(st, "I have 471 Maple Court", 5000);
    expect(bad.state.verified.address).toBe(false);
    expect(bad.reply.speak).toMatch(/^No/);
    expect(bad.reply.speak).toContain("4-1-7");
    st = bad.state;
    expect(st.events.some((e) => e.kind === "address_mismatch")).toBe(true);
  });
});

describe("the model is fenced (AC-7)", () => {
  it("routes an unplanned question to the model and scrubs invented numbers", () => {
    const st = startCall(s, 9);
    const r = traineeTurn(st, s, "Does he take any medication?", { t: 4000 });
    expect(r.kind).toBe("model");
    if (r.kind !== "model") return;
    const done = modelTurn(r.state, s, r.pending, "He takes pills for his heart, 20 mg, at 42 Elm Street!");
    expect(done.reply.source).toBe("model");
    expect(done.reply.speak).not.toMatch(/\d/);
  });
  it("falls back to a scripted line when the model fails", () => {
    const st = startCall(s, 9);
    const r = traineeTurn(st, s, "Does he have any allergies?", { t: 4000 });
    if (r.kind !== "model") throw new Error("expected model");
    const done = modelTurn(r.state, s, r.pending, null);
    expect(done.reply.source).toBe("fallback");
    expect(done.reply.speak.length).toBeGreaterThan(5);
  });
  it("scrubModelLine removes stage directions and digits", () => {
    expect(scrubModelLine("(sobbing) He is 67, please!")).toBe("He is, please!");
  });
});

describe("scorecard (AC-9)", () => {
  it("computes every time from the call's events", () => {
    let st: CallState = openingLine(startCall(s, 11), s).state;
    st = reply(st, "911, what's the address of your emergency?", 3000).state;
    st = reply(st, "Maria, I'm with you. 417 Maple Court?", 14000).state;
    st = reply(st, "What's your callback number?", 20000).state;
    st = reply(st, "555 0142?", 26000).state;
    st = reply(st, "Is he breathing?", 31000).state;
    st = reply(st, "Put the heel of your hand in the center of his chest and push hard and fast", 48000).state;
    st = markCut(st, 3);
    st = endCall(st, 72000);
    const card = score(st, s);
    expect(card.addressConfirmedMs).toBe(14000);
    expect(card.rows.find((r) => r.id === "callback")?.ok).toBe(true);
    expect(card.rows.find((r) => r.id === "cpr")?.t).toBe(48000);
    expect(card.durationMs).toBe(72000);
    expect(card.panicEnd).toBeLessThan(card.panicStart);
  });
});

import { fire } from "@/lib/scenarios/fire";
import { crash } from "@/lib/scenarios/crash";

describe("every scenario plays through", () => {
  for (const sc of [cardiac, fire, crash]) {
    it(`${sc.id}: address read-back, task, scorecard rows from its own checklist`, () => {
      let st = openingLine(startCall(sc, 5), sc).state;
      const go = (text: string, t: number) => {
        const r = traineeTurn(st, sc, text, { t });
        if (r.kind !== "reply") throw new Error(`${sc.id}: model turn for "${text}"`);
        st = r.state;
        return r.reply.speak;
      };
      const ans = go(sc.language === "spanish" ? "911, ¿cuál es la dirección?" : "911, what's the address of your emergency?", 3000);
      expect(ans).toContain(sc.facts.address.digits.split("").join("-"));
      go(`${sc.caller.name}, I'm with you. ${sc.facts.address.written}?`, 9000);
      expect(st.verified.address).toBe(true);
      const task = { instruct_cpr: "Push hard and fast in the center of his chest", instruct_leave: "Get out of the house now, go out the front door", instruct_pressure: "Press a towel on the wound, press hard" }[sc.taskIntent as string]!;
      go(task, 20000);
      expect(st.cprStarted).toBe(true);
      const card = score(endCall(st, 30000), sc);
      expect(card.rows.map((r) => r.id)).toEqual(expect.arrayContaining(sc.checklist.map((c) => c.id)));
      expect(card.rows.find((r) => r.id === sc.checklist.at(-1)!.id)?.ok).toBe(true);
    });
  }
  it("hears the Spanish name with or without the accent", () => {
    expect(hear("Lucia, estoy contigo", crash).calm).toEqual(expect.arrayContaining(["name", "with_you"]));
    expect(hear("Lucía, respira hondo", crash).calm).toEqual(expect.arrayContaining(["name", "breathe"]));
  });
});

import { transcript } from "@/lib/engine/transcript";

describe("transcript", () => {
  it("lists both sides with times, panic and cut-offs, then the scorecard", () => {
    let st = openingLine(startCall(cardiac, 2), cardiac).state;
    st = (traineeTurn(st, cardiac, "911, what's the address?", { t: 3000 }) as { state: CallState }).state;
    st = markCut(st, 2);
    st = (traineeTurn(st, cardiac, "417 Maple Court?", { t: 7000, talkedOver: true }) as { state: CallState }).state;
    st = endCall(st, 20000);
    const text = transcript(st, cardiac, score(st, cardiac));
    expect(text).toMatch(/0:03 {2}YOU: 911, what's the address\?/);
    expect(text).toMatch(/MARIA \[panic \d+\]: .*\[cut off\]/);
    expect(text).toMatch(/\[x\] Address read back and confirmed \(0:07\)/);
    expect(text).toMatch(/Why the panic moved/);
  });
});
