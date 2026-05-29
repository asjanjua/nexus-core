# TASKS.md — NexusAI Roadmap and Checklist

> Master task list for the NexusAI relay team. Do not delete tasks; mark them complete with `[x]`.

---

## Project Overview

**Project name:** NexusAI Mission Control  
**Goal:** Executive intelligence command layer for paid enterprise pilots.  
**Target:** CEOs, COOs, CTO/CDOs, strategy leaders, and transformation sponsors who need faster evidence-backed understanding of company status, risks, decisions, and recommendations.  
**Stack:** Next.js 15, TypeScript, Clerk, Postgres/Drizzle/pgvector, R2, Render, LLM provider routing.

---

## Phase 1 — Pilot Foundation

- [x] Create Mission Control app in `apps/mission-control`
- [x] Add Clerk auth and workspace scoping
- [x] Add Postgres/Drizzle schema and migrations
- [x] Add ingestion contracts, provenance, confidence, quarantine statuses
- [x] Add R2 original-file storage path
- [x] Add pgvector migration and vector retrieval path
- [x] Deploy on Render
- [x] Verify live auth, ingestion, and workspace scoping

---

## Phase 2 — Core UX Stabilization

- [x] Batch upload up to 10 files in onboarding
- [x] Batch upload up to 10 files in dashboard ingestion
- [x] Add active side-nav highlighting
- [x] Add dashboard loading skeletons
- [x] Polish Ask tab history, source details, and suggested prompts
- [x] Polish ingestion result guidance and quarantine refresh prompt
- [x] Polish recommendations empty state and actor handling
- [ ] Rewrite remaining technical page descriptions into exec-friendly language
- [ ] Add mobile/tablet navigation behavior
- [ ] Convert duplicated dashboard routes into one dynamic route

---

## Phase 3 — AI-Assisted Company Context Onboarding

- [ ] Add sector/company type library
- [ ] Add workspace profile contract and persistence
- [ ] Add onboarding step for company type before uploads
- [ ] Add free-text company description box
- [ ] Add AI classifier for sector, subsector, business model, likely roles, likely documents, KPIs, and risk defaults
- [ ] Add deterministic fallback when AI is unavailable
- [ ] Let users confirm/edit AI-generated company profile
- [ ] Use company profile in dashboard and Ask prompts
- [ ] Use company profile to recommend first upload pack

---

## Phase 4 — Department-Based Ingestion

- [ ] Add department taxonomy
- [ ] Add department metadata to evidence records
- [ ] Let users choose department during upload
- [ ] Add AI-suggested department labels per file
- [ ] Add department filters in Sources, Ingestion, Ask, and dashboards
- [ ] Add sector-specific department defaults

---

## Phase 5 — Governance and Trust

- [ ] Add admin delete/archive path for test or bad evidence records
- [ ] Add richer source display instead of raw evidence IDs where possible
- [ ] Add audit view improvements
- [ ] Add dependency vulnerability cleanup pass
- [ ] Add rate-limit/cost guardrails for LLM calls
- [ ] Add richer original document preview path

---

## Phase 6 — Commercial Pilot Packaging

- [ ] Add sponsor-facing onboarding checklist
- [ ] Add pilot success scorecard
- [ ] Add weekly executive brief export
- [ ] Add risk radar export
- [ ] Add recommendation register export
- [ ] Add sample dataset / demo workspace reset flow

