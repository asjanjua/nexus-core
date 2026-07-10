#!/usr/bin/env python3
"""
relay.py — NexusAI relay handoff helper.

This is adapted from asjanjua/ai-relay-team for NexusAI.

By default it updates HANDOVER.md and prints a continuation prompt without
committing. Use --commit with explicit --files to stage and commit selected
files. This safety default matters because the NexusAI repo often contains
unrelated local work in progress.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


HANDOVER_FILE = Path("HANDOVER.md")
TASKS_FILE = Path("TASKS.md")
RELAY_MAP = {"claude": "codex", "codex": "claude"}
INSTRUCTIONS = {"claude": "CLAUDE.md", "codex": "AGENTS.md"}
CLI = {"claude": "claude", "codex": "codex"}


def run(cmd: list[str], capture: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=capture, text=True)


def git_short_hash() -> str:
    result = run(["git", "rev-parse", "--short", "HEAD"])
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def git_commit(done: str, files: list[str]) -> str | None:
    if not files:
        print("[relay] Refusing to commit without explicit --files.")
        return None

    add_result = run(["git", "add", "--", *files])
    if add_result.returncode != 0:
        print(add_result.stderr)
        return None

    commit_msg = f"relay: {done[:72]}"
    commit_result = run(["git", "commit", "-m", commit_msg])
    if commit_result.returncode != 0:
        if "nothing to commit" in commit_result.stdout + commit_result.stderr:
            print("[relay] No selected changes to commit.")
            return git_short_hash()
        print(commit_result.stderr)
        return None

    commit_hash = git_short_hash()
    print(f"[relay] committed {commit_hash}: {commit_msg}")
    return commit_hash


def session_number() -> int:
    if not HANDOVER_FILE.exists():
        return 1
    for line in HANDOVER_FILE.read_text().splitlines():
        if "Session number" in line and "#" in line:
            try:
                return int(line.rsplit("#", 1)[1].strip()) + 1
            except ValueError:
                continue
    return 1


def changed_files_from_args(files: list[str]) -> str:
    if files:
        return "\n".join(files)
    result = run(["git", "status", "--short"])
    return result.stdout.strip() or "(none)"


def write_handover(
    from_model: str,
    done: str,
    next_task: str,
    notes: str,
    commit_hash: str,
    files: list[str],
) -> str:
    next_model = RELAY_MAP.get(from_model, "claude")
    instructions = INSTRUCTIONS[next_model]
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    number = session_number()
    files_text = changed_files_from_args(files)

    continuation_prompt = f"""You are picking up NexusAI mid-build.

Read these files before editing:

1. {instructions}
2. HANDOVER.md
3. TASKS.md

Last model ({from_model}) completed:
{done}

Your task:
{next_task}

Notes:
{notes or "None"}

Start by confirming current state, checking git status, and then proceed.
"""

    handover = f"""# HANDOVER.md — NexusAI Live Session State

> This file is the memory of the NexusAI relay team. Update it at the end of meaningful work.

---

## Session Info

- **Last updated:** {timestamp}
- **Last model:** {from_model}
- **Session number:** #{number}
- **Commit hash:** {commit_hash}

---

## What Was Completed This Session

{done}

---

## Files Changed / Current Dirty Context

```text
{files_text}
```

---

## Immediate Next Task

**Task:** {next_task}

**Assigned to:** {next_model}

---

## Notes and Warnings

{notes or "None"}

---

## Continuation Prompt

```text
{continuation_prompt}
```
"""
    HANDOVER_FILE.write_text(handover)
    print(f"[relay] updated {HANDOVER_FILE} for session #{number}")
    return continuation_prompt


def launch(model: str, prompt: str) -> bool:
    cmd = CLI.get(model)
    if not cmd or not shutil.which(cmd):
        return False

    prompt_file = Path(".relay_prompt.txt")
    prompt_file.write_text(prompt)

    if sys.platform == "darwin":
        script = f'''
        tell application "Terminal"
            do script "cd '{os.getcwd()}' && {cmd} < {prompt_file}"
            activate
        end tell
        '''
        return subprocess.run(["osascript", "-e", script]).returncode == 0

    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="NexusAI relay handoff helper")
    parser.add_argument("--from-model", choices=["claude", "codex"], required=True)
    parser.add_argument("--done", required=True)
    parser.add_argument("--next", required=True, dest="next_task")
    parser.add_argument("--notes", default="")
    parser.add_argument("--commit", action="store_true", help="Commit selected --files before handoff")
    parser.add_argument("--files", nargs="*", default=[], help="Explicit files to stage/commit with --commit")
    parser.add_argument("--launch", action="store_true", help="Attempt to launch next model CLI")
    args = parser.parse_args()

    commit_hash = git_short_hash()
    if args.commit:
        committed = git_commit(args.done, args.files)
        commit_hash = committed or commit_hash

    prompt = write_handover(
        from_model=args.from_model,
        done=args.done,
        next_task=args.next_task,
        notes=args.notes,
        commit_hash=commit_hash,
        files=args.files,
    )

    next_model = RELAY_MAP[args.from_model]
    if args.launch and launch(next_model, prompt):
        print(f"[relay] launched {next_model}")
    else:
        print("\n" + "=" * 72)
        print(f"Continuation prompt for {next_model}:")
        print("=" * 72)
        print(prompt)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

