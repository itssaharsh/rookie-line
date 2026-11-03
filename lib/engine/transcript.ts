// The call as a trainer reads it afterwards: who said what, when, and how scared she was.
import type { CallState, Scenario } from "./types";
import { fmt, type Scorecard } from "./score";

export function transcript(state: CallState, s: Scenario, card: Scorecard): string {
  const lines: string[] = [];
  lines.push(`Rookie Line · Line ${s.line} · ${s.title} · training simulation (fictional caller)`);
  lines.push(`Call length ${fmt(card.durationMs)} · address confirmed ${card.addressConfirmedMs !== null ? `at ${fmt(card.addressConfirmedMs)}` : "never"} · panic ${card.panicStart} -> ${card.panicEnd}`);
  lines.push("");
  for (const t of state.turns) {
    if (!t.text) continue;
    if (t.who === "caller") {
      const words = t.text.split(/\s+/);
      const said = t.cutAt !== undefined ? `${words.slice(0, t.cutAt).join(" ")} [cut off]` : t.text;
      const src = t.source === "model" ? " (model-phrased)" : t.source === "fallback" ? " (fallback line)" : "";
      lines.push(`${fmt(t.t)}  ${s.caller.name.toUpperCase()} [panic ${t.panic ?? "?"}]${src}: ${said}`);
    } else {
      lines.push(`${fmt(t.t)}  YOU: ${t.text}`);
    }
  }
  lines.push("");
  lines.push("Scorecard");
  for (const r of card.rows) lines.push(`  ${r.ok === true ? "[x]" : r.ok === false ? "[ ]" : " - "} ${r.label}${r.t !== undefined ? ` (${fmt(r.t)})` : ""}`);
  if (card.panicReasons.length) {
    lines.push("");
    lines.push("Why the panic moved");
    for (const p of card.panicReasons) lines.push(`  ${fmt(p.t)}  ${p.delta > 0 ? `+${p.delta}` : p.delta}  ${p.detail}`);
  }
  return lines.join("\n") + "\n";
}
