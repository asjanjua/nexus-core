# NexusAI Mission Control — UI/UX Audit
**Date:** 2026-05-29
**Scope:** Full audit — Onboarding, Ingestion, CxO Dashboards, Ask tab
**Output:** Fix-ready findings, grouped by file, severity-ranked

Severity scale: 🔴 Critical (broken/misleading), 🟠 High (poor UX, affects core task), 🟡 Medium (friction), 🟢 Low (polish)

---

## 1. Global / Shared

### 1.1 🔴 Side nav has no active link highlighting
**File:** `components/side-nav.tsx`
**Problem:** All 15 nav links look identical. The user cannot tell where they are.
**Fix:** Detect current pathname with `usePathname()` and apply an active class.
```tsx
// Add to side-nav.tsx (convert to "use client")
"use client";
import { usePathname } from "next/navigation";
// ...
const pathname = usePathname();
// On each Link:
className={[
  "block rounded-md px-3 py-2 text-sm transition",
  pathname === item.href || pathname.startsWith(item.href + "/")
    ? "bg-white/10 text-white font-medium"
    : "text-white/70 hover:bg-white/10 hover:text-white"
].join(" ")}
```

### 1.2 🟠 Top bar exposes raw Clerk userId/orgId to the user
**File:** `app/layout.tsx` line 100
**Problem:** `workspace: {workspaceId}` shows strings like `user_2xkJ9...` — looks like debug output to an exec user.
**Fix:** Show the org/display name, or remove the workspace ID entirely from the visible bar. At minimum label it clearly.
```tsx
// Replace:
<span>workspace: {workspaceId}</span>
// With (fetch org name from Clerk or show truncated + tooltip):
<span className="text-white/30 font-mono text-xs" title={workspaceId}>
  {workspaceId.length > 20 ? `${workspaceId.slice(0, 16)}…` : workspaceId}
</span>
```

### 1.3 🟠 OrganizationSwitcher has `hidePersonal` — breaks solo users
**File:** `app/layout.tsx` line 87
**Problem:** `hidePersonal` means users with no Clerk org see an empty or broken switcher widget.
**Fix:** Remove `hidePersonal` or replace the switcher with a conditional that only renders when `orgId` is present.
```tsx
// Replace the OrganizationSwitcher block:
{orgId ? (
  <OrganizationSwitcher
    afterCreateOrganizationUrl="/onboarding"
    afterSelectOrganizationUrl="/dashboard/ceo"
    appearance={{ ... }}
  />
) : (
  <span className="text-xs text-white/40">Personal workspace</span>
)}
```

### 1.4 🟡 PageShell descriptions use internal engineering language
**File:** `components/page-shell.tsx` (descriptions passed from each page)
**Problem:** "Deterministic extraction for docs/comms with trust gateway and quarantine" is not exec-friendly language. Same for "Workspace-scoped Q&A with evidence references, confidence, freshness, and refusal handling."
**Fix:** Rewrite each page description in plain language (changes in individual page files):

| Page | Current | Suggested |
|------|---------|-----------|
| Ingestion | "Deterministic extraction for docs/comms with trust gateway and quarantine." | "Upload documents to extract and analyse. High-confidence files go straight to your dashboard; others queue for review." |
| Ask | "Workspace-scoped Q&A with evidence references, confidence, freshness, and refusal handling." | "Ask questions about your business. NexusAI answers using your ingested documents and data." |
| Recommendations | "Create, review, approve/reject, and track canonical promotion gates." | "AI-generated recommendations from your evidence, ready for review and action." |
| Review Queue | "Human-in-the-loop checkpoints before promotion or outbound delivery." | "Evidence and decisions waiting for your review before they enter the intelligence pipeline." |

