// The signature visual: her panic as a line over the call. It steps down when the
// trainee handles her right and up when they talk over her.
interface Props {
  trace: { t: number; panic: number }[];
  nowMs: number;
  height?: number;
  live?: boolean;
}

export function PanicTrace({ trace, nowMs, height = 96, live = true }: Props) {
  const W = 640;
  const H = height;
  const pad = 10;
  const span = Math.max(60_000, nowMs + 5_000);
  const x = (t: number) => (t / span) * W;
  const y = (p: number) => pad + ((10 - p) / 10) * (H - pad * 2);
  if (!trace.length) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }} aria-hidden="true">
        <line x1="0" y1={H - pad} x2={W} y2={H - pad} stroke="var(--line)" strokeDasharray="4 6" />
      </svg>
    );
  }
  // step line: hold each level until the next change, then to "now"
  const pts: string[] = [];
  trace.forEach((p, i) => {
    if (i > 0) pts.push(`${x(p.t)},${y(trace[i - 1].panic)}`);
    pts.push(`${x(p.t)},${y(p.panic)}`);
  });
  const last = trace[trace.length - 1];
  const endX = x(live ? Math.max(nowMs, last.t) : last.t + 2000);
  pts.push(`${endX},${y(last.panic)}`);
  const area = `M0,${H} L${pts.join(" L")} L${endX},${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: H }}
      role="img"
      aria-label={`Her panic by turn: ${trace.map((p) => p.panic).join(", ")}`}
    >
      <line x1="0" y1={H - pad} x2={W} y2={H - pad} stroke="var(--line)" />
      <path d={area} fill="var(--accent)" fillOpacity="0.12" />
      <polyline points={pts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={endX} cy={y(last.panic)} r="5" fill="var(--accent)" />
    </svg>
  );
}
