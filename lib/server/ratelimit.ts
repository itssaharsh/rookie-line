// Small in-memory limiter. On Vercel each warm instance keeps its own counts, so this
// is a speed bump against a loop hammering one instance, not a hard global cap; the
// tokens themselves cap each session at five minutes.
type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export function allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= limit) {
    buckets.set(key, b);
    return false;
  }
  b.hits.push(now);
  buckets.set(key, b);
  if (buckets.size > 5000) buckets.clear();
  return true;
}

export function clientIp(headers: Headers): string {
  return (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || headers.get("x-real-ip") || "local";
}
