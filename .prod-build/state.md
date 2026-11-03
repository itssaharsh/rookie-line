# State: Rookie Line (voiiicee)
updated: 2026-11-03T22:20Z · mode hackathon · channel direct · phase BUILDING (freeze 2026-11-07T05:00Z, end 19:00Z)

## Done
T01 tokens + health probe · T02 caller engine (lib/engine) · T03 voice clients (lib/voice) · T04 console golden path
T05 LLM fallback · T07 UI to mockup · T08 three scenarios · T09 transcript · T10 about/README/brand · T11 security.
38 vitest tests; lint/typecheck clean; foldcheck PASS at 1440 and 390; axe 0 on every ?state= view.

## Measured (browser, 2026-11-03)
her first audio 0.29-0.31 s after Answer (call prepared while ringing) · release -> her voice 0.78-0.86 s (voice) / 0.30 s (typed)
model turn ~1.8 s · ForceEndpoint -> final transcript 164 ms.

## Blocked
T06 deploy: adding the key to Vercel env needs Saharsh (permission denied as a secret write). Commands in WIN-MEMORY.md.

## Builder steps open
T15 form questions · T16 dashboard agent bonus · T17 ear test (ear-test/ clips) · T18 approvals · T19 daily probe until results.

## Next
After deploy: smoke + live probe (/api/health contains "tts ok"), foldcheck on the live URL, then T12 backup video take
(product-demo-video, judged profile; narration voice must be AssemblyAI TTS), GitHub repo (private, public at submit), T13, T14.

## Key paths
QA: qa/flow-typed.mjs, qa/flow-voice.mjs (fake-mic WAVs in scratchpad; headless fake mic stalls ~21 s), qa/states.mjs, qa/flow-lines.mjs
Local server: npx next start -p 3311 (kill by PID from `ss -ltnp | grep :3311` before restarting).
