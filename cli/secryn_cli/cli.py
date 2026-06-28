"""Secryn CLI — manage your secrets from the terminal.

Provides commands for authentication, project management, secret
operations, API key management, and user profile access.
"""

import os
import sys
from pathlib import Path
from typing import Optional

# The ``click`` package does not ship type stubs, so static checkers
# that run without ``--no-typeshed`` may report a missing import.
# pyrefly: ignore [missing-import]
import click

from . import __version__
from .client import APIError, Client
from .config import config_path, cookie_jar_path, load_config, save_config


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

def echo_success(text: str) -> None:
    """Print a green success message to stderr."""
    click.echo(f"\033[32m\u2713\033[0m {text}", err=True)


def echo_error(text: str) -> None:
    """Print a red error message to stderr."""
    click.echo(f"\033[31m\u2717\033[0m {text}", err=True)


def echo_info(text: str) -> None:
    """Print a blue info message to stderr."""
    click.echo(f"\033[34m\u2139\033[0m {text}", err=True)


def confirm_action(message: str) -> bool:
    """Prompt the user for a yes/no confirmation (default no)."""
    return click.confirm(f"\033[33m?\033[0m {message}", default=False)


def get_client(api_url: Optional[str] = None) -> Client:
    """Create a configured API client, optionally overriding the API URL.

    Args:
        api_url: If provided, overrides and persists the API base URL.

    Returns:
        A ready-to-use ``Client`` instance.
    """
    cfg = load_config()
    if api_url:
        old_url = cfg.api_url
        cfg.api_url = api_url
        save_config(cfg)
        if api_url != old_url:
            echo_info(f"API URL set to {api_url}")
    return Client(cfg)


def format_table(headers: list[str], rows: list[list[str]]) -> str:
    """Render a list of rows as an aligned ASCII table.

    Args:
        headers: Column header labels.
        rows: Row data, each inner list must have the same length as ``headers``.

    Returns:
        Formatted table string with headers separated from rows by a
        dashed line.
    """
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            col_widths[i] = max(col_widths[i], len(str(cell)))
    col_widths = [w + 2 for w in col_widths]

    lines: list[str] = []
    hdr = "".join(h.ljust(col_widths[i]) for i, h in enumerate(headers))
    lines.append(hdr)
    lines.append("".join("-" * col_widths[i] for i in range(len(headers))))

    for row in rows:
        line = "".join(str(c).ljust(col_widths[i]) for i, c in enumerate(row))
        lines.append(line)

    return "\n".join(lines)


def mask_value(value: str) -> str:
    """Mask a secret value, showing only the first and last 4 characters.

    Args:
        value: The plain-text secret value.

    Returns:
        Masked string with the middle characters replaced by ``*``.
        Short values (<= 8 chars) are fully obscured.
    """
    if len(value) > 8:
        return value[:4] + "*" * (len(value) - 8) + value[-4:]
    if value:
        return "*" * len(value)
    return ""


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

@click.group()
@click.option(
    "--api-url",
    envvar="SECRYN_API_URL",
    help="API base URL (default: https://secryn.xyz/api/v1)",
)
@click.pass_context
def cli(ctx: click.Context, api_url: Optional[str]) -> None:
    """Secryn CLI — manage secrets, projects, and API keys."""
    ctx.obj = get_client(api_url)


# ---------------------------------------------------------------------------
# Auth commands
# ---------------------------------------------------------------------------

@cli.group()
def auth() -> None:
    """Authenticate with Secryn."""


@auth.command("login")
@click.option("--email", help="Email address")
@click.option("--password", help="Password")
@click.pass_obj
def auth_login(client: Client, email: Optional[str], password: Optional[str]) -> None:
    """Log in to Secryn.

    Prompts interactively for email and password if not supplied via flags.
    """
    if not email:
        email = click.prompt("Email", type=str)
    if not password:
        password = click.prompt("Password", hide_input=True, type=str)

    client.post("/auth/login", {"email": email, "password": password})

    client.config.user_email = email
    client.save_config()
    echo_success(f"Logged in as {email}")


@auth.command("logout")
@click.pass_obj
def auth_logout(client: Client) -> None:
    """Log out and clear locally stored credentials."""
    client.logout()
    echo_success("Logged out successfully")


@auth.command("whoami")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.pass_obj
def auth_whoami(client: Client, as_json: bool) -> None:
    """Show the currently logged-in user."""
    user = client.get("/users/@me")

    if as_json:
        import json as _json

        click.echo(_json.dumps(user, indent=2))
        return

    click.echo(
        format_table(
            ["ID", "EMAIL", "USERNAME"],
            [[user["id"], user["email"], user.get("username", "")]],
        )
    )

    client.config.user_id = user["id"]
    client.config.user_email = user["email"]
    client.save_config()


