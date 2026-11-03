import type { Scorecard } from "@/lib/engine/score";
import { fmt } from "@/lib/engine/score";
import { PanicTrace } from "./PanicTrace";

export function ScorecardView({
  card,
  previous,
  trace,
  title,
  onNext,
  onAgain,
  transcriptText,
}: {
  card: Scorecard;
  previous: Scorecard | null;
  trace: { t: number; panic: number }[];
  title: string;
  onNext?: () => void;
  onAgain?: () => void;
  transcriptText?: string;
}) {
  const sec = card.addressConfirmedMs !== null ? Math.round(card.addressConfirmedMs / 1000) : null;
  const prevSec = previous?.addressConfirmedMs != null ? Math.round(previous.addressConfirmedMs / 1000) : null;
  const delta = sec !== null && prevSec !== null ? prevSec - sec : null;
  return (
    <div className="flex flex-wrap gap-12 content-start">
      <section className="flex-[1_1_520px] min-w-0 flex flex-col gap-4">
        <span className="font-mono text-[13px] tracking-[0.08em] text-ink-muted">
          CALL ENDED · {title.toUpperCase()} · {fmt(card.durationMs)}
        </span>
        <h2 className="m-0 text-[40px] sm:text-[52px] leading-[1.05] font-semibold tracking-[-0.02em]">
          {sec !== null ? (
            <>
              Address confirmed in <span className="font-mono tabular-nums">{sec}</span> s
            </>
          ) : (
            "The address was never confirmed"
          )}
        </h2>
        {delta !== null && (
          <p className="m-0 text-lg text-[#c3c9d1]">
            {delta > 0 ? (
              <span className="text-success">{delta} s faster than your last try.</span>
            ) : delta < 0 ? (
              <span className="text-warning">{-delta} s slower than your last try.</span>
            ) : (
              "Same as your last try."
            )}
          </p>
        )}
        <div className="mt-2 flex flex-col">
          {card.rows.map((r) => (
            <div key={r.id} className="grid grid-cols-[28px_minmax(0,1fr)_72px] gap-3 py-3.5 border-t border-line items-baseline last:border-b">
              <span className={r.ok === true ? "text-success" : r.ok === false ? "text-warning" : "text-ink-muted"} aria-hidden="true">
                {r.ok === true ? "✓" : r.ok === false ? "✗" : "·"}
              </span>
              <span className="text-[17px]">
                <span className="sr-only">{r.ok === true ? "Done: " : r.ok === false ? "Missed: " : ""}</span>
                {r.label}
              </span>
              <span className="font-mono text-ink-muted text-right tabular-nums">{r.t !== undefined ? fmt(r.t) : ""}</span>
            </div>
          ))}
        </div>
        {(onNext || onAgain) && (
          <div className="flex flex-wrap gap-3 mt-2">
            {onAgain && (
              <button onClick={onAgain} className="h-12 px-5 rounded-md bg-ink text-canvas font-semibold text-base">
                Try this caller again
              </button>
            )}
            {onNext && (
              <button onClick={onNext} className="h-12 px-4 rounded-md bg-surface-2 text-[15px]">
                Back to the lines
              </button>
            )}
            {transcriptText && (
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(transcriptText)}`}
                download={`rookie-line-${card.scenarioId}-call.txt`}
                className="h-12 px-4 rounded-md bg-surface-2 text-[15px] inline-flex items-center"
              >
                Download the transcript
              </a>
            )}
          </div>
        )}
      </section>
      <section aria-label="Panic over the call" className="flex-[1_1_380px] min-w-0 flex flex-col gap-3 p-5 bg-surface-1 rounded-lg self-start">
        <span className="text-xs tracking-[0.06em] text-ink-muted">PANIC, TURN BY TURN</span>
        <span className="font-mono text-3xl font-semibold tabular-nums">
          {card.panicStart} → {card.panicEnd}
        </span>
        <PanicTrace trace={trace} nowMs={card.durationMs} height={140} live={false} />
        <div className="flex flex-col gap-1.5 text-sm text-[#c3c9d1]">
          {card.panicReasons.slice(0, 6).map((r, i) => (
            <span key={i}>
              <span className="font-mono text-ink-muted tabular-nums">{fmt(r.t)}</span> {r.delta > 0 ? `+${r.delta}` : r.delta} · {r.detail}
            </span>
          ))}
          {!card.panicReasons.length && <span className="text-ink-muted">Nothing you said moved her panic.</span>}
        </div>
      </section>
    </div>
  );
}
