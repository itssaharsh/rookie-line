// The trainee's side: microphone -> 16 kHz PCM -> AssemblyAI Universal Streaming STT.
// Push-to-talk: audio is sent only while the key is held; release sends ForceEndpoint
// so the turn ends at once instead of waiting for silence.
import { toPcm16k, level } from "./pcm";

const WS_URL = "wss://streaming.assemblyai.com/v3/ws";

export class MicDeniedError extends Error {}

export interface EarEvents {
  onPartial?: (text: string) => void;
  onLevel?: (v: number) => void;
  onClose?: (code: number) => void;
}

export class TraineeEar {
  private ws?: WebSocket;
  private ctx?: AudioContext;
  private stream?: MediaStream;
  private node?: AudioWorkletNode;
  private holding = false;
  private tailUntil = 0;
  private pending: Float32Array[] = [];
  private pendingLen = 0;
  private finals: string[] = [];
  private partial = "";
  private waiter?: (text: string) => void;
  model = "";
  constructor(private events: EarEvents = {}) {}

  connect(token: string, keyterms: string[]): Promise<Record<string, unknown>> {
    const qs = new URLSearchParams({
      sample_rate: "16000",
      encoding: "pcm_s16le",
      speech_model: "universal-3-6-pro",
      token,
    });
    if (keyterms.length) qs.set("keyterms_prompt", JSON.stringify(keyterms));
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_URL}?${qs}`);
      ws.binaryType = "arraybuffer";
      this.ws = ws;
      let begun = false;
      ws.onmessage = (ev) => {
        const m = JSON.parse(String(ev.data));
        if (m.type === "Begin") {
          begun = true;
          this.model = String(m.configuration?.model ?? "");
          resolve(m.configuration ?? {});
        } else if (m.type === "Turn") {
          const text = String(m.transcript ?? "");
          if (m.end_of_turn) {
            if (text) this.finals.push(text);
            this.partial = "";
            if (!this.holding && this.waiter) this.resolveTurn();
          } else {
            this.partial = text;
            this.events.onPartial?.([...this.finals, text].join(" ").trim());
          }
        }
      };
      ws.onerror = () => {
        if (!begun) reject(new Error("transcription connection failed"));
      };
      ws.onclose = (e) => {
        if (!begun) reject(new Error(`transcription closed ${e.code} ${e.reason}`));
        this.events.onClose?.(e.code);
      };
    });
  }

  get open() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Ask for the microphone and start the tap. Throws MicDeniedError when blocked. */
  async startMic() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch (err) {
      throw new MicDeniedError(err instanceof Error ? err.message : "microphone blocked");
    }
    this.ctx = new AudioContext();
    await this.ctx.audioWorklet.addModule("/worklets/mic-tap.js");
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "mic-tap");
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => this.onBlock(e.data);
    src.connect(this.node);
  }

  private onBlock(block: Float32Array) {
    this.events.onLevel?.(this.holding ? level(block) : 0);
    const sending = this.holding || performance.now() < this.tailUntil;
    if (!sending || !this.ctx) return;
    this.pending.push(block);
    this.pendingLen += block.length;
    // send in ~50 ms chunks
    if (this.pendingLen >= this.ctx.sampleRate * 0.05) this.flushAudio();
  }

  private flushAudio() {
    if (!this.ctx || !this.pendingLen) return;
    const all = new Float32Array(this.pendingLen);
    let o = 0;
    for (const b of this.pending) {
      all.set(b, o);
      o += b.length;
    }
    this.pending = [];
    this.pendingLen = 0;
    const pcm = toPcm16k(all, this.ctx.sampleRate);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(pcm.buffer);
  }

  press() {
    this.finals = [];
    this.partial = "";
    this.holding = true;
    void this.ctx?.resume();
  }

  /** Release: keep 200 ms of tail, then end the turn now. Resolves with what was said. */
  release(timeoutMs = 2500): Promise<string> {
    this.holding = false;
    this.tailUntil = performance.now() + 200;
    return new Promise((resolve) => {
      this.waiter = resolve;
      setTimeout(() => {
        this.flushAudio();
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "ForceEndpoint" }));
      }, 220);
      setTimeout(() => {
        if (this.waiter === resolve) this.resolveTurn();
      }, timeoutMs);
    });
  }

  private resolveTurn() {
    const text = [...this.finals, this.partial].join(" ").replace(/\s+/g, " ").trim();
    const w = this.waiter;
    this.waiter = undefined;
    this.finals = [];
    this.partial = "";
    w?.(text);
  }

  close() {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "Terminate" }));
    } catch {
      /* ignore */
    }
    setTimeout(() => this.ws?.close(), 300);
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
  }
}
