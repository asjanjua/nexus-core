# NexusAI Billing Tiers and Usage Metering -- Specification

Status: Scoped (not yet built)
Scoped: 2026-06-10
Estimated build: 2-3 sessions

---

## 1. Why This Matters

NexusAI's largest variable cost is LLM token consumption. Without tier-based usage limits, a single heavy workspace on any plan can burn through more tokens than a dozen light users. The billing structure must align what the customer pays with what it costs to serve them, while creating clear upgrade triggers that feel natural rather than punitive.

The pricing must also serve two very different buyer profiles: an SME owner who pays with a credit card and a regulated bank that goes through procurement. The tier structure handles both without splitting the product.

---

## 2. Tier Structure

| | **Free** | **Pro** | **Business** | **Enterprise** |
|---|---|---|---|---|
| **Price** | $0 | $499/mo | $2,500/mo | Custom ($5K-$15K+) |
| **Target** | Prospects, evaluators, small owners | SMEs, startups, single-user teams | Growth companies, advisory clients | Regulated, multi-workspace |
| **Roles** | 1 (CEO/Owner only) | 5 | 10 | Unlimited |
| **Evidence records** | 50 | 1,000 | 5,000 | Unlimited |
| **Monthly AI budget** | 500K tokens | 5M tokens | 25M tokens | Custom / unlimited |
| **Ask questions** | 10/day | Unlimited (within budget) | Unlimited (within budget) | Unlimited |
| **Scheduled synthesis** | No | Weekly | Daily + email delivery | All + Slack + custom cadence |
| **Exports** | No | All | All | All + API bulk |
| **Decision Twin** | View only | Full CRUD | Full CRUD + extraction | Full + custom workflows |
| **Team members** | 1 | 1 | 5 | Unlimited |
| **Connectors** | None | None | 3 | Unlimited |
| **Agent passport customization** | Default only | Default only | Full customization | Full + custom agents |
| **Data residency / local-only** | No | No | No | Yes |
| **Support** | Self-serve (docs only) | Email (48hr SLA) | Email (4hr SLA) | Dedicated CSM |
| **Branding** | NexusAI watermark on exports | Clean exports | Clean exports | White-label option |
| **API access** | No | 3 API keys | 10 API keys | Unlimited |

---

## 3. Token Budget Economics

### 3.1 Cost per operation (approximate)

| Operation | Input tokens | Output tokens | DeepSeek cost | Anthropic cost |
|---|---|---|---|---|
| Ask question | 3K-8K | 500-1K | $0.001 | $0.03 |
| Dashboard card (per agent) | 2K-5K | 500-1K | $0.0005 | $0.02 |
| Synthesis (per role, all questions) | 40K-60K | 3K-7K | $0.01 | $0.20 |
| Decision extraction | 5K-10K | 1K-2K | $0.002 | $0.04 |
| Ingestion classification | 300-500 | 100-200 | $0.0001 | $0.002 |
| Entity extraction | 1K-2K | 500-1K | $0.0003 | $0.008 |

### 3.2 What each tier budget buys (DeepSeek baseline)

| Tier | Budget | Approximate monthly usage |
|---|---|---|
| **Free (500K)** | ~50 Ask questions + 2 on-demand synthesis runs + basic dashboard views |
| **Pro (5M)** | ~4 weekly synthesis runs (1 role) + ~30 Ask questions/day + full dashboards |
| **Business (25M)** | ~20 daily synthesis runs (5 roles) + heavy Ask + decision extraction + full dashboards |
| **Enterprise** | Negotiated per contract; typically 100M+ for large regulated clients |

### 3.3 Provider-normalized budgets

All tiers use the same token budget regardless of which LLM provider the workspace uses. This means:
- DeepSeek workspaces get more value per dollar (higher margin for us)
- Anthropic workspaces hit limits faster (but get higher quality output)
- This is intentional: it keeps the pricing simple and creates a natural incentive to use the cheaper provider for routine operations

Future option: offer an "AI Quality Boost" add-on that doubles the token budget for $X/month, positioned for workspaces that want to run Anthropic/OpenAI for everything.

---

## 4. Schema Changes

### 4.1 New columns on `workspaces` table

```sql
ALTER TABLE workspaces
  ADD COLUMN plan VARCHAR(32) NOT NULL DEFAULT 'free',
  ADD COLUMN monthly_token_limit BIGINT NOT NULL DEFAULT 500000,
  ADD COLUMN monthly_token_used BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN token_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', NOW()) + interval '1 month',
  ADD COLUMN plan_changed_at TIMESTAMP WITH TIME ZONE;
```

