#!/usr/bin/env node
/**
 * Pricing alignment check.
 *
 * Four places have to agree on what a plan costs, and only two of them are in
 * this repo:
 *
 *   1. lib/pricing-tiers.ts   what /pricing publishes          (in repo)
 *   2. lib/billing/budget.ts  PLAN_FALLBACKS                   (in repo)
 *   3. plan_definitions       the DB row, which OVERRIDES 2    (remote)
 *   4. Stripe Price           what the customer is ACTUALLY charged (remote)
 *
 * tests/pricing-plan-alignment.test.ts already diffs 1 against 2. It cannot
 * reach 3 or 4, so a deployment can publish $49, charge $499, and pass CI.
 * This script closes that gap. Read-only: it reports, it never writes.
 *
 * Usage:
 *   node scripts/pricing-align.mjs            # check
 *   node scripts/pricing-align.mjs --sql      # also print the fix-up SQL
 *
 * Needs STRIPE_SECRET_KEY for step 4 and DATABASE_URL for step 3. Missing
 * either is reported as UNCHECKED rather than passing quietly, because a
 * silent skip here is exactly how the mismatch survived in the first place.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "..", "..");

/**
 * Load the same .env files the app uses.
 *
 * Node does not read these on its own, so the first version of this script
 * reported UNCHECKED even on a machine where DATABASE_URL was sitting in
 * .env.local. A check that says "cannot check" when the credentials are right
 * there is a check nobody runs twice.
 *
 * Later files do not overwrite earlier ones, and a real environment variable
 * always wins, so `DATABASE_URL=... npm run pricing:align` still works.
 */
