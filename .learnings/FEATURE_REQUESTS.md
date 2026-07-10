# Feature Requests

Capabilities requested by the user.

---

## [FEAT-20260710-001] separate-api-extraction-path

**Logged**: 2026-07-10T14:15:00+05:00
**Priority**: medium
**Status**: planned
**Area**: backend

### Requested Capability
Evaluate a separate API switch/service as Nexus grows into larger builds.

### User Context
The user wants a professional architecture that can support materially larger product and agent workloads without repeating build and commit failures.

### Complexity Estimate
complex

### Suggested Implementation
Keep the pilot as a modular monolith. Extract asynchronous ingestion/agent workers first when documented scale, release, or compliance triggers are met. Add a remote API base URL only when the remote service exists.

### Metadata
- Frequency: first_time
- Related Features: Mission Control API routes, dispatcher, ingestion, workflow twins

---
