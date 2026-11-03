// Push-to-talk through Chromium's fake microphone (which stops delivering after ~21 s headless). The WAV holds 3 s of silence, then a
// trainee asking for the address. We hold Space across that window and expect her answer.
import { chromium } from "playwright";
const [base, wav] = [process.argv[2], process.argv[3]];
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.grantPermissions(["microphone"], { origin: base });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await p.goto(base);
await p.waitForTimeout(4000); // the line rings; the call gets ready in the background
const t0 = Date.now();
await p.getByRole("button", { name: /Answer line 1/ }).click();
await p.waitForSelector("text=Voice: AssemblyAI", { timeout: 20000 });
console.log("live after", Date.now() - t0, "ms");
await p.waitForFunction(() => window.__rl?.playing?.(), null, { timeout: 8000 }).catch(() => {});
console.log("her first audio", Date.now() - t0, "ms after Answer");
await p.waitForSelector("text=Hold Space to talk", { timeout: 15000 });
const micAt = Date.now(); // the fake file starts when the mic opens (just before this)
console.log("mic ready", micAt - t0, "ms after Answer");
await p.waitForTimeout(Math.max(0, 2600 - (Date.now() - micAt)));
await p.keyboard.down("Space");
await p.waitForTimeout(4600);
await p.keyboard.up("Space");
const rel = Date.now();
await p.waitForFunction(() => document.body.innerText.includes("Maple"), null, { timeout: 15000 }).catch(() => {});
console.log("Maple on screen", Date.now() - rel, "ms after release");
await p.waitForTimeout(2500);
await p.screenshot({ path: "qa/10-voice-address.png" });
if (process.argv[4] === "readback") {
  // headless audio clocks run ~10% slow, so hold a wide window around the second utterance
  await p.waitForTimeout(Math.max(0, 9600 - (Date.now() - micAt)));
  await p.keyboard.down("Space");
  await p.waitForTimeout(5600);
  await p.keyboard.up("Space");
  await p.waitForTimeout(3500);
  await p.screenshot({ path: "qa/11-voice-readback.png" });
  console.log("LOCATION:", (await p.locator("section[aria-label='Incident card']").innerText()).split("\n").slice(2, 5).join(" | "));
  console.log("PANIC:", await p.evaluate(() => window.__rl?.panic?.()));
  console.log("EARLOG:\n" + (await p.evaluate(() => window.__rl?.earLog?.() ?? [])).join("\n"));
}
const you = await p.locator("text=YOU").locator("..").innerText().catch(() => "");
console.log("YOU:", you.replace(/\n/g, " | "));
await p.locator("details summary").first().click().catch(() => {});
console.log("HOOD:", (await p.locator("details").first().innerText().catch(() => "")).replace(/\n/g, " | ").slice(0, 400));
console.log("ERRORS:", errors.length ? errors : "none");
await b.close();
