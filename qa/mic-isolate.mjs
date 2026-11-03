import { chromium } from "playwright";
const [base, wav, headed] = [process.argv[2], process.argv[3], process.argv[4] === "headed"];
const b = await chromium.launch({ headless: !headed, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required"] });
const ctx = await b.newContext(); await ctx.grantPermissions(["microphone"], { origin: base });
const p = await ctx.newPage(); await p.goto(base);
const out = await p.evaluate(async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ac = new AudioContext(); await ac.audioWorklet.addModule("/worklets/mic-tap.js");
  const src = ac.createMediaStreamSource(stream); const node = new AudioWorkletNode(ac, "mic-tap");
  const g = ac.createGain(); g.gain.value = 0; src.connect(node); node.connect(g); g.connect(ac.destination);
  let n = 0; node.port.onmessage = () => n++;
  const marks = []; const t0 = performance.now();
  for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 5000)); marks.push(`${((performance.now() - t0) / 1000).toFixed(0)}s:${(n * 2048 / ac.sampleRate).toFixed(1)}s audio`); }
  return { rate: ac.sampleRate, marks };
});
console.log(JSON.stringify(out));
await b.close();
