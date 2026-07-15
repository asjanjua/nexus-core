---
name: nexus-frontend-orchestrator
description: Coordinate implementation-ready NexusAI front-end slices across routes, components, APIs, states, design craft, accessibility, responsive behavior, browser verification, and documentation. Use for Mission Control UI, UX, dashboards, onboarding, settings, product-domain screens, Figma-to-code work, visual polish, or any change under apps/mission-control/app or components that affects users.
---

# Nexus Frontend Orchestrator

Deliver a complete user-facing vertical slice, not an isolated mockup or component. Connect the visible screen to real contracts, APIs, services, permissions, evidence, and failure behavior.

## Establish the UI contract

1. Read `AGENTS.md` and `docs/ENGINEERING_GUARDRAILS.md`.
2. Read the relevant workflow specification and `docs/UI_BASELINE_VERSIONING.md` when the surface is versioned or Figma-backed.
3. Read `.claude/skills/design-better/SKILL.md` completely for craft and accessibility rules. Treat existing tokens/components as the style source; do not copy the skill into runtime code.
4. Read [references/frontend-gates.md](references/frontend-gates.md).
5. Map the vertical slice:
   - entry route and navigation;
   - primary user and job;
   - API contract and permission boundary;
   - loading, empty, success, error, forbidden, and signed-out states;
   - evidence/provenance and human-approval affordances;
   - responsive and keyboard behavior;
   - browser and production-build proof.

## Coordinate front-end agents

When delegation is useful, assign disjoint roles:

- a read-only UX/design-system scout;
- a read-only API/data-contract scout;
- one UI writer in one worktree;
- a separate browser/accessibility verifier after implementation.

Do not let scouts edit. Do not let multiple writers touch the same route, shared component, navigation, or token files. The main agent owns integration and user-facing acceptance criteria.

## Build the vertical slice

1. Reuse existing layouts, primitives, fetch patterns, typed contracts, workflow registries, and product detection.
2. Keep client components fetch-only against server APIs where possible.
3. Do not import Clerk client components, Sentry runtime instrumentation, client force-graph packages, server database modules, or Node built-ins into client bundles.
4. Keep executive-facing copy plain and evidence-aware. Avoid raw IDs and internal task labels.
5. Make human approval, confidence, sensitivity, provenance, and consequential-action boundaries visible where relevant.
6. Implement all states in the UI contract. A happy-path render alone is incomplete.
7. Add focused component/service/route tests for logic introduced by the slice.
8. Record new reusable patterns in the governing UI/workflow specification rather than scattering unexplained one-offs.

Use `$nexus-build-loop` for the implementation/review/fix cycle.

## Verify the experience

Run focused tests, `$nexus-release-gauntlet`, and browser verification. Exercise real user flows with representative data and confirm:

- no horizontal scroll at 320 CSS px;
- keyboard navigation and visible focus;
- associated labels and semantic elements;
- disabled/loading feedback for asynchronous actions;
- empty, error, forbidden, and signed-out paths;
- no internal jargon or unsupported customer claims;
- production build completion;
- authenticated behavior when the route is protected.

Use the in-app browser for isolated local/public checks. Use Chrome only when the task requires the user's existing logged-in session. Avoid external write actions during smoke unless explicitly authorized.

## Reconcile the surface

Update the appropriate workflow specification and UI baseline only after the code and browser evidence settle. Route central paperwork through `$nexus-papertrail`.

Report the route, user job, states covered, API/permission boundary, test/build results, browser evidence, responsive/accessibility result, and remaining production dependency.
