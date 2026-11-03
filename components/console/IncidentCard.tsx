import type { CallState, Scenario } from "@/lib/engine/types";
import { fmt } from "@/lib/engine/score";

// The CAD incident card: each slot fills only from what happened on the call.
type SlotState = "none" | "heard" | "verified" | "mismatch" | "done";

function Slot({ label, state, value, hint }: { label: string; state: SlotState; value?: string; hint?: string }) {
  const mark =
    state === "verified" || state === "done" ? (
      <span className="text-success" aria-hidden="true">✓ </span>
    ) : state === "heard" ? (
      <span className="text-warning" aria-hidden="true">● </span>
    ) : state === "mismatch" ? (
      <span className="text-warning" aria-hidden="true">✗ </span>
    ) : null;
  return (
    <div className="py-3 border-b border-line flex flex-col gap-1">
      <span className="text-[13px] text-ink-muted">{label}</span>
      <span className={`text-[15px] ${state === "none" ? "text-ink-muted" : ""} ${value && state !== "none" ? "font-mono text-base" : ""}`}>
        {mark}
        {value ?? "Not yet"}
      </span>
      {hint && <span className={`text-[13px] ${state === "verified" ? "text-success" : "text-warning"}`}>{hint}</span>}
    </div>
  );
}

export function IncidentCard({ call, scenario, nowMs }: { call: CallState | null; scenario: Scenario; nowMs: number }) {
  const ev = (k: string) => call?.events.find((e) => e.kind === k);
  const lastMismatch = (k: string) => [...(call?.events ?? [])].reverse().find((e) => e.kind === k);
  const addrV = ev("address_verified");
  const addrMis = lastMismatch("address_mismatch");
  const cbV = ev("callback_verified");
  const cbMis = lastMismatch("callback_mismatch");
  const a = scenario.facts.address;
  const addr: SlotState = addrV ? "verified" : addrMis ? "mismatch" : call?.given.address ? "heard" : "none";
  const cb: SlotState = cbV ? "verified" : cbMis ? "mismatch" : call?.given.callback ? "heard" : "none";
  const what = ev("what_happened");
  const breathing = ev("asked_breathing");
  const cpr = ev("cpr_instructed");
  return (
    <section aria-label="Incident card" className="flex flex-col">
      <div className="flex items-baseline justify-between pb-2.5 border-b border-line">
        <span className="text-xs tracking-[0.06em] text-ink-muted">INCIDENT CARD</span>
        <span className="font-mono text-xl font-semibold tabular-nums" aria-label="Call time">
          {fmt(nowMs)}
        </span>
      </div>
      <Slot
        label="Location"
        state={addr}
        value={addr === "none" ? undefined : addr === "verified" ? a.written : `Heard: ${a.written}`}
        hint={addr === "verified" ? `Read back · ${fmt(addrV!.t)}` : addr === "heard" ? "Read it back to confirm" : addr === "mismatch" ? "You read it back wrong. She corrected you." : undefined}
      />
      <Slot
        label="Callback number"
        state={cb}
        value={cb === "none" ? undefined : `${cb === "verified" ? "" : "Heard: "}${scenario.facts.callback.digits.replace(/(\d{3})(\d{4})/, "$1-$2")}`}
        hint={cb === "verified" ? `Read back · ${fmt(cbV!.t)}` : cb === "heard" ? "Read it back to confirm" : cb === "mismatch" ? "You read it back wrong." : undefined}
      />
      <Slot label="What happened" state={what ? "done" : "none"} value={what ? `${scenario.patient.relation === "father" ? "Father" : "Patient"} collapsed · ${fmt(what.t)}` : undefined} />
      <Slot label="Is he breathing?" state={breathing ? "done" : "none"} value={breathing ? `Gasping, not normal · ${fmt(breathing.t)}` : "Not asked yet"} />
      <Slot label="CPR instructions" state={cpr ? "done" : "none"} value={cpr ? `Started · ${fmt(cpr.t)}` : "Not started"} />
    </section>
  );
}
