// Lines 2 and 3, typed: answer, address, read-back, the task, hang up.
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3311";
const plans = {
  2: ["911, what's the address of your emergency?", "Walter, I'm with you. 2210 Birch Lane?", "Is anyone else in the house?", "Walter, get out of the house now, go out the front door."],
  3: ["911, ¿cuál es la dirección de su emergencia?", "Lucía, estoy contigo. 1803 Oak Street?", "¿Está despierto?", "Press a clean towel on the wound and press hard."],
};
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
for (const [line, steps] of Object.entries(plans)) {
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto(base);
  await p.getByRole("button", { name: new RegExp(`LINE ${line}`) }).click();
  await p.waitForTimeout(3500);
  await p.getByRole("button", { name: new RegExp(`Answer line ${line}`) }).click();
  await p.waitForSelector("text=Voice: AssemblyAI", { timeout: 20000 });
  await p.getByRole("button", { name: "Type instead" }).click();
  const quiet = async () => { const t = Date.now(); await p.waitForTimeout(600); while (Date.now() - t < 12000 && (await p.evaluate(() => window.__rl?.playing?.()))) await p.waitForTimeout(150); };
  for (const s of steps) { await quiet(); await p.fill("#typed", s); await p.keyboard.press("Enter"); await p.waitForTimeout(800); }
  await quiet();
  await p.screenshot({ path: `qa/line${line}-live.png` });
  await p.getByRole("button", { name: "Hang up" }).click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `qa/line${line}-score.png` });
  const text = (await p.locator("main").innerText()).split("\n").filter((l) => l.length > 3).slice(0, 9).join(" | ");
  console.log(`LINE ${line}: ${text}\n  errors: ${errors.length ? errors.join("; ") : "none"}`);
}
await b.close();
