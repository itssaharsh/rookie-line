# Architecture: Rookie Line

One Next.js app on Vercel. The browser talks to AssemblyAI directly for both voices, using temporary tokens minted by the server, so audio never passes through our functions. The caller's mind is plain TypeScript running in the browser; a model is called only for questions the scenario did not plan for.

```
browser                                              server (Vercel, Node)            AssemblyAI
───────                                              ─────────────────────            ──────────
Answer ─────────────── GET /api/tokens ───────────▶  mint STT + TTS tokens ─────────▶ token hosts
mic (hold Space) ── PCM 16 kHz ───────────────────────────────────────────────────▶  Universal Streaming STT
   ◀── partial / final transcript ──────────────────────────────────────────────────
caller engine (lib/engine): intent → facts → panic → line → disfluency
   └─ unplanned question ── POST /api/caller-line ─▶ LLM Gateway (qwen3.5-4b) ──────▶ LLM Gateway
                              ◀─ line (digits replaced by code) ─
line text ── Generate + Flush ────────────────────────────────────────────────────▶  Streaming TTS
   ◀── Audio frames (PCM 24 kHz) + WordBoundaries ─────────────────────────────────
speaker + word-synced captions; Space while she talks → Cancel (she stops mid-word)
call ends → scorecard (lib/engine/score.ts) → localStorage (previous attempt)
```

## Components and the requirement that forces each
| Component | Why it exists |
|---|---|
| `app/page.tsx` console | M1: the product is one screen |
| `app/api/tokens` | the key must never reach the browser; both voices need a token (M2, M3) |
| `app/api/caller-line` | M6: unplanned questions need an answer in character |
| `app/api/health` | AC-10: a live probe that makes one real TTS call |
| `lib/engine/*` | M4, M5, M7: facts, panic, read-back and scoring are rules, so they are code with tests |
| `lib/voice/tts.ts`, `lib/voice/stt.ts` | M2, M3: the two WebSocket clients and audio I/O |
| `lib/scenarios/*` | M10, S1, S2: scenario cards are data |

## Decisions
- **Push-to-talk, not open mic.** Releasing Space ends the turn immediately (ForceEndpoint), which removes the ~1.4 s end-of-turn wait measured on default settings, and the caller's own audio cannot trigger a false barge-in through the speakers. Open mic is a SHOULD with a headphones prompt.
- **Planned turns never wait on a model.** Code picks the caller's answer from the scenario's line bank by intent, so a planned turn costs only the TTS's first audio (~0.3 s measured on an open socket). The model is the fallback, wrapped by code: it may phrase, never state a number.
- **Panic is a number in code.** It moves by rules (calming cues down, talking over her or a bare "calm down" up) and decides how the line is written: false starts, stutters, a shouted word, fillers and cut-offs at high panic; clean, steady sentences at low panic. The TTS reads that text as written.
- **Read-back is checked by code.** Number words and digits in the trainee's words are normalised and compared with the scenario's facts.
- **No database.** A call lives in the browser; the previous attempt is kept in localStorage.

## Failure boundaries
| Fails | What the user sees |
|---|---|
| token route | "The line is unavailable right now" + retry; the recorded sample stays playable |
| TTS socket | her words still appear as captions, with "Her audio dropped" and Call back |
| STT socket / mic denied | the typed path |
| LLM slow (>2.5 s) or odd | a scripted line from the scenario |
| rate limit hit | "Too many calls from here. Try again in a few minutes." |

## Secrets and state
`ASSEMBLYAI_API_KEY` only in `.env.local` and Vercel env. Tokens last ≤10 minutes and cap the session. Nothing about the trainee is stored on the server.