### 4.2 New table: `plan_definitions`

```sql
CREATE TABLE plan_definitions (
  plan_key        VARCHAR(32) PRIMARY KEY,
  label           VARCHAR(64) NOT NULL,
  price_cents     INTEGER NOT NULL DEFAULT 0,
  monthly_tokens  BIGINT NOT NULL,
  max_roles       INTEGER NOT NULL,
  max_evidence    INTEGER NOT NULL,
  max_team        INTEGER NOT NULL,
  max_connectors  INTEGER NOT NULL,
  max_api_keys    INTEGER NOT NULL,
  ask_daily_limit INTEGER,                    -- NULL = unlimited
  scheduled_synthesis BOOLEAN NOT NULL DEFAULT false,
  synthesis_max_cadence VARCHAR(16),           -- 'weekly', 'daily', NULL
  email_delivery  BOOLEAN NOT NULL DEFAULT false,
  slack_delivery  BOOLEAN NOT NULL DEFAULT false,
  exports_enabled BOOLEAN NOT NULL DEFAULT false,
  decision_extraction BOOLEAN NOT NULL DEFAULT false,
  custom_passports BOOLEAN NOT NULL DEFAULT false,
  data_residency  BOOLEAN NOT NULL DEFAULT false,
  api_access      BOOLEAN NOT NULL DEFAULT false,
  watermark       BOOLEAN NOT NULL DEFAULT true
);
```

Seed data:

```sql
INSERT INTO plan_definitions VALUES
  ('free',       'Free',       0,      500000,  1,  50,    1,  0,  0,  10,    false, NULL,     false, false, false, false, false, false, false, true),
  ('pro',        'Pro',        49900,  5000000, 5,  1000,  1,  0,  3,  NULL,  true,  'weekly', false, false, true,  false, false, false, true,  false),
  ('business',   'Business',   250000, 25000000,10, 5000,  5,  3,  10, NULL,  true,  'daily',  true,  false, true,  true,  true,  false, true,  false),
  ('enterprise', 'Enterprise', 0,      0,       -1, -1,    -1, -1, -1, NULL,  true,  'daily',  true,  true,  true,  true,  true,  true,  true,  false);
```

(`-1` = unlimited, `price_cents = 0` for Enterprise = custom pricing handled outside Stripe Checkout)

### 4.3 Drizzle schema additions

```typescript
export const planEnum = pgEnum("plan", ["free", "pro", "business", "enterprise"]);

// Add to workspaces table:
// plan: planEnum("plan").notNull().default("free"),
// monthlyTokenLimit: bigint("monthly_token_limit", { mode: "number" }).notNull().default(500000),
// monthlyTokenUsed: bigint("monthly_token_used", { mode: "number" }).notNull().default(0),
// tokenResetAt: timestamp("token_reset_at", { withTimezone: true }).notNull(),
// planChangedAt: timestamp("plan_changed_at", { withTimezone: true }),

export const planDefinitions = pgTable("plan_definitions", {
  planKey: varchar("plan_key", { length: 32 }).primaryKey(),
  label: varchar("label", { length: 64 }).notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  monthlyTokens: bigint("monthly_tokens", { mode: "number" }).notNull(),
  maxRoles: integer("max_roles").notNull(),
  maxEvidence: integer("max_evidence").notNull(),
  maxTeam: integer("max_team").notNull(),
  maxConnectors: integer("max_connectors").notNull(),
  maxApiKeys: integer("max_api_keys").notNull(),
  askDailyLimit: integer("ask_daily_limit"),
  scheduledSynthesis: boolean("scheduled_synthesis").notNull().default(false),
  synthesisMaxCadence: varchar("synthesis_max_cadence", { length: 16 }),
  emailDelivery: boolean("email_delivery").notNull().default(false),
  slackDelivery: boolean("slack_delivery").notNull().default(false),
  exportsEnabled: boolean("exports_enabled").notNull().default(false),
  decisionExtraction: boolean("decision_extraction").notNull().default(false),
  customPassports: boolean("custom_passports").notNull().default(false),
  dataResidency: boolean("data_residency").notNull().default(false),
  apiAccess: boolean("api_access").notNull().default(false),
  watermark: boolean("watermark").notNull().default(true),
});
```

Migration: `0022_billing_tiers.sql`

---

## 5. Token Budget Enforcement

