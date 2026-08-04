# Deep Red Team: Vertical Product Pathways

Status: UX, trust, privacy, security, regulatory-readiness, and generative-AI design review. This is not legal advice and does not certify legal compliance.

Reviewed: Figma vertical plan `222:2`, product screen sets, `VERTICAL_PRODUCT_SCREEN_PLANS_2026-07-29.md`, and `VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md`.

Date: 2026-07-29.

## Executive Verdict

The product architecture is directionally right: each vertical has a distinct lifecycle and the four-part screen rule (accountable human, evidence state, next governed action, authority boundary) is unusually good.

The remaining risk is not lack of disclaimers. It is that a time-poor user can still mistake:

- a source match for validated evidence;
- a review for approval;
- a named owner for a currently authorized actor;
- an empty panel for no evidence rather than restricted, stale, conflicted, or unavailable evidence;
- a completed workflow for a legally, commercially, or professionally valid outcome.

The next design phase should therefore build **decision integrity**, not another layer of status cards.

## Non-Negotiable UX Rules

1. **Every consequential screen answers five questions in one scan:** What decision is being prepared? What evidence is missing or contested? Who has authority now? What can this user safely do next? What changes if they proceed?
2. **Use one primary action, not one possible action.** A primary CTA must never suppress legitimate secondary actions such as request access, save draft, assign, challenge, export draft, or return for review. Secondary actions belong in a predictable overflow/control area.
3. **Make states mutually exclusive and verbal.** `Draft`, `Reviewed`, `Approved by {role}`, `Published`, `Superseded`, `Restricted`, `Blocked`, and `Withdrawn` cannot share a colour-only treatment or be inferred from visual completion.
4. **Never use a coverage percentage as the leading decision signal.** Lead with the decision-blocking fact: `2 material questions unanswered`, `3 restricted sources may affect this conclusion`, or `No authorized signer assigned`.
5. **Show why, not only what.** Every blocked/stale/restricted/conflicted state needs a short reason, named owner, expected resolution path, and the last meaningful change.
6. **Separate human review from authority to act.** The UI must show reviewer identity, role, delegation basis, scope, expiry, and conflict status. A person who read something is not necessarily a person who can authenticate, submit, approve, or publish it.

## Critical Findings

### D1. The designs do not yet model separation of duties

Named people appear throughout the workflows, but the plans do not require an authority check for delegation, expiry, conflict, or self-review. This is most dangerous at Quorum chair authentication, Meridian filing handoff, Vantage IC handoff, and Nucleus publishing.

**Improvement:** add a shared `Authority Check` row to every consequence preview:

`Actor · role · delegated by · scope · expires · conflict check · substitute authority`

Block a consequential action when the actor is the drafter where segregation is required, their delegation is expired, their scope excludes the object, or their conflict is unresolved. Log both successful and denied attempts.

### D2. Evidence lineage is too shallow for regulated use

Source count, freshness, and a citation do not establish which version was used, how it was transformed, translated, OCR-extracted, summarized, or redacted. The current plan needs a chain-of-custody view.

**Improvement:** extend the provenance strip and drill-down to display:

- source owner and acquisition method;
- original file/version/hash where applicable;
- extraction, translation, redaction, and AI transformation steps;
- validity date, supersession chain, access classification, and downstream artefacts affected;
- the exact source span that supports a claim, plus the time it was retrieved.

The primary UI should remain light. Put this in a one-click Evidence Drawer and show a `Transformed` badge whenever the user is not reading the original source.

### D3. Access-denied designs can still leak sensitive information

Showing `3 restricted sources` can reveal the existence or scale of a sensitive matter. The shared Access Denied state must be classification-aware.

**Improvement:** add two variants:

- `Restricted evidence may affect this result` for users who are allowed to know the impact but not the source.
- `Some information is unavailable to your access scope` for users who must not learn whether an item exists.

Only the first variant may show count-level or impact-level detail. The access-request route must reveal the data owner only when doing so is allowed by the same policy.

### D4. AI provenance is not enough without AI limitation and injection handling

The proposed provenance strip tells users that AI helped, but not whether an untrusted document tried to redirect the model, whether the output used current evidence only, or whether a model/provider was unavailable and a fallback changed behavior.

**Improvement:** add an artefact-level `AI run details` drawer, behind the provenance strip, with:

