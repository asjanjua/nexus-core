# Figma Design Debt — derived from code, 2026-08-06

Every shipped route in `apps/mission-control/app`, checked against every Figma
frame recorded anywhere in this repository.

**Method.** 69 routes enumerated from the filesystem, first-commit date taken
from `git log --diff-filter=A`, then each route string matched against the 61
documented Figma node IDs and the design docs that carry them.

**Figma WAS read (corrected 2026-08-08).** An earlier revision of this document
said the live file could not be reached. That was my error: I tried one Figma
MCP server, the Dev Mode one, and stopped. A second server was connected and
working the whole time. The file has now been enumerated directly — see §5,
which reverses what it previously said.

**Still repo-derived.** The route-by-route mapping below is matched against the
node IDs recorded in this repo, not against a frame-by-frame walk of all 38
Figma pages. Page names and spot-checks support it; a full per-page audit is a
separate pass.

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

## 5. RESOLVED — the file has 38 pages, and the frames are all there

The earlier version of this section reported an unresolved contradiction
between the worklist ("a SINGLE page") and three later docs citing pages 28-33.
It is settled, and the worklist was wrong.

Read directly from `NcQ8F5a0hczwGwZua2gfun` on 2026-08-08:

**38 pages.** Including every page the worklist recorded as missing:
`01 Nexus System` (`0:1`), `08 Quorum UI UX Build` (`78:2`),
`09 Quorum Governance Workflow V0.2` (`80:2`) and
`11 Vertical Input Action Screens V0.2` (`87:2`). Nothing was deleted or moved.

Frames spot-checked and confirmed intact across three unrelated families:
`213:2` Nexus Rooms portfolio, `182:2` Meridian evidence-and-gap review (73
child nodes, fully detailed), `222:3` the Quorum enhanced screen plan with all
17 sub-frames present.

**Why the false negative, and how to avoid repeating it.** Figma loads pages
lazily. `get_metadata` with no `nodeId` returned exactly one page — the loaded
one — and every unloaded page reports `children: 0`. Reading the whole document
requires `figma.root.children` inside a `use_figma` script, which returns all
38. The worklist's "VERIFIED LIVE" label was applied to an artefact of lazy
loading, and this document then repeated it as fact.

**Two pages exist that the repo docs never recorded:**
`33 Evidence / Document type override / 2026-08-05` and
`34 Vertical Trust + Failure States / 2026-07-29`. The evidence override work
was designed after all — worth checking before treating `/evidence/review` as
undesigned.

**The lesson is about verification, not Figma.** A tool returning a plausible
small answer is not the same as an empty result, and "VERIFIED" written next to
a claim does not make it verified. Both the worklist and this document asserted
a negative from a single call that had a benign explanation.

## 6. Suggested order

1. ~~**`/pricing`**~~ — **DONE 2026-08-08.** Designed in Figma as page
   `35 Pricing / 2026-08-08` (frame `246:3`), and the shipped route was brought
   in line with it in the same pass. See §8.
2. ~~Resolve the inventory contradiction~~ — **DONE**, see §5. The file has 38
   pages and nothing is missing.
3. **Cold-start pattern (§4)** — one frame, seven applications, removes the
   "looks broken" problem across the product. Now the top item.
4. **`/governance/trace`** — the provenance claim, undesigned. Check
   `/evidence/review` against page `33 Evidence / Document type override`
   first; it may already be covered.
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

---

## 8. `/pricing` — closed 2026-08-08

**Figma:** page `35 Pricing / 2026-08-08`, frame `246:3`
(`Pricing / Public page / 1440`). Built from the locked tokens and the fixed
type ramp, with the file's existing conventions matched — Inter, dark chrome
top bar, authority-boundary strip at the foot.

**Code:** `app/pricing/page.tsx` brought in line in the same pass. What the
route actually had wrong, all of it invisible to the build:

- two `btn-primary` actions, so nothing was primary;
- `text-3xl` / `text-4xl` (30px / 36px), neither on the ramp;
- `mt-10` (40px), off the spacing scale;
- five different white opacities standing in for `nexus-muted`, with
  `text-white/40` at 12px under the AA contrast floor;
- the recommended tier signalled by border colour alone, so it disappeared
  under the grayscale gate.

The information architecture was already right — priced by team size, honest
about exclusions, honest that checkout is not live — so the pass changed how it
is expressed, not what it says.

**Pinned:** `tests/pricing-page-design.test.ts` asserts the five rules that were
actually broken here, not the whole design system. Negative control: each
violation reintroduced, five tests failed, reverted.
