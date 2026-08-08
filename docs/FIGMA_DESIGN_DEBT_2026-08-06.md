# Figma Design Debt — derived from code, 2026-08-06

Every shipped route in `apps/mission-control/app`, checked against every Figma
frame recorded anywhere in this repository.

**Method.** 69 routes enumerated from the filesystem, first-commit date taken
from `git log --diff-filter=A`, then each route string matched against the 61
documented Figma node IDs and the design docs that carry them.

**What this is NOT.** The live Figma file was not read. The MCP available in
this session is the Dev Mode server, which requires the Figma desktop app with
"Enable Dev Mode MCP Server" switched on. So this measures *what the repository
records about Figma*, not Figma itself. Where the two disagree, Figma wins and
this document is wrong — see §5.

---

## 1. The headline

**17 of 69 routes have no Figma record at all.** Five of those shipped in the
last 48 hours and one of them is the page that sells the product.

| Bucket | Routes | Note |
| --- | --- | --- |
| No design record | 17 | §2 |
| Designed before the route existed — drift likely | 12 | §3 |
| Recorded and plausibly current | 40 | Spot-check only |

---

## 2. No Figma record — ranked by commercial consequence

### 2.1 Sells the product, never designed

| Route | Shipped | Why it ranks here |
| --- | --- | --- |
| `/pricing` | 2026-08-04 | **Publishes $49 / $499 / $2,500 and drives checkout.** The single highest-intent page in the product and the only one where a design flaw costs revenue directly. It was built straight to code during the pricing slice. Design-first is the standing rule for conversion surfaces and it was skipped. |
| `/sign-in`, `/sign-up` | 2026-07-10 | The hosted-Clerk handoff. First authenticated impression, and constrained: no Clerk client components, plain `<a>` links only. The constraint makes design MORE necessary, not less — there is little room to improvise in code. |

### 2.2 Carries the core product claim

| Route | Shipped | Why it ranks here |
| --- | --- | --- |
| `/governance/trace` | 2026-08-04 | The provenance screen. "Evidence-first, provable" is the whole positioning, and this is where a buyer goes to test it. Undesigned. |
| `/evidence/review` | 2026-08-05 | Reviewer queue for untyped documents. Its value is entirely in the ORDERING being legible — "this one unblocks three critical requirements". That is a design problem, and it currently has none. |
| `/compliance` | 2026-08-06 | Brand new. Regulated buyers will open this early. |

### 2.3 Trust and support surfaces a regulated buyer checks

| Route | Shipped | Note |
| --- | --- | --- |
| `/status` | 2026-08-06 | Procurement checks this before signing. |
| `/pilot-sla` | 2026-08-06 | Contractual commitments, presented as a page. |
| `/support` | 2026-08-06 | |
| `/security`, `/privacy`, `/terms`, `/data-processing`, `/acceptable-use` | 2026-07-10 | Legal boilerplate, but they are public brand surfaces on the same domain as the landing page. A single shared "policy page" template would clear all five at once — one frame, not five. |

### 2.4 Operator-only — low polish is acceptable, say so deliberately

| Route | Shipped | Note |
| --- | --- | --- |
| `/admin` | 2026-08-02 | Staff control centre. |
| `/eval` | 2026-08-06 | Eval harness output. |

---

## 3. Designed before the route existed — verify drift, do not rebuild

These carry a Figma record, but the frame predates significant code change.
Cheap to check, expensive to leave wrong.

| Route | Frame recorded | Drift risk |
| --- | --- | --- |
| `/rooms` | `213:2`–`218:527` (page 29, 2026-07-29) | Route shipped 2026-08-06, a week after the frames. The portfolio design is thorough — 18 frames — so the risk is the code diverging from it, not the reverse. Highest-value check on this list. |
| `/meridian/requirements` | 2 mentions, no dedicated frame | Requirement packs (SBP EMI, PSO/PSP) were written after the Meridian workflow frames. |
| `/meridian/evidence-coverage` | `182:2` | Coverage arc was rebuilt during the evidence slice; reviewer override UI is new. |
| `/evidence/[id]` | 2 mentions | Gained the reviewer document-type panel on 2026-08-05. |
| `/dashboard/[role]` | `218:2` + V0.1/V0.2 baselines | Ledger already flags batches 1–2 as possibly needing rebuild. |
| `/settings` | 3 mentions | Has grown enormous — plan, usage, connectors, policies, agents, demo. Almost certainly diverged. |
| `/workflows`, `/onboarding` | 11 / 7 mentions | Signal-strength and lane states were added in code after the frames. |
| `/board`, `/board/minutes/draft` | page 08/09, `182:290` | Quorum record handoff designed; minutes draft route newer. |
| `/vantage/red-flags` | `182:146` | |
| `/nucleus/reviewer-console` | `182:218` | |

---

## 4. Cold-start states — a whole pattern family, still missing

Not a route, but the most visible gap in the product today.

`/meridian` on an unpopulated workspace renders a correct empty state that is
**indistinguishable from a broken page** — observed 2026-08-05 during a live
check, and it was reported as "the live page is not working" when it was
working exactly as designed.

Every hub has this problem: `/meridian`, `/vantage`, `/nucleus`, `/workflows`,
`/knowledge`, `/evidence/review`, `/rooms`. One designed empty-state pattern,
applied across all seven, fixes the whole class. The demo's teaching moment is
the `none` signal state, so this is a sales surface, not a polish item.

---

## 5. Contradiction to resolve before trusting any of this

`docs/FIGMA_PRD_ALIGNMENT_WORKLIST.md` states, marked VERIFIED LIVE via the
Figma MCP, that file `NcQ8F5a0hczwGwZua2gfun` contains **a single page** and
that pages 01, 08, 09 and 11 are absent.

But `NEXUS_ROOM_PORTFOLIO_ACTIVATION.md`, `MERIDIAN_REGULATORY_WORKFLOW.md` and
`NUCLEUS_ADVISORY_DELIVERY_WORKFLOW.md` all cite pages 28–33 with specific node
IDs, dated 2026-07-29.

Both cannot be true of the same file at the same time. Either the worklist's
verification predates the 07-29 work, or the frames live in a different file.
**Until someone opens Figma and confirms, every "recorded" row above is a
claim from a document, not an observation.** This is item zero.

---

## 6. Suggested order

1. **`/pricing`** — design-first, retro-fit the built page. It takes money.
2. **Resolve §5** — one look in Figma; everything else is guesswork until then.
3. **Cold-start pattern (§4)** — one frame, seven applications, removes the
   "looks broken" problem across the product.
4. **`/governance/trace` + `/evidence/review`** — the provenance claim.
5. **`/rooms` drift check** — 18 frames already exist; only verification needed.
6. **Shared policy-page template** — clears five legal routes with one frame.
7. **`/sign-in` and `/sign-up`** — constrained, so design matters more.
8. Operator surfaces last, and explicitly at low polish.

---

## 7. Standing rule this list exists to enforce

`FIGMA_PRD_ALIGNMENT_WORKLIST.md` §4 already says conversion surfaces get
design-first treatment. `/pricing` shipped anyway, straight to code, four days
after that rule was written down.

A rule that only gets applied when someone remembers it is not a rule. **A new
route under `app/` that is a conversion, trust, or buyer-facing surface should
not merge without either a Figma frame or a written decision that it ships
undesigned.** That belongs in the review checklist, not only here.