### 1.5 🟡 Disabled buttons have no visual cue
**File:** `app/globals.css` — `.btn-primary`, `.btn-subtle`
**Problem:** Disabled state has no `cursor-not-allowed` or reduced opacity in the global class definitions, only `disabled:opacity-50` on some buttons inline.
**Fix:** Add to globals.css:
```css
.btn-primary {
  @apply rounded-lg bg-nexus-accent px-3 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed;
}
.btn-subtle {
  @apply rounded-lg border border-white/20 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed;
}
```

### 1.6 🟡 No mobile / tablet responsiveness
**File:** `app/layout.tsx`
**Problem:** Fixed sidebar with `max-w-xs` collapses poorly on narrow viewports. Executive users on tablets will see a broken layout.
**Fix:** Add a responsive breakpoint — on small screens, collapse nav into a hamburger or top bar:
```tsx
// Sidebar: hide on mobile, show on md+
<aside className="hidden md:flex w-full max-w-xs shrink-0 ...">
```
Full mobile nav is a larger effort; minimum viable fix is hiding the sidebar and ensuring content fills the viewport on small screens.

---

## 2. Onboarding Wizard

### 2.1 🔴 Connector cards show internal ticket number "Task 22"
**File:** `app/onboarding/wizard.tsx` line 473
**Problem:** `<span>Task 22</span>` is a developer reference exposed to end users on the Slack/Google Drive connector cards.
**Fix:**
```tsx
// Replace:
<span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white/40">
  Task 22
</span>
// With:
<span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white/40">
  Coming soon
</span>
```

### 2.2 🟠 Step 2 upload button label is broken when 0 files selected
**File:** `app/onboarding/wizard.tsx` line 460
**Problem:** `Ingest ${files.length || ""} Document${...}` renders as "Ingest  Documents →" when no files are selected (empty string for count). Looks like a bug.
**Fix:**
```tsx
{uploading
  ? `Extracting ${uploadedCount}/${files.length}...`
  : files.length === 0
  ? "Select files to continue"
  : files.length === 1
  ? "Ingest Document →"
  : `Ingest ${files.length} Documents →`}
```

### 2.3 🟠 Step 3 "Approve Evidence and Continue" button is misleading
**File:** `app/onboarding/wizard.tsx` line 591
**Problem:** The button says "Approve Evidence" but it does not call any approval API. It just advances the wizard to step 4. Users will think they approved the evidence but the file may still be in `pending_approval` status.
**Fix:** Either rename the button to reflect its actual function, or wire it to the review API for any `pending_approval` records before advancing.

Quick rename fix:
```tsx
// Replace:
<button onClick={onNext} className="btn-primary">
  Approve Evidence and Continue →
</button>
// With:
<button onClick={onNext} className="btn-primary">
  Continue to Dashboard →
</button>
```

Better fix: if `results.some(r => r.ingestionStatus === "pending_approval")`, call `POST /api/evidence/:id/review` with `approved` before advancing, and show a warning for quarantined items.

### 2.4 🟠 Step 3 shows only first file's status badge for multi-file uploads
**File:** `app/onboarding/wizard.tsx` lines 500-503
**Problem:** `const result = results[0]` — the top-level status badge shows the first file's status even when multiple files were uploaded with different statuses.
**Fix:** Show an aggregate summary badge:
```tsx
const processedCount = results.filter(r => r.ingestionStatus === "processed").length;
const pendingCount = results.filter(r => r.ingestionStatus === "pending_approval").length;
const quarantinedCount = results.filter(r => r.ingestionStatus === "quarantined").length;
// Then render multi-badge row instead of single badge
```

### 2.5 🟡 Step 3 missing guidance for pending_approval files
**File:** `app/onboarding/wizard.tsx` lines 569-589
**Problem:** Low confidence warning shows for `< 0.4`. But for `0.4–0.7` (pending_approval zone), there's no message telling the user they need to go to Approvals before the evidence will reach the dashboard.
**Fix:** Add a conditional for pending_approval results:
```tsx
{results.some(r => r.ingestionStatus === "pending_approval") && (
  <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
    <p className="font-medium">Review required</p>
    <p className="text-amber-100/70 mt-1">
      {results.filter(r => r.ingestionStatus === "pending_approval").length} file(s) need sign-off in the{" "}
      <a href="/approvals" className="underline">Approvals queue</a> before appearing in your dashboard.
    </p>
  </div>
)}
```

