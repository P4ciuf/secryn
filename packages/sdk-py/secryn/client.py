"""Secryn API client — full coverage of the Secryn REST API.

Supports both cookie-based authentication (after login) and API-key
authentication for programmatic access.
"""

from typing import Any, List, Optional
from urllib.parse import urljoin

import requests

from .errors import SecrynApiError


class _RequestMixin:
    """Internal mixin that provides the low-level HTTP transport."""

    def _url(self, path: str) -> str:
        """Build an absolute URL by joining the base URL with a relative path.

        Normalises the base URL to always end with a single ``/`` and strips
        any leading ``/`` from the path so that :func:`urljoin` produces a
        predictable result regardless of caller formatting.

        Args:
            path: Relative API path (e.g. ``/projects/1``).

        Returns:
            Fully-qualified URL string.
        """
        base = self.base_url.rstrip("/") + "/"  # type: ignore[attr-defined]
        return urljoin(base, path.lstrip("/"))

    def _request(
        self,
        method: str,
        path: str,
        body: Optional[dict] = None,
        raw: bool = False,
    ) -> Any:
        """Execute an HTTP request against the Secryn API and handle the response.

        Decision order for response handling:
        1. If ``raw=True``, return the response body as plain text (still
           raises on >=400).
        2. If the status is 204 No Content or the body is empty, return
           ``None`` (but still raise on >=400 with a best-effort message).
        3. Attempt to parse the body as JSON; if parsing fails and the status
           is >=400, raise with the raw text. On success with a non-JSON body,
           return the plain text.
        4. If status is >=400 and JSON was parsed, raise
           :exc:`SecrynApiError` using the structured error fields from the
           API response (``message``, ``code``, ``details``).
        5. Otherwise return the parsed JSON data.

        Args:
            method: HTTP method (``GET``, ``POST``, ``PUT``, ``DELETE``).
            path: Relative API path.
            body: Optional JSON-serializable request body.
            raw: If ``True``, return the response text directly instead of
                attempting JSON parsing.

        Returns:
            Parsed JSON data, plain text (when ``raw``), or ``None`` for
            empty/204 responses.

        Raises:
            SecrynApiError: When the API responds with a status >=400.
        """
        url = self._url(path)
        kwargs: dict = {}
        if body is not None:
            kwargs["json"] = body

        resp = self.session.request(method, url, **kwargs)  # type: ignore[attr-defined]

        if raw:
            if resp.status_code >= 400:
                self._raise_error(resp)
            return resp.text

        if resp.status_code == 204 or not resp.text.strip():
            if resp.status_code >= 400:
                raise SecrynApiError("Request failed", resp.status_code, str(resp.status_code))
            return None

        try:
            data = resp.json()
        except ValueError:
            if resp.status_code >= 400:
                raise SecrynApiError(resp.text, resp.status_code)
            return resp.text

        if resp.status_code >= 400:
            raise SecrynApiError(
                data.get("message", "Request failed"),
                resp.status_code,
                data.get("code", ""),
                data.get("details"),
            )

        return data

    def _raise_error(self, resp: requests.Response) -> None:
        """Extract structured error information from a response and raise.

        Attempts to parse the response body as JSON first; falls back to the
        raw response text if parsing fails.

        Args:
            resp: The :class:`requests.Response` object with status >=400.

        Raises:
            SecrynApiError: Always — this is a terminal handler for error
                responses.
        """
        try:
            data = resp.json()
            raise SecrynApiError(
                data.get("message", resp.text),
                resp.status_code,
                data.get("code", ""),
                data.get("details"),
            )
        except (ValueError, KeyError):
            raise SecrynApiError(resp.text, resp.status_code)

    def _get(self, path: str) -> Any:
        return self._request("GET", path)

    def _post(self, path: str, body: Optional[dict] = None) -> Any:
        return self._request("POST", path, body)

    def _put(self, path: str, body: Optional[dict] = None) -> Any:
        return self._request("PUT", path, body)

    def _delete(self, path: str) -> Any:
        return self._request("DELETE", path)


