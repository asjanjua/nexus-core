# Scheduled Synthesis Refresh -- Scoping Specification

Status: Partially shipped/historical specification
Scoped: 2026-06-10
Current state: Scheduled synthesis core shipped in v0.19.0 with schedule table, Settings UI, protected cron endpoint, runner script, and in-app persistence through `agent_outputs`.

Remaining from this original scope: email digest delivery, Slack delivery, and richer week-over-week delivery polish. Use `TASKS.md`, `BACKLOG.md`, and `HANDOVER.md` for current execution status.

---

## 1. Why This Matters

v0.18.2 synthesis is pull-only: the CEO must log in and wait for on-demand generation. Scheduled synthesis turns NexusAI from a pull product into a push product. The CEO gets a fresh "company picture" every Monday morning without logging in. That is the difference between a tool someone occasionally checks and an operating cadence they depend on.

For pilots, this is the feature that makes renewal conversations easy: "Are you still getting your Monday brief?"

---

## 2. What We Are Building

A workspace-configurable scheduled job that:

1. Triggers `synthesiseForRole()` for each configured role on a cron cadence
2. Persists each result to `agent_outputs` (reusing existing U3 versioning/rollback)
3. Delivers the brief via one or more channels: in-app (already works), email digest, Slack message
4. Writes audit events for every scheduled run
5. Exposes a settings UI for workspace admins to configure schedule, roles, and delivery

---

## 3. Schema Changes

### 3.1 New table: `synthesis_schedules`

