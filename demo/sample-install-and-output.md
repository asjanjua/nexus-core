# Sample Install and Output

## Install
```bash
curl -fsSL https://raw.githubusercontent.com/asjanjua/nexus-core/main/scripts/install.sh | bash
export PATH="$HOME/.nexus/bin:$PATH"
nexus init /tmp/nexus-demo
nexus doctor --json
```

## Example Output
```json
{
  "component": "nexus-doctor",
  "status": "ok",
  "checks": [
    {"status":"ok","message":"openclaw: /opt/homebrew/bin/openclaw"},
    {"status":"ok","message":"git: /usr/bin/git"},
    {"status":"ok","message":"bash: /bin/bash"},
    {"status":"ok","message":"config present: /Users/alijanjua/.nexus/config/nexus.env"}
  ]
}
```

## Why This Matters
The install path is simple enough to share, and the health output is easy to paste into an issue or discussion thread.