class _AuthProxy:
    """Proxy providing auth-related API methods."""

    def __init__(self, client: "SecrynClient") -> None:
        self._client = client

    def login(self, email: str, password: str) -> Any:
        return self._client._post("/auth/login", {"email": email, "password": password})

    def register(self, email: str, password: str, username: Optional[str] = None) -> Any:
        body: dict = {"email": email, "password": password}
        if username:
            body["username"] = username
        return self._client._post("/auth/register", body)

    def logout(self) -> None:
        """Send a logout request and unconditionally clear the local session.

        The cookie jar is cleared inside a ``finally`` block so that even if
        the server returns an error the local session is still discarded.
        """
        try:
            self._client._post("/auth/logout")
        finally:
            self._client.session.cookies.clear()

    def refresh(self) -> None:
        self._client._post("/auth/refresh")

    def forgot_password(self, email: str) -> Any:
        return self._client._post("/auth/forgot-password", {"email": email})

    def reset_password(self, token: str, password: str) -> Any:
        return self._client._post("/auth/reset-password", {"token": token, "password": password})


class _MFAProxy:
    """Proxy providing MFA-related API methods."""

    def __init__(self, client: "SecrynClient") -> None:
        self._client = client

    def setup(self) -> Any:
        return self._client._get("/auth/mfa/setup")

    def enable(self, token: str) -> Any:
        return self._client._post("/auth/mfa/enable", {"token": token})

    def disable(self) -> Any:
        return self._client._post("/auth/mfa/disable")

    def confirm(self, token: str, mfa_token: str) -> Any:
        return self._client._post("/auth/mfa/confirm", {"token": token, "mfaToken": mfa_token})

    def recovery(self, code: str, mfa_token: str) -> Any:
        return self._client._post("/auth/mfa/recovery", {"code": code, "mfaToken": mfa_token})

    def recovery_codes(self) -> Any:
        return self._client._get("/auth/mfa/recovery-codes")

    def regenerate_codes(self) -> Any:
        return self._client._post("/auth/mfa/recovery-codes/regenerate")

    def send_backup_code(self, email: str) -> Any:
        return self._client._post("/auth/mfa/send-backup-code", {"email": email})

    def status(self) -> Any:
        return self._client._get("/auth/mfa/status")


class _UsersProxy:
    """Proxy providing user-related API methods."""

    def __init__(self, client: "SecrynClient") -> None:
        self._client = client

    def me(self) -> Any:
        return self._client._get("/users/@me")

    def get(self, user_id: str) -> Any:
        return self._client._get(f"/users/{user_id}")

    def update(self, **kwargs: Any) -> Any:
        return self._client._put("/users", kwargs)

    def delete(self) -> None:
        self._client._delete("/users")


class _ApiKeysProxy:
    """Proxy providing API-key-related API methods."""

    def __init__(self, client: "SecrynClient") -> None:
        self._client = client

    def create(self, name: str, permissions: Optional[List[str]] = None) -> Any:
        body: dict = {"name": name}
        if permissions:
            body["permissions"] = permissions
        return self._client._post("/api-keys", body)

    def list(self) -> Any:
        return self._client._get("/api-keys/@all-user")

    def get(self, key_id: str) -> Any:
        return self._client._get(f"/api-keys/{key_id}")

    def update(self, key_id: str, **kwargs: Any) -> Any:
        return self._client._put(f"/api-keys/{key_id}", kwargs)

    def delete(self, key_id: str) -> None:
        self._client._delete(f"/api-keys/{key_id}")


class _ProjectsProxy:
    """Proxy providing project-related API methods."""

    def __init__(self, client: "SecrynClient") -> None:
        self._client = client

    def create(self, name: str, description: Optional[str] = None) -> Any:
        body: dict = {"name": name}
        if description:
            body["description"] = description
        return self._client._post("/projects", body)

    def list(self) -> Any:
        return self._client._get("/projects/@all")

    def get(self, project_id: str) -> Any:
        return self._client._get(f"/projects/{project_id}")

    def update(self, project_id: str, **kwargs: Any) -> Any:
        return self._client._put(f"/projects/{project_id}", kwargs)

    def delete(self, project_id: str) -> None:
        self._client._delete(f"/projects/{project_id}")

    def transfer(self, project_id: str, new_owner_id: str) -> Any:
        return self._client._post(
            f"/projects/{project_id}/transfer",
            {"newOwnerId": new_owner_id},
        )