# ---------------------------------------------------------------------------
# Project commands
# ---------------------------------------------------------------------------

@cli.group()
def projects() -> None:
    """Manage projects."""


@projects.command("list")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.pass_obj
def projects_list(client: Client, as_json: bool) -> None:
    """List all projects you own or are a member of."""
    result = client.get("/projects/@all")

    if as_json:
        import json as _json

        click.echo(_json.dumps(result, indent=2))
        return

    if not result:
        echo_info("No projects found")
        return

    rows = []
    for p in result:
        rows.append(
            [
                p["id"],
                p["name"],
                p.get("slug", ""),
                p.get("description", "") or "",
                p.get("createdAt", ""),
            ]
        )

    click.echo(
        format_table(
            ["ID", "NAME", "SLUG", "DESCRIPTION", "CREATED"],
            rows,
        )
    )


@projects.command("create")
@click.option("--name", required=True, help="Project name")
@click.option("--description", help="Project description")
@click.pass_obj
def projects_create(client: Client, name: str, description: Optional[str]) -> None:
    """Create a new project."""
    body: dict[str, str] = {"name": name}
    if description:
        body["description"] = description

    project = client.post("/projects", body)
    echo_success(f"Project created: {project['name']} ({project['id']})")


@projects.command("delete")
@click.option("--id", "project_id", required=True, help="Project ID")
@click.option("--force", "-f", is_flag=True, help="Skip confirmation prompt")
@click.pass_obj
def projects_delete(client: Client, project_id: str, force: bool) -> None:
    """Delete a project and all its secrets.

    Asks for confirmation unless ``--force`` is passed.
    """
    if not force and not confirm_action(
        f"Delete project {project_id}? All secrets will also be deleted."
    ):
        echo_info("Aborted")
        return

    client.delete(f"/projects/{project_id}")
    echo_success(f"Project {project_id} deleted")


# ---------------------------------------------------------------------------
# Secret commands
# ---------------------------------------------------------------------------

@cli.group()
def secrets() -> None:
    """Manage secrets."""


@secrets.command("list")
@click.option("--project-id", required=True, help="Project ID")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.pass_obj
def secrets_list(client: Client, project_id: str, as_json: bool) -> None:
    """List all secrets in a project.

    Secret values are masked in table output; use ``sc secrets get`` with
    ``--show-value`` to reveal a single secret.
    """
    result = client.get(f"/projects/{project_id}/secrets")

    if as_json:
        import json as _json

        click.echo(_json.dumps(result, indent=2))
        return

    if not result:
        echo_info("No secrets found in this project")
        return

    rows = []
    for s in result:
        rows.append(
            [
                s["id"],
                s["name"],
                mask_value(s.get("value", "")),
                s.get("notes", "") or "",
                s.get("updatedAt", ""),
            ]
        )

    click.echo(
        format_table(
            ["ID", "NAME", "VALUE", "NOTES", "UPDATED"],
            rows,
        )
    )


@secrets.command("get")
@click.option("--id", "secret_id", required=True, help="Secret ID")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.option("--show-value", is_flag=True, help="Display the secret value in plain text")
@click.pass_obj
def secrets_get(
    client: Client, secret_id: str, as_json: bool, show_value: bool
) -> None:
    """Retrieve a single secret by ID.

    By default the value is masked. Pass ``--show-value`` to reveal it.
    """
    secret = client.get(f"/projects/secrets/{secret_id}")

    if as_json:
        import json as _json

        if not show_value:
            secret_display = dict(secret)
            secret_display["value"] = mask_value(secret_display.get("value", ""))
            click.echo(_json.dumps(secret_display, indent=2))
        else:
            click.echo(_json.dumps(secret, indent=2))
        return

    value_display = (
        secret.get("value", "")
        if show_value
        else mask_value(secret.get("value", "")) + " (use --show-value to reveal)"
    )
    click.echo(
        format_table(
            ["FIELD", "VALUE"],
            [
                ["ID", secret["id"]],
                ["Name", secret["name"]],
                ["Value", value_display],
                ["Notes", secret.get("notes", "") or ""],
                ["Project ID", secret.get("projectId", "")],
                ["Created", secret.get("createdAt", "")],
                ["Updated", secret.get("updatedAt", "")],
            ],
        )
    )