### 2.6 🟡 Back button on Step 3 shows empty Step 2
**File:** `app/onboarding/wizard.tsx` line 714
**Problem:** Going back from Step 3 to Step 2 clears the file state (it's component state). Users see the dropzone empty with no files. The already-uploaded files are lost from view.
**Fix:** Either disable the Back button on Step 3, or preserve the file list in the parent component and pass it down.

---

## 3. Ingestion Tab

### 3.1 🟠 No action links after successful upload
**File:** `components/ingestion-upload.tsx` lines 292-307
**Problem:** Status guidance text says "go to Approvals" and "Check Quarantine Queue below" but these are plain text — no clickable links/buttons. Users have to find the nav items themselves.
**Fix:**
```tsx
{fr.result?.ingestionStatus === "pending_approval" && (
  <p className="text-xs text-amber-200/70">
    Staged for review —{" "}
    <a href="/approvals" className="underline hover:text-amber-200 transition">go to Approvals</a>
    {" "}to approve before synthesis.
  </p>
)}
{fr.result?.ingestionStatus === "processed" && (
  <p className="text-xs text-green-200/70">
    Cleared for LLM synthesis —{" "}
    <a href="/dashboard/ceo" className="underline hover:text-green-200 transition">view your dashboard</a>.
  </p>
)}
```

### 3.2 🟠 Confidence bar in results has no text label
**File:** `components/ingestion-upload.tsx` lines 38-49
**Problem:** `ConfidenceBar` in ingestion-upload.tsx shows only a coloured bar and percentage — no "High / Medium / Low" label. The wizard version has this label. Inconsistency and less informative.
**Fix:** Add the label, matching wizard.tsx's version:
```tsx
function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-green-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  const label = pct >= 70 ? "High" : pct >= 40 ? "Medium" : "Low";
  const labelColor = pct >= 70 ? "text-green-400" : pct >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">Extraction confidence</span>
        <span className={labelColor}>{label} ({pct}%)</span>
      </div>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

### 3.3 🟠 Quarantine queue shows raw file path, not filename
**File:** `app/ingestion/page.tsx` line 24
**Problem:** `{item.sourcePath}` renders as `/uploads/board-pack.pdf` — ugly and noisy.
**Fix:**
```tsx
{item.sourcePath.split("/").pop() ?? item.sourcePath}
```

### 3.4 🟡 Quarantine queue does not refresh after upload
**File:** `app/ingestion/page.tsx`
**Problem:** The quarantine queue is server-rendered and static. After a new upload creates a quarantined record, the queue doesn't update without a page refresh.
**Fix:** Add a "Refresh page" link that appears after upload, or extract the quarantine queue into a client component that re-fetches.

Quick fix — show refresh prompt after upload in `IngestionUpload`:
```tsx
{fileResults.some(fr => fr.result?.ingestionStatus === "quarantined") && (
  <p className="text-xs text-white/40">
    Quarantined items added.{" "}
    <button onClick={() => window.location.reload()} className="underline hover:text-white/70">
      Refresh to see queue
    </button>
  </p>
)}
```

### 3.5 🟡 No "Upload another batch" reset after completion
**File:** `components/ingestion-upload.tsx`
**Problem:** After upload completes, the drop zone still shows "X files selected" and the "Clear" button disappears. Users have to know to click the drop zone again to start a new batch.
**Fix:** Show a clear "Upload another batch" button after all results are in:
```tsx
{!loading && fileResults.length > 0 && (
  <button
    className="btn-subtle text-sm w-full"
    onClick={() => { setFiles([]); setFileResults([]); setError(null); if (fileRef.current) fileRef.current.value = ""; }}
  >
    Upload another batch
  </button>
)}
```

---

## 4. CxO Dashboards

### 4.1 🔴 Dashboard cards have no loading / Suspense state
**File:** `components/dashboard-panel.tsx`
**Problem:** `DashboardPanel` is a server component that awaits `cardsForRole()` — which makes multiple LLM API calls. If LLM is slow, the entire page hangs with zero feedback. On Render free tier, first response can be 5-10 seconds.
**Fix:** Wrap `DashboardPanel` in `<Suspense>` in each dashboard page and add a skeleton fallback:
```tsx
// In app/dashboard/ceo/page.tsx (and all three others):
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

// Replace:
<DashboardPanel role="ceo" workspaceId={workspaceId} />
// With:
<Suspense fallback={<DashboardSkeleton />}>
  <DashboardPanel role="ceo" workspaceId={workspaceId} />
</Suspense>
```

Create `components/dashboard-skeleton.tsx`:
```tsx
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-4 md:grid-cols-2">
        {[1,2,3,4].map(i => (
          <div key={i} className="panel space-y-3">
            <div className="h-3 w-32 rounded bg-white/10" />
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-3/4 rounded bg-white/10" />
          </div>
        ))}
      </div>
      <div className="panel space-y-2">
        <div className="h-3 w-48 rounded bg-white/10" />
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-2/3 rounded bg-white/10" />
      </div>
    </div>
  );
}
```

### 4.2 🟠 Evidence refs displayed as raw UUIDs
**File:** `components/dashboard-panel.tsx` line 21
**Problem:** `{card.evidenceRefs.join(", ")}` renders as `"ev-abc123..., ev-def456..."`. Meaningless to any user.
**Fix:** Show a count with a disclosure toggle, not raw IDs:
```tsx
// Replace:
<p className="mt-2 text-xs text-white/50">Evidence: {card.evidenceRefs.join(", ")}</p>
// With:
<p className="mt-2 text-xs text-white/40">
  Based on {card.evidenceRefs.length} source{card.evidenceRefs.length !== 1 ? "s" : ""}
