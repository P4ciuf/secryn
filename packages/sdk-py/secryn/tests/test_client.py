"""Tests for the Secryn Python SDK client — all proxy groups and error handling."""

from __future__ import annotations

from typing import Any, Dict, Optional
from unittest.mock import MagicMock

import pytest
import requests
from pytest_mock import MockerFixture

from secryn.client import (
    SecrynClient,
    _ApiKeysProxy,
    _AuthProxy,
    _InvitesProxy,
    _MembersProxy,
    _MFAProxy,
    _ProjectsProxy,
    _SecretsProxy,
    _UsersProxy,
)
from secryn.errors import SecrynApiError


# ---------------------------------------------------------------------------
# DTOs — typed shapes used in return values
# ---------------------------------------------------------------------------


class _UserDTO(Dict[str, Any]):
    """Typed dict-alike for user-shaped API responses."""
    id: str
    email: str
    username: Optional[str]


class _ProjectDTO(Dict[str, Any]):
    """Typed dict-alike for project-shaped API responses."""
    id: str
    name: str
    description: Optional[str]


class _SecretDTO(Dict[str, Any]):
    """Typed dict-alike for secret-shaped API responses."""
    id: str
    name: str
    value: str


class _ApiKeyDTO(Dict[str, Any]):
    """Typed dict-alike for API-key-shaped API responses."""
    id: str
    name: str
    key: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_response(
    status_code: int = 200,
    json_data: Any = None,
    text: str = "",
    content_type: str = "application/json",
) -> MagicMock:
    """Build a mocked ``requests.Response`` with the given status and body.

    If ``json_data`` is set, ``text`` defaults to a non-empty placeholder so
    that ``_request`` does not short-circuit on an empty body.
    """
    if json_data is not None and not text:
        text = "{}"  # non-empty placeholder to avoid early None return
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    resp.headers = {"Content-Type": content_type}
    if json_data is not None:
        resp.json.return_value = json_data
    return resp


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def mock_session(mocker: MockerFixture) -> MagicMock:
    """Patches ``requests.Session`` and returns a fully-configured mock.

    ``headers`` is a ``MagicMock`` so the constructor's ``headers.update()``
    and ``headers["api-key"] = ...`` work and can be asserted against.
    ``cookies`` is backed by a real ``dict`` for ``set``, ``clear``, and
    ``__len__``.
    """
    session = MagicMock()
    session.headers = MagicMock()
    _cookie_jar: dict[str, str] = {}
    cookie_mock = MagicMock()
    cookie_mock.set.side_effect = lambda k, v: _cookie_jar.__setitem__(k, v)
    cookie_mock.clear.side_effect = _cookie_jar.clear
    # Assigning __len__ on a MagicMock bypasses the default mock machinery
    # and delegates directly to the closure so that len(cookie_mock) works.
    cookie_mock.__len__ = lambda: len(_cookie_jar)
    session.cookies = cookie_mock
    mocker.patch("secryn.client.requests.Session", return_value=session)
    return session


@pytest.fixture()
def client(mock_session: MagicMock) -> SecrynClient:
    """Returns a fresh SecrynClient backed by a mocked HTTP session."""
    return SecrynClient(base_url="http://localhost:3000/api/v1")


@pytest.fixture()
def api_key_client(mock_session: MagicMock) -> SecrynClient:
    """Returns a SecrynClient configured with an API key."""
    return SecrynClient(
        base_url="http://localhost:3000/api/v1",
        api_key="sk-test-key-123",
    )


# ===================================================================
# SecrynApiError
# ===================================================================


class TestSecrynApiError:
    def test_constructs_with_all_fields(self) -> None:
        err = SecrynApiError(
            message="Not Found",
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            details={"resource": "user", "id": "1"},
        )
        assert err.status_code == 404
        assert err.message == "Not Found"
        assert err.code == "RESOURCE_NOT_FOUND"
        assert err.details == {"resource": "user", "id": "1"}

    def test_default_code_is_unknown(self) -> None:
        err = SecrynApiError("Something broke", 500)
        assert err.code == "UNKNOWN"

    def test_str_without_details(self) -> None:
        err = SecrynApiError("Bad Request", 400, code="VALIDATION_ERROR")
        assert str(err) == "Bad Request (VALIDATION_ERROR)"

    def test_str_with_details(self) -> None:
        err = SecrynApiError(
            "Bad Request",
            400,
            code="VALIDATION_ERROR",
            details=[{"field": "email", "message": "Required"}],
        )
        expected = (
            "Bad Request (VALIDATION_ERROR): "
            "[{'field': 'email', 'message': 'Required'}]"
        )
        assert str(err) == expected


