import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT,
  ENGAGEMENT_WAIVER,
  waiverClaimsSavingHonestly,
  waiverStatus,
} from "@/lib/diagnostic-offer";

const END = ENGAGEMENT_WAIVER.endsAt;
const at = (iso: string) => waiverStatus(new Date(iso));

describe("engagement fee waiver", () => {
  it("is active well before the closing date", () => {
    const s = at("2026-08-04T09:00:00.000Z");
    expect(s.active).toBe(true);
    expect(s.daysRemaining).toBeGreaterThan(80);
  });

  it("stays active for the whole of the closing day", () => {
    // Someone reading the page at breakfast and someone reading it at 11pm on
    // the closing date must see the same offer.
    expect(at(`${END}T00:00:00.000Z`).active).toBe(true);
    expect(at(`${END}T23:59:59.000Z`).active).toBe(true);
    expect(at(`${END}T23:59:59.000Z`).daysRemaining).toBe(0);
  });

  it("closes the moment the day is over", () => {
    // The failure this exists to prevent: copy written as a fixed string is
    // still on the site in December claiming the work is free.
    const s = at("2026-11-05T00:00:01.000Z");
    expect(s.active).toBe(false);
    expect(s.daysRemaining).toBeNull();
  });

  it("stays closed indefinitely afterwards", () => {
    expect(at("2027-06-01T00:00:00.000Z").active).toBe(false);
    expect(at("2030-01-01T00:00:00.000Z").active).toBe(false);
  });

  it("reports the closing date whether open or closed", () => {
    expect(at("2026-09-01T00:00:00.000Z").endsAt).toBe(END);
    expect(at("2027-01-01T00:00:00.000Z").endsAt).toBe(END);
  });

  it("treats an unreadable clock as closed rather than open", () => {
    // Fail towards not making a commercial promise.
    expect(waiverStatus(new Date("not a date")).active).toBe(false);
  });

  it("claims a saving only against a fee that is actually published", () => {
    // The rule, not the current values: copy may say "normally" or "waived"
    // only while ENGAGEMENT.fee exists. Striking through a number nobody was
    // ever asked to pay is a misleading-price claim, and the one thing a
    // governance product cannot afford on its own pricing page. If the fee is
    // ever set back to null without the copy changing, this fails.
    expect(waiverClaimsSavingHonestly()).toBe(true);
  });

  it("shows the same figure in the copy as the fee that will be charged", () => {
    // A mismatch means the page strikes through one number and bills another.
    expect(ENGAGEMENT.fee).not.toBeNull();
    expect(ENGAGEMENT_WAIVER.terms).toContain(ENGAGEMENT.fee!.amount);
  });

  it("says what happens the day after the window closes", () => {
    // "Free until November" without "then what" is the gap buyers distrust.
    expect(ENGAGEMENT_WAIVER.terms).toMatch(/from 5 November/i);
  });

  it("promises no card capture and no automatic conversion", () => {
    // The registry's own warning: a waived fee that later starts charging on a
    // customer-triggered condition is a negative-option arrangement.
    expect(ENGAGEMENT_WAIVER.terms).toMatch(/no card/i);
    expect(ENGAGEMENT_WAIVER.terms).toMatch(/nothing converts/i);
  });

  it("keeps the closing date in both the machine field and the human copy", () => {
    // A mismatch here means the page says one date and the logic uses another.
    const [year, month, day] = END.split("-").map(Number);
    const monthName = new Date(Date.UTC(year, month - 1, day)).toLocaleString("en-GB", {
      month: "long",
      timeZone: "UTC",
    });
    for (const text of [ENGAGEMENT_WAIVER.headline, ENGAGEMENT_WAIVER.terms]) {
      expect(text).toContain(String(day));
      expect(text).toContain(monthName);
      expect(text).toContain(String(year));
    }
  });
});
