// Screenshot every ?state= at 1440 and 390, and run axe on each at 1440.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3311";
const axeSrc = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const states = ["", "connecting", "live", "typed", "error", "scorecard"];
const b = await chromium.launch();
for (const w of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } });
  const p = await ctx.newPage();
  for (const s of states) {
    await p.goto(`${base}/${s ? `?state=${s}` : ""}`, { waitUntil: "load" });
    await p.waitForTimeout(800);
    await p.screenshot({ path: `qa/state-${s || "ringing"}-${w}.png`, fullPage: true });
    if (w === 1440) {
      await p.addScriptTag({ content: axeSrc });
      const res = await p.evaluate(() => window.axe.run({ runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }));
      console.log(`axe ${s || "ringing"}: ${res.violations.length} violations`, res.violations.map((v) => `${v.id}(${v.nodes.length})`).join(" "));
    }
    const scrollW = await p.evaluate(() => document.documentElement.scrollWidth);
    if (scrollW > w) console.log(`SIDEWAYS SCROLL at ${w}: ${s || "ringing"} scrollWidth ${scrollW}`);
  }
  await ctx.close();
}
await b.close();
