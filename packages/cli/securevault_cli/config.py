"""Configuration management for the SecureVault CLI.

Stores API URL, user identity, and persisted cookies under
``~/.config/securevault/`` (or the platform-appropriate equivalent).
"""

import json
import os
import platform
from pathlib import Path
from typing import Optional

APP_NAME = "securevault"
API_BASE_PATH = "/api/v1"


def config_dir() -> Path:
    """Return the platform-specific configuration directory.

    Resolution order:
      1. ``SECUREVAULT_HOME`` environment variable.
      2. Windows: ``%APPDATA%\\securevault``.
      3. Linux/macOS: ``$XDG_CONFIG_HOME/securevault`` or
         ``~/.config/securevault``.

    Returns:
        Absolute path to the configuration directory.
    """
    env_home = os.environ.get("SECUREVAULT_HOME")
    if env_home:
        return Path(env_home)

    if platform.system() == "Windows":
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
        return base / APP_NAME

    xdg = os.environ.get("XDG_CONFIG_HOME", "")
    if xdg:
        return Path(xdg) / APP_NAME

    return Path.home() / ".config" / APP_NAME


def config_path() -> Path:
    """Return the path to the main configuration file (``config.json``)."""
    return config_dir() / "config.json"


def cookie_jar_path() -> Path:
    """Return the path to the persisted cookie jar (``cookies.json``)."""
    return config_dir() / "cookies.json"


class Config:
    """In-memory representation of the CLI configuration.

    Attributes:
        api_url: Base URL of the SecureVault API including the ``/api/v1`` prefix.
        user_id: ID of the currently authenticated user, if any.
        user_email: Email of the currently authenticated user, if any.
        version: CLI version string.
    """

    def __init__(self) -> None:
        self.api_url: str = f"http://localhost:3000{API_BASE_PATH}"
        self.user_id: Optional[str] = None
        self.user_email: Optional[str] = None
        self.version: str = "0.1.0"

    @property
    def user_agent(self) -> str:
        """``User-Agent`` header value sent with every API request."""
        return f"securevault-cli/{self.version}"


def load_config() -> Config:
    """Load configuration from disk, falling back to defaults.

    Creates the config directory with restricted permissions if it does
    not exist yet.

    Returns:
        A ``Config`` instance populated with stored values or defaults.
    """
    cfg = Config()

    config_dir().mkdir(parents=True, exist_ok=True)
    config_dir().chmod(0o700)

    path = config_path()
    if not path.exists():
        return cfg

    try:
        data = json.loads(path.read_text())
        cfg.api_url = data.get("api_url", cfg.api_url)
        cfg.user_id = data.get("user_id")
        cfg.user_email = data.get("user_email")
        cfg.version = data.get("version", cfg.version)
    except (json.JSONDecodeError, ValueError):
        pass

    return cfg


def save_config(cfg: Config) -> None:
    """Persist the current configuration to disk.

    Writes ``config.json`` with mode ``0600`` inside the config directory.

    Args:
        cfg: The ``Config`` instance to persist.
    """
    config_dir().mkdir(parents=True, exist_ok=True)
    config_dir().chmod(0o700)

    data = {
        "api_url": cfg.api_url,
        "user_id": cfg.user_id,
        "user_email": cfg.user_email,
        "version": cfg.version,
    }
    config_path().write_text(json.dumps(data, indent=2))
    config_path().chmod(0o600)


def load_cookies() -> Optional[dict]:
    """Load persisted session cookies from disk.

    Returns:
        A dictionary of serialized cookies, or ``None`` if no cookie
        jar exists or it is unreadable.
    """
    path = cookie_jar_path()
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, ValueError):
        return None


def save_cookies(data: dict) -> None:
    """Persist session cookies to disk.

    Writes ``cookies.json`` with mode ``0600`` inside the config directory.

    Args:
        data: Serialized cookie dictionary.
    """
    config_dir().mkdir(parents=True, exist_ok=True)
    config_dir().chmod(0o700)
    cookie_jar_path().write_text(json.dumps(data, indent=2))
    cookie_jar_path().chmod(0o600)


def clear_cookies() -> None:
    """Remove the persisted cookie jar from disk, if it exists."""
    path = cookie_jar_path()
    if path.exists():
        path.unlink()
