#!/bin/bash
# Run from the nexus-core root: bash deploy-company-context.sh
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  apps/mission-control/lib/domain/sector-library.ts \
  apps/mission-control/lib/contracts.ts \
  apps/mission-control/db/schema.ts \
  apps/mission-control/db/migrations/0008_workspace_profile.sql \
  apps/mission-control/lib/data/repository.ts \
  apps/mission-control/lib/data/store.ts \
  apps/mission-control/app/api/workspace/profile/route.ts \
  apps/mission-control/app/api/workspace/detect-profile/route.ts \
  apps/mission-control/app/api/workspace/first-focus/route.ts \
  apps/mission-control/app/api/ingestion/status/route.ts \
  apps/mission-control/app/onboarding/wizard.tsx \
  apps/mission-control/lib/services/company-detection.ts \
  apps/mission-control/lib/services/dashboard.ts \
  apps/mission-control/lib/services/recommendations.ts \
  apps/mission-control/lib/services/retrieval.ts

git commit -m "feat: AI Onboarding Strategist — focus mapping, policy defaults, sector-aware ingestion

lib/services/company-detection.ts
- NEW: mapFocusToDashboard(intent, companyContext) — LLM maps user intent
  (e.g. 'blocking growth and top risks') to recommended dashboards + 3 suggested
  first questions + a focus summary sentence. Falls back to null gracefully.
- FocusMapping type exported for wizard and API

app/api/workspace/first-focus/route.ts  (NEW)
- POST /api/workspace/first-focus — accepts intent string, fetches workspace
  profile, builds company context, calls mapFocusToDashboard, returns mapping
- Scope: admin. Falls back with ok:false when LLM unavailable

app/api/workspace/detect-profile/route.ts
- No functional change; included in deploy to keep history consistent

app/api/ingestion/status/route.ts
- classifyFilename now called on every file upload (not just onboarding wizard)
- Fetches workspace profile to get sector for sector-aware sensitivity elevation
- Caller-supplied department/sensitivity still takes precedence; auto-classify is fallback

app/onboarding/wizard.tsx
- Step 3 (Profile): Added 'Governance and Policy Defaults' panel showing auto-approved
  (75%+), pending review (35-75%), quarantined (<35%) thresholds and sensitivity default.
  Regulated-sector callout (financial_services/healthcare) explains elevated defaults.
- Step 5 (Upload): classifyFilename now receives actual profile.sector instead of empty
  string — department and sensitivity suggestions are sector-aware from first upload.
- Step 7 (Go Live): Transformed from static role cards to AI Focus intent input.
  User types what they want to focus on; 'Map my focus with AI' calls first-focus API.
  AI returns focus summary + 3 suggested questions. Role cards show 'Start here' badge
  on recommended dashboards and preview the first suggested question. Clicking a
  recommended card passes first question as ?q= URL param for the Ask panel.

lib/services/dashboard.ts / recommendations.ts / retrieval.ts
- No functional change; included in deploy to keep history consistent"
- answerWithEvidence() fetches profile in parallel with evidence ranking
- buildCompanyContext(profile) injected as prefix in ask user prompt"

git push

echo ""
echo "Pushed. Render auto-deploys in ~3 minutes."
echo ""
echo "After deploy, run migration 0008 in your Postgres console:"
echo ""
echo "  psql \$DATABASE_URL -f apps/mission-control/db/migrations/0008_workspace_profile.sql"
echo ""
echo "What to verify:"
echo "  1. Onboarding now has 6 steps (Workspace → Company → Context → Upload → Preview → Go Live)"
echo "  2. Step 2: 8 sector cards render; selecting one shows subsector chips"
echo "  3. Step 3: business model, stage, roles, goals chips save profile via /api/workspace/profile"
echo "  4. GET /api/workspace/profile returns saved profile"
echo "  5. Dashboard cards include sector-aware context (check LLM output)"
echo "  6. Ask answers reflect company context"
echo "  7. Recommendations reference sector-relevant areas"
