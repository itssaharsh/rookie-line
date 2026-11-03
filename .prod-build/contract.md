# Implementation contract - Rookie Line (voiiicee)
mode: hackathon | channel: direct | created: 2026-11-03
Upstream read: hackathon-idea/assemblyai-hack-into-speech/ideas.json + idea-package.md + critic.md (prod-idea, 2026-11-03); UI-SPEC.md + Claude Design canvas https://claude.ai/artifact/ASQj8wHwnNwW2DTarjKY27 (prod-ui, 2026-11-03).

## 1. Intent
- User and moment of use: a 911 call-taker in their first weeks of training, at a laptop with a headset, between role-play sessions.
- What they can do: answer a practice 911 line, talk to a panicked caller voiced live by AssemblyAI's text-to-speech, and get a scorecard of what they caught.
- Before -> after: before, a trainer has to play the caller for every repetition (Police1, 2026-08-11; Sim911, AAAI 2025); after, the trainee drills alone against a caller who stammers, gets cut off, and steadies only when handled right, and sees seconds-to-address fall across attempts.

## 2. Scope
MUST (core product, main workflow, judged/required):
- M1 Console page `/` (UI-SPEC S1): ringing line, Answer, live call, scorecard; no sign-in.
- M2 Caller voice: AssemblyAI Streaming TTS over WebSocket from the browser with a server-minted temporary token; fillers/stammers/CAPS/cut-offs from text; Cancel on barge-in.
- M3 Trainee voice: push-to-talk (hold Space or the button) streamed to AssemblyAI Universal Streaming STT with a server-minted token; ForceEndpoint on release; live partial caption.
- M4 Caller engine (code): scenario card with fixed facts (address, callback, patient), intent matcher, line bank per intent, panic state machine (calming cues lower it, talking over her / "calm down" / silence raise it), disfluency renderer driven by panic level.
- M5 Read-back verification in code: digits and street compared against the facts; verified / mismatch with the caller correcting.
- M6 LLM fallback for unplanned questions via AssemblyAI LLM Gateway (`qwen3.5-4b-32k-fast`), in character, digits stripped and replaced by code, 2.5 s timeout -> scripted fallback line.
- M7 Scorecard (deterministic): address confirmed time, callback read back, breathing asked, CPR started, panic start -> end, times talked over; compared with the previous attempt (localStorage).
- M8 Typed path (no mic or mic denied) running the same pipeline.
- M9 Word-synced captions of the caller from WordBoundaries + the panic trace (signature visual).
- M10 One hardened scenario: Cardiac arrest (English, adult daughter).
- M11 Deploy to Vercel, signed out, live until results day; `/about` landing layer; README first screen.
SHOULD (built after the MUSTs are verified):
- S1 Scenario 2: Kitchen fire (whispering teen hiding from smoke). S2 Scenario 3: Spanish-speaking caller after a crash (aai-constanza, language spanish, multilingual STT).
- S3 Replay of the call (both sides) from the scorecard; S4 shareable `/call/[id]` via Vercel Blob.
- S5 Open-mic mode with a headphones prompt (barge-in by speech).
- S6 "Under the hood" panel: per-turn latency (STT final, engine/LLM, TTS first audio), voice id, panic, the facts the model cannot change.
COULD (listed, not built): trainer dashboard; custom scenario editor; phone line via SIP; cloned "real caller" voices.
WON'T now: accounts, databases, analytics, multi-tenant centres.

## 3. Core journeys
J1 (the call): page opens on a ringing line -> press Answer (or Space) -> the caller starts talking at once, panicked -> trainee holds Space and asks -> on release the caller answers within ~1 s, in character, with disfluency set by her panic -> trainee reads the address back -> the Location slot locks verified -> ... -> trainee hangs up (or the call reaches its end) -> scorecard.
J2 (no mic): mic blocked -> "Type instead" is primary -> same call by typing.
J3 (second attempt): scorecard -> "Try this caller again" -> scorecard compares with the previous attempt.

## 4. Surfaces
`/` console (S1 states: ringing, connecting, in-call, mic-denied, scorecard, error) · `/about` landing layer · `GET /api/tokens` (STT + TTS temporary tokens) · `POST /api/caller-line` (LLM fallback) · `GET /api/health` (one real TTS call, for the live probe).