# ===================================================================
# SecrynClient — constructor & configuration
# ===================================================================


class TestSecrynClient:
    def test_default_base_url(self, mock_session: MagicMock) -> None:
        client = SecrynClient()
        assert client.base_url == "http://localhost:3000/api/v1"

    def test_custom_base_url(self, mock_session: MagicMock) -> None:
        client = SecrynClient(base_url="https://api.example.com/v2")
        assert client.base_url == "https://api.example.com/v2"

    def test_sets_content_type_header(self, mock_session: MagicMock) -> None:
        SecrynClient()
        session = mock_session
        session.headers.update.assert_called_once()
        headers_arg: dict[str, str] = session.headers.update.call_args[0][0]
        assert headers_arg["Content-Type"] == "application/json"
        assert headers_arg["Accept"] == "application/json"

    def test_sets_api_key_header_when_provided(self, mock_session: MagicMock) -> None:
        SecrynClient(api_key="sk-abc123")
        session = mock_session
        session.headers.__setitem__.assert_called_with("api-key", "sk-abc123")

    def test_does_not_set_api_key_header_when_omitted(self, mock_session: MagicMock) -> None:
        SecrynClient()
        session = mock_session
        assert "api-key" not in session.headers

    def test_all_proxy_attributes_are_set(self, client: SecrynClient) -> None:
        assert isinstance(client.auth, _AuthProxy)
        assert isinstance(client.mfa, _MFAProxy)
        assert isinstance(client.users, _UsersProxy)
        assert isinstance(client.api_keys, _ApiKeysProxy)
        assert isinstance(client.projects, _ProjectsProxy)
        assert isinstance(client.invites, _InvitesProxy)
        assert isinstance(client.members, _MembersProxy)
        assert isinstance(client.secrets, _SecretsProxy)

    def test_custom_user_agent(self, mock_session: MagicMock) -> None:
        SecrynClient(user_agent="my-custom-agent/2.0")
        session = mock_session
        headers_arg: dict[str, str] = session.headers.update.call_args[0][0]
        assert headers_arg["User-Agent"] == "my-custom-agent/2.0"


# ===================================================================
# _RequestMixin — low-level HTTP transport
# ===================================================================