```sql
CREATE TABLE synthesis_schedules (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  TEXT NOT NULL REFERENCES workspaces(id),
  enabled       BOOLEAN NOT NULL DEFAULT true,
  cron          VARCHAR(64) NOT NULL DEFAULT '0 7 * * 1',   -- Monday 7am
  timezone      VARCHAR(64) NOT NULL DEFAULT 'UTC',          -- inherits from workspace_settings
  roles         JSONB NOT NULL DEFAULT '["ceo"]',            -- roles to synthesize
  delivery      JSONB NOT NULL DEFAULT '["in_app"]',         -- ["in_app", "email", "slack"]
  email_targets JSONB DEFAULT '[]',                          -- email addresses for digest
  slack_channel TEXT,                                         -- channel ID for Slack delivery
  last_run_at   TIMESTAMP WITH TIME ZONE,
  last_status   VARCHAR(32),                                  -- success / partial / failed
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

Design notes:
- Separate table (not columns on workspace_settings) because schedule config is structurally different from general settings and may support multiple schedules per workspace later.
- `roles` is JSONB array so workspaces can synthesize for CEO only, or CEO + CFO + COO, or all active roles.
- `timezone` defaults from workspace_settings.timezone but is stored independently so schedule interpretation is self-contained.
- `delivery` is JSONB array because a workspace might want both email and in-app.

### 3.2 Drizzle schema addition

```typescript
export const synthesisSchedules = pgTable("synthesis_schedules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  enabled: boolean("enabled").notNull().default(true),
  cron: varchar("cron", { length: 64 }).notNull().default("0 7 * * 1"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
  roles: jsonb("roles").$type<string[]>().notNull().default(["ceo"]),
  delivery: jsonb("delivery").$type<string[]>().notNull().default(["in_app"]),
  emailTargets: jsonb("email_targets").$type<string[]>().default([]),
  slackChannel: text("slack_channel"),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastStatus: varchar("last_status", { length: 32 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Migration: `0021_synthesis_schedules.sql`

---

## 4. Execution Mechanism

### Option A: Render Cron Job (recommended for pilot)

Render supports cron jobs on paid plans. Add to `render.yaml`:

```yaml
  - type: cron
    name: nexus-synthesis-cron
    runtime: node
    schedule: "*/15 * * * *"   # check every 15 minutes
    buildCommand: npm ci && npm run build
    startCommand: node apps/mission-control/scripts/run-scheduled-synthesis.js
    envVars: ...same as web service...
```

The cron runner:
1. Queries `synthesis_schedules WHERE enabled = true`
2. For each schedule, checks if `cron` expression matches current 15-minute window (using workspace timezone)
3. Calls `synthesiseForRole(role, workspaceId, { persist: true })` for each configured role
4. Updates `last_run_at` and `last_status`
5. Dispatches delivery (email/Slack) for each completed synthesis
6. Writes `synthesis_scheduled_run` audit event

Why every 15 minutes instead of matching exact cron: keeps the Render cron simple (one fixed schedule) while supporting per-workspace custom schedules. The runner itself evaluates each workspace's cron expression.

### Option B: Vercel Cron (if migrating to Vercel)

Create `app/api/cron/synthesis/route.ts` with Vercel cron config in `vercel.json`. Same logic, different trigger mechanism.

### Option C: Internal polling (not recommended)

Long-running setInterval inside the Next.js process. Fragile on serverless, unreliable on Render free tier. Reject this option.

**Recommendation: Option A for pilot. Migrate to Option B if/when Vercel becomes the hosting platform.**

---

## 5. Delivery Channels

### 5.1 In-App (already works)

`synthesiseForRole()` with `persist: true` saves to `agent_outputs`. Next time the user opens `/dashboard/[role]`, the fresh synthesis is there. No new code needed.

A small UX addition: show a "Last refreshed: Monday 7:00am" timestamp on the synthesis brief panel, sourced from the `agent_outputs.createdAt` of the active `synthesis_<role>` output.

### 5.2 Email Digest (pilot priority)

Use managed product email delivery, currently implemented with a pure-fetch Resend client at `lib/email/resend.ts`. This is separate from Clerk authentication email. Clerk owns signup/signin verification and account lifecycle email; the synthesis runner owns product notifications only.

Required production settings:
- `NEXUS_RESEND_API_KEY`
- `NEXUS_FROM_EMAIL`, ideally a domain-authenticated sender such as `Nexus <noreply@pinavia.io>`
- `NEXT_PUBLIC_APP_URL` for the in-app brief and unsubscribe links

Content per role:
- Subject: "NexusAI Weekly Brief: [Role] -- [Company Name]"
- Body: each synthesis question with answer (truncated to 200 words), confidence badge, evidence count
- CTA: "View full brief in NexusAI" linking to `/dashboard/[role]`
- Footer: "You receive this because scheduled synthesis is enabled for your workspace. Manage in Settings."

Email targets come from `synthesis_schedules.email_targets`. No user table dependency; workspace admin enters email addresses manually in settings.

### 5.3 Slack Delivery (later)

Slack OAuth skeleton already exists. When Slack is enabled for the workspace:
- Post a formatted Slack message to `synthesis_schedules.slack_channel`
- Use Block Kit for structured display
- Include a "View in NexusAI" button

Defer Slack delivery until after pilot feedback confirms demand.

---

## 6. API Endpoints

### `GET /api/synthesis-schedule`

Returns the workspace's synthesis schedule config. Scope: `read:settings`.

### `PUT /api/synthesis-schedule`

Create or update the schedule. Scope: `write:settings`.

```json
{
  "enabled": true,
  "cron": "0 7 * * 1",
  "timezone": "Asia/Karachi",
  "roles": ["ceo", "cfo"],
  "delivery": ["in_app", "email"],
  "emailTargets": ["ceo@company.com", "cfo@company.com"]
}
```

### `POST /api/synthesis-schedule/test`

Triggers an immediate one-off synthesis run for preview. Does not update `last_run_at`. Scope: `write:settings`.

### `POST /api/cron/synthesis` (internal)

Called by a scheduler such as Render Cron Job, GitHub Actions, or any trusted uptime scheduler.
Protected by a shared secret (`NEXUS_CRON_SECRET` env var), not Clerk auth.

First implementation status:
- The endpoint is live as `POST /api/cron/synthesis`.
- `npm run cron:synthesis -w @nexus/mission-control` calls the endpoint using `NEXT_PUBLIC_APP_URL` and `NEXUS_CRON_SECRET`.
- In-app delivery is active through `agent_outputs` persistence.
- Email and Slack digest sending remain a follow-on delivery pass.

---

## 7. Settings UI

New section on `/settings` page: **Scheduled Synthesis**

Layout:

```
Scheduled Synthesis
-------------------
[Toggle: Enabled / Disabled]

Schedule:  [Dropdown: Daily at 7am | Weekly Monday 7am | Weekly Friday 5pm | Custom cron]
Timezone:  [Dropdown: workspace timezone pre-selected]

Roles to include:
  [x] CEO
  [ ] COO
  [ ] CFO
  [ ] CTO
  [ ] CBO
  [ ] CHRO

Delivery:
  [x] In-app (synthesis saved to dashboard)
  [ ] Email digest
      To: [email input, comma-separated]
  [ ] Slack (requires Slack to be connected)
      Channel: [channel picker]

Last run: Monday 9 Jun 2026, 7:00am PKT -- Success (3 roles synthesized)

[Test Now]  [Save]
```

---

## 8. History and Week-over-Week

Each scheduled run persists via the existing `agent_outputs` table with `agentId = synthesis_<role>`. The U3 output versioning already gives us:
- Full history of every synthesis snapshot
- Active/inactive flagging
- Rollback capability
- Audit trail

For week-over-week comparison (a later enhancement), the data is already accumulating. A future UI could show: "Last week you had 3 items needing attention. This week you have 5." The synthesis service would load the previous active output for the same `agentId` and pass it as context to the LLM.

No new table needed for history. The existing plumbing handles it.

---

## 9. Governance

Scheduled synthesis inherits the full governance stack:
- `cardsForRole()` runs passport filtering on every synthesis
- Output gates apply to specialist cards feeding the synthesis
- Red-team checks run on every synthesis answer
- Audit events written for every scheduled run
- Sensitivity ceiling respected (workspace-level)
- No autonomous outbound action: email delivery is a notification, not a decision

New audit events:
- `synthesis_scheduled_run`: records workspace, roles, status, duration
- `synthesis_delivery_sent`: records workspace, role, channel (email/slack), recipient

---

## 10. Failure Handling

| Failure | Behavior |
|---|---|
| LLM provider down | Mark `last_status = failed`, write audit event, retry next scheduled window |
| Partial role failure | Deliver successful roles, mark `last_status = partial`, log failed roles |
| Email delivery failure | Log to audit, do not retry (user sees in-app result) |
| No evidence in workspace | Synthesis returns low-confidence answers with "insufficient evidence" notes (existing behavior) |
| Cron runner crash | Render restarts on next schedule; `last_run_at` gap is visible in settings UI |

---

## 11. Build Plan (2 sessions)

### Session 1: Core scheduled synthesis

1. Migration `0021_synthesis_schedules.sql` and Drizzle schema
2. Repository methods: `getSynthesisSchedule`, `upsertSynthesisSchedule`, `getDueSchedules`, `updateScheduleLastRun`
3. Cron runner script: `scripts/run-scheduled-synthesis.ts`
4. Internal cron API route with shared-secret auth
5. Settings API routes: GET/PUT `/api/synthesis-schedule`, POST `/api/synthesis-schedule/test`
6. Settings UI section for schedule configuration
7. "Last refreshed" timestamp on synthesis brief panel
8. Tests: schedule CRUD, cron window matching, runner logic

### Session 2: Email delivery and polish

1. Configure the production sender domain and product-email provider credentials.
2. Confirm Clerk auth email verification remains configured in Clerk, not Nexus.
3. Run one end-to-end scheduled synthesis test with email delivery.
4. Confirm unsubscribe link and audit event behavior.
5. Update ARCHITECTURE.md, ROADMAP.md, TASKS.md, CHANGELOG.md when the production sender is verified.

---

## 12. What This Is Not

- Not a notification system. This is a scheduled synthesis refresh with optional push delivery.
- Not real-time alerts. The cadence is daily or weekly, not event-driven.
- Not a subscription service. Email targets are workspace-admin configured, not self-serve.
- Not autonomous action. The brief is read-only; decisions still require human approval in-app.

---

## 13. Commercial Impact

**Before:** "NexusAI gives you an AI analyst you can check when you want."

**After:** "NexusAI delivers your leadership brief every Monday morning. You open your email, and the company picture is already there."

The push cadence creates habit. Habit creates retention. Retention creates renewals.

For pilot pricing, scheduled synthesis is a natural upsell: free tier gets on-demand only, pilot/paid tier gets scheduled delivery. This is a clean value boundary.
