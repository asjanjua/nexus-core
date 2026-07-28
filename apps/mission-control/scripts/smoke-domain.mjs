#!/usr/bin/env node

/**
 * Demo-domain smoke check.
 *
 * Usage:
 *   APP_URL=https://app.pinavia.io npm run smoke:domain -w @nexus/mission-control
 *
 * This intentionally avoids authenticated routes. It verifies the public edge
 * layer that most often breaks during a custom-domain cutover: health, HTTPS,
 * security headers, sign-in redirects, and production CORS.
 */

const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
const expectedCorsOrigin = (process.env.EXPECT_CORS_ORIGIN || "").replace(/\/+$/, "");

if (!baseUrl) {
  console.error("Missing APP_URL or NEXT_PUBLIC_APP_URL.");
  process.exit(1);
}

const checks = [];

function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  const icon = ok ? "OK" : "FAIL";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function request(path, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...init,
    headers: {
      "user-agent": "nexus-domain-smoke/1.0",
      ...(init.headers || {}),
    },
  });
}

try {
  const health = await request("/api/health");
  const healthJson = await health.json().catch(() => null);
  record(
    "health endpoint",
    health.ok && healthJson?.ok === true && healthJson?.data?.status === "ok",
    `status=${health.status}`
  );

  const home = await request("/");
  record("home responds", home.ok, `status=${home.status}`);
  record("HSTS present", Boolean(home.headers.get("strict-transport-security")));
  record("CSP present", Boolean(home.headers.get("content-security-policy")));
  record(
    "frame protection present",
    home.headers.get("x-frame-options") === "DENY" ||
      (home.headers.get("content-security-policy") ?? "").includes("frame-ancestors 'none'")
  );

  const workspace = await request("/workspace");
  const workspaceLocation = workspace.headers.get("location") ?? "";
  record(
    "workspace redirects to sign-in",
    [301, 302, 303, 307, 308].includes(workspace.status) && workspaceLocation.includes("/sign-in"),
    `status=${workspace.status} location=${workspaceLocation || "none"}`
  );

  if (expectedCorsOrigin) {
    const preflight = await request("/api/ask", {
      method: "OPTIONS",
      headers: {
        origin: expectedCorsOrigin,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    record(
      "CORS allows expected origin",
      preflight.headers.get("access-control-allow-origin") === expectedCorsOrigin,
      `origin=${preflight.headers.get("access-control-allow-origin") ?? "none"}`
    );
  } else {
    record("CORS expected-origin check skipped", true, "set EXPECT_CORS_ORIGIN to verify allowlist");
  }

  const badPreflight = await request("/api/ask", {
    method: "OPTIONS",
    headers: {
      origin: "https://evil.example",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });
  record(
    "CORS rejects unknown origin",
    !badPreflight.headers.has("access-control-allow-origin"),
    `origin=${badPreflight.headers.get("access-control-allow-origin") ?? "none"}`
  );
} catch (error) {
  record("smoke runner exception", false, error instanceof Error ? error.message : String(error));
}

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\n${failed.length} domain smoke check(s) failed for ${baseUrl}.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} domain smoke checks passed for ${baseUrl}.`);
