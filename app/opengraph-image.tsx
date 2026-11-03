import { ImageResponse } from "next/og";
import { sampleCard, sampleEnded } from "@/lib/sample-run";

export const alt = "Rookie Line: practice 911 calls for trainee call-takers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The share card: the product's own first screen in miniature, not a logo on a gradient.
export default function OpenGraph() {
  // the sample run's own panic trace and numbers
  const pts = sampleEnded.panicTrace;
  const span = Math.max(1, sampleCard.durationMs);
  const points = pts
    .flatMap((p, i) => {
      const x = (p.t / span) * 420;
      const y = 10 + ((10 - p.panic) / 10) * 90;
      const prevY = i > 0 ? 10 + ((10 - pts[i - 1].panic) / 10) * 90 : y;
      return i > 0 ? [`${x},${prevY}`, `${x},${y}`] : [`${x},${y}`];
    })
    .concat(`420,${10 + ((10 - sampleCard.panicEnd) / 10) * 90}`)
    .join(" ");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#13161B", color: "#ECEFF3", display: "flex", flexDirection: "column", padding: 64, gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 54, height: 40, background: "#FF4632", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 30, height: 9, background: "#160302", borderRadius: 5 }} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>Rookie Line</div>
          <div style={{ fontSize: 28, color: "#9AA3AF", marginLeft: 12 }}>Practice 911 calls for trainee call-takers</div>
        </div>
        <div style={{ fontSize: 26, color: "#FF4632", letterSpacing: 2 }}>● LINE 1 · 911 · LIVE</div>
        <div style={{ fontSize: 64, lineHeight: 1.15, fontWeight: 600, display: "flex", flexWrap: "wrap" }}>
          It&apos;s- it&apos;s 4-1-7 Maple-- Maple Court! Please, PLEASE hurry —
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 30, marginTop: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 24, color: "#9AA3AF" }}>
            <span>HER PANIC · SAMPLE CALL</span>
            <span style={{ fontSize: 56, color: "#ECEFF3" }}>{`${sampleCard.panicStart} → ${sampleCard.panicEnd}`}</span>
          </div>
          <svg width="760" height="110" viewBox="0 0 420 110">
            <polyline
              points={points}
              fill="none"
              stroke="#FF4632"
              strokeWidth="5"
            />
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