- agent purpose and model class/provider policy identifier, not a marketing model name;
- evidence retrieval time and policy/permission result;
- source count split into original, transformed, stale, restricted, and excluded;
- a visible warning when untrusted instructions in source material were ignored or a source was excluded;
- fallback/degraded state and whether the result is comparable to the prior run;
- a `Report a concern` action that opens a bounded correction/dispute workflow.

Do not expose raw hidden prompts, other tenants' metadata, chain-of-thought, or security-sensitive control details.

### D5. The paths lack a decision checkpoint before drafting begins

The current plans usually begin with setup and evidence. Users can invest hours into a pack before discovering the decision question, authority, materiality threshold, or acceptable evidence standard was never agreed.

**Improvement:** add a compact **Decision Brief** at the top of each active workflow, not a new heavy screen:

| Vertical | Required brief fields |
|---|---|
| Quorum | agenda outcome, authority route, resolution threshold, conflict/recusal rule, meeting date |
| Meridian | filing objective, legal entity, regulator/channel, required signer, submission deadline, specialist reviewer |
| Vantage | buyer thesis, IC decision question, materiality threshold, clean-team/access restriction, decision date |
| Nucleus | client question, scope/exclusions, partner accountable, client-visible commitment, review/publish gate |

The brief must be versioned. Material changes require a human acknowledgement and surface downstream impact.

## Pathway Review

### Quorum

**High-risk gaps**

- Quorum and recusal must be recalculated at the moment of each affected agenda item, not only once for the meeting.
- A circular resolution needs response deadline, eligible voters, non-response treatment, dissent/reservation, and later-meeting noting.
- Minutes correction must preserve original, delta, reason, affected decision, notification/acknowledgement, and a clear authoritative version.
- Director pre-read needs a read-only, offline-safe, tablet-first mode with comment drafts that cannot accidentally become minutes.

**Path improvements**

- Add a persistent meeting-context bar: entity, meeting type, scheduled time zone, quorum state, current agenda item, conflicted attendees, pack version.
- In Decision & Vote Capture, distinguish `for approval`, `for noting`, `recommendation`, `deferred`, and `shareholder escalation`; never use a generic green completion state.
- Add a `Director challenge` control on every material assertion and create a visible challenge queue for the secretary.
- Include a pre-meeting `Notice and delivery proof` checkpoint. A valid pack without proof of correct notice is a workflow blind spot.

### Meridian

**High-risk gaps**

- Jurisdiction and regulator selection are not enough: a filing needs legal entity, product/activity scope, effective date, filing channel, signer/delegation, language, and cut-off time zone.
- Requirement changes may alter a requirement's applicability; a simple alert is insufficient without a human disposition that records why the pack remains valid or must be rebuilt.
- Human filing handoff must model channel evidence: portal receipt, submission identifier, submitted artefacts/version, named filer, timestamp, and regulator query clock.

**Path improvements**

- Make `Requirement Change Watch` a blocking banner on the scope, coverage, memo, and handoff screens when a material linked change is unresolved.
- Add a `Regulatory calendar` strip for deadline, cut-off time zone, required signers, regulator business-day assumption, and escalation owner.
- Add a `Response privilege / internal-only` marker in the reviewer and query flows; a comment suitable for counsel is not automatically safe for the filing pack.
- Treat translations as transformed evidence: show language, translator/reviewer, original source link, and whether the official language controls.

### Vantage

**High-risk gaps**

- Deal teams often need clean-team, MNPI, insider-list, and advisor-access controls. An ordinary workspace permission model may be insufficient.
- The proposed red-flag path still risks turning incomplete evidence into a visual risk score. Materiality is decision-contextual and must be set before red-flag triage.
- Post-decision learning can become revisionism if users overwrite the original investment basis.

**Path improvements**

- Add a `Deal access wall` in Deal Room Setup: clean-team membership, external-advisor access, restricted recipients, data-room watermark, download/print policy, and expiry.
- Put the materiality threshold and buyer mandate in the persistent deal-context bar; the same issue may be material for one buyer and not another.
- Make Evidence Contradiction a first-class queue with `source A`, `source B`, `impact`, `advisor disposition`, `memo sections affected`, and `IC-notified` state.
- Keep Post-Decision Learning append-only and visually separate from the original IC pack; show `recorded after decision` on every learning note.