class _InvitesProxy:
    """Proxy providing project-invitation API methods."""

    def __init__(self, client: "SecrynClient") -> None:
        self._client = client

    def create(self, project_id: str, email: Optional[str] = None) -> Any:
        body: dict = {}
        if email:
            body["email"] = email
        # body or None: send None (no body) when no email is provided,
        # so the server creates an open invite that anyone can accept.
        return self._client._post(f"/projects/{project_id}/invites", body or None)

    def accept(self, slug: str) -> Any:
        """Accept a project invitation by its slug.

        Uses ``GET`` instead of ``POST`` because the server identifies the
        invite via a unique URL slug and does not require a request body.
        """
        return self._client._get(f"/projects/invites/{slug}")


class _MembersProxy:
    """Proxy providing project-member API methods."""

    def __init__(self, client: "SecrynClient") -> None:
        self._client = client

    def remove(self, project_id: str, member_id: str) -> None:
        self._client._delete(f"/projects/{project_id}/members/{member_id}")

    def add_permissions(self, project_id: str, member_id: str, permissions: List[str]) -> Any:
        return self._client._post(
            f"/projects/{project_id}/members/{member_id}/permissions",
            {"permissions": permissions},
        )

    def remove_permissions(self, project_id: str, member_id: str, permissions: List[str]) -> Any:
        # Uses raw _request instead of _delete because the DELETE endpoint
        # accepts a JSON body listing the permissions to remove.
        self._client._request(
            "DELETE",
            f"/projects/{project_id}/members/{member_id}/permissions",
            {"permissions": permissions},
        )


class _SecretsProxy:
    """Proxy providing secret-related API methods."""

    def __init__(self, client: "SecrynClient") -> None:
        self._client = client

    def create(
        self,
        project_id: str,
        name: str,
        value: str,
        notes: Optional[str] = None,
    ) -> Any:
        body: dict = {"name": name, "value": value}
        if notes:
            body["notes"] = notes
        return self._client._post(f"/projects/{project_id}/secrets", body)

    def get(self, secret_id: str) -> Any:
        return self._client._get(f"/projects/secrets/{secret_id}")

    def list(self, project_id: str) -> Any:
        return self._client._get(f"/projects/{project_id}/secrets")

    def update(self, secret_id: str, **kwargs: Any) -> Any:
        return self._client._put(f"/projects/secrets/{secret_id}", kwargs)

    def delete(self, secret_id: str) -> None:
        self._client._delete(f"/projects/secrets/{secret_id}")

    def export_dotenv(self, project_id: str) -> str:
        """Export project secrets as a dotenv-formatted string.

        Uses raw mode to prevent JSON parsing of the ``.env`` payload.
        Falls back to an empty string when the response body is ``None``
        (e.g. a 204 No Content from an empty project).
        """
        result = self._client._request("GET", f"/projects/{project_id}/secrets/export", raw=True)
        return result if result is not None else ""


class SecrynClient(_RequestMixin):
    """HTTP client for the full Secryn REST API.

    Supports both cookie-based authentication (via ``auth.login``) and
    API-key authentication (pass ``api_key`` to the constructor).

    Args:
        base_url: Base URL of the Secryn API including the ``/api/v1`` prefix.
        api_key: Optional API key for programmatic access.

    Example:

        # Cookie-based
        client = SecrynClient()
        client.auth.login("user@example.com", "password")
        secrets = client.secrets.list("project-id")

        # API-key-based
        client = SecrynClient(api_key="sk-...")
        secret = client.secrets.get("secret-id")
    """

    def __init__(
        self,
        base_url: str = "https://secryn.xyz/api/v1",
        api_key: Optional[str] = None,
        user_agent: str = "secryn-sdk-python/1.0.0",
    ) -> None:
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": user_agent,
            }
        )
        if api_key:
            self.session.headers["api-key"] = api_key

        # Proxies for API resource groups
        self.auth = _AuthProxy(self)
        self.mfa = _MFAProxy(self)
        self.users = _UsersProxy(self)
        self.api_keys = _ApiKeysProxy(self)
        self.projects = _ProjectsProxy(self)
        self.invites = _InvitesProxy(self)
        self.members = _MembersProxy(self)
        self.secrets = _SecretsProxy(self)
