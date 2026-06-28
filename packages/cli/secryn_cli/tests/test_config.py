"""Tests for the Secryn CLI configuration module."""

from __future__ import annotations

import json
import os
from pathlib import Path

from pytest_mock import MockerFixture

from secryn_cli.config import (
    Config,
    clear_cookies,
    config_dir,
    config_path,
    cookie_jar_path,
    load_config,
    load_cookies,
    save_config,
    save_cookies,
)


class TestConfigDir:
    """Tests for config_dir resolution."""

    def test_uses_secryn_home_env_var(self, mocker: MockerFixture) -> None:
        mocker.patch.dict(os.environ, {"SECRYN_HOME": "/custom/secryn/path"}, clear=True)

        result = config_dir()

        assert result == Path("/custom/secryn/path")

    def test_uses_xdg_config_home(self, mocker: MockerFixture) -> None:
        env: dict[str, str] = {"XDG_CONFIG_HOME": "/home/user/.local/config"}
        mocker.patch.dict(os.environ, env, clear=True)

        result = config_dir()

        assert result == Path("/home/user/.local/config/secryn")

    def test_defaults_to_dot_config(self, mocker: MockerFixture) -> None:
        mocker.patch.dict(os.environ, {}, clear=True)

        result = config_dir()

        assert result == Path.home() / ".config" / "secryn"


class TestConfigPaths:
    """Tests for config_path and cookie_jar_path."""

    def test_config_path(self, mocker: MockerFixture) -> None:
        mocker.patch.dict(os.environ, {"SECRYN_HOME": "/tmp/testsecryn"}, clear=True)

        result = config_path()

        assert result == Path("/tmp/testsecryn/config.json")

    def test_cookie_jar_path(self, mocker: MockerFixture) -> None:
        mocker.patch.dict(os.environ, {"SECRYN_HOME": "/tmp/testsecryn"}, clear=True)

        result = cookie_jar_path()

        assert result == Path("/tmp/testsecryn/cookies.json")


class TestConfigDefaults:
    """Tests for Config class defaults."""

    def test_default_api_url(self) -> None:
        cfg = Config()
        assert cfg.api_url == "http://localhost:3000/api/v1"

    def test_default_user_fields_are_none(self) -> None:
        cfg = Config()
        assert cfg.user_id is None
        assert cfg.user_email is None

    def test_default_version(self) -> None:
        cfg = Config()
        assert cfg.version == "0.1.1"

    def test_user_agent_property(self) -> None:
        cfg = Config()
        assert cfg.user_agent == "secryn-cli/0.1.1"


class TestLoadSaveConfig:
    """Tests for load_config and save_config round-trip."""

    def test_load_returns_defaults_when_no_file(self, mocker: MockerFixture, tmp_path: Path) -> None:
        mocker.patch("secryn_cli.config.config_dir", return_value=tmp_path)
        mocker.patch("secryn_cli.config.config_path", return_value=tmp_path / "config.json")

        cfg = load_config()

        assert cfg.api_url == "http://localhost:3000/api/v1"
        assert cfg.user_id is None

    def test_save_and_load_round_trip(self, tmp_path: Path) -> None:
        cfg = Config()
        cfg.api_url = "https://api.secryn.xyz/api/v1"
        cfg.user_id = "user-42"
        cfg.user_email = "user@secryn.xyz"

        def fake_config_dir() -> Path:
            return tmp_path

        def fake_config_path() -> Path:
            return tmp_path / "config.json"

        import secryn_cli.config as config_mod

        mocker_orig_dir = config_mod.config_dir
        mocker_orig_path = config_mod.config_path

        config_mod.config_dir = fake_config_dir  # type: ignore[assignment]
        config_mod.config_path = fake_config_path  # type: ignore[assignment]

        try:
            save_config(cfg)

            assert (tmp_path / "config.json").exists()

            data = json.loads((tmp_path / "config.json").read_text())
            assert data["api_url"] == "https://api.secryn.xyz/api/v1"
            assert data["user_id"] == "user-42"
            assert data["user_email"] == "user@secryn.xyz"
        finally:
            config_mod.config_dir = mocker_orig_dir
            config_mod.config_path = mocker_orig_path

    def test_load_handles_malformed_json(self, mocker: MockerFixture, tmp_path: Path) -> None:
        (tmp_path / "config.json").write_text("not valid json")
        mocker.patch("secryn_cli.config.config_dir", return_value=tmp_path)
        mocker.patch("secryn_cli.config.config_path", return_value=tmp_path / "config.json")

        cfg = load_config()

        assert cfg.api_url == "http://localhost:3000/api/v1"


class TestLoadSaveCookies:
    """Tests for load_cookies, save_cookies and clear_cookies."""

    def test_load_returns_none_when_no_file(
        self, mocker: MockerFixture, tmp_path: Path
    ) -> None:
        path = tmp_path / "cookies.json"
        mocker.patch("secryn_cli.config.cookie_jar_path", return_value=path)

        result = load_cookies()

        assert result is None

    def test_save_and_load_cookies_round_trip(
        self, mocker: MockerFixture, tmp_path: Path
    ) -> None:
        path = tmp_path / "cookies.json"
        mocker.patch("secryn_cli.config.cookie_jar_path", return_value=path)
        mocker.patch("secryn_cli.config.config_dir", return_value=tmp_path)

        cookies: list[dict[str, object]] = [
            {"name": "jwt", "value": "token123", "domain": "localhost", "path": "/", "expires": None, "secure": True}
        ]
        save_cookies(cookies)

        assert path.exists()
        result = load_cookies()
        assert result is not None
        assert result[0]["name"] == "jwt"
        assert result[0]["value"] == "token123"

    def test_load_returns_none_for_malformed_json(
        self, mocker: MockerFixture, tmp_path: Path
    ) -> None:
        path = tmp_path / "cookies.json"
        path.write_text("not json")
        mocker.patch("secryn_cli.config.cookie_jar_path", return_value=path)

        result = load_cookies()

        assert result is None

    def test_clear_cookies_removes_file(
        self, mocker: MockerFixture, tmp_path: Path
    ) -> None:
        path = tmp_path / "cookies.json"
        path.write_text('{"name": "jwt"}')
        mocker.patch("secryn_cli.config.cookie_jar_path", return_value=path)

        clear_cookies()

        assert not path.exists()

    def test_clear_cookies_handles_missing_file(
        self, mocker: MockerFixture, tmp_path: Path
    ) -> None:
        path = tmp_path / "cookies.json"
        mocker.patch("secryn_cli.config.cookie_jar_path", return_value=path)

        clear_cookies()  # should not raise

        assert not path.exists()
