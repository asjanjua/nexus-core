#!/usr/bin/env python3
"""NexusAI cross-model handoff helper.

The papertrail skill is the source of truth. This helper is a compatibility
adapter that appends a concise HANDOVER section, writes a unique agent-run
ledger, prints the continuation prompt, and optionally launches the next CLI.

Existing HANDOVER bytes are never rewritten. Normal writes are serialized with
an exclusive POSIX file lock and duplicate handoffs are rejected.
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


HANDOVER_FILE = Path("HANDOVER.md")
LEDGER_ROOT = Path("docs/agent-runs")
RELAY_MAP = {"claude": "codex", "codex": "claude"}
INSTRUCTIONS = {"claude": "CLAUDE.md", "codex": "AGENTS.md"}
CLI = {"claude": "claude", "codex": "codex"}


class RelayError(RuntimeError):
    """Raised when a handoff cannot be recorded safely."""


@dataclass(frozen=True)
class RelayRecord:
    number: int
    timestamp: str
    from_model: str
    next_model: str
    commit_hash: str
    branch: str
    done: str
    next_task: str
    notes: str
    files_text: str
    fingerprint: str
    ledger_path: Path
    continuation_prompt: str
    handover_section: str
    ledger_content: str


def run(cmd: list[str], capture: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=capture, text=True, check=False)


def git_value(args: list[str], fallback: str) -> str:
    result = run(["git", *args])
    value = result.stdout.strip() if result.returncode == 0 else ""
    return value or fallback


def git_short_hash() -> str:
    return git_value(["rev-parse", "--short", "HEAD"], "unknown")


def git_branch() -> str:
    return git_value(["branch", "--show-current"], "detached-or-unknown")


def git_commit(done: str, files: list[str]) -> str | None:
    if not files:
        print("[relay] Refusing to commit without explicit --files.", file=sys.stderr)
        return None

    staged_before = git_value(["diff", "--cached", "--name-only"], "")
    if staged_before:
        print(
            "[relay] Refusing to commit while pre-existing staged changes are present:\n"
            + staged_before,
            file=sys.stderr,
        )
        return None

    add_result = run(["git", "add", "--", *files])
    if add_result.returncode != 0:
        print(add_result.stderr, file=sys.stderr)
        return None

    commit_msg = f"relay: {done[:72]}"
    commit_result = run(["git", "commit", "-m", commit_msg])
    if commit_result.returncode != 0:
        combined = commit_result.stdout + commit_result.stderr
        if "nothing to commit" in combined:
            print("[relay] No selected changes to commit.")
            return git_short_hash()
        print(commit_result.stderr, file=sys.stderr)
        return None

    commit_hash = git_short_hash()
    print(f"[relay] committed {commit_hash}: {commit_msg}")
    return commit_hash


def validate_text(label: str, value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise RelayError(f"{label} must contain non-whitespace text")
    return normalized


def next_session_number(existing: str) -> int:
    patterns = (
        r"\bSession\s+#(\d+)",
        r"\bSession\s+number:\*{0,2}\s*#?(\d+)",
        r"\bRelay\s+#(\d+)",
    )
    numbers = [
        int(match.group(1))
        for pattern in patterns
        for match in re.finditer(pattern, existing, flags=re.IGNORECASE)
    ]
    return max(numbers, default=0) + 1


def changed_files_from_args(files: list[str]) -> str:
    if files:
        return "\n".join(files)
    result = run(["git", "status", "--short"])
    return result.stdout.strip() if result.returncode == 0 and result.stdout.strip() else "(none)"


def relay_fingerprint(from_model: str, done: str, next_task: str, notes: str) -> str:
    payload = "\0".join((from_model, done, next_task, notes)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def continuation_prompt(
    from_model: str, next_model: str, done: str, next_task: str, notes: str
) -> str:
    instructions = INSTRUCTIONS[next_model]
    return f"""You are picking up NexusAI mid-build.

Read these files before editing:

1. {instructions}
2. HANDOVER.md
3. TASKS.md
4. BACKLOG.md

Last model ({from_model}) completed:
{done}

Your task:
{next_task}

Notes:
{notes or "None"}