## 5. States per journey
| Journey | initial | loading | success | error | empty | partial | retry | disabled | permission-denied | offline/degraded |
|---|---|---|---|---|---|---|---|---|---|---|
| J1 | ringing line + brief + last scorecard | "Connecting the line…" (tokens, mic, sockets) | call runs; scorecard | TTS/STT socket fails: "Her line dropped." + Call back; captions keep her text | no prior attempt: scorecard has no comparison row | STT partial shown live at 60% | Call back re-opens sockets | Space ignored while connecting | mic denied -> J2 | LLM slow -> scripted line; TTS down -> captions-only with a notice |
| J2 | same | same | same | same | same | n/a (typed lines are whole) | same | Send disabled while she speaks? no: typing while she speaks cuts her off | n/a | same |
| J3 | scorecard | n/a | comparison row | localStorage blocked -> no comparison row | first attempt | n/a | n/a | n/a | n/a | n/a |

## 6. Data
| Entity | Key fields | Relationships | Owner | Persistence | Source of truth | PII/retention |
|---|---|---|---|---|---|---|
| Scenario | id, caller persona, voice_id, language, facts (address, callback, patient), line bank, protocol checklist | has many lines | repo | code (`lib/scenarios/*.ts`) | repo | fictional only |
| Call | scenarioId, turns[], panic[], events[] (slot changes with t), startedAt, endedAt | belongs to scenario | the browser | memory; last scorecard in localStorage | the client engine | trainee's speech text only; audio not stored (S3/S4 later) |

## 7. Interfaces
| Interface | Purpose | Contract file | Failure mode | Fallback |
|---|---|---|---|---|
| AssemblyAI token host `POST /v1/token {product:"tts"}` | browser TTS session | app/api/tokens/route.ts | 4xx/5xx, rate | error state "line unavailable" + retry |
| AssemblyAI STT token `GET /v3/token` | browser STT session | same | same | typed path |
| TTS WebSocket wss://tts.us.assemblyai.com/v1/ws | caller voice | lib/voice/tts.ts | 3005/3009/close | captions-only notice; reconnect once |
| STT WebSocket wss://streaming.assemblyai.com/v3/ws | trainee words | lib/voice/stt.ts | close, no final | typed path; re-open on next PTT |
| LLM Gateway /v1/chat/completions (qwen3.5-4b-32k-fast) | unplanned questions | app/api/caller-line/route.ts | timeout, refusal, digits invented | scripted fallback line; digits replaced by code |

## 8. Constraints
- Sponsor/theme (verbatim, Luma, read 2026-11-03): "Build voices people want to listen to ... need speech that sounds natural, responds fast, and holds up in real conversations. AssemblyAI's new Text-to-Speech API gives you that voice, so you can spend the hackathon building the product around it."
- Judging criteria: not published. Assumed from the organiser's DEV rubric: "Use of Underlying technology", "Usability and User Experience", "Accessibility", "Creativity" (equal weights assumed).
- Secrets: the API key lives only in Vercel env / `.env.local`; the browser gets temporary tokens (TTS ≤600 s, STT ≤600 s).
- Abuse limits: `/api/tokens` 10 per IP per 10 min, 300 per day per instance; `/api/caller-line` 60 per IP per 10 min, input ≤ 400 chars, output ≤ 60 tokens; STT/TTS tokens carry `max_session_duration_seconds` 300.
- Latency: caller first audio ≤ 1.2 s after PTT release on scripted turns (p50), ≤ 2.5 s on LLM turns.
- Platform: Next 16 on Vercel (Node runtime); browser Chrome/Edge/Safari desktop first; phone layout readable (390).
- Deadline: freeze 2026-11-07T05:00Z, end 2026-11-07T19:00Z.

