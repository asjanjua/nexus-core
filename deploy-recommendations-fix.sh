#!/bin/bash
# Run from the nexus-core root: bash deploy-recommendations-fix.sh
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  apps/mission-control/lib/services/recommendations.ts \
  apps/mission-control/lib/data/store.ts \
  apps/mission-control/app/api/ingestion/status/route.ts \
  apps/mission-control/app/api/evidence/[id]/review/route.ts \
  apps/mission-control/app/api/dashboard/[role]/route.ts \
  apps/mission-control/components/dashboard-panel.tsx \
  apps/mission-control/lib/services/dashboard.ts

git commit -m "feat: recommendation generation, dashboard fixes, empty states

lib/services/recommendations.ts  (NEW)
- LLM-powered recommendation generator using processed evidence
- Prompts DeepSeek/Anthropic for 2-3 structured JSON recommendations
- Deduplicates by title, caps drafts at 10, strips markdown fences
- Fully silent failure path — never propagates errors to callers

lib/data/store.ts
- Add addRecommendation() to in-memory fallback store
  (was missing, caused TS2551 when DB unavailable)

app/api/ingestion/status/route.ts
- Fire-and-forget generateRecommendations() after POST
  Only triggers when ingestionStatus === 'processed'

app/api/evidence/[id]/review/route.ts
- Fire-and-forget generateRecommendations() after manual approval
  (pending_approval → processed transition)

app/api/dashboard/[role]/route.ts
- Pass ctx.workspaceId to cardsForRole() — was missing, so API
  route always queried workspace-demo instead of user's workspace

components/dashboard-panel.tsx
- Add empty state: 'No recommendations yet. Ingest and process
  documents to generate AI-driven recommendations.'
- Show owner + confidence next to each recommendation title

lib/services/dashboard.ts
- Fix generateCard() catch fallback: says ANTHROPIC_API_KEY but
  app uses DeepSeek — updated to mention both keys"

git push

echo ""
echo "Pushed. Render auto-deploys in ~3 minutes."
echo ""
echo "After deploy, upload a document via the Ingestion tab."
echo "Once ingested, the dashboard Recommendations section should"
echo "populate automatically within seconds."
