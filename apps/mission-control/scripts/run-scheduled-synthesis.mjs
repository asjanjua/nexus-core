#!/usr/bin/env node

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXUS_APP_URL || "").replace(/\/+$/, "");
const secret = process.env.NEXUS_CRON_SECRET || "";

if (!baseUrl) {
  console.error("Missing NEXT_PUBLIC_APP_URL or NEXUS_APP_URL.");
  process.exit(1);
}

if (!secret) {
  console.error("Missing NEXUS_CRON_SECRET.");
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/cron/synthesis`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${secret}`,
    "content-type": "application/json"
  }
});

const body = await response.text();
if (!response.ok) {
  console.error(`Scheduled synthesis failed with ${response.status}: ${body}`);
  process.exit(1);
}

console.log(body);
