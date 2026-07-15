import { afterEach, describe, expect, it } from "vitest";
import { formatTimeUtc } from "../lib/date-format";

const originalTimezone = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTimezone;
});

describe("formatTimeUtc", () => {
  it("returns the same hydration-safe text in different process timezones", () => {
    const generatedAt = "2026-07-15T18:16:00.000Z";

    process.env.TZ = "UTC";
    const serverText = formatTimeUtc(generatedAt);

    process.env.TZ = "Asia/Karachi";
    const browserText = formatTimeUtc(generatedAt);

    expect(serverText).toBe("06:16 PM UTC");
    expect(browserText).toBe(serverText);
  });

  it("handles an invalid timestamp without throwing", () => {
    expect(formatTimeUtc("not-a-timestamp")).toBe("time unavailable");
  });
});
