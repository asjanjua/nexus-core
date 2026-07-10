import { describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, readSession, verifyLoginCredentials, verifyPassword } from "@/lib/auth";

describe("auth", () => {
  it("creates and validates a session token", () => {
    const token = createSessionToken("tester", "workspace-demo");
    const session = readSession(token);
    expect(session?.userId).toBe("tester");
    expect(session?.workspaceId).toBe("workspace-demo");
  });

  it("rejects malformed token", () => {
    expect(readSession("bad-token")).toBeNull();
  });

  it("validates default admin credentials", () => {
    expect(verifyLoginCredentials("admin", "admin")).toBe(true);
    expect(verifyLoginCredentials("admin", "wrong")).toBe(false);
  });

  it("hashes and verifies passwords", () => {
    const derived = hashPassword("admin");
    expect(verifyPassword("admin", derived.salt, derived.hash)).toBe(true);
    expect(verifyPassword("wrong", derived.salt, derived.hash)).toBe(false);
  });
});