Start by confirming the current branch, HEAD, working-tree state, and newest agent-run ledger. Then proceed.
"""


def available_ledger_path(date_part: str, number: int, from_model: str, next_model: str) -> tuple[int, Path]:
    candidate_number = number
    while True:
        candidate = (
            LEDGER_ROOT
            / date_part
            / f"relay-{candidate_number:03d}-{from_model}-to-{next_model}.md"
        )
        if not candidate.exists():
            return candidate_number, candidate
        candidate_number += 1


def build_record(
    *,
    existing: str,
    from_model: str,
    done: str,
    next_task: str,
    notes: str,
    commit_hash: str,
    files: list[str],
    now: datetime | None = None,
) -> RelayRecord:
    done = validate_text("--done", done)
    next_task = validate_text("--next", next_task)
    notes = notes.strip()
    next_model = RELAY_MAP[from_model]
    instant = now or datetime.now().astimezone()
    timestamp = instant.isoformat(timespec="seconds")
    number, ledger_path = available_ledger_path(
        instant.strftime("%Y-%m-%d"), next_session_number(existing), from_model, next_model
    )
    fingerprint = relay_fingerprint(from_model, done, next_task, notes)
    marker = f"<!-- relay-fingerprint: {fingerprint} -->"
    if marker in existing:
        raise RelayError("duplicate handoff refused: this relay fingerprint already exists")

    files_text = changed_files_from_args(files)
    branch = git_branch()
    prompt = continuation_prompt(from_model, next_model, done, next_task, notes)
    handover_section = f"""{marker}
## {timestamp} — Relay #{number}: {from_model} to {next_model}

- **Branch:** `{branch}`
- **Commit:** `{commit_hash}`
- **Ledger:** `{ledger_path.as_posix()}`

### Completed

{done}

### Immediate Next Task

{next_task}

### Notes and Warnings

{notes or "None"}

### Files Changed / Dirty Context

```text
{files_text}
```
"""
    ledger_content = f"""# Relay Run #{number}: {from_model} to {next_model}

- **Recorded:** {timestamp}
- **Status:** `handoff_recorded`
- **Branch:** `{branch}`
- **Commit:** `{commit_hash}`
- **Handover file:** `{HANDOVER_FILE.as_posix()}`
- **Fingerprint:** `{fingerprint}`

## Completed

{done}

## Immediate Next Task

{next_task}

## Notes and Warnings

{notes or "None"}

## Files Changed / Dirty Context

```text
{files_text}
```

## Continuation Prompt

