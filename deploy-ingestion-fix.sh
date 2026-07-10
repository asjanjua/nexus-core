#!/bin/bash
# Run from the nexus-core root: bash deploy-ingestion-fix.sh
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  render.yaml \
  apps/mission-control/app/api/ask/route.ts \
  apps/mission-control/app/ask/page.tsx \
  apps/mission-control/app/ingestion/page.tsx \
  apps/mission-control/app/onboarding/wizard.tsx \
  apps/mission-control/app/decisions/page.tsx \
  apps/mission-control/app/recommendations/page.tsx \
  apps/mission-control/app/review/page.tsx \
  apps/mission-control/app/sources/page.tsx \
  apps/mission-control/app/layout.tsx \
  apps/mission-control/app/dashboard/ceo/page.tsx \
  apps/mission-control/app/dashboard/coo/page.tsx \
  apps/mission-control/app/dashboard/cbo/page.tsx \
  apps/mission-control/app/dashboard/cto/page.tsx \
  apps/mission-control/components/ingestion-upload.tsx \
  apps/mission-control/components/ask-panel.tsx \
  apps/mission-control/lib/api-auth.ts \
  apps/mission-control/lib/services/llm.ts

git commit -m "fix: ask tab, workspace isolation, LLM model, and ingestion UI

ask/route.ts
- Use ctx.workspaceId from auth session, not request body
  Body workspaceId was stale (org-less users sent 'workspace-demo')
  while evidence was stored under userId after the api-auth fix

ask/page.tsx + all dashboard/page.tsx files (11 pages)
- Workspace fallback: orgId ?? userId ?? env ?? 'workspace-demo'
  Consistent with api-auth.ts so server pages and API routes
  resolve the same workspace for the same user

lib/services/llm.ts
- Fix hardcoded deepseek-v4-pro fallback to deepseek-chat in two places
  (DEFAULT_MODEL and callOpenAICompatible model selection)

render.yaml
- NEXUS_LLM_MODEL: deepseek-v4-pro -> deepseek-chat

lib/api-auth.ts
- Authenticated users without Clerk org get userId as workspace
  (not workspace-demo shared bucket)

components/ingestion-upload.tsx
- Full redesign: drag-and-drop, per-file progress, status badges,
  confidence bars, inline next-step guidance per result

components/ask-panel.tsx
- Guard empty answer string with actionable diagnostic message
- Show evidence ref count in badge row

app/onboarding/wizard.tsx
- Wire real drag-and-drop handlers to dropzone (onDrop/onDragOver/onDragLeave)
- Add visual drag-active border state"

git push

echo ""
echo "Pushed. Render auto-deploys in ~3 minutes."
echo "After deploy, test Ask tab — you should get a real DeepSeek answer."
