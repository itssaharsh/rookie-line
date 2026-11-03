---
name: Rookie Line
scope: standard
one_line: "Rookie Line gives 911 trainees panicked callers to practise on."
ambition: "L2 on the caller stage (captions lit word by word from the TTS's word timings + a live panic trace); L1 everywhere else. No 3D: the data is a voice and a timeline, not space."
registers: { console: productive, caller-stage: expressive, scorecard: serious, about: expressive, errors: system }
direction: "derived from a 911 dispatch floor at night: canvas dispatch-slate #13161B (dimmed floor, night shift) · ink #ECEFF3 · accent 911-line red #FF4632 (the flashing line key you press to answer; used as a surface: line key, live tally, panic trace) · display + body Radio Canada Big (broadcast captioning lettering; one family) · mono Chivo Mono (ANI/ALI readout: address, callback, timer only). Candidates: (a) ALI-amber readout on black (CRT ALI screens) – too close to Sodium Night/patch-hours gold; (b) EMD protocol-card paper with coloured tabs, light – too close to the four light-paper/white entries; (c) chosen. Checked against ledger entries 2026-10-15 clearance, 2026-10-19 opentally, 2026-10-19 ghost-shelf, 2026-11-03 engineering-in-motion, patch-hours: differs from each on canvas, accent hue band, display face, layout and signature (patch-hours shares only a dark canvas)."
personality: precise
dials: { variance: 5, motion: 5, density: 5 }
stack: { framework: "Next 16 App Router — API routes earn it (token minting, LLM proxy, scoring)", css: "Tailwind 4 + :root tokens", fonts: "next/font/google: Radio Canada Big, Chivo Mono", motion: "CSS transitions + WAAPI only; no motion lib unless the scorecard morph needs it" }
archetype: "voice (f), reshaped as a dispatch console"
viewports: [320x640, 390x844, 1024x768, 1440x900]
signature: { interaction: "talk over her and she stops mid-word ('--'), then answers what you asked", visual: "the panic trace: her fear as a live line that falls when you handle her right, beside captions lit word by word" }
mockup: { source: claude-design, screens: { canvas: "https://claude.ai/artifact/ASQj8wHwnNwW2DTarjKY27" } }   # frames: Main (in call), Ringing (first screen), Scorecard; bracketed numbers are placeholders until real runs
wow: "trainee says her name + 'breathe with me' (real STT) → within 100 ms the line key tally pulses → her next line is audibly steadier and the panic trace drops 8 → 4 on screen → the trace keeps the step → the turn log shows the panic change and the words that caused it"
demo: { seed: ./lib/scenarios, flag: "?demo=1", state_param: "?state=", reset: "alt+shift+r", replay: "alt+shift+p", guest: true, record: "?record=1" }
live_vs_simulated: [ "caller voice: live AssemblyAI TTS", "trainee speech: live AssemblyAI streaming STT", "caller's words: live LLM Gateway (Qwen 3.5 4B) inside code-held facts", "scoring: deterministic code", "the emergency itself: a training scenario (fictional caller, fictional address)" ]
deviations:
  - "No 3D/L3: no spatial data; the stage is audio + text + one trace (A5)."
  - "Dark canvas: dispatch floors are dimmed and trainees work night shifts; judges watch on laptops."
  - "Monospace is used only for ANI/ALI readouts (address, callback, timer), where the world uses it."
---