</p>
```

### 4.3 🟠 Four dashboard pages are identical duplicates
**Files:** `app/dashboard/ceo/page.tsx`, `coo/page.tsx`, `cbo/page.tsx`, `cto/page.tsx`
**Problem:** All four pages are copy-pastes differing only in role and title. Any change (e.g., adding Suspense) must be applied to all four manually — a maintenance and consistency risk.
**Fix:** Create a single dynamic route:
```
app/dashboard/[role]/page.tsx  (replaces all four static pages)
```
```tsx
import { DashboardPanel } from "@/components/dashboard-panel";
import { PageShell } from "@/components/page-shell";
import { auth } from "@clerk/nextjs/server";
import { roleSchema } from "@/lib/contracts";
import { notFound } from "next/navigation";
import { Suspense } from "react";

const PAGE_META: Record<string, { title: string; description: string }> = {
  ceo: { title: "CEO Command Brief", description: "Strategic priorities, cross-functional risks, and open decisions." },
  coo: { title: "COO Execution View", description: "Operational health, delivery pipeline, and execution status." },
  cbo: { title: "CBO / Strategy", description: "Growth opportunities, BD pipeline, and strategic alignment." },
  cto: { title: "CTO / CDO", description: "Technology health, data quality, and security posture." },
};

export default async function DashboardPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) notFound();
  const { orgId, userId } = await auth();
  const workspaceId = orgId ?? userId ?? process.env.NEXUS_DEMO_WORKSPACE ?? "workspace-demo";
  const meta = PAGE_META[parsed.data];
  return (
    <PageShell title={meta.title} description={meta.description}>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardPanel role={parsed.data} workspaceId={workspaceId} />
      </Suspense>
    </PageShell>
  );
}
```

### 4.4 🟡 Dashboard card summaries have no max-height or line clamp
**File:** `components/dashboard-panel.tsx` line 16
**Problem:** Long LLM responses create uneven, very tall cards in the 2-column grid. Cards of different heights look unprofessional.
**Fix:**
```tsx
// Replace:
<p className="mt-2 text-sm text-white/80">{card.summary}</p>
// With:
<p className="mt-2 text-sm text-white/80 line-clamp-6">{card.summary}</p>
```
Add a "Show more" expand interaction for power users if needed.

### 4.5 🟡 Stale data warning is not actionable
**File:** `app/layout.tsx` lines 112-116
**Problem:** "Stale-data warning: one or more records exceed freshness policy and should be reviewed." — no indication of what to do or where to go.
**Fix:**
```tsx
<div className="mb-4 rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
  One or more evidence records exceed the 7-day freshness threshold.{" "}
  <a href="/ingestion" className="underline hover:text-amber-50">Re-ingest updated files</a>{" "}
  or{" "}
  <a href="/sources" className="underline hover:text-amber-50">review your sources</a>.
