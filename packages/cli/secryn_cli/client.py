"""HTTP client for the Secryn API.

Manages authentication cookies, request serialisation, and error handling.
"""

import json
from typing import Any, Optional
from urllib.parse import urljoin

import requests

from .config import Config, clear_cookies, load_cookies, save_cookies


class APIError(Exception):
    """Raised when the Secryn API returns a non-2xx status code.

    Attributes:
        status_code: HTTP status code returned by the server.
        message: Human-readable error description.
        code: Machine-readable error identifier.
        details: Optional structured context (e.g. validation errors).
    """

    def __init__(
        self,
        status_code: int,
        message: str,
        code: str = "",
        details: Any = None,
    ) -> None:
        self.status_code = status_code
        self.message = message
        self.code = code
        self.details = details
        super().__init__(message)

    def __str__(self) -> str:
        if self.details:
            return f"{self.message} ({self.code}): {self.details}"
        return f"{self.message} ({self.code})"


class Client:
    """Low-level HTTP client that talks to the Secryn API.

    Automatically persists and restores authentication cookies between
    invocations so that a login survives across CLI sessions.

    Args:
        config: The CLI configuration object holding the API base URL
            and user metadata.
    """

    def __init__(self, config: Config) -> None:
        self.config = config
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": config.user_agent,
            }
        )

        cookies = load_cookies()
        if cookies:
            for cookie in cookies:
                self.session.cookies.set(
                    cookie["name"],
                    cookie["value"],
                    domain=cookie.get("domain", ""),
                    path=cookie.get("path", "/"),
                )

    def _url(self, path: str) -> str:
        """Resolve an API path against the configured base URL."""
        return urljoin(self.config.api_url.rstrip("/") + "/", path.lstrip("/"))

    def _persist_cookies(self) -> None:
        """Write the current session cookies to disk for future reuse."""
        cookies = []
        for cookie in self.session.cookies:
            cookies.append(
                {
                    "name": cookie.name,
                    "value": cookie.value,
                    "domain": cookie.domain,
                    "path": cookie.path,
                    "expires": cookie.expires,
                    "secure": cookie.secure,
                }
            )
        save_cookies(cookies)

    def _request(
        self,
        method: str,
        path: str,
        body: Optional[dict] = None,
        raw: bool = False,
    ) -> Any:
        """Execute an HTTP request against the API.

        Args:
            method: HTTP method (``GET``, ``POST``, ``PUT``, ``DELETE``).
            path: API path relative to the base URL.
            body: Optional JSON-serialisable request body.
            raw: When ``True``, returns the raw response text instead of
                parsing JSON.

        Returns:
            Parsed JSON response body, raw response text, or ``None`` for
            204 No Content.

        Raises:
            APIError: The server returned a 4xx or 5xx status code.
        """
        url = self._url(path)
        kwargs: dict = {}
        if body is not None:
            kwargs["json"] = body

        resp = self.session.request(method, url, **kwargs)
        self._persist_cookies()

        if raw:
            if resp.status_code >= 400:
                try:
                    err = resp.json()
                    raise APIError(
                        resp.status_code,
                        err.get("message", resp.text),
                        err.get("code", ""),
                        err.get("details"),
                    )
                except (json.JSONDecodeError, ValueError):
                    raise APIError(resp.status_code, resp.text)
            return resp.text

        if resp.status_code == 204 or not resp.text.strip():
            if resp.status_code >= 400:
                raise APIError(resp.status_code, "Request failed", str(resp.status_code))
            return None

        try:
            data = resp.json()
        except (json.JSONDecodeError, ValueError):
            if resp.status_code >= 400:
                raise APIError(resp.status_code, resp.text)
            return resp.text

        if resp.status_code >= 400:
            raise APIError(
                resp.status_code,
                data.get("message", "Request failed"),
                data.get("code", ""),
                data.get("details"),
            )

        return data

    def get(self, path: str) -> Any:
        """Send a GET request to ``path`` and return the parsed JSON body."""
        return self._request("GET", path)

    def post(self, path: str, body: Optional[dict] = None) -> Any:
        """Send a POST request to ``path`` with an optional JSON body."""
        return self._request("POST", path, body)

    def put(self, path: str, body: Optional[dict] = None) -> Any:
        """Send a PUT request to ``path`` with an optional JSON body."""
        return self._request("PUT", path, body)

    def delete(self, path: str) -> Any:
        """Send a DELETE request to ``path``."""
        return self._request("DELETE", path)

    def get_raw(self, path: str) -> str:
        """Send a GET request to ``path`` and return the raw response text.

        Used for endpoints that return non-JSON content (e.g. ``.env`` export).
        """
        result = self._request("GET", path, raw=True)
        return result if result is not None else ""

    def save_config(self) -> None:
        """Persist the CLI configuration to disk."""
        from .config import save_config as _save_config

        _save_config(self.config)

    def logout(self) -> None:
        """Log out and clear all locally stored credentials.

        Attempts to notify the server, then removes the cookie jar and
        resets user identity fields.
        """
        try:
            self.post("/auth/logout")
        except Exception:
            pass
        clear_cookies()
        self.config.user_id = None
        self.config.user_email = None
        self.save_config()