@secrets.command("create")
@click.option("--project-id", required=True, help="Project ID")
@click.option("--name", required=True, help="Secret name (e.g. DATABASE_URL)")
@click.option("--value", required=True, help="Secret value")
@click.option("--notes", help="Optional notes for this secret")
@click.pass_obj
def secrets_create(
    client: Client,
    project_id: str,
    name: str,
    value: str,
    notes: Optional[str],
) -> None:
    """Create a new secret in a project."""
    body: dict[str, str] = {"name": name, "value": value}
    if notes:
        body["notes"] = notes

    secret = client.post(f"/projects/{project_id}/secrets", body)
    echo_success(f"Secret created: {secret['name']} ({secret['id']})")


@secrets.command("update")
@click.option("--id", "secret_id", required=True, help="Secret ID")
@click.option("--name", help="New name for the secret")
@click.option("--value", help="New value for the secret")
@click.option("--notes", help="New notes for the secret")
@click.pass_obj
def secrets_update(
    client: Client,
    secret_id: str,
    name: Optional[str],
    value: Optional[str],
    notes: Optional[str],
) -> None:
    """Update an existing secret.

    Only the fields you pass will be changed; omitted fields stay
    unchanged.
    """
    body: dict[str, str] = {}
    if name:
        body["name"] = name
    if value:
        body["value"] = value
    if notes is not None:
        body["notes"] = notes

    if not body:
        echo_info("No fields to update")
        return

    secret = client.put(f"/projects/secrets/{secret_id}", body)
    echo_success(f"Secret {secret['id']} updated")


@secrets.command("delete")
@click.option("--id", "secret_id", required=True, help="Secret ID")
@click.option("--force", "-f", is_flag=True, help="Skip confirmation prompt")
@click.pass_obj
def secrets_delete(client: Client, secret_id: str, force: bool) -> None:
    """Delete a secret permanently."""
    if not force and not confirm_action(f"Delete secret {secret_id}?"):
        echo_info("Aborted")
        return

    client.delete(f"/projects/secrets/{secret_id}")
    echo_success(f"Secret {secret_id} deleted")


@secrets.command("export")
@click.option("--project-id", required=True, help="Project ID")
@click.option(
    "--output",
    "-o",
    "output_file",
    help="Output file path (prints to stdout if omitted)",
)
@click.pass_obj
def secrets_export(
    client: Client, project_id: str, output_file: Optional[str]
) -> None:
    """Export all project secrets as a ``.env`` file.

    Writes dotenv-formatted output to stdout or to the file specified
    with ``-o``. The output file is created with mode ``0600``.
    """
    data = client.get_raw(f"/projects/{project_id}/secrets/export")

    if output_file:
        Path(output_file).write_text(data)
        os.chmod(output_file, 0o600)
        echo_success(f"Secrets exported to {output_file}")
    else:
        click.echo(data)


# ---------------------------------------------------------------------------
# API key commands
# ---------------------------------------------------------------------------

@cli.group(name="api-keys")
def api_keys() -> None:
    """Manage API keys for programmatic access."""


@api_keys.command("list")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.pass_obj
def api_keys_list(client: Client, as_json: bool) -> None:
    """List all API keys for your account."""
    keys = client.get("/api-keys/@all-user")

    if as_json:
        import json as _json

        click.echo(_json.dumps(keys, indent=2))
        return

    if not keys:
        echo_info("No API keys found")
        return

    rows = []
    for k in keys:
        status = "active" if k.get("isActive", True) else "inactive"
        perms = ", ".join(k.get("permissions", []))
        rows.append(
            [
                k["id"],
                k.get("keyName", ""),
                status,
                perms,
                k.get("createdAt", ""),
                k.get("expiresAt", ""),
            ]
        )

    click.echo(
        format_table(
            ["ID", "NAME", "STATUS", "PERMISSIONS", "CREATED", "EXPIRES"],
            rows,
        )
    )


@api_keys.command("create")
@click.option("--name", required=True, help="Human-readable label for the key")
@click.option(
    "--permissions",
    default="read,write",
    help="Comma-separated permissions: read, write",
)
@click.pass_obj
def api_keys_create(client: Client, name: str, permissions: str) -> None:
    """Create a new API key.

    The key value is displayed **only once** at creation time — save it
    immediately. Permissions can be ``read`` and/or ``write``.
    """
    perm_list = [p.strip() for p in permissions.split(",") if p.strip()]

    key = client.post("/api-keys", {"name": name, "permissions": perm_list})

    click.echo("")
    click.echo("\u250c" + "\u2500" * 47 + "\u2510")
    click.echo("\u2502  IMPORTANT: Save this key securely!         \u2502")
    click.echo("\u2502  It will NOT be shown again.                \u2502")
    click.echo("\u251c" + "\u2500" * 47 + "\u2524")
    click.echo(f"\u2502  Key:  {key['key']:<38} \u2502")
    click.echo(f"\u2502  ID:   {key['id']:<38} \u2502")
    click.echo(
        f"\u2502  Perm: {', '.join(key.get('permissions', [])):<38} \u2502"
    )
    click.echo("\u2514" + "\u2500" * 47 + "\u2518")
    echo_success(f"API key created: {key.get('keyName', name)}")


