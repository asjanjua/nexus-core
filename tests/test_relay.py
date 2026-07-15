from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
RELAY = REPO_ROOT / "relay.py"


class RelayAppendTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.initial = b"# Existing handover\n\n## Session #58 delivered\n\nHistorical session A.\nHistorical session B."
        (self.root / "HANDOVER.md").write_bytes(self.initial)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def relay_args(self, *, done: str = "Completed the safe relay.", next_task: str = "Run verification.") -> list[str]:
        return [
            sys.executable,
            str(RELAY),
            "--from-model",
            "codex",
            "--done",
            done,
            "--next",
            next_task,
            "--notes",
            "No secrets. Preserve history.",
        ]

    def run_relay(self, *extra: str, done: str = "Completed the safe relay.", next_task: str = "Run verification.") -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [*self.relay_args(done=done, next_task=next_task), *extra],
            cwd=self.root,
            capture_output=True,
            text=True,
            check=False,
        )

    def test_append_preserves_existing_bytes_and_writes_unique_ledger(self) -> None:
        result = self.run_relay()

        self.assertEqual(result.returncode, 0, result.stderr)
        updated = (self.root / "HANDOVER.md").read_bytes()
        self.assertTrue(updated.startswith(self.initial))
        self.assertIn(b"relay-fingerprint", updated)
        self.assertIn(b"Relay #59", updated)
        self.assertIn(b"Completed the safe relay.", updated)

        ledgers = list((self.root / "docs/agent-runs").glob("*/*.md"))
        self.assertEqual(len(ledgers), 1)
        ledger = ledgers[0].read_text(encoding="utf-8")
        self.assertIn("handoff_recorded", ledger)
        self.assertIn("Continuation Prompt", ledger)

    def test_duplicate_handoff_is_rejected_without_second_append(self) -> None:
        first = self.run_relay()
        self.assertEqual(first.returncode, 0, first.stderr)
        after_first = (self.root / "HANDOVER.md").read_bytes()

        second = self.run_relay()

        self.assertEqual(second.returncode, 1)
        self.assertIn("duplicate handoff refused", second.stderr)
        self.assertEqual((self.root / "HANDOVER.md").read_bytes(), after_first)
        self.assertEqual(len(list((self.root / "docs/agent-runs").glob("*/*.md"))), 1)

    def test_dry_run_and_print_only_do_not_write(self) -> None:
        dry_run = self.run_relay("--dry-run")
        self.assertEqual(dry_run.returncode, 0, dry_run.stderr)
        self.assertIn("Planned HANDOVER append", dry_run.stdout)
        self.assertEqual((self.root / "HANDOVER.md").read_bytes(), self.initial)
        self.assertFalse((self.root / "docs").exists())

        print_only = self.run_relay("--print-only")
        self.assertEqual(print_only.returncode, 0, print_only.stderr)
        self.assertIn("You are picking up NexusAI mid-build.", print_only.stdout)
        self.assertEqual((self.root / "HANDOVER.md").read_bytes(), self.initial)
        self.assertFalse((self.root / "docs").exists())

    def test_malformed_handoff_is_rejected(self) -> None:
        result = self.run_relay(done="   ")

        self.assertEqual(result.returncode, 2)
        self.assertIn("must contain non-whitespace text", result.stderr)
        self.assertEqual((self.root / "HANDOVER.md").read_bytes(), self.initial)

    def test_commit_refuses_preexisting_staged_changes(self) -> None:
        subprocess.run(["git", "init"], cwd=self.root, capture_output=True, check=True)
        subprocess.run(["git", "config", "user.name", "Relay Test"], cwd=self.root, check=True)
        subprocess.run(["git", "config", "user.email", "relay-test@example.invalid"], cwd=self.root, check=True)
        subprocess.run(["git", "add", "HANDOVER.md"], cwd=self.root, check=True)
        subprocess.run(["git", "commit", "-m", "initial"], cwd=self.root, capture_output=True, check=True)
        (self.root / "unrelated.txt").write_text("unrelated", encoding="utf-8")
        (self.root / "selected.txt").write_text("selected", encoding="utf-8")
        subprocess.run(["git", "add", "unrelated.txt"], cwd=self.root, check=True)

        result = self.run_relay("--commit", "--files", "selected.txt")

        self.assertEqual(result.returncode, 1)
        self.assertIn("pre-existing staged changes", result.stderr)
        staged = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            cwd=self.root,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.splitlines()
        self.assertEqual(staged, ["unrelated.txt"])
        self.assertEqual((self.root / "HANDOVER.md").read_bytes(), self.initial)

    def test_concurrent_writers_are_serialized(self) -> None:
        first = subprocess.Popen(
            self.relay_args(done="Concurrent writer one.", next_task="Continue one."),
            cwd=self.root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        second = subprocess.Popen(
            self.relay_args(done="Concurrent writer two.", next_task="Continue two."),
            cwd=self.root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        first_out, first_err = first.communicate(timeout=10)
        second_out, second_err = second.communicate(timeout=10)

        self.assertEqual(first.returncode, 0, first_err or first_out)
        self.assertEqual(second.returncode, 0, second_err or second_out)
        updated = (self.root / "HANDOVER.md").read_bytes()
        self.assertTrue(updated.startswith(self.initial))
        self.assertEqual(updated.count(b"relay-fingerprint"), 2)
        self.assertEqual(len(list((self.root / "docs/agent-runs").glob("*/*.md"))), 2)


if __name__ == "__main__":
    unittest.main()
