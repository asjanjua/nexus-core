/**
 * Seed the reference demo company into a running Mission Control instance.
 *
 * Calls POST /api/workspace/seed-demo with a short-lived admin Bearer token
 * minted from AUTH_SECRET (same HMAC scheme as lib/tokens.ts). The target
 * workspace must have demo mode enabled first (Settings > demo mode), otherwise
 * the endpoint returns 403 demo_mode_required.
 *
 * Env:
 *   NEXT_PUBLIC_APP_URL   target base URL (e.g. https://nexus-mission-control.onrender.com)
 *   AUTH_SECRET           the app's auth secret (same value set in Render)
 *   NEXUS_DEMO_WORKSPACE  workspace id to seed (default "workspace-demo")
 *
 * Usage:
 *   NEXT_PUBLIC_APP_URL=... AUTH_SECRET=... npm run db:seed:demo
 */

import crypto from "node:crypto";

function signAdminToken(secret, workspaceId) {
  const payload = {
    workspaceId,
    keyId: "seed-script",
    scopes: ["admin"],
    exp: Math.floor(Date.now() / 1000) + 300,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `${body}.${sig}`;
}

async function main() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.AUTH_SECRET;
  const workspaceId = process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";

  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is required");
  if (!secret) throw new Error("AUTH_SECRET is required (same value as the running app)");

  const token = signAdminToken(secret, workspaceId);
  const url = `${appUrl.replace(/\/+$/, "")}/api/workspace/seed-demo`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-workspace-id": workspaceId,
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    console.error(`Seed failed (${res.status}):`, json.error ?? json);
    if (res.status === 403) {
      console.error("Enable demo mode on the workspace in Settings, then re-run.");
    }
    process.exit(1);
  }

  console.log("Seeded reference company:", JSON.stringify(json.data, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
