# Desktop Distribution — Code Impact Analysis
### How the Mac/PC download plan lands on the Mission Control codebase

Companion to `DESKTOP_DISTRIBUTION_PLAN.md`.
Baseline: NexusAI Mission Control v0.23.1 (Next.js 15, Drizzle + node-postgres, Clerk, R2, server-side LLM).
Date: 25 June 2026.

---

## 1. The headline

Good news first. Three of the four cloud dependencies that a local-first desktop build has to replace are **already seamed in the code**. This is not a rewrite. It is adapters behind interfaces that already exist, plus one genuinely hard swap (the database).

| Dependency | Current seam in code | How ready is it? | Phase |
|---|---|---|---|
| LLM provider | `lib/services/llm.ts` already supports `NEXUS_LLM_PROVIDER=openai_compatible` with a configurable `OPENAI_COMPAT_BASE_URL`, plus a workspace-level local-only mode and provider allow-list | Basically done | Phase 3 |
| File storage | `lib/services/object-storage.ts` is flag-gated (`NEXUS_R2_ORIGINALS=enabled/disabled`) and already no-ops gracefully when R2 is absent | Seam exists, needs a filesystem backend | Phase 2 |
| Auth | `middleware.ts` runs Clerk, but there is already a Bearer/API-key bypass path and a local `verifyPassword` in `lib/auth` | Seam exists, needs local-unlock mode | Phase 2 |
| Database | `lib/data/repository.ts` uses `drizzle-orm/node-postgres` (`Pool` from `pg`) with an in-memory `store` fallback and `db-policy` gating | Hardest swap; pgvector is Postgres-specific | Phase 2 |

Translation: **Phase 3 (on-prem local LLM) is almost a configuration change, not a build.** The database is the only part that deserves the word "engineering." That reorders the effort in the distribution plan in your favour.

---

## 2. What each phase actually touches

### Phase 0 — Installable web app (PWA)
Smallest footprint. Purely additive, no existing file logic changes.

New files:
- `apps/mission-control/public/manifest.json` (name, icons, `display: standalone`, theme colours from the locked design tokens)
- `apps/mission-control/public/sw.js` service worker (versioned cache, network-first for API routes)
- Icon set under `public/icons/` (192, 512, maskable)

Edited files:
- `app/layout.tsx` — add `<link rel="manifest">` and theme-colour meta, register the service worker
- `middleware.ts` — ensure `/manifest.json` and `/sw.js` are on the public-route allow-list so Clerk does not gate them

Risk: the service worker must not cache authenticated API responses or Clerk will misbehave. Use network-first for `/api/*` and cache only the static shell.

### Phase 1 — Tauri desktop client over cloud backend
The Next.js app does not change. You add a sibling crate.

New top-level structure:
- `apps/desktop/` — Tauri v2 project
  - `src-tauri/tauri.conf.json` — window config, updater endpoint (GitHub Releases), deep-link scheme `nexus://`, bundle identifiers
  - `src-tauri/src/main.rs` — thin shell that loads `https://app.pinavia.io` (or a bundled shell), system tray, menu
  - `src-tauri/icons/` — platform icons
- `.github/workflows/desktop-release.yml` — matrix build (macOS Intel + Apple Silicon, Windows x64) via `tauri-action`, signing secrets, publish to Releases

Edited files:
- Minimal. Possibly a `NEXUS_DESKTOP=true` header/flag so the backend can tell desktop sessions apart (telemetry, licence checks). Add to `middleware.ts` only if needed.

Risk: Clerk session cookies inside a Tauri WebView. Clerk supports this but the redirect flow and allowed origins must include the Tauri origin. Budget a day for auth-in-webview.

### Phase 2 — Local-first (the real work)
Four workstreams behind existing seams.

**2a. Database adapter (the crux).**
- `lib/data/repository.ts` is the single chokepoint; all DB access already routes through it. That is the good news.
- Two viable local backends:
  - **Option A — Embedded Postgres.** Ship a Postgres binary with the app (e.g. an embedded-postgres approach). Keeps `pgvector`, keeps migrations `0001-0025` unchanged, keeps SQL identical. Heaviest bundle, most faithful.
  - **Option B — SQLite + sqlite-vec.** Add a Drizzle SQLite driver behind the repository interface. Lightest, most "desktop native", but requires: porting 25 migrations to SQLite dialect, replacing pgvector queries in `lib/services/retrieval.ts` and `embeddings.ts` with sqlite-vec, and auditing every raw `sql\`\`` fragment for Postgres-isms.
- Recommendation: prototype Option B first (better desktop fit, smaller, matches the Tauri philosophy); fall back to Option A if migration/vector parity proves too costly. Decide with a spike, not a debate.
- New: `lib/data/repository-sqlite.ts` (or a driver switch inside `repository.ts` keyed on `NEXUS_DB_DRIVER`).

**2b. File storage backend.**
- `lib/services/object-storage.ts` already abstracts store/fetch and is flag-gated. Add a `filesystem` backend that writes originals to the Tauri app-data directory instead of R2.
- New: `lib/services/object-storage-fs.ts`; select via a `NEXUS_STORAGE_DRIVER=filesystem|r2` env/flag.