### 5.1 Hot-path metering (no extra query per LLM call)

The existing `repository.recordLLMUsage()` fires after every LLM call. Extend it to also atomically increment `workspaces.monthly_token_used`:

```typescript
// Inside recordLLMUsage():
await db.update(workspaces)
  .set({
    monthlyTokenUsed: sql`monthly_token_used + ${totalTokens}`
  })
  .where(eq(workspaces.id, workspaceId));
```

### 5.2 Budget check before LLM calls

Add a lightweight `checkTokenBudget(workspaceId)` function that reads from an in-process cache (5-minute TTL):

```typescript
interface TokenBudgetStatus {
  allowed: boolean;
  used: number;
  limit: number;
  percentUsed: number;
  plan: string;
}

async function checkTokenBudget(workspaceId: string): Promise<TokenBudgetStatus> {
  // Check cache first (5-min TTL)
  const cached = tokenBudgetCache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) return cached.status;

  // Query DB
  const ws = await db.select({
    plan: workspaces.plan,
    used: workspaces.monthlyTokenUsed,
    limit: workspaces.monthlyTokenLimit,
  }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);

  const status: TokenBudgetStatus = {
    allowed: ws[0].used < ws[0].limit || ws[0].limit === 0, // 0 = unlimited
    used: ws[0].used,
    limit: ws[0].limit,
    percentUsed: ws[0].limit > 0 ? Math.round((ws[0].used / ws[0].limit) * 100) : 0,
    plan: ws[0].plan,
  };

  tokenBudgetCache.set(workspaceId, { status, expiresAt: Date.now() + 300_000 });
  return status;
}
```

### 5.3 Enforcement points

Every feature that calls the LLM checks the budget first:

| Feature | On budget exceeded |
|---|---|
| Ask panel | Return structured response: "You've reached your monthly AI budget. Upgrade to Pro for 10x more." No LLM call. |
| Dashboard card generation | Show cached last-known card with a "Budget reached" badge. No new generation. |
| Synthesis (on-demand) | Return error with upgrade CTA. |
| Synthesis (scheduled) | Skip run, write audit event `synthesis_budget_exceeded`, send notification. |
| Decision extraction | Disable "Propose from AI" button, show upgrade tooltip. |
| Ingestion classification | Fall back to deterministic filename classifier only (already exists as fallback). |

### 5.4 Monthly reset

A scheduled job (or the same Render cron runner used for synthesis) resets `monthly_token_used` to 0 for all workspaces where `NOW() >= token_reset_at`, and advances `token_reset_at` by one month.

```sql
UPDATE workspaces
SET monthly_token_used = 0,
    token_reset_at = token_reset_at + interval '1 month'
WHERE token_reset_at <= NOW();
```

---

## 6. Feature Gating

### 6.1 Server-side gate function

```typescript
type Feature =
  | 'scheduled_synthesis' | 'email_delivery' | 'slack_delivery'
  | 'exports' | 'decision_extraction' | 'custom_passports'
  | 'data_residency' | 'api_access';

async function canUseFeature(workspaceId: string, feature: Feature): Promise<{
  allowed: boolean;
  requiredPlan: string;
}> {
  const plan = await getPlanDefinition(workspaceId); // cached
  const allowed = plan[featureToColumn(feature)] === true;
  const requiredPlan = getMinimumPlanFor(feature);
  return { allowed, requiredPlan };
}
```

### 6.2 Limit enforcement

| Limit | Enforcement |
|---|---|
| Max roles | Block role activation in wizard and Settings beyond limit. Show upgrade CTA. |
| Max evidence | Return 403 on `POST /api/ingestion/status` beyond limit. Show count in UI. |
| Max team members | Block invitation beyond limit. Show upgrade CTA in Settings. |
| Max connectors | Block new connector install beyond limit. |
| Max API keys | Block new key creation beyond limit. |
| Ask daily limit | Track per-workspace per-day count. Return structured limit response after threshold. |

### 6.3 Client-side plan context

Expose a lightweight plan summary via the existing workspace settings API:

```json
{
  "plan": "pro",
  "planLabel": "Pro",
  "tokenBudget": { "used": 2100000, "limit": 5000000, "percentUsed": 42 },
  "limits": {
    "roles": { "used": 3, "limit": 5 },
    "evidence": { "used": 412, "limit": 1000 },
    "team": { "used": 1, "limit": 1 }
  },
  "features": {
    "scheduledSynthesis": true,
    "emailDelivery": false,
    "exports": true,
    "decisionExtraction": false
  }
}
```

