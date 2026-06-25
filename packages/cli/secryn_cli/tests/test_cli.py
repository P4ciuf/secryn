"""Tests for the Secryn CLI — covers all commands and error handling."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

# pyrefly: ignore [missing-import]
import pytest
# pyrefly: ignore [missing-import]
from click.testing import CliRunner
# pyrefly: ignore [missing-import]
from pytest_mock import MockerFixture

from secryn_cli import __version__
from secryn_cli.cli import cli, main
from secryn_cli.client import APIError
from secryn_cli.config import Config

@pytest.fixture()
def runner() -> CliRunner:
    """Returns a Click CliRunner instance."""
    return CliRunner()


@pytest.fixture()
def mock_client(mocker: MockerFixture) -> MagicMock:
    """Patches the Client constructor and returns a MagicMock instance."""
    mock_instance = MagicMock()
    mock_instance.config = Config()
    mock_class = mocker.patch("secryn_cli.cli.Client", return_value=mock_instance)
    mock_class.return_value = mock_instance
    return mock_instance


@pytest.fixture()
def mock_config_funcs(mocker: MockerFixture) -> dict[str, MagicMock]:
    """Mocks config utility functions to prevent real file I/O."""
    mocks: dict[str, MagicMock] = {}
    mocks["load_config"] = mocker.patch(
        "secryn_cli.cli.load_config", return_value=Config()
    )
    mocks["save_config"] = mocker.patch("secryn_cli.cli.save_config")
    mocks["config_path"] = mocker.patch(
        "secryn_cli.cli.config_path", return_value=Path("/tmp/test-config.json")
    )
    mocks["cookie_jar_path"] = mocker.patch(
        "secryn_cli.cli.cookie_jar_path",
        return_value=Path("/tmp/test-cookies.json"),
    )
    return mocks


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------


def _strip(text: str) -> str:
    """Remove ANSI escape sequences from text."""
    import re
    return re.sub(r"\033\[[0-9;]*[a-zA-Z]", "", text)


# ---------------------------------------------------------------------------
# Group-level / Meta commands
# ---------------------------------------------------------------------------


class TestRootGroup:
    """Tests for the top-level CLI group and meta commands."""

    def test_no_args_shows_help(self, runner: CliRunner, mock_config_funcs: dict[str, MagicMock]) -> None:
        """``sc`` with no arguments displays the help text."""
        result = runner.invoke(cli, [])
        assert "Secryn CLI" in _strip(result.output)

    def test_help_flag(self, runner: CliRunner, mock_config_funcs: dict[str, MagicMock]) -> None:
        """``sc --help`` displays the help text."""
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "Secryn CLI" in _strip(result.stdout)

    def test_bad_command_shows_error_and_help(
        self, runner: CliRunner, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``sc badcommand`` prints an error and the command list."""
        result = runner.invoke(cli, ["badcommand"])
        assert "No such command" in _strip(result.output)

    def test_bad_option_shows_error(
        self, runner: CliRunner, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``sc --badflag`` prints a clear error and exits non-zero."""
        result = runner.invoke(cli, ["--badflag"])
        assert result.exit_code != 0
        assert "No such option" in _strip(result.output)

    def test_version_command(
        self, runner: CliRunner, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``sc version`` prints the version string."""
        result = runner.invoke(cli, ["version"])
        assert result.exit_code == 0
        assert f"Secryn CLI v{__version__}" in result.stdout

    def test_config_command(
        self, runner: CliRunner, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``sc config`` displays the current configuration."""
        result = runner.invoke(cli, ["config"])
        assert result.exit_code == 0
        assert "API URL" in _strip(result.stdout)
        assert "Config file" in _strip(result.stdout)

    def test_api_url_option_persists(
        self,
        mocker: MockerFixture,
        mock_config_funcs: dict[str, MagicMock],
    ) -> None:
        """``--api-url`` without a command saves the URL via main()."""
        new_url = "http://custom.example.com/api/v1"
        cfg = Config()
        cfg.api_url = "http://localhost:3000/api/v1"
        mock_config_funcs["load_config"].return_value = cfg
        mocker.patch("sys.argv", ["sc", "--api-url", new_url])
        mocker.patch("secryn_cli.cli.Client")

        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 0
        assert mock_config_funcs["save_config"].call_count >= 1

    def test_config_show_not_logged_in(
        self, runner: CliRunner, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``sc config`` shows '(not logged in)' when no user is stored."""
        result = runner.invoke(cli, ["config"])
        assert "(not logged in)" in _strip(result.stdout)


# ---------------------------------------------------------------------------
# Auth commands
# ---------------------------------------------------------------------------


class TestAuthLogin:
    """Tests for ``sc auth login``."""

    def test_login_success(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Successful login saves email and prints success message."""
        mock_client.post.return_value = {}

        result = runner.invoke(
            cli, ["auth", "login", "--email", "user@example.com", "--password", "secret"]
        )
        assert result.exit_code == 0
        assert "Logged in as user@example.com" in _strip(result.stderr)
        mock_client.post.assert_called_once_with(
            "/auth/login", {"email": "user@example.com", "password": "secret"}
        )
        mock_client.save_config.assert_called_once()

    def test_login_prompts_interactively(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Login without flags prompts for email and password."""
        mock_client.post.return_value = {}
        result = runner.invoke(
            cli, ["auth", "login"], input="prompt@test.com\npassword123\n"
        )
        assert result.exit_code == 0
        assert "Logged in as prompt@test.com" in _strip(result.stderr)

    def test_login_api_error(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Login with bad credentials raises APIError (caught by main)."""
        mock_client.post.side_effect = APIError(401, "Invalid credentials", "UNAUTHORIZED")

        result = runner.invoke(
            cli, ["auth", "login", "--email", "bad@test.com", "--password", "wrong"]
        )
        assert result.exit_code == 1
        assert isinstance(result.exception, APIError)
        assert "Invalid credentials" in str(result.exception)

    def test_login_connection_error(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Login with unreachable server shows error (caught by Exception handler)."""
        mock_client.post.side_effect = ConnectionError("Connection refused")

        result = runner.invoke(
            cli, ["auth", "login", "--email", "user@test.com", "--password", "pass"]
        )
        assert result.exit_code == 1
        assert isinstance(result.exception, ConnectionError)
        assert "Connection refused" in str(result.exception)


class TestAuthLogout:
    """Tests for ``sc auth logout``."""

    def test_logout_success(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Logout clears credentials and prints success."""
        result = runner.invoke(cli, ["auth", "logout"])
        assert result.exit_code == 0
        assert "Logged out successfully" in _strip(result.stderr)
        mock_client.logout.assert_called_once()


class TestAuthWhoami:
    """Tests for ``sc auth whoami``."""

    def test_whoami_success(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Shows the current user identity in a table."""
        mock_client.get.return_value = {
            "id": "user-1",
            "email": "me@example.com",
            "username": "me-user",
        }
        result = runner.invoke(cli, ["auth", "whoami"])
        assert result.exit_code == 0
        assert "me@example.com" in _strip(result.stdout)

    def test_whoami_json_output(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``--json`` outputs raw JSON."""
        mock_client.get.return_value = {
            "id": "user-1",
            "email": "me@example.com",
            "username": "me-user",
        }
        result = runner.invoke(cli, ["auth", "whoami", "--json"])
        assert result.exit_code == 0
        data: dict[str, str] = json.loads(result.stdout)
        assert data["email"] == "me@example.com"

    def test_whoami_api_error(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Whoami with auth failure shows error."""
        mock_client.get.side_effect = APIError(401, "Unauthorized", "UNAUTHORIZED")
        result = runner.invoke(cli, ["auth", "whoami"])
        assert result.exit_code == 1


# ---------------------------------------------------------------------------
# Project commands
# ---------------------------------------------------------------------------


class TestProjectsList:
    """Tests for ``sc projects list``."""

    def test_list_empty(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Empty project list shows info message."""
        mock_client.get.return_value = []
        result = runner.invoke(cli, ["projects", "list"])
        assert result.exit_code == 0
        assert "No projects found" in _strip(result.stderr)

    def test_list_with_projects(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Non-empty list renders a table."""
        mock_client.get.return_value = [
            {
                "id": "p-1",
                "name": "Project Alpha",
                "slug": "alpha",
                "description": "First project",
                "createdAt": "2025-01-01",
            }
        ]
        result = runner.invoke(cli, ["projects", "list"])
        assert result.exit_code == 0
        assert "Project Alpha" in _strip(result.stdout)

    def test_list_json_output(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``--json`` outputs raw JSON."""
        mock_client.get.return_value = [
            {"id": "p-1", "name": "Alpha", "slug": "alpha"}
        ]
        result = runner.invoke(cli, ["projects", "list", "--json"])
        assert result.exit_code == 0
        data: list[dict[str, str]] = json.loads(result.stdout)
        assert data[0]["name"] == "Alpha"


class TestProjectsCreate:
    """Tests for ``sc projects create``."""

    def test_create_success(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Creates a project and prints success."""
        mock_client.post.return_value = {"id": "proj-new", "name": "My Project"}
        result = runner.invoke(
            cli, ["projects", "create", "--name", "My Project", "--description", "Desc"]
        )
        assert result.exit_code == 0
        assert "Project created" in _strip(result.stderr)
        mock_client.post.assert_called_once_with(
            "/projects", {"name": "My Project", "description": "Desc"}
        )

    def test_create_without_description(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Creates a project with name only."""
        mock_client.post.return_value = {"id": "p-1", "name": "Solo"}
        result = runner.invoke(cli, ["projects", "create", "--name", "Solo"])
        assert result.exit_code == 0
        mock_client.post.assert_called_once_with("/projects", {"name": "Solo"})


class TestProjectsDelete:
    """Tests for ``sc projects delete``."""

    def test_delete_aborted(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """User declines confirmation — project is not deleted."""
        result = runner.invoke(cli, ["projects", "delete", "--id", "p-1"], input="n\n")
        assert result.exit_code == 0
        assert "Aborted" in _strip(result.stderr)
        mock_client.delete.assert_not_called()

    def test_delete_force(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``--force`` skips confirmation and deletes immediately."""
        result = runner.invoke(cli, ["projects", "delete", "--id", "p-1", "--force"])
        assert result.exit_code == 0
        assert "deleted" in _strip(result.stderr)
        mock_client.delete.assert_called_once_with("/projects/p-1")

    def test_delete_confirmed(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """User confirms and project is deleted."""
        result = runner.invoke(cli, ["projects", "delete", "--id", "p-2"], input="y\n")
        assert result.exit_code == 0
        mock_client.delete.assert_called_once_with("/projects/p-2")


# ---------------------------------------------------------------------------
# Secret commands
# ---------------------------------------------------------------------------


class TestSecretsList:
    """Tests for ``sc secrets list``."""

    def test_list_empty(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Empty secret list shows info message."""
        mock_client.get.return_value = []
        result = runner.invoke(cli, ["secrets", "list", "--project-id", "proj-1"])
        assert result.exit_code == 0
        assert "No secrets found" in _strip(result.stderr)

    def test_list_with_secrets(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Non-empty list renders a table with masked values."""
        mock_client.get.return_value = [
            {
                "id": "s-1",
                "name": "DATABASE_URL",
                "value": "postgres://user:pass@host/db",
                "notes": "Main DB",
                "updatedAt": "2025-01-01",
            }
        ]
        result = runner.invoke(cli, ["secrets", "list", "--project-id", "proj-1"])
        assert result.exit_code == 0
        assert "DATABASE_URL" in _strip(result.stdout)
        # Value should be masked (not showing the full URL)
        assert "postgres://" not in _strip(result.stdout)

    def test_list_json_output(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``--json`` outputs all secrets as JSON."""
        mock_client.get.return_value = [
            {"id": "s-1", "name": "KEY", "value": "secret-val"}
        ]
        result = runner.invoke(cli, ["secrets", "list", "--project-id", "p1", "--json"])
        assert result.exit_code == 0
        data: list[dict[str, str]] = json.loads(result.stdout)
        assert data[0]["value"] == "secret-val"  # JSON shows full value


class TestSecretsGet:
    """Tests for ``sc secrets get``."""

    def test_get_masked(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Default output masks the value."""
        mock_client.get.return_value = {
            "id": "s-1",
            "name": "API_KEY",
            "value": "sk-1234567890abcdef",
            "notes": "",
            "projectId": "p-1",
            "createdAt": "2025-01-01",
            "updatedAt": "2025-01-01",
        }
        result = runner.invoke(cli, ["secrets", "get", "--id", "s-1"])
        assert result.exit_code == 0
        assert "sk-1234" not in _strip(result.stdout)  # masked
        assert "use --show-value" in _strip(result.stdout)

    def test_get_show_value(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``--show-value`` reveals the plain-text value."""
        mock_client.get.return_value = {
            "id": "s-1",
            "name": "API_KEY",
            "value": "sk-1234567890abcdef",
            "notes": "",
            "projectId": "p-1",
            "createdAt": "2025-01-01",
            "updatedAt": "2025-01-01",
        }
        result = runner.invoke(cli, ["secrets", "get", "--id", "s-1", "--show-value"])
        assert result.exit_code == 0
        assert "sk-1234567890abcdef" in _strip(result.stdout)

    def test_get_json(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``--json`` outputs structured data."""
        mock_client.get.return_value = {
            "id": "s-1",
            "name": "KEY",
            "value": "my-secret",
        }
        result = runner.invoke(cli, ["secrets", "get", "--id", "s-1", "--json"])
        assert result.exit_code == 0
        data: dict[str, str] = json.loads(result.stdout)
        assert data["value"] != "my-secret"  # masked in JSON

    def test_get_json_show_value(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``--json --show-value`` reveals the value."""
        mock_client.get.return_value = {
            "id": "s-1",
            "name": "KEY",
            "value": "my-secret",
        }
        result = runner.invoke(
            cli, ["secrets", "get", "--id", "s-1", "--json", "--show-value"]
        )
        assert result.exit_code == 0
        data: dict[str, str] = json.loads(result.stdout)
        assert data["value"] == "my-secret"

    def test_get_not_found(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Non-existent secret returns an error."""
        mock_client.get.side_effect = APIError(404, "Secret not found", "NOT_FOUND")
        result = runner.invoke(cli, ["secrets", "get", "--id", "missing"])
        assert result.exit_code == 1


class TestSecretsCreate:
    """Tests for ``sc secrets create``."""

    def test_create_success(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Creates a secret and prints confirmation."""
        mock_client.post.return_value = {"id": "s-new", "name": "MY_KEY"}
        result = runner.invoke(
            cli,
            [
                "secrets",
                "create",
                "--project-id", "p-1",
                "--name", "MY_KEY",
                "--value", "secret123",
                "--notes", "Test secret",
            ],
        )
        assert result.exit_code == 0
        assert "Secret created" in _strip(result.stderr)
        mock_client.post.assert_called_once_with(
            "/projects/p-1/secrets",
            {"name": "MY_KEY", "value": "secret123", "notes": "Test secret"},
        )

    def test_create_without_notes(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Creates a secret without optional notes."""
        mock_client.post.return_value = {"id": "s-1", "name": "KEY"}
        result = runner.invoke(
            cli,
            ["secrets", "create", "--project-id", "p-1", "--name", "KEY", "--value", "val"],
        )
        assert result.exit_code == 0
        assert "notes" not in mock_client.post.call_args[0][1]


class TestSecretsUpdate:
    """Tests for ``sc secrets update``."""

    def test_update_success(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Updates a secret's value."""
        mock_client.put.return_value = {"id": "s-1"}
        result = runner.invoke(
            cli, ["secrets", "update", "--id", "s-1", "--value", "new-value"]
        )
        assert result.exit_code == 0
        assert "updated" in _strip(result.stderr)
        mock_client.put.assert_called_once_with(
            "/projects/secrets/s-1", {"value": "new-value"}
        )

    def test_update_no_fields(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """No fields provided — shows info and does nothing."""
        result = runner.invoke(cli, ["secrets", "update", "--id", "s-1"])
        assert result.exit_code == 0
        assert "No fields to update" in _strip(result.stderr)
        mock_client.put.assert_not_called()

    def test_update_clear_notes(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Passing ``--notes \"\"`` clears the notes field."""
        mock_client.put.return_value = {"id": "s-1"}
        result = runner.invoke(
            cli, ["secrets", "update", "--id", "s-1", "--notes", ""]
        )
        assert result.exit_code == 0
        mock_client.put.assert_called_once_with(
            "/projects/secrets/s-1", {"notes": ""}
        )


class TestSecretsDelete:
    """Tests for ``sc secrets delete``."""

    def test_delete_aborted(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """User declines confirmation."""
        result = runner.invoke(cli, ["secrets", "delete", "--id", "s-1"], input="n\n")
        assert result.exit_code == 0
        assert "Aborted" in _strip(result.stderr)

    def test_delete_force(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``--force`` deletes immediately."""
        result = runner.invoke(cli, ["secrets", "delete", "--id", "s-1", "--force"])
        assert result.exit_code == 0
        mock_client.delete.assert_called_once_with("/projects/secrets/s-1")


class TestSecretsExport:
    """Tests for ``sc secrets export``."""

    def test_export_stdout(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Exports secrets to stdout."""
        mock_client.get_raw.return_value = "KEY=value\nSECRET=abc"
        result = runner.invoke(cli, ["secrets", "export", "--project-id", "p-1"])
        assert result.exit_code == 0
        assert "KEY=value" in result.stdout

    def test_export_to_file(
        self,
        runner: CliRunner,
        mock_client: MagicMock,
        mock_config_funcs: dict[str, MagicMock],
        tmp_path: Path,
    ) -> None:
        """Exports secrets to a specified file."""
        output_file = tmp_path / "secrets.env"
        mock_client.get_raw.return_value = "KEY=val"
        result = runner.invoke(
            cli,
            ["secrets", "export", "--project-id", "p-1", "--output", str(output_file)],
        )
        assert result.exit_code == 0
        assert output_file.read_text() == "KEY=val"


# ---------------------------------------------------------------------------
# API Key commands
# ---------------------------------------------------------------------------


class TestApiKeysList:
    """Tests for ``sc api-keys list``."""

    def test_list_empty(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Empty list shows info message."""
        mock_client.get.return_value = []
        result = runner.invoke(cli, ["api-keys", "list"])
        assert result.exit_code == 0
        assert "No API keys found" in _strip(result.stderr)

    def test_list_with_keys(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Non-empty list renders a table."""
        mock_client.get.return_value = [
            {
                "id": "ak-1",
                "keyName": "CI Key",
                "isActive": True,
                "permissions": ["read", "write"],
                "createdAt": "2025-01-01",
                "expiresAt": "2026-01-01",
            }
        ]
        result = runner.invoke(cli, ["api-keys", "list"])
        assert result.exit_code == 0
        assert "CI Key" in _strip(result.stdout)
        assert "active" in _strip(result.stdout)

    def test_list_json_output(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``--json`` outputs raw JSON."""
        mock_client.get.return_value = [
            {"id": "ak-1", "keyName": "My Key", "isActive": False, "permissions": ["read"]}
        ]
        result = runner.invoke(cli, ["api-keys", "list", "--json"])
        assert result.exit_code == 0
        data: list[dict[str, Any]] = json.loads(result.stdout)
        assert data[0]["keyName"] == "My Key"

    def test_list_inactive_key(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Inactive key shows 'inactive' status."""
        mock_client.get.return_value = [
            {
                "id": "ak-1",
                "keyName": "Old Key",
                "isActive": False,
                "permissions": [],
                "createdAt": "",
                "expiresAt": "",
            }
        ]
        result = runner.invoke(cli, ["api-keys", "list"])
        assert "inactive" in _strip(result.stdout)


class TestApiKeysCreate:
    """Tests for ``sc api-keys create``."""

    def test_create_success(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Creates an API key and displays the key value."""
        mock_client.post.return_value = {
            "id": "ak-new",
            "key": "sc_abcdef1234567890",
            "permissions": ["read", "write"],
            "keyName": "My Key",
        }
        result = runner.invoke(cli, ["api-keys", "create", "--name", "My Key"])
        assert result.exit_code == 0
        assert "Save this key" in _strip(result.stdout)
        assert "sc_abcdef1234567890" in _strip(result.stdout)
        mock_client.post.assert_called_once_with(
            "/api-keys", {"name": "My Key", "permissions": ["read", "write"]}
        )

    def test_create_custom_permissions(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Custom permission string is parsed correctly."""
        mock_client.post.return_value = {
            "id": "ak-1",
            "key": "sc_xxxx",
            "permissions": ["read"],
            "keyName": "RO Key",
        }
        result = runner.invoke(
            cli, ["api-keys", "create", "--name", "RO Key", "--permissions", "read"]
        )
        assert result.exit_code == 0
        mock_client.post.assert_called_once_with(
            "/api-keys", {"name": "RO Key", "permissions": ["read"]}
        )


class TestApiKeysDelete:
    """Tests for ``sc api-keys delete``."""

    def test_delete_aborted(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """User declines confirmation."""
        result = runner.invoke(cli, ["api-keys", "delete", "--id", "ak-1"], input="n\n")
        assert result.exit_code == 0
        assert "Aborted" in _strip(result.stderr)

    def test_delete_force(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``--force`` deletes immediately."""
        result = runner.invoke(cli, ["api-keys", "delete", "--id", "ak-1", "--force"])
        assert result.exit_code == 0
        mock_client.delete.assert_called_once_with("/api-keys/ak-1")


# ---------------------------------------------------------------------------
# User commands
# ---------------------------------------------------------------------------


class TestUserInfo:
    """Tests for ``sc user info``."""

    def test_info_success(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """Displays user profile in a table."""
        mock_client.get.return_value = {
            "id": "u-1",
            "email": "user@example.com",
            "username": "the-user",
            "role": "admin",
            "createdAt": "2025-01-01",
        }
        result = runner.invoke(cli, ["user", "info"])
        assert result.exit_code == 0
        assert "user@example.com" in _strip(result.stdout)
        assert "admin" in _strip(result.stdout)

    def test_info_saves_config(
        self, runner: CliRunner, mock_client: MagicMock, mock_config_funcs: dict[str, MagicMock]
    ) -> None:
        """``user info`` persists user identity to config."""
        mock_client.get.return_value = {
            "id": "u-2",
            "email": "u2@example.com",
            "username": "",
            "role": "member",
            "createdAt": "",
        }
        runner.invoke(cli, ["user", "info"])
        mock_client.save_config.assert_called_once()


# ---------------------------------------------------------------------------
# main() wrapper — system-level edge cases
# ---------------------------------------------------------------------------


class TestMainEntryPoint:
    """Tests for the ``main()`` entry point that wraps the CLI group."""

    def test_main_handles_system_exit(self, mocker: MockerFixture) -> None:
        """``main()`` exits cleanly when Click raises ``SystemExit``."""
        mocker.patch("sys.argv", ["sc", "version"])
        mocker.patch("secryn_cli.cli.load_config", return_value=Config())
        mocker.patch("secryn_cli.cli.save_config")
        mocker.patch("secryn_cli.cli.config_path", return_value=Path("/tmp/test-cfg.json"))
        mocker.patch(
            "secryn_cli.cli.cookie_jar_path", return_value=Path("/tmp/test-ck.json")
        )
        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 0

    def test_main_catches_api_error(self, mocker: MockerFixture) -> None:
        """``main()`` exits with code 1 on APIError."""
        mocker.patch("sys.argv", ["sc", "auth", "whoami"])
        mocker.patch("secryn_cli.cli.load_config", return_value=Config())
        mocker.patch("secryn_cli.cli.save_config")
        mocker.patch("secryn_cli.cli.config_path", return_value=Path("/tmp/test-cfg.json"))
        mocker.patch(
            "secryn_cli.cli.cookie_jar_path", return_value=Path("/tmp/test-ck.json")
        )

        mock_cls = mocker.patch("secryn_cli.cli.Client")
        mock_inst = MagicMock()
        mock_inst.get.side_effect = APIError(401, "Not authenticated", "UNAUTHORIZED")
        mock_cls.return_value = mock_inst

        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 1
