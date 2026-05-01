# Install Nexus (One Command)

Nexus installs as an overlay around OpenClaw.
If OpenClaw is missing, bootstrap will install it automatically.

## Quick Install
From repo root:

```bash
bash scripts/nexus-bootstrap.sh
```

Then verify:

```bash
$HOME/.nexus/scripts/nexus-doctor.sh
```

Optional PATH helper:

```bash
export PATH="$HOME/.nexus/bin:$PATH"
nexus doctor
```

## What The Bootstrap Does
1. Checks if `openclaw` exists.
2. Installs OpenClaw with `npm install -g openclaw` if missing.
3. Creates Nexus home at `~/.nexus`.
4. Writes config: `~/.nexus/config/nexus.env`.
5. Installs helper scripts under `~/.nexus/scripts`.
6. Installs optional helper command at `~/.nexus/bin/nexus`.

## Requirements
- macOS or Linux shell
- `bash`
- `git`
- `npm` (only needed when OpenClaw is not already installed)

## Troubleshooting
- If `openclaw` is installed but not found, restart your shell and re-run bootstrap.
- If npm global installs are blocked, install OpenClaw manually, then rerun bootstrap.
- If `nexus doctor` fails, run:

```bash
echo "$PATH"
command -v openclaw
```

