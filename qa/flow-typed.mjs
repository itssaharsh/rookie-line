// Typed-path golden flow on a running build: answer, ask, read back, hang up, scorecard.
// node qa/flow-typed.mjs http://localhost:3311
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3311";
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: [] });
const p = await ctx.newPage();
const errors = [];
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(base, { waitUntil: "load" });
await p.screenshot({ path: "qa/01-ringing.png" });
const t0 = Date.now();
await p.getByRole("button", { name: /Answer line 1/ }).click();
await p.waitForSelector("text=Voice: AssemblyAI", { timeout: 20000 });
console.log("connected in", Date.now() - t0, "ms");
await p.waitForTimeout(2500);
await p.screenshot({ path: "qa/02-opening.png" });
// mic is fake-allowed, so open the typed path
const typeBtn = p.getByRole("button", { name: "Type instead" });
if (await typeBtn.isVisible().catch(() => false)) await typeBtn.click();
// wait until her line has finished (the meter goes quiet and the caption is fully lit), then speak
const quiet = async (max = 12000) => {
  const t = Date.now();
  await p.waitForTimeout(600);
  while (Date.now() - t < max) {
    const playing = await p.evaluate(() => window.__rl?.playing?.() ?? false);
    if (!playing) return Date.now() - t;
    await p.waitForTimeout(150);
  }
  return max;
};
const say = async (text) => {
  await quiet();
  await p.fill("#typed", text);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(900);
};
await say("911, what's the address of your emergency?");
await p.screenshot({ path: "qa/03-address.png" });
await say("Maria, I'm here with you. Is that 471 Maple Court?");
await p.screenshot({ path: "qa/04-mismatch.png" });
await say("Sorry. 417 Maple Court?");
await say("What's the number you're calling from?");
await say("555 0142?");
await say("Is he breathing?");
await say("Does he take any medication?");
await p.waitForTimeout(2500);
await p.screenshot({ path: "qa/05-model.png" });
await say("Help is on the way. Put the heel of your hand in the center of his chest and push hard and fast.");
await p.waitForTimeout(1500);
await p.screenshot({ path: "qa/06-cpr.png" });
await quiet();
await p.locator("details summary").first().click().catch(() => {});
const hood = await p.locator("details").first().innerText().catch(() => "");
await p.getByRole("button", { name: "Hang up" }).click();
await p.waitForTimeout(800);
await p.screenshot({ path: "qa/07-scorecard.png", fullPage: true });
const score = await p.locator("main").innerText();
console.log("SCORECARD:\n" + score.split("\n").slice(0, 16).join("\n"));
console.log("HOOD:", hood.replace(/\n/g, " | ").slice(0, 600));
console.log("ERRORS:", errors.length ? errors : "none");
await b.close();
