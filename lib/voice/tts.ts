// The caller's voice: one AssemblyAI Streaming TTS session for the whole call.
// Lines are sent as Generate + Flush; audio frames are scheduled back to back on a
// 24 kHz AudioContext; Cancel stops her mid-word when the trainee cuts in.
import { base64ToInt16, int16ToFloat32, estimateWordsHeard, wordsStarted, type WordTiming } from "./pcm";

const SAMPLE_RATE = 24000;
const WS_URL = "wss://tts.us.assemblyai.com/v1/ws";

export interface SpokenLine {
  id: number;
  text: string;
  flushId?: number;
  startAt?: number; // AudioContext time of the first sample
  until: number; // AudioContext time the last scheduled sample ends
  sources: AudioBufferSourceNode[];
  words?: WordTiming[];
  synthesized: boolean;
  cancelled: boolean;
  firstAudioMs?: number; // ms from speak() to first audio frame
  sentAt: number;
  totalMs?: number;
}

export interface VoiceEvents {
  onLineStart?: (line: SpokenLine) => void;
  onWords?: (line: SpokenLine) => void;
  onLineEnd?: (line: SpokenLine) => void;
  onError?: (message: string) => void;
  onClose?: (code: number) => void;
}

export interface CutResult {
  lineId: number;
  wordsHeard: number;
  playedMs: number;
}