## 9. Acceptance criteria
AC-1: WHEN the page opens with no input THE SYSTEM SHALL show a ringing 911 line, the scenario brief and an Answer action on the first screen at 1440x900 and 390x844. Verify: foldcheck.py. Priority: must
AC-2: WHEN the trainee answers THE SYSTEM SHALL play the caller's first line within 1.5 s. Verify: Playwright run with fake media + timing log. Priority: must
AC-3: WHEN the trainee releases push-to-talk after a planned question THE SYSTEM SHALL start the caller's answer within 1.2 s (p50 of 10 turns). Verify: turn latency log (S6) on a recorded run. Priority: must
AC-4: WHEN the trainee starts talking while the caller speaks THE SYSTEM SHALL cancel her audio within 150 ms and show her caption cut after the last word played. Verify: unit test of cut index + browser check. Priority: must
AC-5: WHEN the trainee reads back the address with the right digits and street THE SYSTEM SHALL mark Location verified with the time; IF the digits differ THEN THE SYSTEM SHALL mark a mismatch and the caller SHALL correct them. Verify: vitest engine tests (number words, "four seventeen", "4-1-7", wrong order). Priority: must
AC-6: WHEN the trainee uses a calming cue THE SYSTEM SHALL lower panic by its rule, and WHEN they talk over her or say "calm down" THE SYSTEM SHALL raise it; the next line's disfluency SHALL follow the new level. Verify: vitest. Priority: must
AC-7: IF the LLM returns digits or takes longer than 2.5 s THEN THE SYSTEM SHALL replace digits with the scenario's facts or use a scripted line. Verify: vitest with a stubbed fetch. Priority: must
AC-8: IF the mic is denied THEN THE SYSTEM SHALL make "Type instead" primary and run the same call by typing. Verify: Playwright with permissions denied. Priority: must
AC-9: WHEN the call ends THE SYSTEM SHALL show the scorecard with times computed from the call's events, and compare with the previous attempt when one exists. Verify: vitest + browser. Priority: must
AC-10: WHEN `/api/health` is called on the deployment THE SYSTEM SHALL make one real TTS call and return "tts ok". Verify: pb.py smoke --probe. Priority: must
AC-11: The caller's captions SHALL light word by word from WordBoundaries during playback. Verify: browser check. Priority: must

## 10. Assumptions
A-1 [reversible]: push-to-talk is acceptable for a call-taking drill (real call-takers use open headsets) — validate with one dispatcher or trainer if reachable; S5 adds open mic.
A-2 [safe]: AssemblyAI temporary tokens work from the browser for both TTS and STT — validated 2026-11-03 (probe).
A-3 [reversible]: `qwen3.5-4b-32k-fast` is good enough for fallback lines when wrapped by code — validate with 20 unplanned questions.
A-4 [safe]: the key's credits cover judging traffic (TTS $15 per 1M characters; a call ≈ 1,500 characters).

## 11. Demo script
0:00 the line rings: "You're a 911 trainee. This caller is panicking. Get the address." · 0:08 Answer; she bursts in mid-sentence · 0:20 trainee talks over her; she stops mid-word · 0:35 trainee says her name, "I'm with you"; her next line is steadier, trace drops · 0:50 address read back; Location locks · 1:10 scorecard · 1:25 second attempt, faster · 1:50 Spanish caller (if S2) · 2:15 under the hood · 2:35 limits and links.

## 12. Event and judged path
(This file is committed with the repository, so a judge may read it.)
- Window: start 2026-10-28T02:00:00Z (Oct 28 07:30 IST) / freeze 2026-11-07T05:00:00Z / end 2026-11-07T19:00:00Z (Nov 8 00:30 IST). Source: the organiser's Luma update email of 2026-10-19 ("Wednesday, October 28 7:30 AM - Nov 8, 12:30 AM GMT+5:30"); the Luma page body still reads "October 15–23, 2026" (read 2026-11-03), so provisional. Rule on earlier work: none published (Luma, read 2026-11-03). This repository's first commit is inside the window.
- How an entry is judged: not published. A Google Form (sign-in required) is the submission; we assume form → video → live link → repository.
- Criteria: not published. Assumed from the organiser's own DEV challenge rubric (https://dev.to/challenges/assemblyai-2025-07-16): use of underlying technology, usability and user experience, accessibility, creativity; plus presentation.
- Criteria coverage: technology — the caller's voice (fillers, stress, cut-off, exact digits) and captions from word timings, 0:20 (met) · usability — one link, Answer, talk, scorecard (partial until the latency target is measured) · accessibility — word-synced captions, typed path, keyboard-only (met when axe passes) · creativity — the AI is the frightened caller, and her voice steadies when handled right (partial until heard) · presentation — two attempts in the video (planned).
- Capability coverage: no prize text names capabilities.
- Main result: seconds to a confirmed address, shown on the scorecard after two live calls, with her panic trace falling; material: a fictional scenario voiced live. Staged failure: a wrong read-back (4-7-1) that the caller corrects and the scorecard marks.
- Live feature: the live call at the public URL. Probe: `GET /api/health` returns "tts ok" after one real TTS call. Needs: the AssemblyAI key's credits (organiser credits on this key), Vercel hosting. Off state: "Calls are paused right now. Here is one we recorded." with the recorded run one click away.
- Promise coverage: "911" → a call console with a ringing 911 line on the first screen; "Rookie" → the brief and scorecard written for trainees.
- Before the clock: nothing. The idea research and UI mockup were written on 2026-11-03, inside the window, before the first commit.
