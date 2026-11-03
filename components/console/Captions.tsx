// The caller's words, lit one by one as the voice reaches them. A line she was cut
// off in ends at the last word heard, with a hard break.
export interface CaptionLine {
  id: number;
  text: string;
  lit: number; // words heard so far
  cutAt?: number; // set when the trainee cut her off
  done: boolean;
}

export function Captions({ lines }: { lines: CaptionLine[] }) {
  // a line cut before any word was heard is not shown
  const older = lines.slice(0, -1).filter((l) => l.cutAt !== 0).slice(-2);
  const current = lines.at(-1);
  return (
    <div className="flex flex-col gap-3.5 max-w-[900px]" aria-live="off">
      {older.map((l) => (
        <p key={l.id} className="m-0 text-[22px] leading-[1.35] text-ink-dim">
          {l.cutAt !== undefined ? (
            <>
              {l.text.split(/\s+/).slice(0, l.cutAt).join(" ")}
              <span className="text-accent"> —</span>
            </>
          ) : (
            l.text
          )}
        </p>
      ))}
      {current && <CurrentLine line={current} />}
    </div>
  );
}

function CurrentLine({ line }: { line: CaptionLine }) {
  const words = line.text.split(/\s+/).filter(Boolean);
  const cut = line.cutAt;
  const shown = cut !== undefined ? words.slice(0, cut) : words;
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[30px] sm:text-[40px] leading-[1.2] font-medium tracking-[-0.015em]">
        {shown.map((w, i) => (
          <span key={i} style={{ color: line.done || i < line.lit ? "var(--ink)" : "#4a515c", transition: "color 120ms" }}>
            {w}{" "}
          </span>
        ))}
        {cut !== undefined && <span className="text-accent">—</span>}
      </p>
      {cut !== undefined && (
        <span className="font-mono text-xs tracking-[0.06em] text-ink-muted">CUT OFF · YOU STARTED TALKING</span>
      )}
    </div>
  );
}
