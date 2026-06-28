# Secryn CLI

[![PyPI](https://img.shields.io/pypi/v/secryn-cli)](https://pypi.org/project/secryn-cli/)
[![Python](https://img.shields.io/pypi/pyversions/secryn-cli.svg)](https://pypi.org/project/secryn-cli/)
[![License](https://img.shields.io/pypi/l/secryn-cli.svg)](https://github.com/P4ciuf/secryn/blob/main/LICENSE)

Command-line interface for [Secryn](https://secryn.xyz) — manage your secrets, projects, and API keys without leaving the terminal.

## Installation

### Via pipx (recommended)

```bash
pipx install secryn-cli
```

### From source

```bash
cd packages/cli
pipx install -e .
```

### Via pip + venv

```bash
cd packages/cli
python3 -m venv .venv
.venv/bin/pip install -e .
ln -sf $(pwd)/.venv/bin/sc ~/.local/bin/sc
```

### One-liner install script

```bash
curl -fsSL https://raw.githubusercontent.com/P4ciuf/secryn/main/packages/cli/install.sh | bash
```

Requires Python 3.10+.

## Quick Start

```bash
# Login to your Secryn instance
sc auth login --email user@example.com --password "your-password"

# Or use a custom API URL
sc --api-url https://secryn.xyz/api auth login
```

The CLI stores configuration and session cookies in `~/.config/secryn/`.

## Commands

### Authentication

```bash
sc auth login                                   # Interactive login
sc auth login --email <email> --password <pw>   # Non-interactive
sc auth logout                                  # Logout and clear cookies
sc auth whoami                                  # Show authenticated user
sc auth whoami --json                           # JSON output
```

### Projects

```bash
sc projects list                        # List all projects
sc projects list --json                 # JSON output
sc projects create --name <name>        # Create a project
sc projects create --name <name>        # With description
  --description <desc>
sc projects delete --id <id>            # Delete (with confirmation)
sc projects delete --id <id> -f         # Skip confirmation
```

### Secrets

```bash
sc secrets list --project-id <id>             # List secrets
sc secrets list --project-id <id> --json      # JSON output
sc secrets get --id <id>                      # Show secret (masked)
sc secrets get --id <id> --show-value         # Show in plain text
sc secrets get --id <id> --json               # JSON output
sc secrets create --project-id <id>           # Create a secret
  --name <name> --value <value>
  --notes <notes>                             # Optional notes
sc secrets update --id <id>                   # Partial update
  --name <new> --value <new>
  --notes <new>
sc secrets delete --id <id>                   # Delete secret
sc secrets delete --id <id> -f                # Skip confirmation
sc secrets export --project-id <id>           # Export as .env (stdout)
sc secrets export --project-id <id>           # Export to file
  -o .env
```

### API Keys

```bash
sc api-keys list                        # List all keys
sc api-keys list --json                 # JSON output
sc api-keys create --name <name>        # Create key (read+write)
sc api-keys create --name <name>        # Create with specific permissions
  --permissions read
sc api-keys delete --id <id>            # Delete key
sc api-keys delete --id <id> -f         # Skip confirmation
```

### User & Config

```bash
sc user info                # Show user profile
sc config                   # Show config paths and values
sc version                  # Show CLI version
```

## Global Options

| Option            | Description                                                  |
| ----------------- | ------------------------------------------------------------ |
| `--api-url <url>` | Override API base URL (default: `http://localhost:3000/api`) |
| `--json`          | Output in JSON format (where supported)                      |
| `--force`, `-f`   | Skip confirmation for destructive commands                   |
| `--help`          | Show help for any command or subcommand                      |

## Environment Variables

| Variable         | Description                |
| ---------------- | -------------------------- |
| `SECRYN_API_URL` | Alternative to `--api-url` |
| `SECRYN_HOME`    | Custom config directory    |

## Configuration Files

The CLI stores its state in `~/.config/secryn/`:

| File           | Content                        |
| -------------- | ------------------------------ |
| `config.json`  | API URL, user ID, email        |
| `cookies.json` | JWT session cookies (httpOnly) |

## License

Apache 2.0 — see [LICENSE](https://github.com/P4ciuf/secryn/blob/main/LICENSE).