Components check `features.*` before rendering gated UI. Gated features show a lock icon with the required plan name and an upgrade link.

---

## 7. Usage UI in Settings

New section on `/settings` page: **Plan and Usage**

```
Your Plan: Pro ($499/month)
[Manage Plan]  [View Invoices]

AI Budget This Month
[========================================--------] 62%
3.1M of 5M tokens used. Resets July 1.

Usage Breakdown (this month):
  Ask questions ............. 1.8M tokens (58%)
  Dashboard generation ...... 0.6M tokens (19%)
  Synthesis ................. 0.5M tokens (16%)
  Other (ingestion, etc.) ... 0.2M tokens (7%)

Resource Limits:
  Roles ........... 3 of 5 active
  Evidence ........ 412 of 1,000 records
  Team members .... 1 of 1
  API keys ........ 2 of 3

[Approaching limit? Upgrade to Business →]
```

Important: never show raw token counts as the primary metric. Show percentage bars and natural-language descriptions. The breakdown table is secondary detail for power users.

### 7.1 Warning banners

| Threshold | Action |
|---|---|
| 80% of monthly token budget | Yellow banner: "You've used 80% of your monthly AI budget. [Upgrade]" |
| 95% of monthly token budget | Orange banner: "Your AI budget is almost exhausted. Responses may be limited. [Upgrade]" |
| 100% of monthly token budget | Red banner: "Monthly AI budget reached. Upgrade to continue using AI features. [Upgrade]" |
| 80% of evidence limit | Inline warning on ingestion page |
| 80% of role limit | Inline warning on role activation |

---

## 8. Stripe Integration

### 8.1 Products and Prices

Create three Stripe Products:
- NexusAI Pro ($499/month)
- NexusAI Business ($2,500/month)
- NexusAI Enterprise (custom, invoice-only)

Each product has a monthly recurring Price. Annual pricing (2 months free) added as a second Price per Product when demand warrants.

### 8.2 Checkout flow

1. User clicks "Upgrade to Pro" in Settings or on a limit-reached screen.
2. Server creates a Stripe Checkout Session with `mode: 'subscription'`, `customer_email` from Clerk, and `metadata: { workspaceId }`.
3. User completes payment on Stripe-hosted page.
4. Stripe webhook `checkout.session.completed` fires.
5. Server updates `workspaces.plan`, `monthly_token_limit`, `stripe_customer_id`, `stripe_subscription_id`, `plan_changed_at`, and writes `plan_upgraded` audit event.
6. User is redirected back to Settings with a success banner.

### 8.3 Webhook events to handle

| Event | Action |
|---|---|
| `checkout.session.completed` | Activate plan, set limits |
| `customer.subscription.updated` | Handle plan changes (upgrade/downgrade) |
| `customer.subscription.deleted` | Revert to free plan |
| `invoice.payment_failed` | Start suspension flow (existing logic in PILOT_BILLING_TRIGGERS.md) |
| `invoice.paid` | Clear suspension if applicable |

### 8.4 Downgrade logic

When a workspace downgrades (e.g., Business to Pro):
- Plan changes immediately at next billing cycle
- Existing evidence is preserved but new uploads blocked if over the new limit
- Excess roles are not deactivated; the user must choose which to keep
- Scheduled synthesis cadence is adjusted to the new plan's maximum
- A "resolve limits" banner appears in Settings until the workspace is within bounds

---

## 9. Trial-to-Free Transition

The existing `trial` status (14 days) now converts to `free` plan instead of suspending. This replaces the hard cutoff with a soft conversion:

| Day | Current behavior | New behavior |
|---|---|---|
| 1-14 | Full access (trial) | Full access (trial = temporary Pro equivalent) |
| 15 | Read-only suspension | Convert to Free plan (limited but functional) |
| 15+ | Data deletion at 90 days | Workspace stays on Free indefinitely |

The trial period now acts as a 14-day Pro preview. When it expires, the workspace drops to Free limits. The user can upgrade at any time. No data is lost.

This is better for conversion: a user who hits the Free ceiling after a Pro trial feels the downgrade and is motivated to upgrade. A suspended user who loses access entirely just churns.

### 9.1 Migration for existing workspaces