```text
{prompt.rstrip()}
```
"""
    return RelayRecord(
        number=number,
        timestamp=timestamp,
        from_model=from_model,
        next_model=next_model,
        commit_hash=commit_hash,
        branch=branch,
        done=done,
        next_task=next_task,
        notes=notes,
        files_text=files_text,
        fingerprint=fingerprint,
        ledger_path=ledger_path,
        continuation_prompt=prompt,
        handover_section=handover_section,
        ledger_content=ledger_content,
    )


def append_record(
    *, from_model: str, done: str, next_task: str, notes: str, commit_hash: str, files: list[str]
) -> RelayRecord:
    HANDOVER_FILE.parent.mkdir(parents=True, exist_ok=True)
    with HANDOVER_FILE.open("a+", encoding="utf-8") as handover:
        fcntl.flock(handover.fileno(), fcntl.LOCK_EX)
        ledger_created = False
        record: RelayRecord | None = None
        try:
            handover.seek(0)
            existing = handover.read()
            record = build_record(
                existing=existing,
                from_model=from_model,
                done=done,
                next_task=next_task,
                notes=notes,
                commit_hash=commit_hash,
                files=files,
            )
            record.ledger_path.parent.mkdir(parents=True, exist_ok=True)
            with record.ledger_path.open("x", encoding="utf-8") as ledger:
                ledger.write(record.ledger_content)
                ledger.flush()
                os.fsync(ledger.fileno())
            ledger_created = True

            handover.seek(0, os.SEEK_END)
            if existing and not existing.endswith("\n"):
                handover.write("\n")
            handover.write("\n---\n\n")
            handover.write(record.handover_section)
            handover.flush()
            os.fsync(handover.fileno())
            return record
        except Exception:
            if ledger_created and record is not None:
                record.ledger_path.unlink(missing_ok=True)
            raise
        finally:
            fcntl.flock(handover.fileno(), fcntl.LOCK_UN)


def preview_record(
    *, from_model: str, done: str, next_task: str, notes: str, commit_hash: str, files: list[str]
) -> RelayRecord:
    existing = HANDOVER_FILE.read_text(encoding="utf-8") if HANDOVER_FILE.exists() else ""
    return build_record(
        existing=existing,
        from_model=from_model,
        done=done,
        next_task=next_task,
        notes=notes,
        commit_hash=commit_hash,
        files=files,
    )


def launch(model: str, prompt: str) -> bool:
    cmd = CLI.get(model)
    if not cmd or not shutil.which(cmd):
        return False

    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", prefix="nexus-relay-", suffix=".txt", delete=False
    ) as prompt_file:
        prompt_file.write(prompt)
        prompt_path = Path(prompt_file.name)

    if sys.platform == "darwin":
        shell_command = (
            f"cd {shlex.quote(os.getcwd())} && "
            f"trap {shlex.quote(f'rm -f {shlex.quote(str(prompt_path))}')} EXIT && "
            f"{shlex.quote(cmd)} < {shlex.quote(str(prompt_path))}"
        )
        apple_command = shell_command.replace("\\", "\\\\").replace('"', '\\"')
        script = f'''
        tell application "Terminal"
            do script "{apple_command}"
            activate
        end tell
        '''
        launched = subprocess.run(["osascript", "-e", script], check=False).returncode == 0
        if not launched:
            prompt_path.unlink(missing_ok=True)
        return launched

    prompt_path.unlink(missing_ok=True)
    return False


def print_record(record: RelayRecord) -> None:
    print(f"[relay] appended {HANDOVER_FILE} with relay #{record.number}")
    print(f"[relay] wrote ledger {record.ledger_path}")
    print("\n" + "=" * 72)
    print(f"Continuation prompt for {record.next_model}:")
    print("=" * 72)
    print(record.continuation_prompt)


def main() -> int:
    parser = argparse.ArgumentParser(description="NexusAI append-only relay handoff helper")
    parser.add_argument("--from-model", choices=sorted(RELAY_MAP), required=True)
    parser.add_argument("--done", required=True)
    parser.add_argument("--next", required=True, dest="next_task")
    parser.add_argument("--notes", default="")
    parser.add_argument("--commit", action="store_true", help="Commit selected --files before recording the handoff")
    parser.add_argument("--files", nargs="*", default=[], help="Explicit files to stage with --commit, or describe in the handoff")
    parser.add_argument("--launch", action="store_true", help="Attempt to launch the next model CLI after recording")
    output_mode = parser.add_mutually_exclusive_group()
    output_mode.add_argument("--dry-run", action="store_true", help="Preview the handover and ledger without writing, committing, or launching")
    output_mode.add_argument("--print-only", action="store_true", help="Print only the continuation prompt without writing, committing, or launching")
    args = parser.parse_args()

    try:
        done = validate_text("--done", args.done)
        next_task = validate_text("--next", args.next_task)
        notes = args.notes.strip()
    except RelayError as error:
        parser.error(str(error))

    if (args.dry_run or args.print_only) and (args.commit or args.launch):
        parser.error("--dry-run/--print-only cannot be combined with --commit or --launch")
    if args.commit and not args.files:
        parser.error("--commit requires explicit --files")

    commit_hash = git_short_hash()
    if args.dry_run or args.print_only:
        try:
            record = preview_record(
                from_model=args.from_model,
                done=done,
                next_task=next_task,
                notes=notes,
                commit_hash=commit_hash,
                files=args.files,
            )
        except RelayError as error:
            print(f"[relay] {error}", file=sys.stderr)
            return 1
        if args.print_only:
            print(record.continuation_prompt)
        else:
            print(f"# Planned ledger: {record.ledger_path}\n")
            print("# Planned HANDOVER append\n")
            print(record.handover_section)
            print("\n# Planned ledger content\n")
            print(record.ledger_content)
        return 0

    if args.commit:
        committed = git_commit(done, args.files)
        if committed is None:
            return 1
        commit_hash = committed

    try:
        record = append_record(
            from_model=args.from_model,
            done=done,
            next_task=next_task,
            notes=notes,
            commit_hash=commit_hash,
            files=args.files,
        )
    except (OSError, RelayError) as error:
        print(f"[relay] handoff not recorded: {error}", file=sys.stderr)
        return 1

    if args.launch and not launch(record.next_model, record.continuation_prompt):
        print(f"[relay] {record.next_model} CLI was not launched; handoff remains recorded.", file=sys.stderr)

    print_record(record)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