### Nucleus

**High-risk gaps**

- The client portal boundary must include client-side identity, organisation membership, delegated client contacts, access expiry, and export/watermark controls.
- The partner brand can make the platform's role disappear. Attribution, platform trust footer, data handling link, and client dispute route must be fixed and visible.
- Client question handling needs a clear internal/external drafting boundary; a draft generated from internal commentary must never become a client reply through a single misclick.

**Path improvements**

- In Client Portal Preview, render two labelled modes side by side: `Internal delivery view` and `Client-visible view`. Show a change log of differences rather than relying on memory.
- Add a `Client release checklist`: approved deliverable version, partner sign-off, visible sources, caveat treatment, client recipients, expiry, watermark/export policy, support owner.
- Make every client question carry `internal`, `draft client reply`, `partner-approved reply`, or `sent` state. Only the latter two may be visible to the client.
- At closeout, separate return, deletion request, retention, legal hold, and access revocation. None should silently imply another occurred.

## Light-Touch Privacy, Security And AI Disclosure

Do not repeat a legal disclaimer on every card. Use a three-layer pattern:

1. **Artefact strip:** status, provenance, freshness/validity, access state, and whether AI assisted.
2. **Contextual disclosure:** an inline one-sentence explanation only when the user is about to rely on, export, publish, authenticate, submit, or disclose something.
3. **Trust drawer/footer:** data handling, retention, subprocessors, model-use policy, export controls, contact route, and the current product's authority boundary.

Recommended copy:

- `AI-assisted draft. Verify sources and obtain the required human review before relying on this output.`
- `Coverage is limited to evidence available to this workspace. It is not assurance that no issue exists.`
- `This action records you as the accountable actor. It does not replace your legal, fiduciary, investment, or professional judgement.`
- `Some information may be unavailable to your access scope.`
- `Source validity and regulatory information can change. Review the evidence status before external use.`

Avoid absolute statements about legal compliance, model training, confidentiality, encryption, deletion, or jurisdictional validity unless the deployed service, contracts, and applicable configuration have been verified.

## Accessibility And Responsive Requirements

- Consequence previews, authentication, filing handoff, IC handoff, and publish controls must be keyboard operable, visibly focused, screen-reader named, and resistant to accidental double submission.
- Do not require hover to reveal evidence, restrictions, confidence meaning, or authority conditions.
- Provide a responsive **read/comment** surface first for directors, IC members, and clients. Desktop authoring can remain the initial scope.
- Support text scaling and high-contrast mode without truncating source names, restrictions, owner names, or consequence details.
- Never use colour as the sole signal for review, restricted, stale, disputed, or AI-assisted states.

## Prioritized Improvements

| Priority | Improvement | Why it comes first |
|---|---|---|
| P0 | Authority Check plus consequence preview for every irreversible act | Prevents unauthorized or self-conflicted action. |
| P0 | Evidence chain-of-custody and classification-aware restricted state | Prevents false confidence and data leakage. |
| P0 | Artefact AI run details with prompt-injection/exclusion and fallback warnings | Makes generative output safely reviewable. |
| P1 | Decision Brief and persistent context bar per vertical | Reduces rework and decision ambiguity across every pathway. |
| P1 | Quorum item-level recusal/quorum, Meridian filing receipt/query clock, Vantage deal access wall, Nucleus dual-view portal release | Addresses the product-specific highest-risk workflows. |
| P1 | Responsive read/comment routes | Matches how directors, IC members, and clients actually consume governed materials. |
| P2 | Correction/dispute/afterlife flows and post-decision learning | Creates trust after the happy path, and supports renewal value. |
| P2 | High-contrast, keyboard, focus-order and double-submit acceptance tests | Makes authority gates usable and defensible. |

## Design Gate Before Implementation

Do not call a vertical design-ready until each consequential route has:

- authority check and conflict/delegation state;
- consequence preview and reversible cancel path;
- evidence drawer with validity, transformation, access and supersession details;
- restricted, stale, conflicted, unavailable, degraded, and error states;
- AI provenance plus model/fallback/exclusion disclosure where AI was used;
- accessibility acceptance criteria and responsive read/comment behavior;
- a named user test scenario for normal, rushed, denied, disputed, and post-event use.