export class CallerVoice {
  readonly ctx: AudioContext;
  private gain: GainNode;
  private analyser: AnalyserNode;
  private ws?: WebSocket;
  private lines: SpokenLine[] = [];
  private awaiting: SpokenLine[] = []; // lines whose flush_id is not known yet
  private dropping = 0; // Cancels not yet answered: drop their audio
  private nextId = 1;
  private keepAlive?: ReturnType<typeof setInterval>;
  private endTimers = new Map<number, ReturnType<typeof setTimeout>>();
  voiceId = "";
  constructor(private events: VoiceEvents = {}) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    // the device's native rate; 24 kHz buffers are resampled by the browser on playback
    this.ctx = new Ctx({ latencyHint: "interactive" });
    this.gain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.gain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  /** Open the session. Resolves with the Begin configuration. */
  connect(token: string, voiceId: string, language: string): Promise<Record<string, unknown>> {
    this.voiceId = voiceId;
    const qs = new URLSearchParams({ voice_id: voiceId, language, sample_rate: String(SAMPLE_RATE), encoding: "pcm_s16le", token });
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_URL}?${qs}`);
      this.ws = ws;
      let begun = false;
      ws.onmessage = (ev) => {
        const m = JSON.parse(String(ev.data));
        if (m.type === "Begin") {
          begun = true;
          resolve(m.configuration ?? {});
          this.keepAlive = setInterval(() => this.send({ type: "KeepAlive" }), 60_000);
        } else this.onFrame(m);
      };
      ws.onerror = () => {
        if (!begun) reject(new Error("voice connection failed"));
        else this.events.onError?.("voice connection error");
      };
      ws.onclose = (e) => {
        clearInterval(this.keepAlive);
        if (!begun) reject(new Error(`voice closed ${e.code} ${e.reason}`));
        this.events.onClose?.(e.code);
      };
    });
  }

  private send(m: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  get open() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Speak one line. Returns its id. */
  speak(text: string): SpokenLine {
    const line: SpokenLine = { id: this.nextId++, text, until: 0, sources: [], synthesized: false, cancelled: false, sentAt: performance.now() };
    this.lines.push(line);
    this.awaiting.push(line);
    this.send({ type: "Generate", text });
    this.send({ type: "Flush" });
    return line;
  }

  private lineByFlush(flushId: number): SpokenLine | undefined {
    let line = this.lines.find((l) => l.flushId === flushId);
    if (!line && this.awaiting.length) {
      line = this.awaiting.shift()!;
      line.flushId = flushId;
    }
    return line;
  }

  private onFrame(m: { type: string; [k: string]: unknown }) {
    switch (m.type) {
      case "Audio": {
        if (this.dropping > 0) return; // tail of a cancelled line
        const line = this.lineByFlush(m.flush_id as number);
        if (!line || line.cancelled) return;
        const pcm = int16ToFloat32(base64ToInt16(m.audio as string));
        const buf = this.ctx.createBuffer(1, pcm.length, SAMPLE_RATE);
        buf.copyToChannel(pcm, 0);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.gain);
        const at = Math.max(this.ctx.currentTime + 0.03, line.until || 0);
        src.start(at);
        line.sources.push(src);
        if (line.startAt === undefined) {
          line.startAt = at;
          line.firstAudioMs = performance.now() - line.sentAt;
          this.events.onLineStart?.(line);
        }
        line.until = at + buf.duration;
        this.armEnd(line);
        break;
      }
      case "FlushDone": {
        const line = this.lineByFlush(m.flush_id as number);
        if (!line) return;
        line.synthesized = true;
        line.totalMs = Number(m.audio_duration_ms ?? 0);
        if (!line.totalMs && line.startAt === undefined) this.finish(line); // nothing to say
        else this.armEnd(line);
        break;
      }
      case "WordBoundaries": {
        const line = this.lines.find((l) => l.flushId === (m.flush_id as number));
        if (!line || line.cancelled) return;
        const base = Number(m.audio_start_ms ?? 0);
        const words = (m.words as { word: string; start: number; end: number }[]) ?? [];
        line.words = words.map((w) => ({ word: w.word, start: w.start - base, end: w.end - base }));
        this.events.onWords?.(line);
        break;
      }
      case "Cancelled":
        this.dropping = Math.max(0, this.dropping - 1);
        break;
      case "Error":
        this.events.onError?.(String(m.error ?? "voice error"));
        break;
    }
  }

  private armEnd(line: SpokenLine) {
    if (!line.synthesized) return;
    clearTimeout(this.endTimers.get(line.id));
    const ms = Math.max(0, (line.until - this.ctx.currentTime) * 1000) + 30;
    this.endTimers.set(line.id, setTimeout(() => this.finish(line), ms));
  }

  private finish(line: SpokenLine) {
    clearTimeout(this.endTimers.get(line.id));
    this.endTimers.delete(line.id);
    this.events.onLineEnd?.(line);
  }

  /** The line currently audible, if any. */
  playing(): SpokenLine | undefined {
    const now = this.ctx.currentTime;
    return this.lines.find((l) => !l.cancelled && l.startAt !== undefined && now < l.until + 0.02) ??
      this.lines.find((l) => !l.cancelled && !l.synthesized && l.startAt === undefined && performance.now() - l.sentAt < 4000);
  }

  /** Elapsed ms of the given line's audio. */
  elapsedMs(line: SpokenLine): number {
    if (line.startAt === undefined) return 0;
    return Math.max(0, (this.ctx.currentTime - line.startAt) * 1000);
  }

  /** Barge-in: stop her now. Returns how much of the line was heard. */
  cut(): CutResult | null {
    const line = this.playing();
    if (!line) return null;
    const playedMs = this.elapsedMs(line);
    line.cancelled = true;
    for (const s of line.sources) {
      try {
        s.stop();
      } catch {
        /* not started */
      }
    }
    if (!line.synthesized) {
      this.dropping += 1;
      this.send({ type: "Cancel" });
    }
    const heard = line.words
      ? wordsStarted(line.words, playedMs)
      : estimateWordsHeard(line.text, playedMs, line.totalMs ?? Math.max(playedMs, line.text.length * 65));
    this.awaiting = this.awaiting.filter((l) => l !== line);
    this.finish(line);
    return { lineId: line.id, wordsHeard: heard, playedMs };
  }

  /** Output level 0..1 for the meter. */
  level(): number {
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    let s = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      s += v * v;
    }
    return Math.min(1, Math.sqrt(s / data.length) * 3);
  }

  async resume() {
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  close() {
    clearInterval(this.keepAlive);
    for (const l of this.lines) for (const s of l.sources) {
      try {
        s.stop();
      } catch {
        /* ignore */
      }
    }
    this.send({ type: "Terminate" });
    setTimeout(() => this.ws?.close(), 300);
    void this.ctx.close();
  }
}
