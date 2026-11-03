import { describe, it, expect } from "vitest";
import { allow } from "@/lib/server/ratelimit";

describe("rate limiter", () => {
  it("allows up to the limit in the window, then refuses", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(allow("k", 3, 1000, t + i)).toBe(true);
    expect(allow("k", 3, 1000, t + 5)).toBe(false);
    expect(allow("k", 3, 1000, t + 2000)).toBe(true);
  });
});
