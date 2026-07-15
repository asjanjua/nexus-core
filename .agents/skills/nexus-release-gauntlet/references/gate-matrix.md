# Release Gate Matrix

| Change class | Focused tests | Boundaries | Standalone TS | Full tests | Production build | CI required |
| --- | --- | --- | --- | --- | --- | --- |
| Docs/skill instructions only | As applicable | If executable config/import rules changed | No | No | No | Before merge if repo policy requires |
| Pure service/domain logic | Yes | Yes | Yes | Yes | Yes before publish | Yes |
| API/auth/repository/migration | Yes, including tenant/security | Yes | Yes | Yes | Yes | Yes |
| UI/component/navigation | Yes | Yes | Yes | Yes | Mandatory | Yes |
| Middleware/Clerk/Next config/dependency | Yes | Yes | Yes | Yes | Mandatory fresh build | Yes |
| Observability/Sentry/tracing/graph/vault watcher | Yes | Yes | Yes | Yes | Mandatory fresh build | Yes |

## Result record

For each gate record:

- exact command;
- Node version;
- result classification;
- test file/test counts where available;
- relevant error or timeout phase;
- whether failure is new, known, or pre-existing;
- next action.

## Overall classifications

- `locally_verified`: all required local gates passed.
- `local_verification_incomplete_ci_required`: independent tests and build passed, but a known local environment stall left a required phase inconclusive.
- `release_blocked_source_failure`: current source or test behavior failed.
- `release_blocked_environment`: environment/dependency state prevents meaningful verification.
- `not_release_scoped`: documentation-only change with no executable behavior affected.

Only GitHub CI can produce `ci_green`. Only direct deployment/live checks can produce operational verification.
