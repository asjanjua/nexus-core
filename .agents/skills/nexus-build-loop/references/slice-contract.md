# Slice Contract

## Required fields

- Slice ID
- Milestone and priority
- User/system outcome
- In-scope files or subsystem
- Explicit non-goals
- Acceptance criteria
- Failure and recovery behavior
- Security/tenant boundary
- Targeted tests
- Full release gates
- Browser/live proof when relevant
- Migration and deployment ordering
- Paperwork destinations

## Vertical completeness

A Nexus slice is not complete if it adds only one layer of behavior. Trace the path needed by the outcome:

- UI or caller;
- route/input contract;
- service/domain policy;
- repository or external adapter;
- audit and observable status;
- tests;
- operator/user state;
- operational proof.

Not every slice needs every layer. Explicitly mark omitted layers as unnecessary rather than forgetting them.

## Review prompts

Ask:

1. Can a caller cross workspace boundaries?
2. Can retrying duplicate money, invitations, approvals, emails, jobs, or outputs?
3. Can the system report success after an effect failed?
4. Can a new enum/state reach an unhandled branch?
5. Can sensitive evidence leave its allowed surface?
6. Can a client bypass a server policy?
7. Does a new import enter the fragile Next.js build path?
8. Is the feature observable and recoverable?
9. Do the docs claim more than the proof supports?

## Completion rule

Use `code_complete` for implementation without all checks. Use `locally_verified` only after the required gates. Keep deployment and operational verification separate.
