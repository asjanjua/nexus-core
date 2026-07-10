# Meridian Regulatory Workflow

Status: Domain-owned workflow plan, added 2026-07-06.

Meridian is the regulatory submissions vertical. It should not inherit Quorum's board lifecycle or Vantage's deal lifecycle. Its workflow is built around jurisdiction, regulator, license type, requirement coverage, evidence gaps, caveats, and filing-pack readiness.

This is product planning, not legal or regulatory advice. Requirement content must be reviewed by qualified, current domain specialists before Meridian is used for a customer-facing regulatory conclusion or submission.

## Source Of Truth

- Code registry: `apps/mission-control/lib/meridian-regulatory-workflow.ts`
- Tests: `apps/mission-control/tests/meridian-regulatory-workflow.test.ts`
- Requirement library: `apps/mission-control/lib/domain/regulatory-requirement-library.ts`
- Figma exploration: `10 Pivot Workflow Builds V0.1`, node `82:3` — https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=82-3
- Cross-vertical input/action Figma board: `11 Vertical Input Action Screens V0.2`, node `87:3` — https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=87-3

## Product Boundary

The shared Nexus engine handles ingestion, evidence, source confidence, governance, agents, billing, and approvals. Meridian owns the regulatory workflow: how a filing objective moves from scope to evidence to gap triage to submission pack.

Meridian must not file, submit, certify, or legally sign anything automatically.

## Global Use Model

Meridian should expand by adding jurisdiction packs, not by stretching the Pakistan/SECP pack into other countries.

Every jurisdiction pack must define:

| Requirement | Why it matters |
|---|---|
| Regulator and license taxonomy | Every market needs its own regulator, license, permission, and filing taxonomy. SECP/NBFC terms must not leak into unrelated markets. |
| Official source catalog | Requirement packs must link to official law, rulebook, regulator, exchange, or supervisory guidance sources with source dates. |
| Applicability rules | Requirements need explicit applicability by entity type, license status, activity, threshold, filing objective, and effective date. |
| Local specialist review | Global rollout requires qualified local compliance/legal review before a pack is treated as current or customer-facing. |
| Translation and terminology control | Non-English markets need controlled translations and original-language source references so regulatory meaning is not lost. |
| Filing channel boundary | Each market has different portals, forms, signatures, and submission authority. Meridian should prepare packs, not impersonate an authorized filer. |

These requirements are encoded in `meridianJurisdictionPackRequirements`.

## Screen Guidance

The code registry defines `meridianScreenGuidance` and `guidanceForMeridianScreen()`. This is the source for the Figma input/action review board and for future route copy when Meridian screens are implemented.

For each Meridian screen, the guidance must show:

- user input needed before the workflow can move forward
- action points the product should make explicit
- the filing boundary that keeps submission, certification, and signature under human control

When a new Meridian screen is added, add its guidance and test coverage in the same change.

## Workflow Arcs

| Arc | Why it exists |
|---|---|
| Scope | Determine jurisdiction, regulator, license type, license status, filing objective, owner, and reviewer before evidence is assessed. |
| Evidence | Map the selected requirement library to ingested documents, source links, evidence tags, and confidence state. |
| Gap | Separate true requirement gaps from missing evidence, stale documents, caveats, and reviewer questions. |
| Filing | Assemble a reviewable memo and filing pack with source index, requirement matrix, caveats, and sign-off state. |

## Planned Screens

| Screen | Arc | Candidate route | Purpose |
|---|---|---|---|
| Regulatory Scope | Scope | `/meridian/scope` | Select jurisdiction, regulator, license type, license status, filing objective, deadline, and reviewer. |
| License Profile | Scope | `/meridian/license-profile` | Capture applicant/license-holder details, ownership posture, directors/sponsors, activities, and current license state. |
| Requirement Library | Evidence | `/meridian/requirements` | Show the selected requirement set with severity, applicability, and evidence tags. |
| Evidence Coverage | Evidence | `/meridian/evidence-coverage` | Map evidence to each requirement and separate matched, missing, stale, and low-confidence evidence. |
| Gap Triage | Gap | `/meridian/gaps` | Prioritize gaps, assign owners, request missing documents, and capture reviewer notes. |
| Caveat Register | Gap | `/meridian/caveats` | Track legal, regulatory, evidence-quality, and management-confirmation caveats. |
| Submission Memo | Filing | `/meridian/submission-memo` | Draft requirement summary, evidence narrative, unresolved caveats, attestations, and reviewer sign-off. |
| Filing Pack | Filing | `/meridian/filing-pack` | Assemble memo, requirement matrix, evidence index, caveats, and approval state. |

## Next Implementation Slice

Build Meridian scope and evidence coverage first:

1. Create the `/meridian/scope` route and screen state.
2. Let the user select regulator, license type, and license status.
3. Call the existing regulatory requirement library for matching requirements.
4. Show requirement coverage against current evidence tags.
5. Keep the specialist-review boundary visible before any filing language appears.

## Runtime Safety

Keep `meridianScreensForStage()` strict for tests and registry authors. It should throw when a stage references a deleted or missing screen.

When route code starts using the registry, prefer `safeMeridianScreensForStage()`. It logs missing draft screens and renders the screens that still exist, so Meridian pages can degrade gracefully during workflow expansion.

## Validation Boundaries

- Meridian organizes evidence and requirements; it is not a regulator, lawyer, compliance officer, or filing authority.
- Requirement content must be domain-reviewed before it is demoed as current regulatory substance.
- Filing/export flows remain human-controlled and approval-gated.