class TestRequestMixinGet:
    def test_returns_parsed_json_on_200(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"id": "1", "name": "test"}
        )
        result = client._get("/projects/1")
        assert result == {"id": "1", "name": "test"}
        mock_session.request.assert_called_once_with(
            "GET", "http://localhost:3000/api/v1/projects/1"
        )

    def test_returns_none_on_204(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(204, text="")
        result = client._get("/users")
        assert result is None

    def test_raises_securyn_api_error_on_400(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            400,
            json_data={"message": "Bad input", "code": "VALIDATION_ERROR"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client._get("/projects/1")
        assert exc_info.value.status_code == 400
        assert exc_info.value.message == "Bad input"
        assert exc_info.value.code == "VALIDATION_ERROR"

    def test_raises_on_401(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            401,
            json_data={"message": "Unauthorized", "code": "UNAUTHORIZED"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client._get("/users/@me")
        assert exc_info.value.status_code == 401

    def test_raises_on_404(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            404,
            json_data={"message": "Not found", "code": "NOT_FOUND"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client._get("/projects/999")
        assert exc_info.value.status_code == 404

    def test_raises_on_500_with_json_body(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            500,
            json_data={"message": "Internal error", "code": "INTERNAL"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client._get("/projects/1")
        assert exc_info.value.status_code == 500

    def test_raises_on_500_with_non_json_body(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        resp = _make_response(500, text="<html>Server Error</html>")
        resp.json.side_effect = ValueError("not json")
        mock_session.request.return_value = resp
        with pytest.raises(SecrynApiError):
            client._get("/projects/1")


class TestRequestMixinPost:
    def test_returns_parsed_json_on_201(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            201, json_data={"id": "2", "name": "new-project"}
        )
        result = client._post("/projects", {"name": "new-project"})
        assert result == {"id": "2", "name": "new-project"}
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/projects",
            json={"name": "new-project"},
        )

    def test_sends_body_as_json(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(200, json_data={"ok": True})
        client._post("/auth/login", {"email": "a@b.com", "password": "secret"})
        call_kwargs = mock_session.request.call_args[1]
        assert call_kwargs["json"] == {"email": "a@b.com", "password": "secret"}

    def test_raises_on_422_validation_error(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            422,
            json_data={
                "message": "Validation failed",
                "code": "VALIDATION_ERROR",
                "details": [{"field": "email"}],
            },
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client._post("/auth/register", {"email": "invalid"})
        assert exc_info.value.status_code == 422
        assert exc_info.value.details == [{"field": "email"}]


class TestRequestMixinPut:
    def test_returns_parsed_json_on_200(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"id": "1", "name": "updated"}
        )
        result = client._put("/projects/1", {"name": "updated"})
        assert result == {"id": "1", "name": "updated"}


class TestRequestMixinDelete:
    def test_returns_none_on_204(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(204, text="")
        result = client._delete("/projects/1")
        assert result is None

    def test_raises_on_404(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            404,
            json_data={"message": "Not found"},
        )
        with pytest.raises(SecrynApiError):
            client._delete("/projects/999")


class TestRequestMixinRaw:
    def test_raw_mode_returns_text_on_success(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200, text="KEY=VALUE\nSECRET=abc", content_type="text/plain"
        )
        result = client._request(
            "GET", "/projects/1/secrets/export", raw=True
        )
        assert result == "KEY=VALUE\nSECRET=abc"

    def test_raw_mode_raises_on_error(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            500,
            json_data={"message": "Export failed"},
        )
        with pytest.raises(SecrynApiError):
            client._request("GET", "/projects/1/secrets/export", raw=True)


# ===================================================================
# _AuthProxy
# ===================================================================


class TestAuthProxy:
    def test_login_sends_correct_payload(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"token": "jwt..."}
        )
        result = client.auth.login("user@example.com", "password123")
        assert result == {"token": "jwt..."}
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/auth/login",
            json={"email": "user@example.com", "password": "password123"},
        )

    def test_login_raises_on_401(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            401,
            json_data={"message": "Invalid credentials", "code": "INVALID_CREDENTIALS"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client.auth.login("bad@example.com", "wrong")
        assert exc_info.value.status_code == 401

    def test_register_sends_correct_payload(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            201, json_data={"id": "1", "email": "new@example.com"}
        )
        result = client.auth.register("new@example.com", "secret123", username="newuser")
        assert result == {"id": "1", "email": "new@example.com"}
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/auth/register",
            json={"email": "new@example.com", "password": "secret123", "username": "newuser"},
        )

    def test_register_omits_username_when_not_provided(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            201, json_data={"id": "2", "email": "noalias@example.com"}
        )
        client.auth.register("noalias@example.com", "secret123")
        call_kwargs = mock_session.request.call_args[1]
        assert "username" not in call_kwargs["json"]

    def test_logout_clears_cookies_even_on_error(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.side_effect = SecrynApiError("fail", 500)
        client.session.cookies.set("session", "abc")
        with pytest.raises(SecrynApiError):
            client.auth.logout()
        client.session.cookies.clear.assert_called_once()  # type: ignore[attr-defined]

    def test_logout_success(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(200, json_data={"ok": True})
        client.auth.logout()
        mock_session.request.assert_called_once_with(
            "POST", "http://localhost:3000/api/v1/auth/logout"
        )

    def test_refresh(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(200, json_data={})
        client.auth.refresh()
        mock_session.request.assert_called_once_with(
            "POST", "http://localhost:3000/api/v1/auth/refresh"
        )

    def test_forgot_password(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"message": "Email sent"}
        )
        result = client.auth.forgot_password("user@example.com")
        assert result == {"message": "Email sent"}
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/auth/forgot-password",
            json={"email": "user@example.com"},
        )

    def test_reset_password(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"message": "Password reset"}
        )
        result = client.auth.reset_password("reset-token-abc", "newpassword")
        assert result == {"message": "Password reset"}
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/auth/reset-password",
            json={"token": "reset-token-abc", "password": "newpassword"},
        )


# ===================================================================
# _MFAProxy
# ===================================================================


class TestMFAProxy:
    def test_setup(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"secret": "JBSWY3DPEHPK3PXP", "qrCode": "data:..."}
        )
        result = client.mfa.setup()
        assert result["secret"] == "JBSWY3DPEHPK3PXP"
        mock_session.request.assert_called_once_with(
            "GET", "http://localhost:3000/api/v1/auth/mfa/setup"
        )

    def test_enable(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"enabled": True}
        )
        result = client.mfa.enable("123456")
        assert result == {"enabled": True}
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/auth/mfa/enable",
            json={"token": "123456"},
        )

    def test_disable(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"enabled": False}
        )
        result = client.mfa.disable()
        assert result == {"enabled": False}

    def test_confirm(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"confirmed": True}
        )
        result = client.mfa.confirm("setup-token", "654321")
        assert result == {"confirmed": True}
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/auth/mfa/confirm",
            json={"token": "setup-token", "mfaToken": "654321"},
        )

    def test_recovery(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"token": "jwt-recovery"}
        )
        result = client.mfa.recovery("ABCD-EFGH", "111111")
        assert result == {"token": "jwt-recovery"}
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/auth/mfa/recovery",
            json={"code": "ABCD-EFGH", "mfaToken": "111111"},
        )

    def test_recovery_codes(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"codes": ["AAAA-BBBB", "CCCC-DDDD"]}
        )
        result = client.mfa.recovery_codes()
        assert result == {"codes": ["AAAA-BBBB", "CCCC-DDDD"]}

    def test_regenerate_codes(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"codes": ["EEEE-FFFF"]}
        )
        result = client.mfa.regenerate_codes()
        assert result == {"codes": ["EEEE-FFFF"]}

    def test_send_backup_code(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"sent": True}
        )
        result = client.mfa.send_backup_code("user@example.com")
        assert result == {"sent": True}
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/auth/mfa/send-backup-code",
            json={"email": "user@example.com"},
        )

    def test_status(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"enabled": True, "backupCodesRemaining": 5}
        )
        result = client.mfa.status()
        assert result["enabled"] is True

    def test_setup_raises_on_401_when_unauthenticated(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            401,
            json_data={"message": "Authentication required", "code": "UNAUTHORIZED"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client.mfa.setup()
        assert exc_info.value.status_code == 401


# ===================================================================
# _UsersProxy
# ===================================================================


class TestUsersProxy:
    def test_me_returns_current_user(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"id": "user-1", "email": "me@example.com"}
        )
        result = client.users.me()
        assert result == {"id": "user-1", "email": "me@example.com"}
        mock_session.request.assert_called_once_with(
            "GET", "http://localhost:3000/api/v1/users/@me"
        )

    def test_get_returns_user_by_id(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200,
            json_data={"id": "user-2", "email": "other@example.com"},
        )
        result = client.users.get("user-2")
        assert result["email"] == "other@example.com"
        mock_session.request.assert_called_once_with(
            "GET", "http://localhost:3000/api/v1/users/user-2"
        )

    def test_get_raises_on_404(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            404,
            json_data={"message": "User not found", "code": "NOT_FOUND"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client.users.get("nonexistent")
        assert exc_info.value.status_code == 404

    def test_update_sends_kwargs_as_body(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200,
            json_data={"id": "user-1", "username": "updated-name"},
        )
        result = client.users.update(username="updated-name")
        assert result["username"] == "updated-name"
        mock_session.request.assert_called_once_with(
            "PUT",
            "http://localhost:3000/api/v1/users",
            json={"username": "updated-name"},
        )

    def test_delete(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(204, text="")
        client.users.delete()
        mock_session.request.assert_called_once_with(
            "DELETE", "http://localhost:3000/api/v1/users"
        )

    def test_me_raises_on_401(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            401, json_data={"message": "Unauthorized"}
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client.users.me()
        assert exc_info.value.status_code == 401


# ===================================================================
# _ApiKeysProxy
# ===================================================================


class TestApiKeysProxy:
    def test_create_with_permissions(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            201,
            json_data={"id": "key-1", "name": "ci-key", "key": "sk-..."},
        )
        result = client.api_keys.create("ci-key", permissions=["read:secrets"])
        assert result["name"] == "ci-key"
        assert result["key"] == "sk-..."
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/api-keys",
            json={"name": "ci-key", "permissions": ["read:secrets"]},
        )

    def test_create_without_permissions(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            201, json_data={"id": "key-2", "name": "simple-key"}
        )
        client.api_keys.create("simple-key")
        call_kwargs = mock_session.request.call_args[1]
        assert "permissions" not in call_kwargs["json"]

    def test_list(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200,
            json_data={"apiKeys": [{"id": "key-1", "name": "ci-key"}]},
        )
        result = client.api_keys.list()
        assert result["apiKeys"][0]["name"] == "ci-key"
        mock_session.request.assert_called_once_with(
            "GET", "http://localhost:3000/api/v1/api-keys/@all-user"
        )

    def test_get(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"id": "key-1", "name": "ci-key"}
        )
        result = client.api_keys.get("key-1")
        assert result["id"] == "key-1"

    def test_update(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"id": "key-1", "name": "renamed-key"}
        )
        result = client.api_keys.update("key-1", name="renamed-key")
        assert result["name"] == "renamed-key"

    def test_delete(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(204, text="")
        client.api_keys.delete("key-1")

    def test_get_raises_on_404(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            404, json_data={"message": "Not found"}
        )
        with pytest.raises(SecrynApiError):
            client.api_keys.get("nonexistent")

    def test_create_raises_on_422_validation(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            422,
            json_data={"message": "Validation error", "code": "VALIDATION_ERROR"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client.api_keys.create("")  # empty name
        assert exc_info.value.status_code == 422


# ===================================================================
# _ProjectsProxy
# ===================================================================


class TestProjectsProxy:
    def test_create_with_description(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            201, json_data={"id": "proj-1", "name": "my-project", "description": "desc"}
        )
        result = client.projects.create("my-project", description="desc")
        assert result["id"] == "proj-1"
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/projects",
            json={"name": "my-project", "description": "desc"},
        )

    def test_create_without_description(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            201, json_data={"id": "proj-2", "name": "minimal"}
        )
        client.projects.create("minimal")
        call_kwargs = mock_session.request.call_args[1]
        assert "description" not in call_kwargs["json"]

    def test_list(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200,
            json_data={"projects": [{"id": "proj-1", "name": "p1"}]},
        )
        result = client.projects.list()
        assert result["projects"][0]["name"] == "p1"
        mock_session.request.assert_called_once_with(
            "GET", "http://localhost:3000/api/v1/projects/@all"
        )

    def test_get(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"id": "proj-1", "name": "my-project"}
        )
        result = client.projects.get("proj-1")
        assert result["name"] == "my-project"

    def test_get_returns_404(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            404, json_data={"message": "Project not found"}
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client.projects.get("nonexistent")
        assert exc_info.value.status_code == 404

    def test_update(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"id": "proj-1", "name": "renamed"}
        )
        result = client.projects.update("proj-1", name="renamed")
        assert result["name"] == "renamed"

    def test_delete(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(204, text="")
        client.projects.delete("proj-1")

    def test_transfer(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"ownerId": "user-2"}
        )
        result = client.projects.transfer("proj-1", "user-2")
        assert result == {"ownerId": "user-2"}
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/projects/proj-1/transfer",
            json={"newOwnerId": "user-2"},
        )

    def test_transfer_raises_on_403_forbidden(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            403,
            json_data={"message": "Only owner can transfer", "code": "FORBIDDEN"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client.projects.transfer("proj-1", "user-3")
        assert exc_info.value.status_code == 403


# ===================================================================
# _InvitesProxy
# ===================================================================


class TestInvitesProxy:
    def test_create_with_email(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            201, json_data={"slug": "invite-abc", "email": "invitee@example.com"}
        )
        result = client.invites.create("proj-1", email="invitee@example.com")
        assert result["slug"] == "invite-abc"
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/projects/proj-1/invites",
            json={"email": "invitee@example.com"},
        )

    def test_create_without_email_accept_anyone(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            201,
            json_data={"slug": "invite-def", "email": None},
        )
        result = client.invites.create("proj-1")
        assert result["slug"] == "invite-def"
        # body is None when email is not provided (empty dict is falsy)
        call_args = mock_session.request.call_args[0]
        call_kwargs = mock_session.request.call_args[1]
        assert call_kwargs.get("json") is None

    def test_accept(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"projectId": "proj-1", "userId": "user-1"}
        )
        result = client.invites.accept("invite-abc")
        assert result["projectId"] == "proj-1"
        mock_session.request.assert_called_once_with(
            "GET",
            "http://localhost:3000/api/v1/projects/invites/invite-abc",
        )

    def test_accept_raises_on_404_when_invite_expired(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            404,
            json_data={"message": "Invite not found or expired", "code": "NOT_FOUND"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client.invites.accept("expired-slug")
        assert exc_info.value.status_code == 404


# ===================================================================
# _MembersProxy
# ===================================================================


class TestMembersProxy:
    def test_remove(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(204, text="")
        client.members.remove("proj-1", "user-2")
        mock_session.request.assert_called_once_with(
            "DELETE",
            "http://localhost:3000/api/v1/projects/proj-1/members/user-2",
        )

    def test_add_permissions(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"permissions": ["read:secrets", "write:secrets"]}
        )
        result = client.members.add_permissions(
            "proj-1", "user-2", ["read:secrets", "write:secrets"]
        )
        assert "write:secrets" in result["permissions"]
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/projects/proj-1/members/user-2/permissions",
            json={"permissions": ["read:secrets", "write:secrets"]},
        )

    def test_remove_permissions(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"permissions": ["read:secrets"]}
        )
        client.members.remove_permissions(
            "proj-1", "user-2", ["write:secrets"]
        )
        # remove_permissions does not return the response (source behaviour);
        # verify the correct HTTP call was made
        mock_session.request.assert_called_once_with(
            "DELETE",
            "http://localhost:3000/api/v1/projects/proj-1/members/user-2/permissions",
            json={"permissions": ["write:secrets"]},
        )

    def test_remove_raises_on_403_not_owner(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            403,
            json_data={"message": "Only owner can remove members", "code": "FORBIDDEN"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client.members.remove("proj-1", "user-2")
        assert exc_info.value.status_code == 403


# ===================================================================
# _SecretsProxy
# ===================================================================


class TestSecretsProxy:
    def test_create_with_notes(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            201,
            json_data={"id": "sec-1", "name": "API_KEY", "value": "encrypted..."},
        )
        result = client.secrets.create(
            "proj-1", "API_KEY", "my-secret-value", notes="production key"
        )
        assert result["id"] == "sec-1"
        mock_session.request.assert_called_once_with(
            "POST",
            "http://localhost:3000/api/v1/projects/proj-1/secrets",
            json={
                "name": "API_KEY",
                "value": "my-secret-value",
                "notes": "production key",
            },
        )

    def test_create_without_notes(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            201, json_data={"id": "sec-2", "name": "TOKEN", "value": "encrypted..."}
        )
        client.secrets.create("proj-1", "TOKEN", "value")
        call_kwargs = mock_session.request.call_args[1]
        assert "notes" not in call_kwargs["json"]

    def test_get(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200,
            json_data={"id": "sec-1", "name": "API_KEY", "value": "decrypted-value"},
        )
        result = client.secrets.get("sec-1")
        assert result["value"] == "decrypted-value"
        mock_session.request.assert_called_once_with(
            "GET",
            "http://localhost:3000/api/v1/projects/secrets/sec-1",
        )

    def test_get_returns_404(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            404, json_data={"message": "Secret not found"}
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client.secrets.get("nonexistent")
        assert exc_info.value.status_code == 404

    def test_list(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200,
            json_data={
                "secrets": [
                    {"id": "sec-1", "name": "KEY1"},
                    {"id": "sec-2", "name": "KEY2"},
                ]
            },
        )
        result = client.secrets.list("proj-1")
        assert len(result["secrets"]) == 2
        mock_session.request.assert_called_once_with(
            "GET",
            "http://localhost:3000/api/v1/projects/proj-1/secrets",
        )

    def test_update(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(
            200,
            json_data={"id": "sec-1", "name": "API_KEY", "value": "new-encrypted"},
        )
        result = client.secrets.update("sec-1", value="new-value", notes="updated note")
        assert result["value"] == "new-encrypted"
        mock_session.request.assert_called_once_with(
            "PUT",
            "http://localhost:3000/api/v1/projects/secrets/sec-1",
            json={"value": "new-value", "notes": "updated note"},
        )

    def test_delete(self, client: SecrynClient, mock_session: MagicMock) -> None:
        mock_session.request.return_value = _make_response(204, text="")
        client.secrets.delete("sec-1")

    def test_export_dotenv_returns_raw_text(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200, text="API_KEY=abc123\nSECRET=xyz", content_type="text/plain"
        )
        result = client.secrets.export_dotenv("proj-1")
        assert result == "API_KEY=abc123\nSECRET=xyz"
        mock_session.request.assert_called_once_with(
            "GET",
            "http://localhost:3000/api/v1/projects/proj-1/secrets/export",
        )

    def test_export_dotenv_raises_on_500(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            500, json_data={"message": "Export failed", "code": "INTERNAL"}
        )
        with pytest.raises(SecrynApiError) as exc_info:
            client.secrets.export_dotenv("proj-1")
        assert exc_info.value.status_code == 500

    def test_export_dotenv_returns_empty_string_when_response_is_none(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        """When _request returns None (204 or empty body) the export_dotenv
        method falls back to an empty string."""
        mock_session.request.return_value = _make_response(204, text="")
        result = client.secrets.export_dotenv("proj-1")
        assert result == ""


# ===================================================================
# Integration: API-key client header propagation
# ===================================================================


class TestApiKeyAuth:
    def test_api_key_is_sent_in_requests(
        self, api_key_client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            200, json_data={"id": "proj-1", "name": "my-project"}
        )
        # The api_key should have been set in headers at construction time
        mock_session.headers.__setitem__.assert_called_with("api-key", "sk-test-key-123")
        result = api_key_client.projects.get("proj-1")
        assert result["name"] == "my-project"

    def test_api_key_auth_gets_401_when_key_invalid(
        self, api_key_client: SecrynClient, mock_session: MagicMock
    ) -> None:
        mock_session.request.return_value = _make_response(
            401,
            json_data={"message": "Invalid API key", "code": "INVALID_API_KEY"},
        )
        with pytest.raises(SecrynApiError) as exc_info:
            api_key_client.projects.list()
        assert exc_info.value.status_code == 401
        assert exc_info.value.code == "INVALID_API_KEY"


# ===================================================================
# Edge cases on _request / URL building
# ===================================================================


class TestRequestEdgeCases:
    def test_url_join_handles_trailing_slash_in_base_url(
        self, mock_session: MagicMock
    ) -> None:
        client = SecrynClient(base_url="http://localhost:3000/api/v1/")
        mock_session.request.return_value = _make_response(
            200, json_data={"ok": True}
        )
        client._get("/projects/1")
        mock_session.request.assert_called_once_with(
            "GET", "http://localhost:3000/api/v1/projects/1"
        )

    def test_url_join_handles_missing_trailing_slash(
        self, mock_session: MagicMock
    ) -> None:
        client = SecrynClient(base_url="http://localhost:3000/api/v1")
        mock_session.request.return_value = _make_response(
            200, json_data={"ok": True}
        )
        client._get("/projects/1")
        mock_session.request.assert_called_once_with(
            "GET", "http://localhost:3000/api/v1/projects/1"
        )

    def test_non_json_success_body_returns_text(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        resp = _make_response(200, text="plain text response")
        resp.json.side_effect = ValueError("not json")
        mock_session.request.return_value = resp
        result = client._get("/some-endpoint")
        assert result == "plain text response"

    def test_500_with_unparseable_json_body(
        self, client: SecrynClient, mock_session: MagicMock
    ) -> None:
        resp = _make_response(500, text="<h1>Internal Server Error</h1>")
        resp.json.side_effect = ValueError("not json")
        mock_session.request.return_value = resp
        with pytest.raises(SecrynApiError) as exc_info:
            client._get("/broken")
        assert exc_info.value.message == "<h1>Internal Server Error</h1>"