```sql
-- Convert existing trial workspaces past expiry to free plan
UPDATE workspaces
SET plan = 'free', status = 'active'
WHERE status = 'trial' AND trial_ends_at < NOW();

-- Convert active pilot workspaces to business plan
UPDATE workspaces
SET plan = 'business'
WHERE status = 'pilot';

-- Convert active subscription workspaces to business plan
UPDATE workspaces
SET plan = 'business'
WHERE status = 'active' AND stripe_subscription_id IS NOT NULL;
```

---

## 10. Commercial Logic

### 10.1 Upgrade triggers (what makes people pay)

| Trigger | From | To | Why it works |
|---|---|---|---|
| Hit 50 evidence records | Free | Pro | "I have more documents to upload" |
| Want scheduled synthesis | Free | Pro | "I want the Monday brief" |
| Want exports | Free | Pro | "I need to share this with my board" |
| Need more than 5 roles | Pro | Business | "My CFO and COO also want dashboards" |
| Need team members | Pro | Business | "Can my COO also log in?" |
| Need connectors | Pro | Business | "Can we connect Google Drive?" |
| Need data residency | Business | Enterprise | Regulatory requirement |
| Need SLA | Business | Enterprise | Procurement requirement |
| Need custom agents | Business | Enterprise | "We want agents for our specific workflows" |

### 10.2 Free tier cost control

Maximum cost per free workspace per month: ~$0.10 (DeepSeek) or ~$2.00 (Anthropic).

Mitigations:
- 500K token hard limit
- 10 Ask questions/day hard limit
- No scheduled synthesis (no recurring cost)
- No support channel (self-serve only)
- Ingestion falls back to deterministic classifier only when budget is exhausted

### 10.3 Pricing review cadence

Review pricing quarterly based on:
- Actual cost per workspace per tier (from `llm_usage` aggregates)
- Conversion rates between tiers
- Churn rates per tier
- Competitive landscape
- LLM provider pricing changes (these can shift 2-5x in either direction)

---

## 11. Build Plan (2-3 sessions)

### Session 1: Schema, enforcement, and Settings UI

1. Migration `0022_billing_tiers.sql`: plan columns on workspaces, plan_definitions table with seed data.
2. Drizzle schema updates.
3. `checkTokenBudget()` with in-process cache.
4. Extend `recordLLMUsage()` to atomically increment `monthly_token_used`.
5. Feature gate function `canUseFeature()`.
6. Enforcement at all LLM call points (Ask, dashboard, synthesis, extraction, ingestion).
7. Plan and Usage section in Settings UI (plan display, usage bar, limits, breakdown).
8. Warning banners at 80%/95%/100%.
9. Monthly token reset in cron runner.
10. Tests: budget check, feature gating, enforcement, reset.

### Session 2: Stripe integration and checkout

1. Install Stripe SDK, configure Products and Prices.
2. Checkout session creation endpoint.
3. Webhook handler for subscription lifecycle events.
4. Upgrade/downgrade flow in Settings.
5. Trial-to-Free conversion logic.
6. Invoice portal link.
7. Audit events for all plan changes.
8. End-to-end test: trial expiry, upgrade, downgrade, payment failure.

### Session 3 (optional): Polish and analytics

1. Usage breakdown by feature type (Ask vs synthesis vs dashboard).
2. Admin revenue dashboard (internal): MRR, active plans, usage per workspace.
3. Upgrade CTA components across all gated features.
4. Annual pricing option.
5. Update all docs: ARCHITECTURE.md, ROADMAP.md, CHANGELOG.md.
6. Bump version.

---

## 12. What This Is Not

- Not usage-based pricing. The token budget is a ceiling, not a meter that charges per token. Customers pay a fixed monthly fee and get a budget.
- Not a freemium trap. The free tier is genuinely useful for small businesses. It just does not include the features that enterprise buyers need.
- Not pay-per-seat (except team members in Business+). The primary axis is workspace capability, not headcount.
- Not a consumption model. No surprise bills. The monthly price is the monthly price.

---

## 13. Sales and Positioning

**Free:** "Try NexusAI with your own documents. One dashboard, one role, no credit card."

**Pro:** "Your AI analyst, always on. Weekly briefs, full exports, and 10x the AI capacity."

**Business:** "NexusAI for the leadership team. Daily briefs, team access, connectors, and custom governance."

**Enterprise:** "NexusAI for regulated companies. Data residency, SLA, unlimited capacity, and a dedicated success manager."

**Upgrade conversation:** "You're getting value from NexusAI. Pro gives you scheduled briefs every Monday and 10x more AI capacity for $499/month. Want me to set that up?"
