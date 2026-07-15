# Front-End Gates

## Architecture gate

Trace each interactive surface through:

`page/component -> API route -> service/domain policy -> repository`

Do not duplicate business policy in the browser. Server enforcement remains authoritative.

## State gate

Every asynchronous surface needs deliberate handling for:

- initial loading;
- empty/no-data;
- success;
- recoverable failure with retry;
- terminal failure;
- forbidden/approval required;
- signed out;
- stale data when freshness matters.

## Nexus trust gate

Show the information needed to judge an output:

- source or evidence references;
- confidence or provisional state;
- sensitivity restrictions;
- reviewer/approval requirement;
- audit/result status;
- clear distinction between draft and consequential action.

## Build-path gate

Block:

- Clerk client components in page/component bundles;
- Sentry runtime instrumentation unless explicitly feature-gated and build-proven;
- client-side force-graph dependencies;
- database, filesystem, path, process, or child-process imports in client files;
- conflict-copy route filenames;
- nested pnpm-style dependency layouts.

## Browser gate

Verify at minimum:

1. expected route and navigation entry;
2. loading-to-success transition;
3. empty state;
4. server/API failure state;
5. permission or signed-out state;
6. keyboard-only primary flow;
7. narrow viewport and standard desktop viewport;
8. no console error introduced by the slice;
9. protected routes with a fresh session when auth is material.

## Completion evidence

Record screenshots only when they materially prove visual state. Always record route, viewport, account/workspace context, deployed SHA or local commit, and what was actually exercised.