</div>
```

### 4.6 🟡 Recommendations list shows flat text, no visual hierarchy
**File:** `components/dashboard-panel.tsx` lines 27-38
**Problem:** The updated empty state is correct (from previous fix), but for populated recommendations the list reads as a wall of text. Owner and confidence are presented as one undifferentiated line.
**Fix:** Add confidence colour coding per recommendation row:
```tsx
{recs.length ? (
  recs.map((rec) => {
    const confPct = Math.round(rec.confidence * 100);
    const confColor = confPct >= 70 ? "text-green-300" : confPct >= 40 ? "text-amber-300" : "text-red-300";
    return (
      <li key={rec.id} className="flex items-start gap-3 py-1.5 border-b border-white/5 last:border-0">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/90">{rec.title}</p>
          <p className="mt-0.5 text-xs text-white/40">{rec.owner}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className={`text-xs font-medium ${confColor}`}>{confPct}%</span>
          <p className="text-xs text-white/30">{rec.status}</p>
        </div>
      </li>
    );
  })
) : ( ... )}
```

---

## 5. Ask Tab

### 5.1 🟠 Conversation history shows full answers — no truncation
**File:** `components/ask-panel.tsx` lines 100-112
**Problem:** `item.text` for assistant turns renders the entire LLM response inline in the history list. After 3-4 exchanges this becomes a massive wall of text.
**Fix:** Truncate history items with a "Show more" toggle:
```tsx
function HistoryItem({ role, text }: { role: string; text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;
  return (
    <li className="space-y-0.5">
      <span className="text-xs font-medium uppercase text-white/40">{role === "user" ? "You" : "NexusAI"}</span>
      <p className="text-sm text-white/70 leading-relaxed">
        {expanded || !isLong ? text : `${text.slice(0, 200)}…`}
      </p>
      {isLong && (
        <button onClick={() => setExpanded(e => !e)} className="text-xs text-nexus-accent hover:underline">
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </li>
  );
}
```

### 5.2 🟡 Role labels are "USER" / "ASSISTANT" — not user-friendly
**File:** `components/ask-panel.tsx` line 105
**Problem:** `<span className="uppercase text-white/50">{item.role}</span>` renders as "USER" and "ASSISTANT". For an exec product this is technical jargon.
**Fix:**
```tsx
const roleLabel = item.role === "user" ? "You" : "NexusAI";
```

### 5.3 🟡 No conversation history reset
**File:** `components/ask-panel.tsx`
**Problem:** History grows indefinitely with no way to clear it in the session.
**Fix:** Add a "Clear" button in the conversation history header:
```tsx
<div className="flex items-center justify-between">
  <p className="panel-title">Conversation History</p>
  {history.length > 0 && (
    <button onClick={() => setHistory([])} className="text-xs text-white/30 hover:text-white/60 transition">
      Clear
    </button>
  )}
</div>
```

### 5.4 🟡 Evidence refs badge is not actionable
**File:** `components/ask-panel.tsx` line 87
**Problem:** `{result.evidenceRefs.length} refs` badge shows a count but doesn't reveal which evidence was used. Users trust LLM answers more when they can trace the source.
**Fix:** Add an expandable panel below the badges showing the evidence IDs (and ideally file names if fetched):
```tsx
{result.evidenceRefs.length > 0 && (
  <details className="mt-1">
    <summary className="cursor-pointer text-xs text-white/40 hover:text-white/60">
      {result.evidenceRefs.length} source{result.evidenceRefs.length !== 1 ? "s" : ""} used
    </summary>
    <ul className="mt-1 space-y-0.5">
      {result.evidenceRefs.map(ref => (
        <li key={ref} className="text-xs font-mono text-white/30">{ref}</li>
      ))}
    </ul>
  </details>
)}
```

### 5.5 🟡 No suggested queries for empty state
**File:** `components/ask-panel.tsx`
**Problem:** Default query is hardcoded. New users don't know what to ask.
**Fix:** Show 2-3 suggested queries as chips below the textarea when query is the default value:
```tsx
const SUGGESTIONS = [
  "What are the top risks right now?",
  "What decisions are waiting to be made?",
  "What is our execution status this week?",
];
// Render below textarea:
<div className="flex flex-wrap gap-2 mt-2">
  {SUGGESTIONS.map(s => (
    <button key={s} onClick={() => setQuery(s)}
      className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/50 hover:border-nexus-accent/40 hover:text-white/80 transition">
      {s}
    </button>
  ))}
</div>
```

---

## 6. Recommendations Page

### 6.1 🔴 Recommendation approval API uses wrong field name
**File:** `components/recommendation-list.tsx` line 23
**Problem:** `body: JSON.stringify({ status, actor: "operator" })` — the `/api/approvals/[recommendationId]` endpoint expects `{ status }`, but looking at the approvals route, it likely expects something else. More importantly, the `actor` is hardcoded as `"operator"` instead of the logged-in user's ID.
**Fix:** Use the authenticated user's ID. Since this is a client component, pass `userId` as a prop from the page:
```tsx
// In recommendations/page.tsx, pass userId:
<RecommendationList initial={recs} userId={userId ?? "operator"} />

// In RecommendationList, accept and use it:
export function RecommendationList({ initial, userId }: { initial: Recommendation[]; userId: string }) {
  // ...
  body: JSON.stringify({ status, actor: userId })
```

### 6.2 🟠 Recommendation list has no empty state
**File:** `components/recommendation-list.tsx`
**Problem:** When `rows` is empty, the component renders an empty `<ul>` with no message. Users see a blank panel with no context.
**Fix:**
```tsx
{rows.length === 0 ? (
  <li className="text-center py-8 text-sm text-white/40">
    No recommendations yet. Upload and process documents to generate AI recommendations.
  </li>
) : rows.map(rec => ...)}
```

---

## 7. Approvals Page

The Approvals page (`app/approvals/page.tsx`) is the strongest page in the app — full empty state, bulk approve, confidence bar with labels, good metadata display. No critical issues.

### 7.1 🟢 Success/rejection state fades out but stays in list
**File:** `app/approvals/page.tsx` line 92-99
**Minor:** After approval/rejection, the card stays in the list at 60% opacity. This is fine but after all items are reviewed, users see a list of faded cards rather than the clean EmptyState. Add a note or button to refresh after all are done:
```tsx
{items.every(i => itemStates[i.id]?.status === "done") && items.length > 0 && (
  <div className="text-center pt-4">
    <p className="text-sm text-white/60">All items reviewed.</p>
    <button onClick={fetchPending} className="mt-2 btn-subtle text-sm">Refresh queue</button>
  </div>
)}
```

---

## Priority Summary

| # | Severity | Area | Issue | File |
|---|----------|------|-------|------|
| 1.1 | 🔴 Critical | Nav | No active link highlighting | side-nav.tsx |
| 2.1 | 🔴 Critical | Onboarding | "Task 22" visible to users | wizard.tsx |
| 4.1 | 🔴 Critical | Dashboards | No loading/Suspense state | dashboard-panel.tsx + pages |
| 6.1 | 🔴 Critical | Recommendations | Hardcoded `actor: "operator"` | recommendation-list.tsx |
| 1.2 | 🟠 High | Global | Raw userId shown in top bar | layout.tsx |
| 1.3 | 🟠 High | Global | OrganizationSwitcher breaks solo users | layout.tsx |
| 2.2 | 🟠 High | Onboarding | Broken button label with 0 files | wizard.tsx |
| 2.3 | 🟠 High | Onboarding | "Approve Evidence" button misleads | wizard.tsx |
| 2.4 | 🟠 High | Onboarding | Step 3 shows wrong status for multi-file | wizard.tsx |
| 3.1 | 🟠 High | Ingestion | No action links after upload | ingestion-upload.tsx |
| 3.2 | 🟠 High | Ingestion | Confidence bar missing label | ingestion-upload.tsx |
| 3.3 | 🟠 High | Ingestion | Quarantine queue shows raw path | ingestion/page.tsx |
| 4.2 | 🟠 High | Dashboards | Raw UUIDs for evidence refs | dashboard-panel.tsx |
| 4.3 | 🟠 High | Dashboards | 4 identical duplicate pages | dashboard pages |
| 5.1 | 🟠 High | Ask | No history truncation | ask-panel.tsx |
| 6.2 | 🟠 High | Recommendations | No empty state | recommendation-list.tsx |
| 1.4 | 🟡 Medium | Global | Engineering language in descriptions | page files |
| 1.5 | 🟡 Medium | Global | Disabled button style | globals.css |
| 1.6 | 🟡 Medium | Global | No mobile responsiveness | layout.tsx |
| 2.5 | 🟡 Medium | Onboarding | Missing pending_approval guidance | wizard.tsx |
| 2.6 | 🟡 Medium | Onboarding | Back button clears file state | wizard.tsx |
| 3.4 | 🟡 Medium | Ingestion | Queue doesn't refresh after upload | ingestion/page.tsx |
| 3.5 | 🟡 Medium | Ingestion | No post-upload reset | ingestion-upload.tsx |
| 4.4 | 🟡 Medium | Dashboards | Cards have no height limit | dashboard-panel.tsx |
| 4.5 | 🟡 Medium | Dashboards | Stale warning not actionable | layout.tsx |
| 4.6 | 🟡 Medium | Dashboards | Rec list has no visual hierarchy | dashboard-panel.tsx |
| 5.2 | 🟡 Medium | Ask | Role labels are technical jargon | ask-panel.tsx |
| 5.3 | 🟡 Medium | Ask | No history clear button | ask-panel.tsx |
| 5.4 | 🟡 Medium | Ask | Evidence refs not traceable | ask-panel.tsx |
| 5.5 | 🟡 Medium | Ask | No suggested queries | ask-panel.tsx |
| 4.5 | 🟡 Medium | Dashboards | Stale warning not actionable | layout.tsx |
| 7.1 | 🟢 Low | Approvals | No "all reviewed" state | approvals/page.tsx |

---

## Recommended Implementation Order

**Wave 1 — Fix before any demo or user test (Critical + High):**
Issues 1.1, 2.1, 4.1, 6.1, 1.3, 2.2, 2.3, 3.1, 3.2, 3.3, 4.2

**Wave 2 — Before wider rollout (remaining High):**
Issues 1.2, 2.4, 4.3, 5.1, 6.2

**Wave 3 — Polish pass before commercial release (Medium):**
All 🟡 items

**Wave 4 — Nice to have (Low):**
All 🟢 items
