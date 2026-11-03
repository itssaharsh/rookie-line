// The sample call: plays to the end and lands on the sample scorecard.
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3311";
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const failed = [];
p.on("requestfailed", (r) => failed.push(r.url()));
await p.goto(base);
await p.getByRole("button", { name: /Hear a sample call/ }).click();
await p.waitForTimeout(15500);
await p.screenshot({ path: "qa/sample-15s.png" });
await p.waitForTimeout(52000);
await p.screenshot({ path: "qa/sample-end.png" });
console.log((await p.locator("main").innerText()).split("\n").filter((l) => l.length > 3).slice(0, 4).join(" | "));
console.log("errors:", errors.length ? errors : "none", "| failed requests:", failed.length ? failed : "none");
await b.close();