function loadEnvFiles() {
  const files = [
    join(ROOT, ".env.production.local"),
    join(ROOT, ".env.development.local"),
    join(ROOT, ".env.local"),
    join(REPO, ".env.local"),
  ];
  const loaded = [];
  for (const file of files) {
    if (!existsSync(file)) continue;
    loaded.push(file.replace(REPO + "/", ""));
    for (const raw of readFileSync(file, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
  return loaded;
}

const envFiles = loadEnvFiles();

/** Parse the published tiers out of the TS source without a build step. */
function publishedTiers() {
  const src = readFileSync(join(ROOT, "lib/pricing-tiers.ts"), "utf8");
  const body = src.slice(src.indexOf("export const PRICING_TIERS"));
  const tiers = [];
  for (const block of body.split(/\n  \{\n/).slice(1)) {
    const pick = (k) => block.match(new RegExp(`${k}: "([^"]*)"`))?.[1];
    const num = (k) => {
      const m = block.match(new RegExp(`${k}: (-?\\d+)`));
      return m ? Number(m[1]) : null;
    };
    const planKey = pick("planKey");
    if (!planKey) continue;
    tiers.push({
      label: pick("label"),
      planKey,
      monthlyUsd: num("monthlyUsd"),
      maxSeats: /maxSeats: null/.test(block) ? null : num("maxSeats"),
      quoteRequired: /quoteRequired: true/.test(block),
    });
  }
  return tiers;
}

const results = [];
const record = (status, area, detail) => results.push({ status, area, detail });

const tiers = publishedTiers();
if (tiers.length === 0) {
  console.error("Could not parse PRICING_TIERS. Aborting rather than reporting a false pass.");
  process.exit(2);
}

console.log(envFiles.length ? `Loaded env from: ${envFiles.join(", ")}` : "No .env files found");
console.log("");
console.log("Published tiers");
for (const t of tiers) {
  console.log(
    `  ${t.label.padEnd(11)} ${t.planKey.padEnd(11)} ` +
      `${t.quoteRequired ? "quoted" : "$" + t.monthlyUsd + "/mo"} ` +
      `seats ${t.maxSeats ?? "unlimited"}`
  );
}

// ---------------------------------------------------------------------------
// 3. plan_definitions
// ---------------------------------------------------------------------------

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  record("UNCHECKED", "plan_definitions", "DATABASE_URL not set");
} else {
  let pool;
  try {
    // `pg` with the repo's own URL normaliser, matching scripts/db-check.mjs.
    // The first version reached for @neondatabase/serverless, which this
    // project does not install, so the check failed on a machine that could
    // have answered the question.
    const { Pool } = await import("pg");
    const { normalizeDatabaseUrl } = await import("./db-url.mjs");
    pool = new Pool({ connectionString: normalizeDatabaseUrl(dbUrl), max: 1 });
    const { rows } = await pool.query(
      "SELECT plan_key, label, price_cents, max_team FROM plan_definitions"
    );
    if (rows.length === 0) {
      // Empty is SAFE: the code falls back to PLAN_FALLBACKS, which CI checks.
      record("OK", "plan_definitions", "no rows; PLAN_FALLBACKS applies and CI covers it");
    } else {
      for (const t of tiers) {
        const row = rows.find((r) => r.plan_key === t.planKey);
        if (!row) {
          record("OK", `plan_definitions/${t.planKey}`, "no row; falls back to PLAN_FALLBACKS");
          continue;
        }
        const wantCents = t.quoteRequired ? 0 : t.monthlyUsd * 100;
        const wantSeats = t.maxSeats === null ? -1 : t.maxSeats;
        if (row.price_cents !== wantCents) {
          record(
            "MISMATCH",
            `plan_definitions/${t.planKey}`,
            `price_cents is ${row.price_cents}, /pricing says ${wantCents}`
          );
        }
        if (row.max_team !== wantSeats) {
          record(
            "MISMATCH",
            `plan_definitions/${t.planKey}`,
            `max_team is ${row.max_team}, /pricing sells ${wantSeats}`
          );
        }
        if (row.label !== t.label) {
          record("WARN", `plan_definitions/${t.planKey}`, `label is "${row.label}", page says "${t.label}"`);
        }
      }
    }
  } catch (err) {
    // A missing table is a definitive answer, not a failure to look: the
    // migration has not run, so no row can override PLAN_FALLBACKS.
    if (/relation .*plan_definitions.* does not exist/i.test(err.message)) {
      record("OK", "plan_definitions", "table absent; PLAN_FALLBACKS applies and CI covers it");
    } else {
      record("UNCHECKED", "plan_definitions", `query failed: ${err.message}`);
    }
  } finally {
    await pool?.end().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// 4. Stripe. The only one that decides what the card is charged.
// ---------------------------------------------------------------------------

const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
if (!stripeKey) {
  // Stripe keys live in the hosting environment, not in the local .env files,
  // so this is expected on a laptop. It still fails: the check is only
  // meaningful where the keys are, which is the deployed environment.
  record(
    "UNCHECKED",
    "stripe",
    "STRIPE_SECRET_KEY not set. Run this in the deployed environment, or " +
      "export the key for one command."
  );
} else {
  for (const t of tiers.filter((x) => !x.quoteRequired)) {
    const envName = t.planKey === "pro" ? "STRIPE_PRICE_PRO" : "STRIPE_PRICE_BUSINESS";
    const priceId = process.env[envName]?.trim();
    if (!priceId) {
      record("MISMATCH", `stripe/${t.planKey}`, `${envName} not set, so checkout cannot start`);
      continue;
    }
    try {
      const res = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      const price = await res.json();
      if (!res.ok) {
        record("MISMATCH", `stripe/${t.planKey}`, `${priceId}: ${price.error?.message ?? res.status}`);
        continue;
      }
      const wantCents = t.monthlyUsd * 100;
      if (price.unit_amount !== wantCents) {
        record(
          "MISMATCH",
          `stripe/${t.planKey}`,
          `${priceId} charges ${price.unit_amount} ${String(price.currency).toUpperCase()}, ` +
            `/pricing says ${wantCents} USD`
        );
      }
      if (price.currency !== "usd") {
        record("MISMATCH", `stripe/${t.planKey}`, `currency is ${price.currency}, pricing is published in USD`);
      }
      if (price.recurring?.interval !== "month") {
        record(
          "MISMATCH",
          `stripe/${t.planKey}`,
          `interval is ${price.recurring?.interval ?? "one-off"}, page says per month`
        );
      }
      if (price.active === false) {
        record("MISMATCH", `stripe/${t.planKey}`, `${priceId} is archived in Stripe`);
      }
    } catch (err) {
      record("UNCHECKED", `stripe/${t.planKey}`, `lookup failed: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------

console.log("\nFindings");
const mismatches = results.filter((r) => r.status === "MISMATCH");
const unchecked = results.filter((r) => r.status === "UNCHECKED");
if (results.length === 0) console.log("  none");
for (const r of results) console.log(`  ${r.status.padEnd(10)} ${r.area.padEnd(28)} ${r.detail}`);

if (process.argv.includes("--sql")) {
  console.log("\n-- Bring plan_definitions in line with /pricing. Review before running.");
  for (const t of tiers) {
    const cents = t.quoteRequired ? 0 : t.monthlyUsd * 100;
    const seats = t.maxSeats === null ? -1 : t.maxSeats;
    console.log(
      `UPDATE plan_definitions SET price_cents = ${cents}, max_team = ${seats}, ` +
        `label = '${t.label}' WHERE plan_key = '${t.planKey}';`
    );
  }
}

console.log(
  `\n${mismatches.length} mismatch(es), ${unchecked.length} unchecked.` +
    (unchecked.length ? " Unchecked is not a pass." : "")
);
// Unchecked exits non-zero too. A CI run with no credentials that reports
// success is the failure mode this script exists to prevent.
process.exit(mismatches.length > 0 || unchecked.length > 0 ? 1 : 0);
