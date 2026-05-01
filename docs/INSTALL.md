# Install Nexus (One Command)

Nexus installs as an overlay around OpenClaw.
If OpenClaw is missing, bootstrap will install it automatically.

## Quick Install
From anywhere:

```bash
curl -fsSL https://raw.githubusercontent.com/asjanjua/nexus-core/main/scripts/install.sh | bash
```

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
nexus doctor --json
nexus init
nexus init /path/to/workspace
nexus status
nexus setup
nexus help
```

## What The Bootstrap Does
1. Checks if `openclaw` exists.
2. Installs OpenClaw with `npm install -g openclaw` if missing.
3. Creates Nexus home at `~/.nexus`.
4. Writes config: `~/.nexus/config/nexus.env`.
5. Installs helper scripts under `~/.nexus/scripts`.
6. Installs helper command at `~/.nexus/bin/nexus`.

## Available Commands
- `nexus doctor`
- `nexus doctor --json`
- `nexus init`
- `nexus init /path/to/workspace`
- `nexus status`
- `nexus setup`
- `nexus help`

## Requirements
- macOS or Linux shell
- `bash`
- `curl` (for hosted installer path)
- `git`
- `npm` (only needed when OpenClaw is not already installed)

## Safer Variant (No Pipe-To-Shell)
If your policy avoids direct pipe execution:

```bash
curl -fsSL https://raw.githubusercontent.com/asjanjua/nexus-core/main/scripts/install.sh -o /tmp/nexus-install.sh
bash /tmp/nexus-install.sh
```

## Troubleshooting
- If `openclaw` is installed but not found, restart your shell and re-run bootstrap.
- If npm global installs are blocked, install OpenClaw manually, then rerun bootstrap.
- If `nexus doctor` fails, run:

```bash
echo "$PATH"
command -v openclaw
```
