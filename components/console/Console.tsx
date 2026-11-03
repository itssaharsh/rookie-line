"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CallState, CallerReply, Scenario } from "@/lib/engine/types";
import { startCall, openingLine, traineeTurn, modelTurn, markCut, endCall } from "@/lib/engine/call";
import { score, fmt, type Scorecard } from "@/lib/engine/score";
import { CallerVoice, type SpokenLine } from "@/lib/voice/tts";
import { TraineeEar, MicDeniedError } from "@/lib/voice/stt";
import { wordsStarted, estimateWordsHeard } from "@/lib/voice/pcm";
import { saveAttempt, subscribeAttempts, attemptsSnapshot, lastCardFrom } from "@/lib/attempts";
import { Captions, type CaptionLine } from "./Captions";
import { PanicTrace } from "./PanicTrace";
import { IncidentCard } from "./IncidentCard";
import { ScorecardView } from "./ScorecardView";

type Phase = "ringing" | "connecting" | "live" | "ended" | "error";

interface Prepared {
  v: CallerVoice;
  stt: string;
  at: number;
  scenarioId: string;
}

interface TurnMetric {
  n: number;
  heard: string;
  sttMs: number | null; // release -> transcript
  source: CallerReply["source"];
  modelMs: number | null;
  firstAudioMs: number | null; // line sent -> first audio
  totalMs: number | null; // release (or send) -> first audio
}

const CALL_CAP_MS = 4 * 60_000 + 45_000;
const SILENCE_NUDGE_MS = 9_000;

