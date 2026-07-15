#!/usr/bin/env python3
"""Create a safe, unique Nexus agent-run ledger template."""

from __future__ import annotations

import argparse
import re
import subprocess
from datetime import datetime
from pathlib import Path


def git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=root, capture_output=True, text=True, check=False
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def slug(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not normalized:
        raise ValueError("value must contain at least one letter or digit")
    return normalized


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slice-id", required=True)
    parser.add_argument("--agent", required=True)
    parser.add_argument("--objective", required=True)
    parser.add_argument("--acceptance", action="append", default=[])
    parser.add_argument("--file", action="append", dest="files", default=[])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root_result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=False
    )
    if root_result.returncode != 0:
        raise SystemExit("Run inside the Nexus Git repository.")

    root = Path(root_result.stdout.strip())
    now = datetime.now().astimezone()
    relative = Path("docs/agent-runs") / now.strftime("%Y-%m-%d") / f"{slug(args.slice_id)}-{slug(args.agent)}.md"
    target = root / relative
    branch = git(root, "branch", "--show-current") or "detached"
    head = git(root, "rev-parse", "HEAD")
    status = git(root, "status", "--short") or "(clean)"
    acceptance = "\n".join(f"- [ ] {item}" for item in args.acceptance) or "- [ ] Define measurable acceptance criteria"
    files = "\n".join(f"- `{item}`" for item in args.files) or "- To be confirmed before edits"

    content = f"""# Agent Run: {args.slice_id}

- **Started:** {now.isoformat(timespec='seconds')}
- **Agent:** {args.agent}
- **Branch:** `{branch}`
- **Starting HEAD:** `{head}`
- **Status:** `in_progress`

## Objective

{args.objective}

## Acceptance Criteria

{acceptance}

## Claimed Files

{files}

## Starting Worktree State

```text
{status}
```

## Checkpoints

### {now.isoformat(timespec='seconds')} — slice opened

- **Completed:** Orientation and durable ledger creation.
- **Verification:** Not started.
- **Pushed SHA:** Not pushed.
- **Deployed SHA:** Not verified.
- **Blockers:** None recorded.
- **Next exact action:** Inspect the governing code and tests, then implement the first coherent change.
"""

    if args.dry_run:
        print(f"# Target: {relative}\n\n{content}")
        return 0

    if target.exists():
        raise SystemExit(f"Refusing to overwrite existing ledger: {relative}")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    print(relative)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
