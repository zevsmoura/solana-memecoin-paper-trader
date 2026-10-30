import { describe, expect, it } from "vitest";
import { compactUsd } from "@/lib/money";

describe("compactUsd", () => {
  it("abbreviates market caps with readable units", () => {
    expect(compactUsd(2_123_123)).toBe("$2.1M");
    expect(compactUsd(100_000)).toBe("$100K");
    expect(compactUsd(2_100)).toBe("$2.1K");
  });

  it("keeps small values readable and rejects invalid input", () => {
    expect(compactUsd(812)).toBe("$812.00");
    expect(compactUsd(Number.NaN)).toBe("—");
  });
});
