# Contributing to Nexus Core

Thanks for helping improve Nexus.

## Good Ways To Contribute
- fix a doc typo or clarify a setup step
- improve a sample output or template
- add a small demo, test, or install improvement
- open an issue with a realistic use case

## Before You Submit
- keep changes focused
- include reproduction steps for bugs
- include an example input and expected output for feature requests
- avoid large unrelated refactors in the same pull request

## Issue Quality
Best issues include:
- what you tried
- what you expected
- what happened instead
- any relevant command output or screenshots

## Pull Request Style
- explain the user-facing change first
- link the issue if one exists
- note any docs or install updates
- keep the diff small when possible

## Local Check
Use:

```bash
export PATH="$HOME/.nexus/bin:$PATH"
nexus doctor
nexus doctor --json
nexus init /tmp/nexus-demo
```

## Mission Control build constraints
If you touch `apps/mission-control` front-end, read `docs/ENGINEERING_GUARDRAILS.md` §7 first. In short: no Clerk client components in bundles (auth handoff is hosted via `NEXT_PUBLIC_CLERK_HOSTED_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_HOSTED_SIGN_UP_URL`); no Sentry runtime instrumentation, middleware tracing, or force-graph in the build path; and verify with a real `npm run build`, not just tests + `tsc`, since those do not catch the build hang those triggers cause.

