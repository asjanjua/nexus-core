import { describe, expect, it } from "vitest";
import { repository } from "@/lib/data/repository";
import { buildUnsubscribeToken, decodeUnsubscribeToken } from "@/lib/email/resend";

/**
 * The unsubscribe route previously audited the request, rendered a page saying
 * "You will no longer receive scheduled briefs by email", and suppressed
 * nothing: `synthesis_email_unsubscribed` was written in one place and read in
 * none. These tests pin the part that makes that sentence true.
 */
describe("email suppression (migration 0039)", () => {
  it("suppresses an address for its workspace", async () => {
    const ws = `ws-sup-${Date.now()}-a`;
    expect((await repository.listSuppressedEmails(ws)).has("cfo@example.com")).toBe(false);

    await repository.suppressEmail(ws, "cfo@example.com");

    expect((await repository.listSuppressedEmails(ws)).has("cfo@example.com")).toBe(true);
  });

  it("normalises case and surrounding whitespace", async () => {
    const ws = `ws-sup-${Date.now()}-b`;
    await repository.suppressEmail(ws, "  CFO@Example.COM  ");

    const suppressed = await repository.listSuppressedEmails(ws);
    expect(suppressed.has("cfo@example.com")).toBe(true);
  });

  it("is idempotent, so clicking an old link twice does not error", async () => {
    const ws = `ws-sup-${Date.now()}-c`;
    await repository.suppressEmail(ws, "coo@example.com");
    await expect(repository.suppressEmail(ws, "coo@example.com")).resolves.toBeUndefined();

    expect((await repository.listSuppressedEmails(ws)).has("coo@example.com")).toBe(true);
  });

  it("does not leak a suppression across workspaces", async () => {
    const a = `ws-sup-${Date.now()}-d1`;
    const b = `ws-sup-${Date.now()}-d2`;
    await repository.suppressEmail(a, "shared@example.com");

    expect((await repository.listSuppressedEmails(a)).has("shared@example.com")).toBe(true);
    expect((await repository.listSuppressedEmails(b)).has("shared@example.com")).toBe(false);
  });

  it("round-trips the address the unsubscribe route will suppress", async () => {
    const ws = `ws-sup-${Date.now()}-e`;
    const token = buildUnsubscribeToken(ws, "board@example.com");
    const decoded = decodeUnsubscribeToken(token);
    expect(decoded).not.toBeNull();

    const [workspaceId, email] = decoded!;
    await repository.suppressEmail(workspaceId, email);

    expect((await repository.listSuppressedEmails(ws)).has("board@example.com")).toBe(true);
  });
});