@api_keys.command("delete")
@click.option("--id", "key_id", required=True, help="API key ID")
@click.option("--force", "-f", is_flag=True, help="Skip confirmation prompt")
@click.pass_obj
def api_keys_delete(client: Client, key_id: str, force: bool) -> None:
    """Delete an API key permanently."""
    if not force and not confirm_action(f"Delete API key {key_id}?"):
        echo_info("Aborted")
        return

    client.delete(f"/api-keys/{key_id}")
    echo_success(f"API key {key_id} deleted")


# ---------------------------------------------------------------------------
# User commands
# ---------------------------------------------------------------------------

@cli.group()
def user() -> None:
    """User information and settings."""


@user.command("info")
@click.pass_obj
def user_info(client: Client) -> None:
    """Show your user profile information."""
    u = client.get("/users/@me")

    click.echo(
        format_table(
            ["FIELD", "VALUE"],
            [
                ["ID", u["id"]],
                ["Email", u["email"]],
                ["Username", u.get("username", "")],
                ["Role", u.get("role", "")],
                ["Joined", u.get("createdAt", "")],
            ],
        )
    )

    client.config.user_id = u["id"]
    client.config.user_email = u["email"]
    client.save_config()


# ---------------------------------------------------------------------------
# Meta commands
# ---------------------------------------------------------------------------

@cli.command("version")
def version() -> None:
    """Print the CLI version and exit."""
    click.echo(f"Secryn CLI v{__version__}")


@cli.command("config")
def config_cmd() -> None:
    """Show current CLI configuration paths and values."""
    _cfg = load_config()

    click.echo(
        format_table(
            ["SETTING", "VALUE"],
            [
                ["API URL", _cfg.api_url],
                ["Config file", str(config_path())],
                ["Cookie jar", str(cookie_jar_path())],
                ["Logged in as", _cfg.user_email or "(not logged in)"],
            ],
        )
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    """Entry point that wraps the Click CLI group with custom error handling.

    Pre-processes the ``--api-url`` flag from ``sys.argv`` so the URL is
    persisted to disk even when no subcommand is given (Click does not invoke
    the group callback when a subcommand is absent).

    Uses ``standalone_mode=False`` so exceptions propagate to this function
    instead of being caught by Click's built-in handlers.  This allows a
    unified exit-code strategy:

    - ``SystemExit`` (including ``click.exceptions.Exit``) → exit with the
      exception's code, preserving Click's own exit semantics.
    - ``NoArgsIsHelpError`` → display the command list and exit 0.
    - ``UsageError`` with *Missing command* / *No such command* → show
      the error text followed by the command list, exit 0.
    - Other ``UsageError`` / ``ClickException`` / ``APIError`` /
      ``Exception`` → print the message to stderr and exit 1.

    Note:
        Exit codes 0 and 1 are the only codes emitted by this wrapper;
        Click's own ``--help`` handling and built-in validation errors
        (e.g. ``NoSuchOption``) may produce code 2 before reaching here.
    """
    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg == "--api-url" and i + 1 < len(args):
            api_url = args[i + 1]
            cfg = load_config()
            if api_url != cfg.api_url:
                cfg.api_url = api_url
                save_config(cfg)
                echo_info(f"API URL set to {api_url}")
            break

    exit_code = 0
    try:
        cli.main(args=args, prog_name="sc", standalone_mode=False)
    except click.exceptions.Exit as e:
        exit_code = e.exit_code if e.exit_code is not None else 0
    except click.ClickException as e:
        if isinstance(e, click.exceptions.NoArgsIsHelpError):
            click.echo(cli.get_help(click.Context(cli, info_name="sc")))
        elif isinstance(e, click.UsageError):
            msg = str(e)
            if "Missing command" in msg or "No such command" in msg:
                click.echo(f"Error: {msg}", err=True)
                click.echo()
                click.echo(cli.get_help(click.Context(cli, info_name="sc")))
            else:
                echo_error(msg)
                exit_code = 1
        else:
            echo_error(str(e))
            exit_code = 1
    except APIError as e:
        echo_error(str(e))
        exit_code = 1
    except Exception as e:
        echo_error(str(e))
        exit_code = 1

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