export function Console({ scenarios }: { scenarios: Scenario[] }) {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
  const [phase, setPhase] = useState<Phase>("ringing");
  const [error, setError] = useState<string | null>(null);
  const [call, setCall] = useState<CallState | null>(null);
  const [captions, setCaptions] = useState<CaptionLine[]>([]);
  const [partial, setPartial] = useState("");
  const [lastTrainee, setLastTrainee] = useState("");
  const [talking, setTalking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [typed, setTyped] = useState("");
  const [typedOnly, setTypedOnly] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [metrics, setMetrics] = useState<TurnMetric[]>([]);
  const [card, setCard] = useState<{ card: Scorecard; previous: Scorecard | null; trace: CallState["panicTrace"] } | null>(null);
  const [engineInfo, setEngineInfo] = useState({ voice: "", model: "" });
  const [micReady, setMicReady] = useState(false);
  const [status, setStatus] = useState("");

  const voice = useRef<CallerVoice | null>(null);
  const ear = useRef<TraineeEar | null>(null);
  const callRef = useRef<CallState | null>(null);
  const t0 = useRef(0);
  const lines = useRef(new Map<number, CaptionLine>());
  const current = useRef<SpokenLine | null>(null);
  const pressAt = useRef(0);
  const talkedOverThisTurn = useRef(false);
  const callerEndedAt = useRef(0);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busy = useRef(false);
  const phaseRef = useRef<Phase>("ringing");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const attemptsRaw = useSyncExternalStore(subscribeAttempts, attemptsSnapshot, () => "");
  const lastCard = useMemo(() => lastCardFrom(attemptsRaw, scenario.id), [attemptsRaw, scenario.id]);

  const now = () => (t0.current ? performance.now() - t0.current : 0);

  const setCallState = (s: CallState) => {
    callRef.current = s;
    setCall(s);
  };

  const refreshCaptions = useCallback(() => {
    setCaptions([...lines.current.values()].slice(-3).map((l) => ({ ...l })));
  }, []);

  // one animation loop while the call is live: clock, lit words, meters
  useEffect(() => {
    if (phase !== "live") return;
    let id = 0;
    let lastClock = -1;
    let lastBars = -1;
    const loop = () => {
      // render the clock four times a second, not every frame
      const ms = t0.current ? performance.now() - t0.current : 0;
      const q = Math.floor(ms / 250);
      if (q !== lastClock) {
        lastClock = q;
        setNowMs(ms);
      }
      const v = voice.current;
      const line = current.current;
      if (v && line) {
        const cap = lines.current.get(line.id);
        if (cap && !cap.done && cap.cutAt === undefined) {
          const el = v.elapsedMs(line);
          const lit = line.words
            ? wordsStarted(line.words, el)
            : estimateWordsHeard(line.text, el, line.totalMs ?? line.text.length * 70);
          if (lit !== cap.lit) {
            cap.lit = lit;
            refreshCaptions();
          }
        }
        const bars = Math.round(v.level() * 9);
        if (bars !== lastBars) {
          lastBars = bars;
          setVoiceLevel(bars / 9);
        }
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [phase, refreshCaptions]);

  const say = useCallback(
    (text: string, sentAtForMetric: number | null, metric: Omit<TurnMetric, "firstAudioMs" | "totalMs"> | null) => {
      const v = voice.current;
      if (!v || !text) return;
      const line = v.speak(text);
      current.current = line;
      callerEndedAt.current = 0; // she is talking again: silence is measured from the end of this line
      lines.current.set(line.id, { id: line.id, text, lit: 0, done: false });
      refreshCaptions();
      if (metric) {
        const watch = setInterval(() => {
          if (line.firstAudioMs !== undefined || line.cancelled) {
            clearInterval(watch);
            setMetrics((m) => [
              ...m,
              {
                ...metric,
                firstAudioMs: line.firstAudioMs !== undefined ? Math.round(line.firstAudioMs) : null,
                totalMs: sentAtForMetric !== null && line.startAt !== undefined ? Math.round(performance.now() - sentAtForMetric) : null,
              },
            ]);
          }
        }, 20);
        setTimeout(() => clearInterval(watch), 8000);
      }
    },
    [refreshCaptions],
  );

  const cutHer = useCallback(() => {
    const v = voice.current;
    if (!v) return false;
    const cut = v.cut();
    if (!cut) return false;
    const cap = lines.current.get(cut.lineId);
    if (cap) cap.cutAt = Math.max(0, cut.wordsHeard);
    if (callRef.current) setCallState(markCut(callRef.current, cut.wordsHeard));
    refreshCaptions();
    return true;
  }, [refreshCaptions]);

  const respond = useCallback(
    async (text: string, opts: { silenceMs?: number; sttMs: number | null }) => {
      const st = callRef.current;
      if (!st || busy.current) return;
      busy.current = true;
      clearTimeout(silenceTimer.current);
      const sentAt = performance.now();
      const talkedOver = talkedOverThisTurn.current;
      talkedOverThisTurn.current = false;
      try {
        const r = traineeTurn(st, scenario, text, { t: now(), talkedOver, silenceMs: opts.silenceMs });
        if (r.kind === "reply") {
          setCallState(r.state);
          say(r.reply.speak, sentAt, { n: r.state.turns.length, heard: text, sttMs: opts.sttMs, source: "bank", modelMs: null });
        } else {
          setCallState(r.state);
          setThinking(true);
          const m0 = performance.now();
          let line: string | null = null;
          try {
            const res = await fetch("/api/caller-line", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(r.request),
            });
            line = ((await res.json()) as { line: string | null }).line;
          } catch {
            line = null;
          }
          const done = modelTurn(r.state, scenario, r.pending, line);
          setCallState(done.state);
          setThinking(false);
          say(done.reply.speak, sentAt, { n: done.state.turns.length, heard: text, sttMs: opts.sttMs, source: done.reply.source, modelMs: Math.round(performance.now() - m0) });
        }
      } finally {
        busy.current = false;
      }
    },
    [say, scenario],
  );

  const armSilence = useCallback(() => {
    clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => {
      if (phaseRef.current !== "live" || busy.current || talkedOverThisTurn.current) return;
      if (pressAt.current > callerEndedAt.current) return;
      void respond("", { silenceMs: SILENCE_NUDGE_MS, sttMs: null });
    }, SILENCE_NUDGE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onVoiceEvents = useCallback(() => {
    return {
      onLineEnd: (line: SpokenLine) => {
        const cap = lines.current.get(line.id);
        if (cap && cap.cutAt === undefined) {
          cap.done = true;
          cap.lit = line.text.split(/\s+/).length;
        }
        refreshCaptions();
        if (current.current?.id === line.id) {
          callerEndedAt.current = performance.now();
          armSilence();
        }
      },
      onWords: () => refreshCaptions(),
      onError: (m: string) => setStatus(m),
      onClose: (code: number) => {
        if (phaseRef.current === "live" && code !== 1000) setStatus("Her audio dropped. Her words still show here.");
      },
    };
  }, [armSilence, refreshCaptions]);

  // ---- the call ----
  // Get the line ready while it rings: tokens minted and her voice session open, so
  // pressing Answer plays her first words at once. The mic connects while she talks.
  const prepared = useRef<Promise<Prepared> | null>(null);
  const prepare = useCallback(
    (s: Scenario) => {
      const job = (async (): Promise<Prepared> => {
        const res = await fetch("/api/tokens", { cache: "no-store" });
        const tok = (await res.json()) as { stt?: string; tts?: string; error?: string };
        if (!res.ok || !tok.tts || !tok.stt) throw new Error(tok.error ?? "The line is unavailable right now.");
        const v = new CallerVoice(onVoiceEvents());
        await v.connect(tok.tts, s.voiceId, s.language);
        return { v, stt: tok.stt, at: performance.now(), scenarioId: s.id };
      })();
      job.catch(() => {}); // surfaced when the line is answered
      prepared.current = job;
      return job;
    },
    [onVoiceEvents],
  );

  useEffect(() => {
    if ((phase === "ringing" || phase === "ended") && !prepared.current) prepare(scenario);
  }, [phase, prepare, scenario]);

  const answer = useCallback(async () => {
    if (phaseRef.current !== "ringing" && phaseRef.current !== "ended" && phaseRef.current !== "error") return;
    setPhase("connecting");
    setError(null);
    setCard(null);
    setCaptions([]);
    lines.current.clear();
    setMetrics([]);
    setLastTrainee("");
    setStatus("Connecting the line…");
    try {
      let ready = await (prepared.current ?? prepare(scenario)).catch(() => null);
      prepared.current = null;
      if (!ready || ready.scenarioId !== scenario.id || !ready.v.open || performance.now() - ready.at > 9 * 60_000) {
        ready?.v.close();
        ready = await prepare(scenario);
        prepared.current = null;
      }
      const v = ready.v;
      voice.current = v;
      await v.resume();
      t0.current = performance.now();
      const first = openingLine(startCall(scenario), scenario);
      setCallState(first.state);
      setPhase("live");
      say(first.reply.speak, null, null);
      setStatus("Connecting your mic…");
      // the trainee's side connects while she talks
      const e = new TraineeEar({ onPartial: (t) => setPartial(t), onLevel: (l) => setMicLevel((prev) => (Math.round(prev * 9) === Math.round(l * 9) ? prev : l)) });
      ear.current = e;
      const keyterms = [scenario.facts.address.written, scenario.caller.name, scenario.patient.name];
      e.connect(ready.stt, keyterms)
        .then(() => e.startMic())
        .then(() => {
          setEngineInfo({ voice: scenario.voiceId, model: e.model || "universal-3-6-pro" });
          setMicReady(true);
          setStatus("Hold Space to talk");
        })
        .catch((err) => {
          if (!(err instanceof MicDeniedError)) console.warn("transcription unavailable", err);
          setEngineInfo({ voice: scenario.voiceId, model: "typed" });
          setTypedOnly(true);
          setShowTyping(true);
          setStatus(err instanceof MicDeniedError ? "Your mic is blocked. Type your side of the call instead." : "Voice input is unavailable. Type your side of the call instead.");
        });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The line is unavailable right now.");
      setPhase("error");
      setStatus("");
    }
  }, [prepare, say, scenario]);

  const finish = useCallback(() => {
    if (!callRef.current) return;
    clearTimeout(silenceTimer.current);
    const ended = endCall(callRef.current, now());
    setCallState(ended);
    const c = score(ended, scenario);
    const prev = saveAttempt(c);
    setCard({ card: c, previous: prev?.card ?? null, trace: ended.panicTrace });
    voice.current?.close();
    ear.current?.close();
    voice.current = null;
    ear.current = null;
    setMicReady(false);
    setTypedOnly(false);
    setShowTyping(false);
    setPhase("ended");
    setStatus("Call ended.");
  }, [scenario]);

  // hang up automatically before the session cap
  useEffect(() => {
    if (phase === "live" && nowMs > CALL_CAP_MS) finish();
  }, [finish, nowMs, phase]);

  const startTalking = useCallback(() => {
    if (phaseRef.current !== "live" || talking || typedOnly || !micReady) return;
    clearTimeout(silenceTimer.current);
    if (cutHer()) talkedOverThisTurn.current = true;
    pressAt.current = performance.now();
    setPartial("");
    setTalking(true);
    ear.current?.press();
  }, [cutHer, micReady, talking, typedOnly]);

  const stopTalking = useCallback(async () => {
    if (!talking) return;
    setTalking(false);
    const rel = performance.now();
    const text = (await ear.current?.release()) ?? "";
    const sttMs = Math.round(performance.now() - rel);
    setPartial("");
    if (!text.trim()) {
      setStatus("Didn't catch that. Hold Space while you talk.");
      talkedOverThisTurn.current = false;
      return;
    }
    setLastTrainee(text);
    const silenceMs = callerEndedAt.current && pressAt.current > callerEndedAt.current ? pressAt.current - callerEndedAt.current : 0;
    void respond(text, { silenceMs, sttMs });
  }, [respond, talking]);

  const sendTyped = useCallback(() => {
    const text = typed.trim();
    if (!text || phaseRef.current !== "live") return;
    if (cutHer()) talkedOverThisTurn.current = true;
    setTyped("");
    setLastTrainee(text);
    void respond(text, { sttMs: null });
  }, [cutHer, respond, typed]);

  // Space: answer, then push-to-talk
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e)) return;
      if ((e.target as HTMLElement)?.tagName === "BUTTON") return; // let buttons handle their own Space
      e.preventDefault();
      if (e.repeat) return;
      if (phaseRef.current === "ringing") void answer();
      else startTalking();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e)) return;
      if ((e.target as HTMLElement)?.tagName === "BUTTON") return;
      e.preventDefault();
      void stopTalking();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [answer, startTalking, stopTalking]);

  // test hook for the QA scripts and the demo recorder: is she speaking right now?
  useEffect(() => {
    (window as unknown as { __rl?: unknown }).__rl = {
      playing: () => !!voice.current?.playing(),
      panic: () => callRef.current?.panic ?? null,
      earLog: () => ear.current?.log ?? [],
    };
  }, []);

  useEffect(
    () => () => {
      clearTimeout(silenceTimer.current);
      voice.current?.close();
      ear.current?.close();
      prepared.current?.then((r) => r.v.close()).catch(() => {});
    },
    [],
  );

  const reset = () => {
    setPhase("ringing");
    setCall(null);
    callRef.current = null;
    setCaptions([]);
    setCard(null);
    setStatus("");
    t0.current = 0;
    setNowMs(0);
  };

  const live = phase === "live";
  const panic = call?.panic ?? scenario.startPanic;
  const prevPanic = call && call.panicTrace.length > 1 ? call.panicTrace[call.panicTrace.length - 2].panic : null;

  return (
    <div className="min-h-dvh flex flex-col bg-canvas text-ink">
      <header className="min-h-[52px] px-5 flex items-center gap-3.5 border-b border-line flex-wrap py-2">
        <svg width="22" height="22" viewBox="0 0 48 48" role="img" aria-label="Rookie Line">
          <rect x="6" y="10" width="36" height="28" rx="5" fill="var(--accent)" />
          <rect x="14" y="21" width="20" height="6" rx="3" fill="var(--accent-ink)" />
        </svg>
        <span className="font-bold text-[17px] tracking-[-0.01em]">Rookie Line</span>
        <span className="text-sm text-ink-muted">Practice 911 calls for trainee call-takers</span>
        <span className="flex-1" />
        <span className="font-mono text-xs tracking-[0.08em] text-warning border border-line-input rounded-sm px-2 py-1">
          TRAINING SIMULATION · fictional caller and address
        </span>
        <a href="/about" className="text-sm underline-offset-4 hover:underline">
          How it works
        </a>
      </header>

      <div className="flex-1 flex flex-wrap min-h-0">
        {/* left: line keys */}
        <aside className="order-2 lg:order-1 flex-[1_1_260px] lg:max-w-[280px] p-5 flex flex-col gap-2.5 lg:border-r border-line">
          <span className="text-xs tracking-[0.06em] text-ink-muted">LINES</span>
          {scenarios.map((s) => {
            const active = s.id === scenario.id;
            const isLive = active && (phase === "live" || phase === "connecting");
            const ringing = active && phase === "ringing";
            return (
              <button
                key={s.id}
                disabled={phase === "live" || phase === "connecting"}
                onClick={() => {
                  if (s.id !== scenario.id) {
                    prepared.current?.then((r) => r.v.close()).catch(() => {});
                    prepared.current = null;
                  }
                  setScenarioId(s.id);
                  if (phase !== "ringing") reset();
                }}
                aria-pressed={active}
                className={`text-left min-h-16 px-3.5 py-2.5 rounded-md flex flex-col gap-0.5 transition-colors ${
                  isLive ? "bg-accent text-accent-ink" : ringing ? "border-2 border-accent ring-flash" : "border border-line-input"
                } disabled:cursor-not-allowed`}
              >
                <span className={`font-mono text-[13px] tracking-[0.06em] ${isLive ? "font-semibold" : ringing ? "text-accent" : "text-ink-muted"}`}>
                  LINE {s.line} · 911 · {isLive ? `LIVE ${fmt(nowMs)}` : ringing ? "RINGING" : "READY"}
                </span>
                <span className={`text-[15px] ${isLive ? "font-semibold" : ""}`}>{s.title}</span>
              </button>
            );
          })}
          <div className="mt-4 p-3.5 bg-surface-1 rounded-md flex flex-col gap-2">
            <span className="text-xs tracking-[0.06em] text-ink-muted">ON THIS CALL, GET</span>
            {scenario.checklist.map((c, i) => (
              <span key={c.id} className="text-sm">
                {i + 1} · {c.label}
              </span>
            ))}
          </div>
        </aside>

        {/* center: the caller stage */}
        <main className="order-1 lg:order-2 flex-[999_1_560px] min-w-0 px-6 sm:px-10 pt-7 flex flex-col gap-5">
          {phase === "ended" && card ? (
            <div className="py-4">
              <ScorecardView
                card={card.card}
                previous={card.previous}
                trace={card.trace}
                title={`Line ${scenario.line} · ${scenario.title}`}
                onAgain={() => void answer()}
                onNext={reset}
              />
            </div>
          ) : phase === "ringing" || phase === "error" || phase === "connecting" ? (
            <div className="flex-1 flex flex-col justify-center gap-5 py-10">
              <span className="font-mono text-sm tracking-[0.08em] text-accent">● INCOMING · LINE {scenario.line} · 911</span>
              <h1 className="m-0 text-[36px] sm:text-[52px] leading-[1.1] font-semibold tracking-[-0.02em] max-w-[760px]">{scenario.brief}</h1>
              <p className="m-0 text-[19px] leading-normal text-[#c3c9d1] max-w-[640px]">
                The caller is panicking. She stammers, cuts herself off and answers what you ask. Handle her right and you will hear her steady.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <button
                  onClick={() => void answer()}
                  disabled={phase === "connecting"}
                  className="h-14 px-7 rounded-md bg-accent text-accent-ink font-bold text-lg disabled:opacity-60"
                >
                  {phase === "connecting" ? "Connecting…" : `Answer line ${scenario.line}`}
                </button>
                <span className="text-[15px] text-ink-muted">or press Space · a headset helps</span>
              </div>
              {error && (
                <p role="alert" className="m-0 text-warning">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="size-2.5 rounded-full bg-accent" aria-hidden="true" />
                <span className="text-[13px] tracking-[0.06em] text-ink-muted">
                  CALLER · {scenario.caller.name.toUpperCase()}, {scenario.caller.age} · HER {scenario.patient.relation.toUpperCase()} NEEDS HELP
                </span>
                <span className="flex-1" />
                <span className="text-[13px] text-ink-muted">Voice: AssemblyAI text-to-speech</span>
                <Meter v={voiceLevel} />
              </div>
              <Captions lines={captions} />
              {thinking && <p className="m-0 text-ink-muted">…</p>}
              {(lastTrainee || partial || talking) && (
                <div className="self-end max-w-[520px] text-right flex flex-col gap-1">
                  <span className="text-xs tracking-[0.06em] text-ink-muted">YOU</span>
                  <p className={`m-0 text-[19px] leading-snug ${partial || talking ? "text-ink-muted" : "text-[#c3c9d1]"}`}>
                    {talking ? partial || "Listening…" : lastTrainee}
                  </p>
                </div>
              )}
              <div className="flex-1" />
              <section aria-label="Her panic" className="border-t border-line pt-3.5 pb-4 flex gap-5 items-end">
                <div className="flex flex-col gap-1 min-w-[120px]">
                  <span className="text-xs tracking-[0.06em] text-ink-muted">HER PANIC</span>
                  <span className="font-mono text-3xl font-semibold tabular-nums">
                    {panic}
                    <span className="text-base text-ink-muted"> / 10</span>
                  </span>
                  {prevPanic !== null && prevPanic !== panic && (
                    <span className={`text-[13px] ${panic < prevPanic ? "text-success" : "text-warning"}`}>
                      {panic < prevPanic ? "down" : "up"} from {prevPanic}
                    </span>
                  )}
                </div>
                <PanicTrace trace={call?.panicTrace ?? []} nowMs={nowMs} />
              </section>
            </>
          )}
        </main>

        {/* right: incident card */}
        <aside className="order-3 flex-[1_1_320px] lg:max-w-[360px] p-5 lg:border-l border-line bg-surface-1 flex flex-col gap-1">
          {phase === "ringing" && lastCard ? (
            <LastCall card={lastCard} />
          ) : (
            <IncidentCard call={call} scenario={scenario} nowMs={live ? nowMs : call ? (card?.card.durationMs ?? nowMs) : 0} />
          )}
          {metrics.length > 0 && (
            <details className="mt-3 text-[13px] text-ink-muted">
              <summary className="cursor-pointer">Under the hood</summary>
              <div className="font-mono text-xs leading-relaxed mt-2 flex flex-col gap-1">
                <span>Voice {engineInfo.voice || scenario.voiceId} · speech model {engineInfo.model || "universal-3-6-pro"}</span>
                <span>Facts the model cannot change: address, callback number</span>
                {metrics.slice(-6).map((m) => (
                  <span key={m.n}>
                    turn {m.n}: you stopped → she spoke in {m.totalMs !== null ? `${((m.totalMs + (m.sttMs ?? 0)) / 1000).toFixed(2)} s` : "–"}
                    {" "}(words {m.sttMs ?? "typed"}
                    {m.sttMs !== null ? " ms" : ""}, {m.source === "bank" ? "planned line" : `model ${m.modelMs} ms`}, first audio {m.firstAudioMs ?? "–"} ms)
                  </span>
                ))}
              </div>
            </details>
          )}
        </aside>
      </div>

      {/* control bar */}
      <footer className="sticky bottom-0 bg-canvas min-h-[72px] px-5 py-3 border-t border-line flex items-center gap-3 flex-wrap">
        {live && !typedOnly && (
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              startTalking();
            }}
            onPointerUp={() => void stopTalking()}
            onPointerLeave={() => talking && void stopTalking()}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                e.preventDefault();
                startTalking();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                void stopTalking();
              }
            }}
            aria-pressed={talking}
            disabled={!micReady}
            className={`h-12 px-5 rounded-md font-semibold text-base flex items-center gap-2.5 select-none touch-none disabled:opacity-50 ${talking ? "bg-accent text-accent-ink" : "bg-ink text-canvas"}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
            {talking ? "Talking… release to send" : "Hold Space to talk"}
            {talking && <Meter v={micLevel} dark />}
          </button>
        )}
        {live && (showTyping || typedOnly) ? (
          <form
            className="flex gap-2 flex-1 min-w-[260px]"
            onSubmit={(e) => {
              e.preventDefault();
              sendTyped();
            }}
          >
            <label htmlFor="typed" className="sr-only">
              Your side of the call
            </label>
            <input
              id="typed"
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="911, what's the address of your emergency?"
              className="flex-1 h-12 px-3 rounded-md bg-surface-1 border border-line-input text-base"
            />
            <button type="submit" className="h-12 px-4 rounded-md bg-surface-2">
              Say it
            </button>
          </form>
        ) : (
          live && (
            <button onClick={() => setShowTyping(true)} className="h-12 px-4 rounded-md bg-surface-2 text-[15px]">
              Type instead
            </button>
          )
        )}
        <span className="flex-1 text-sm text-ink-muted" role="status" aria-live="polite">
          {status}
        </span>
        {live && (
          <button onClick={finish} className="h-12 px-4 text-[15px] text-danger">
            Hang up
          </button>
        )}
      </footer>
    </div>
  );
}

function Meter({ v, dark = false }: { v: number; dark?: boolean }) {
  const bars = 9;
  return (
    <span className="inline-flex items-center gap-[3px] h-5" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => {
        const on = v * bars * 1.4 > i;
        const h = 4 + Math.round(Math.sin(((i + 1) / bars) * Math.PI) * 14);
        return (
          <span
            key={i}
            style={{
              width: 4,
              height: on ? h : 4,
              background: on ? (dark ? "var(--accent-ink)" : "var(--accent)") : "#5e6774",
              transition: "height 80ms",
            }}
          />
        );
      })}
    </span>
  );
}

function LastCall({ card }: { card: Scorecard }) {
  const sec = card.addressConfirmedMs !== null ? Math.round(card.addressConfirmedMs / 1000) : null;
  return (
    <section aria-label="Your last call on this line" className="flex flex-col gap-3">
      <span className="text-xs tracking-[0.06em] text-ink-muted">YOUR LAST CALL ON THIS LINE</span>
      <span className="font-mono text-4xl font-semibold tabular-nums">{sec !== null ? `${sec} s` : "—"}</span>
      <span className="text-[15px] text-[#c3c9d1]">{sec !== null ? "to a confirmed address" : "address never confirmed"}</span>
      <div className="border-t border-line pt-3 flex flex-col gap-2 text-sm">
        {card.rows.slice(0, 5).map((r) => (
          <span key={r.id}>
            <span className={r.ok ? "text-success" : "text-warning"} aria-hidden="true">
              {r.ok ? "✓" : "✗"}
            </span>{" "}
            {r.label}
          </span>
        ))}
        <span>
          Her panic: <span className="font-mono">{card.panicStart} → {card.panicEnd}</span>
        </span>
      </div>
    </section>
  );
}
