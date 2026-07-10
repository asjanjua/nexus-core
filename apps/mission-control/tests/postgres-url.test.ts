import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "@/lib/data/postgres-url";

describe("postgres url normalization", () => {
  it("upgrades ambiguous SSL modes to verify-full", () => {
    const input = "postgres://user:pass@db.example.com/nexus?sslmode=require";

    expect(normalizeDatabaseUrl(input)).toBe(
      "postgres://user:pass@db.example.com/nexus?sslmode=verify-full"
    );
  });

  it("leaves strict, local, and invalid URLs unchanged", () => {
    const strict = "postgres://user:pass@db.example.com/nexus?sslmode=verify-full";
    const local = "postgres://user:pass@localhost:5432/nexus";

    expect(normalizeDatabaseUrl(strict)).toBe(strict);
    expect(normalizeDatabaseUrl(local)).toBe(local);
    expect(normalizeDatabaseUrl("not-a-url")).toBe("not-a-url");
  });
});
