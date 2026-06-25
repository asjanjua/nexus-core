# NexusAI Development Finish Line Visual

Status: Working visualization for planning and handoff
Last updated: 2026-06-25

Use this page when you need the whole path from the current v0.25.0 state to paid-pilot readiness in one view.

## Development Map

```mermaid
flowchart LR
  A["Now: v0.25.0 built locally"] --> B["Release Gate"]
  B --> C["Strategy Profile"]
  C --> D["Onboarding to First Workflow"]
  D --> E["Pilot Paperwork Automation"]
  E --> F["Knowledge Workspace Follow-through"]
  F --> G["Connector Expansion"]
  G --> H["Paid Pilot Ready"]
  H --> I["Repeatable Pilot Machine"]

  B1["Confirm Render commit 3530808"] --> B
  B2["Logged-in smoke: /knowledge /workflows settings Ask noteRefs"] --> B

  C1["Persist readiness result"] --> C
  C2["Persist buyer lane, role, sector, size, priority"] --> C
  C3["Sponsor, reviewer, governance posture"] --> C

  D1["Use workflow scorer"] --> D
  D2["Backcast first workflow"] --> D
  D3["Seed dashboard and suggested questions"] --> D

  E1["SOW"] --> E
  E2["Onboarding checklist"] --> E
  E3["Success scorecard"] --> E
  E4["Billing trigger checklist"] --> E

  F1["Note embeddings"] --> F
  F2["Graph filters"] --> F
  F3["Note-to-entity links"] --> F
  F4["Brief automation"] --> F
  F5["Contradiction audit"] --> F

  G1["Google Drive / SharePoint"] --> G
  G2["Teams / Slack scheduled sync"] --> G
  G3["Jira / GitHub / CRM / Finance"] --> G
```

## Finish Line Sequence

```mermaid
gantt
  title NexusAI Development to Paid Pilot Finish Line
  dateFormat  YYYY-MM-DD
  axisFormat  %b %d

  section Release Gate
  Confirm Render deployed commit 3530808          :active, r1, 2026-06-25, 1d
  Authenticated production smoke                  :r2, after r1, 1d

  section Strategy in Product
  Strategy profile data model                     :s1, after r2, 3d
  Readiness to signup handoff                     :s2, after s1, 3d
  Onboarding to workflow scorer                   :s3, after s2, 3d

  section Pilot Machine
  First workflow selection and backcast           :p1, after s3, 2d
  Pilot paperwork generation                      :p2, after p1, 4d
  Value proof pack and shadow ROI loop            :p3, after p2, 3d

  section Knowledge Workspace
  Embeddings and semantic note search             :k1, after p1, 3d
  Graph filters and note-to-entity linking        :k2, after k1, 4d
  Daily/project/workflow brief automation         :k3, after k2, 4d

  section Production Readiness
  Tenant isolation and auth-bypass review         :sec1, after r2, 3d
  Monitoring, backups, support mailbox            :sec2, after sec1, 3d
  Paid pilot readiness signoff                    :milestone, done1, after sec2, 0d

  section Expansion
  Google Drive / SharePoint connector             :c1, after done1, 6d
  Teams / Jira / GitHub / CRM connectors          :c2, after c1, 8d
```

## What Done Means

```mermaid
flowchart TD
  Done["Paid Pilot Ready"] --> R["Release is live and smoked"]
  Done --> S["Strategy is persisted in product"]
  Done --> W["One workflow pilot is selected"]
  Done --> P["Paperwork is generated from that workflow"]
  Done --> K["Knowledge Workspace supports operating memory"]
  Done --> T["Trust gates are complete"]

  R --> R1["Render commit confirmed"]
  R --> R2["Logged-in smoke passed"]

  S --> S1["Buyer lane"]
  S --> S2["Readiness context"]
  S --> S3["Sponsor/reviewer"]

  W --> W1["Scored workflow"]
  W --> W2["Backcast target"]
  W --> W3["Shadow ROI metric"]

  P --> P1["SOW"]
  P --> P2["Checklist"]
  P --> P3["Scorecard"]
  P --> P4["Billing triggers"]

  K --> K1["Notes"]
  K --> K2["Entities"]
  K --> K3["Briefs"]
  K --> K4["Contradiction checks"]

  T --> T1["Tenant isolation"]
  T --> T2["Security scan"]
  T --> T3["Monitoring/backups"]
```

## Plain-English Path

First get v0.25.0 truly live, then turn the strategy from docs into product state, then make onboarding choose one valuable workflow, then generate pilot paperwork from that workflow, then let Knowledge Workspace become the operating memory around the pilot.

