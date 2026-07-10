#!/bin/bash
# Phase 6 completion — department filters, evidence delete, audit log, per-workspace rate limits
# Run from the nexus-core root: bash deploy-phase6.sh
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  apps/mission-control/app/ask/page.tsx \
  apps/mission-control/components/ask-panel.tsx \
  apps/mission-control/components/delete-evidence-button.tsx \
  apps/mission-control/app/sources/page.tsx \
  apps/mission-control/app/settings/page.tsx \
  apps/mission-control/app/api/audit/events/route.ts \
  apps/mission-control/lib/services/llm.ts \
  apps/mission-control/lib/services/retrieval.ts \
  apps/mission-control/lib/services/dashboard.ts \
  apps/mission-control/lib/services/recommendations.ts \
  TASKS.md \
  HANDOVER.md \
  CHANGELOG.md \
  docs/ROADMAP.md

git commit -m "feat: Phase 6 complete — department chips, evidence delete, audit log, per-workspace rate limits

app/ask/page.tsx
- Fetches available departments server-side and passes to AskPanel as prop
- Reads ?q= URL param and passes as initialQuery so Go Live step can pre-populate Ask

components/ask-panel.tsx
- Department filter upgraded from text input to clickable chip selector
- Chips show all departments that exist in the workspace evidence
- Chips fall back to text input when no departments are present
- initialQuery prop + useEffect triggers auto-population from ?q= URL param
- Cmd+Enter keyboard shortcut to submit query

components/delete-evidence-button.tsx  (NEW)
- Two-step confirmation: click 'Remove' → confirm with filename shown → DELETE /api/evidence/:id
- Uses router.refresh() to update Sources list without full page reload
- Graceful error display; shows 'Removing...' during request

app/sources/page.tsx
- DeleteEvidenceButton added to each evidence row with confirmation flow
- Shows 'Remove' link aligned with the status badge

app/settings/page.tsx
- New 'Audit Log' tab added to Settings tabs (8th tab)
- AuditTab component fetches GET /api/audit/events with configurable limit (25/50/100)
- Displays event type (colour-coded), actor, timestamp, and human-readable summary
- Covers: ingestion_extraction_completed, evidence_deleted, recommendation_generated,
  approval_granted/rejected, ingestion_original_stored, ingestion_original_storage_failed

app/api/audit/events/route.ts  (NEW)
- GET /api/audit/events?limit=50 — returns workspace audit events (admin scope)
- Calls repository.getAuditEvents(workspaceId, limit)
- limit capped at 100

lib/services/llm.ts
- usageState refactored from global singleton to Map<workspaceId, UsageState>
- getUsageState(workspaceId) helper creates state on first access
- enforceLlmGuardrails() and reconcileUsage() now keyed by workspaceId
- LLMOptions.workspaceId field added (optional, defaults to '_global_')
- Rate-limit error messages now include workspace ID for auditability
- Existing behaviour unchanged for callers that don't supply workspaceId

lib/services/retrieval.ts
lib/services/dashboard.ts
lib/services/recommendations.ts
- workspaceId threaded into ask() calls so rate limits are tracked per workspace"

git push

echo ""
echo "Pushed. Render auto-deploys in ~3 minutes."
echo ""
echo "What to verify:"
echo "  1. Ask page: department chips appear when evidence has department labels"
echo "  2. Ask page: /ask?q=What+are+the+risks pre-populates the query"
echo "  3. Sources: 'Remove' button per row with two-step confirmation"
echo "  4. Settings > Audit Log: shows recent events with colour-coded types"
echo "  5. GET /api/audit/events returns events for the workspace"
echo "  6. LLM errors include workspace ID in rate-limit messages"