**2c. Auth / local unlock.**
- Introduce a `NEXUS_AUTH_MODE=cloud|local`. In `local`, bypass Clerk in `middleware.ts` (the Bearer bypass path is the template) and gate the app behind a local licence-key unlock that reuses the existing `verifyPassword`/local user path.
- New: `lib/auth/local-unlock.ts` (licence-key validation, see Section 4); edits to `middleware.ts` guarded by the auth-mode flag so cloud behaviour is untouched.

**2d. Runtime host.**
- Decide how Next.js server routes run inside the desktop app: either bundle the Next server as a Tauri sidecar process, or compile the needed logic into Tauri commands. Sidecar is faster to reach and keeps the API routes intact. This is the second real engineering decision after the DB.

### Phase 3 — On-prem local LLM
Nearly free because the provider layer is already built.
- Set `NEXUS_LLM_PROVIDER=openai_compatible` and `OPENAI_COMPAT_BASE_URL=http://localhost:1234/v1` (LM Studio) or `http://localhost:11434/v1` (Ollama). Both expose OpenAI-compatible endpoints.
- Add: local-endpoint auto-detect with a friendly "start your local model" prompt when none responds; a local embeddings model wired into `lib/services/embeddings.ts` (embeddings must also be local, or vector search still calls the cloud).
- Gate quality: run the existing 30-case eval harness against the local model before shipping; only release if it clears the current threshold.

---

## 3. What must not change

The governance layer is the moat and it is portable across all phases. Do not fork or special-case it for desktop:
- `lib/agents/passport-policy.ts`, `lib/agents/output-gate.ts`, `lib/agents/default-passports.ts` — evidence filtering, hard stops, tool guards
- `lib/services/synthesis.ts`, `lib/services/dispatcher.ts` — synthesis and orchestration
- `lib/contracts.ts` — Zod schemas and types
- The eval/red-team harness

These run identically whether the data is in Neon or SQLite and whether the LLM is Anthropic or a local model. Keeping them driver-agnostic is the whole point of doing the swaps behind the repository and provider seams.

---

## 4. New capability the plan needs: offline licence keys

For paid desktop/on-prem tiers, the app must validate a licence without your server. Approach:
- Issue signed licence keys (Ed25519). The app ships the public key; a key encodes tier, seat count, and expiry; the app verifies the signature offline.
- Sell/issue via Lemon Squeezy (merchant of record, handles GCC/EU tax) for one-time keys; keep Stripe for cloud subscriptions.
- New: `lib/licensing/verify.ts` (offline signature check), a key-entry screen, and a tier gate that reuses the existing plan-definition/feature-flag machinery so Free/Pro/Business/Enterprise mean the same thing online and offline.

This is genuinely new code, not a swap. Small but security-sensitive; keep the signing private key out of the repo.

---

## 5. Re-estimated effort (given the seams)

| Phase | Original estimate | Revised, given existing seams |
|---|---|---|
| Phase 0 PWA | days | 2 to 3 days |
| Phase 1 Tauri client | 2 to 4 weeks | 1.5 to 3 weeks (auth-in-webview is the variable) |
| Phase 2 local-first | 6 to 10 weeks | 4 to 8 weeks; ~70% of it is the DB adapter + Next runtime host |
| Phase 3 local LLM | 1 to 2 weeks | 3 to 5 days (provider layer already exists; embeddings + eval are the work) |
| Licensing (new) | not separately scoped | 3 to 5 days |

The single biggest risk to the timeline is the database adapter. Everything else is bounded.

---

## 6. Risks specific to the code

| Risk | Where | Mitigation |
|---|---|---|
| pgvector has no drop-in SQLite equal | `retrieval.ts`, `embeddings.ts` | Spike sqlite-vec early; keep embedded-Postgres as the fallback |
| Raw `sql\`\`` Postgres-isms break on SQLite | `repository.ts` | Grep every raw fragment during the spike; the repository is the only place they live |
| Clerk session inside Tauri WebView | `middleware.ts`, auth flow | Add Tauri origin to Clerk allowed origins; test the redirect early |
| Service worker caches authed API responses | Phase 0 `sw.js` | Network-first for `/api/*`, cache only static shell |
| Local model quality below cloud | Phase 3 | Gate release on the existing eval harness |
| Licence key private material leaking | Phase 1/2 licensing | Keep private key in CI secrets only; ship public key |
| Two runtime modes drift apart | whole app | One codebase, driver flags (`NEXUS_DB_DRIVER`, `NEXUS_STORAGE_DRIVER`, `NEXUS_AUTH_MODE`); no forks |

---

## 7. Immediate code next steps

1. **Ship Phase 0.** Add `manifest.json`, `sw.js`, icons; edit `app/layout.tsx` and the middleware public-route list. Verify the install prompt in Chrome. Low risk, real download story this week.
2. **Prove Phase 3 in an afternoon.** Point a dev build at LM Studio via the existing `openai_compatible` provider and run the eval harness. This de-risks the enterprise pitch immediately and costs almost nothing.
3. **Spike the DB adapter.** One week, timeboxed: Drizzle SQLite + sqlite-vec against migrations `0001-0025` and the vector queries in `retrieval.ts`. Output is a go/no-go on Option B vs embedded Postgres. This decision governs the Phase 2 timeline.
4. **Scaffold `apps/desktop/`.** Tauri v2 shell loading `app.pinavia.io`, plus the `desktop-release.yml` matrix build producing unsigned artifacts. Prove the pipeline before adding signing.

Do these four and you have converted a strategy document into a de-risked build, with the two cheapest high-value wins (PWA download and local-LLM proof) already banked.