## 0. Brief + context profile
- **One line:** Rookie Line gives 911 trainees panicked callers to practise on.
- **User and moment:** a call-taker in their first weeks, at a practice laptop with a headset, between role-play sessions; the trainer reads the scorecard after.
- **Promise:** "911" → the first screen is a call console with a ringing 911 line; "Rookie" → three trainee scenarios and a scorecard written for trainees.
- **Primary action:** answer the line (press the flashing line key, or Space) and talk.
- **Hero object:** the call: the caller's live voice as captions lit word by word, her panic trace, and the incident card whose slots lock only when read back right.
- **Product moment:** the address slot locks "verified" when the trainee reads 4-1-7 back correctly.
- **Demo moment:** the trainee cuts in and she stops mid-word; later, handled right, the same voice steadies and the trace falls.
- **Differentiator:** her fear is set by code and is audible and visible; the address and number are held by code, never invented by the model; the digits the trainee reads back are checked by code.
- **Artifact:** the scorecard + both sides of the call as a replay, with a shareable link.
- **World inventory:** the flashing 911 line key · the ANI/ALI readout (mono, location + callback) · the EMD protocol card (key questions, in order) · the call timer · the CAD incident card (location, callback, nature, priority) · the headset tally.
- **Moving truth:** the call timer, her audio level, the panic trace, the turn latency — all from the live engine.
- **Judging:** no published criteria; assumed use of technology · usability/UX · accessibility · creativity · presentation (organiser's DEV rubric). Async: form → video → live link → repo. No UI prize known. Card length unknown → judge card ≤180 chars.
- **Budget:** ~12 h UI inside a ~90 h window; resources: AssemblyAI TTS/STT/LLM Gateway on one key, Vercel.

| Factor | Pole | What it changes |
|---|---|---|
| Task frequency | a few calls per session | guidance on first run, one expressive moment (the steadying) |
| Data density | a few facts | large captions, few fields |
| Stakes | training for life-and-death work | serious register, no jokes, no confetti; "TRAINING SIMULATION" always visible |
| Audience | trainees + judges new to dispatch | plain words; dispatch terms glossed once (ALI = "where the system thinks the caller is") |
| Use scene | desk, headset, dimmed room; judges on laptops | dark canvas; 44 px targets; push-to-talk on Space |
| Emotional target | pressure, then control | the screen gets calmer as she does |
| Personality | precise (dispatch software) | 120–200 ms, no bounce |
| Sponsor | AssemblyAI's TTS is the product's voice | "Voice: AssemblyAI TTS" visible on the stage; latency per turn in "Under the hood" |

## 1. Judge tests
- **5 s:** the wordmark + "Practice 911 calls for trainee call-takers" · a red LINE 1 key flashing "911 · Cardiac arrest · ringing" · the scenario's one-line brief ("Her dad collapsed. Get the address and a callback number.") · a finished sample scorecard from a recorded run, labeled with its date.
- **30 s:** Answer → she panics (captions + trace) → you ask the address → she cuts herself off and gives it → you read it back → the Location slot locks green with the time. Type path for no mic.
- **Demo-critical screens:** S1 console (pre-call, in-call, scorecard); S2 /about.
- **3 stills:** (1) ringing console with last scorecard; (2) mid-call: broken caption "it's my- my DAD, he's not-- " with the trace high; (3) scorecard "Address confirmed 0:14 · panic 9 → 3".

## 2. Demo script (video ≤ event limit, unknown → aim 2:30–3:00)
0:00 the line rings; "You're a 911 trainee. This caller is panicking." · 0:08 answer; she stammers · 0:20 trainee cuts in, she stops mid-word · 0:35 trainee calms her; her voice steadies, trace falls · 0:50 address read back, slot locks · 1:10 scorecard · 1:25 second attempt faster (41 s → 14 s, real runs) · 1:50 Spanish caller · 2:15 under the hood (latency, facts the model can't change, word timings) · 2:35 limits + links. Record with `?record=1`.

## 3. Journey + screen inventory
| id | route | why | entered from | primary action | states |
|---|---|---|---|---|---|
| S1 | / | the console: the product | link | Answer line | ringing, connecting, mic-denied, in-call, ended/scorecard, replay, error |
| S2 | /about | landing layer: copy block for strangers | top bar, README | Try a call | — |
| S3 | /call/[id] | shareable scorecard + replay of a real run | scorecard "Share" | Replay | loading, not-found |

## 5. Screens — S1 console (1440)
Top bar 52: mark + "Rookie Line" + descriptor · TRAINING SIMULATION tag · "How it works" link · mute.
Left 280: line keys (one per scenario: LINE 1 Cardiac arrest · LINE 2 Kitchen fire · LINE 3 Español · choque), the ringing one flashing; under them the "How to judge in 90 s" card (?judge=1 / demo deployment).
Center (flex, min 640): caller stage — "CALLER · Maria, 34 · voice: AssemblyAI TTS aai-…" label; captions (current line 32/40, words lit in sync; previous 2 lines dimmed above; her cut-offs drawn as a hard break "—"); the trainee's last line under it, smaller, right-aligned in ink-muted; panic trace strip 96 high at the bottom of the stage.
Bottom control bar 72: hold Space to talk (mic level) · Type instead · Hang up.
Right 340: incident card (CAD): Location · Callback · Nature · Breathing · Instructions; each slot: "not yet" → "heard: …" (amber, unverified) → "read back ✓ 0:14" (green). Call timer on the card header (mono). "Under the hood" disclosure: per-turn STT / LLM / TTS ms, voice id, panic level, the facts the model cannot change.

| Element | Tier | Register | Levers (grayscale first) | States | Transition |
|---|---|---|---|---|---|
| Caller captions | primary | expressive | largest type (40/48), max 22ch per line, center column, the only full-ink text block; spoken word = full ink, unspoken = 35% | waiting: "…" breathing dots; cut-off: line ends in a hard rule; error: "Her line dropped. Call back." | words light as WordBoundaries arrive; older lines shift up 8px + fade to 45% |
| LINE key (ringing/live) | interactive (primary action) | productive | the only red surface; 64px tall; label in mono caps | ringing: flash 1 Hz (pausable, stops under reduced motion → steady + "RINGING" text); live: steady + timer; ended: outline | press: scale .97; ringing→live: flash stops |
| Panic trace | secondary | expressive | 96px strip, one red line, area under it 12% red; current value as a numeral at the right (mono 20) | no call: flat dashed baseline + "Her panic will show here"; live: line draws per turn | each turn's step eases 400 ms |
| Incident card slots | secondary | serious | rows, not cards; label 13 muted, value mono 16; verified = green check + time | not yet · heard (amber dot) · verified (green check) · mismatch (amber ✗ "you said 4-7-1") | slot value crossfades; verified check draws 200 ms |
| Trainee line | tertiary | productive | 18px ink-muted, right-aligned, "YOU" label | partial (live STT partial in 60%) | — |
| Control bar | interactive | productive | hold-to-talk = filled ink button with mic level ring; Type instead = tonal; Hang up = text, serious | mic-denied: Type instead becomes primary + reason | — |
| Scorecard (end) | primary (after call) | serious | replaces the stage; 5 rows with times; one big number "Address in 14 s"; compare to last attempt | — | stage cross-fades through; rows enter 40 ms stagger |
| Under the hood | tertiary | system | collapsed disclosure, mono 12 | — | — |

## 9. Copy deck (key)
- Descriptor: "Practice 911 calls for trainee call-takers"
- Line key: "LINE 1 · 911 · Cardiac arrest" / "RINGING" / "LIVE 0:42"
- Brief: "Her dad collapsed. Get the address and a callback number."
- Hold to talk: "Hold Space to talk" · Type: "Type instead" · Hang up: "Hang up"
- Mic denied: "Your mic is blocked. You can type your side of the call instead."
- Slots: "Not yet" · "Heard: 417 Maple Court" · "Read back · 0:14" · "You said 4-7-1. She said 4-1-7."
- Empty trace: "Her panic will show here"
- Scorecard title: "Call ended · 1:12" · rows: "Address confirmed in 14 s", "Callback number read back", "Asked if he's breathing at 0:22", "Started CPR instructions at 0:48", "Her panic: 9 → 3", "You talked over her 2 times"
- Honesty: "TRAINING SIMULATION · fictional caller and address"
- Landing block (S2/README): headline "Practice the 911 call before the real one"; subhead "A caller who panics, stammers and gets cut off, voiced live by AssemblyAI's text-to-speech, and a scorecard that checks what you caught."; proof points (from real runs only); how it works (Answer the line · Get the address and number · Read the scorecard); limits ("Training simulation. Three scenarios. Scoring checks the facts, not your tone."); links.

## 11. Real-product checks
Value: reps without a trainer · Clarity: the line rings, the brief says what to get · Trust: facts and scoring by code, shown in Under the hood · Feedback: line key pulses within 100 ms of speech · Failure: mic denied → type; LLM slow → scenario line; TTS fails → captions still show her line · 10× data: n/a (one call) · Maintainability: one Next app, 3 API routes.

## 12. Don'ts
No sirens, no gore, no real addresses or names; no confetti; no red for errors (amber); never call it "real"; no fake reviews from dispatchers.

## 14. Tokens
```css
:root{
  color-scheme: dark;
  --canvas:#13161B; --surface-1:#1A1E24; --surface-2:#232831; --surface-sunken:#0E1115;
  --line:#2C323C; --line-input:#6B7482;
  --ink:#ECEFF3; --ink-muted:#9AA3AF;
  --accent:#FF4632; --accent-ink:#160302;
  --success:#46D08F; --warning:#F2B544; --danger:#FF8A80;
  --focus:#ECEFF3;
  --r-sm:3px; --r-md:6px; --r-lg:10px;
}
```
