#!/bin/bash
# Run from the nexus-core root: bash deploy-uiux-wave1.sh
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  apps/mission-control/app/layout.tsx \
  apps/mission-control/components/side-nav.tsx \
  apps/mission-control/app/onboarding/wizard.tsx \
  apps/mission-control/components/dashboard-skeleton.tsx \
  apps/mission-control/components/dashboard-panel.tsx \
  apps/mission-control/components/ingestion-upload.tsx \
  apps/mission-control/app/ingestion/page.tsx \
  apps/mission-control/components/ask-panel.tsx \
  apps/mission-control/components/recommendation-list.tsx \
  apps/mission-control/app/recommendations/page.tsx \
  apps/mission-control/app/dashboard/ceo/page.tsx \
  apps/mission-control/app/dashboard/coo/page.tsx \
  apps/mission-control/app/dashboard/cbo/page.tsx \
  apps/mission-control/app/dashboard/cto/page.tsx \
  "apps/mission-control/app/dashboard/[role]/page.tsx"

git commit -m "fix: UI/UX Wave 1+2 — nav, onboarding, dashboards, ingestion, ask, recommendations

components/side-nav.tsx
- Add active link highlighting via usePathname()
- Active item: bg-white/10, text-white, font-medium
- Converted to client component

app/layout.tsx
- Fix OrganizationSwitcher: only render when orgId present;
  solo users see 'Personal workspace' label instead of blank widget
- Truncate raw workspaceId in top bar (was showing full Clerk userId)
- Stale data warning now links to /ingestion and /sources

app/onboarding/wizard.tsx
- Fix Step 2: 'Task 22' → 'Coming soon' on connector cards
- Fix Step 2: Broken button label when 0 files selected
- Fix Step 3: Multi-file upload shows aggregate status badge
  (e.g. '3 processed, 1 pending') instead of first file's status only
- Fix Step 3: 'Approve Evidence and Continue →' → 'Continue to Dashboard →'
  (button did not call any approval API — misleading)
- Add pending_approval guidance in Step 3 with link to /approvals

components/dashboard-skeleton.tsx  (NEW)
- Animated skeleton for dashboard loading state

app/dashboard/{ceo,coo,cbo,cto}/page.tsx
- Wrap DashboardPanel in <Suspense fallback={<DashboardSkeleton />}>
- Pages no longer hang silently during LLM synthesis calls

app/dashboard/[role]/page.tsx  (NEW)
- Single dynamic route as canonical source for future roles
- roleSchema validation with notFound() on invalid role
- Includes Suspense + DashboardSkeleton

components/dashboard-panel.tsx
- Replace raw UUID evidence refs with '2 sources' count text
- Add line-clamp-6 to card summaries (prevents uneven card heights)
- Recommendations list: colour-coded confidence, owner on separate line,
  borderless rows with dividers instead of wall of text

components/ingestion-upload.tsx
- ConfidenceBar now shows High/Medium/Low label (matching wizard)
- Action links after upload: 'go to Approvals' and 'view your dashboard'
  are now <a> links, not plain text
- 'Upload another batch' button appears after upload completes

app/ingestion/page.tsx
- Plain-language page description
- Quarantine queue: show filename only (not full /uploads/... path)
- Quarantine queue: count badge on section header
- Quarantine queue: description text explaining what to do

components/ask-panel.tsx
- History truncation: answers >220 chars get Show more / Show less
- Role labels: 'USER'/'ASSISTANT' → 'You'/'NexusAI'
- Clear button in conversation history header
- Evidence refs: expandable <details> element showing source IDs
- Suggested queries: three preset question chips below textarea
- Spinner animation during loading
- Generic LLM key error message (not DeepSeek-specific)

components/recommendation-list.tsx
- Empty state: 'No recommendations yet. Upload and process documents...'
- Fixed hardcoded actor: 'operator' → actual userId passed as prop
- Coloured confidence text per recommendation
- Status badge with colour coding per status value
- Proper error display on approval/rejection failure

app/recommendations/page.tsx
- Plain-language page description
- Pass userId to RecommendationList"

git push

echo ""
echo "Pushed. Render auto-deploys in ~3 minutes."
echo ""
echo "What to verify after deploy:"
echo "  1. Side nav: active page is highlighted"
echo "  2. Onboarding Step 2: connector cards say 'Coming soon'"
echo "  3. Onboarding Step 3: multi-file shows aggregate status"
echo "  4. Dashboard pages: show skeleton animation while loading"
echo "  5. Ingestion: confidence bar shows High/Medium/Low label"
echo "  6. Ingestion: post-upload links are clickable"
echo "  7. Ask tab: history has 'You'/'NexusAI' labels + Clear button"
echo "  8. Recommendations: empty state message visible when none exist"
