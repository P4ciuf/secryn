"""Tests for the Secryn CLI HTTP client."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest
from pytest_mock import MockerFixture

from secryn_cli.client import APIError, Client
from secryn_cli.config import Config


class TestAPIError:
    """Tests for APIError construction and string representation."""

    def test_constructs_with_all_fields(self) -> None:
        err = APIError(400, "Bad request", "VALIDATION_ERROR", {"field": "email"})
        assert err.status_code == 400
        assert err.message == "Bad request"
        assert err.code == "VALIDATION_ERROR"
        assert err.details == {"field": "email"}

    def test_default_code_is_empty_string(self) -> None:
        err = APIError(500, "Server error")
        assert err.status_code == 500
        assert err.code == ""

    def test_str_without_details(self) -> None:
        err = APIError(404, "Not found", "NOT_FOUND")
        assert str(err) == "Not found (NOT_FOUND)"

    def test_str_with_details(self) -> None:
        err = APIError(422, "Validation failed", "VALIDATION", {"name": "required"})
        assert str(err) == "Validation failed (VALIDATION): {'name': 'required'}"

    def test_str_without_code(self) -> None:
        err = APIError(500, "Internal error")
        assert str(err) == "Internal error ()"


class TestClientInit:
    """Tests for Client initialization."""

    def test_sets_session_headers(self, mocker: MockerFixture) -> None:
        mocker.patch("secryn_cli.client.load_cookies", return_value=None)
        cfg = Config()
        cfg.api_url = "http://test.local/api/v1"
        client = Client(cfg)

        headers = client.session.headers
        assert headers["Content-Type"] == "application/json"
        assert headers["Accept"] == "application/json"
        assert headers["User-Agent"] == f"secryn-cli/{cfg.version}"

    def test_loads_persisted_cookies(self, mocker: MockerFixture) -> None:
        mock_cookies = [
            {
                "name": "jwt",
                "value": "token123",
                "domain": "test.local",
                "path": "/",
                "expires": None,
                "secure": True,
            }
        ]
        mocker.patch("secryn_cli.client.load_cookies", return_value=mock_cookies)
        cfg = Config()
        client = Client(cfg)

        cookie = client.session.cookies.get("jwt")
        assert cookie == "token123"

    def test_handles_empty_cookies(self, mocker: MockerFixture) -> None:
        mocker.patch("secryn_cli.client.load_cookies", return_value=None)
        cfg = Config()
        client = Client(cfg)

        assert len(list(client.session.cookies)) == 0


class TestClientUrl:
    """Tests for URL building."""

    def test_resolves_path_against_base_url(self, mocker: MockerFixture) -> None:
        mocker.patch("secryn_cli.client.load_cookies", return_value=None)
        cfg = Config()
        cfg.api_url = "http://test.local/api/v1"
        client = Client(cfg)

        assert client._url("/projects") == "http://test.local/api/v1/projects"

    def test_handles_trailing_slash_in_base_url(self, mocker: MockerFixture) -> None:
        mocker.patch("secryn_cli.client.load_cookies", return_value=None)
        cfg = Config()
        cfg.api_url = "http://test.local/api/v1/"
        client = Client(cfg)

        assert client._url("/projects") == "http://test.local/api/v1/projects"

    def test_handles_no_leading_slash_in_path(self, mocker: MockerFixture) -> None:
        mocker.patch("secryn_cli.client.load_cookies", return_value=None)
        cfg = Config()
        cfg.api_url = "http://test.local/api/v1"
        client = Client(cfg)

        assert client._url("projects") == "http://test.local/api/v1/projects"


class TestClientRequest:
    """Tests for the core _request method."""

    @pytest.fixture()
    def client(self, mocker: MockerFixture) -> Client:
        mocker.patch("secryn_cli.client.load_cookies", return_value=None)
        mocker.patch("secryn_cli.client.save_cookies")
        cfg = Config()
        cfg.api_url = "http://test.local/api/v1"
        return Client(cfg)

    def test_get_returns_parsed_json(self, client: Client, mocker: MockerFixture) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True, "data": [1, 2, 3]}
        mocker.patch.object(client.session, "request", return_value=mock_response)
        mocker.patch.object(client, "_persist_cookies")

        result = client._request("GET", "/projects")

        assert result == {"success": True, "data": [1, 2, 3]}
        client.session.request.assert_called_once()

    def test_post_sends_json_body(self, client: Client, mocker: MockerFixture) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"success": True, "project": {"id": "1"}}
        mocker.patch.object(client.session, "request", return_value=mock_response)
        mocker.patch.object(client, "_persist_cookies")

        result = client._request("POST", "/projects", {"name": "Test"})

        assert result["success"] is True
        client.session.request.assert_called_once_with(
            "POST", "http://test.local/api/v1/projects", json={"name": "Test"}
        )

    def test_returns_none_for_204_no_content(self, client: Client, mocker: MockerFixture) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 204
        mock_response.text = ""
        mocker.patch.object(client.session, "request", return_value=mock_response)
        mocker.patch.object(client, "_persist_cookies")

        result = client._request("DELETE", "/projects/1")

        assert result is None

    def test_raises_api_error_on_4xx_with_json_body(
        self, client: Client, mocker: MockerFixture
    ) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.json.return_value = {
            "message": "Not found",
            "code": "NOT_FOUND",
        }
        mocker.patch.object(client.session, "request", return_value=mock_response)
        mocker.patch.object(client, "_persist_cookies")

        with pytest.raises(APIError) as exc_info:
            client._request("GET", "/projects/999")

        assert exc_info.value.status_code == 404
        assert exc_info.value.message == "Not found"
        assert exc_info.value.code == "NOT_FOUND"

    def test_raises_api_error_on_4xx_without_json_body(
        self, client: Client, mocker: MockerFixture
    ) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.json.side_effect = ValueError("not json")
        mock_response.text = "Internal error"
        mocker.patch.object(client.session, "request", return_value=mock_response)
        mocker.patch.object(client, "_persist_cookies")

        with pytest.raises(APIError) as exc_info:
            client._request("GET", "/projects")

        assert exc_info.value.status_code == 500
        assert exc_info.value.message == "Internal error"

    def test_raw_mode_returns_text(self, client: Client, mocker: MockerFixture) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "KEY=value\nSECRET=123"
        mock_response.json.side_effect = ValueError("not called in raw mode")
        mocker.patch.object(client.session, "request", return_value=mock_response)
        mocker.patch.object(client, "_persist_cookies")

        result = client._request("GET", "/projects/1/secrets/export", raw=True)

        assert result == "KEY=value\nSECRET=123"

    def test_raw_mode_raises_on_error_with_json(
        self, client: Client, mocker: MockerFixture
    ) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_response.json.return_value = {"message": "Forbidden", "code": "FORBIDDEN"}
        mocker.patch.object(client.session, "request", return_value=mock_response)
        mocker.patch.object(client, "_persist_cookies")

        with pytest.raises(APIError) as exc_info:
            client._request("GET", "/projects/1/secrets/export", raw=True)

        assert exc_info.value.status_code == 403
        assert exc_info.value.message == "Forbidden"

    def test_persists_cookies_after_request(self, client: Client, mocker: MockerFixture) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True}
        mocker.patch.object(client.session, "request", return_value=mock_response)
        mock_persist = mocker.patch.object(client, "_persist_cookies")

        client._request("GET", "/projects")

        mock_persist.assert_called_once()


class TestClientConvenienceMethods:
    """Tests for the convenience HTTP method wrappers."""

    @pytest.fixture()
    def client(self, mocker: MockerFixture) -> Client:
        mocker.patch("secryn_cli.client.load_cookies", return_value=None)
        mocker.patch("secryn_cli.client.save_cookies")
        cfg = Config()
        return Client(cfg)

    def test_get_delegates_to_request(self, client: Client, mocker: MockerFixture) -> None:
        mock_req = mocker.patch.object(client, "_request", return_value={"data": []})
        result = client.get("/projects")
        mock_req.assert_called_once_with("GET", "/projects")
        assert result == {"data": []}

    def test_post_delegates_to_request(self, client: Client, mocker: MockerFixture) -> None:
        mock_req = mocker.patch.object(client, "_request", return_value={"id": "1"})
        body = {"name": "Test"}
        result = client.post("/projects", body)
        mock_req.assert_called_once_with("POST", "/projects", body)
        assert result == {"id": "1"}

    def test_put_delegates_to_request(self, client: Client, mocker: MockerFixture) -> None:
        mock_req = mocker.patch.object(client, "_request", return_value={"updated": True})
        result = client.put("/projects/1", {"name": "Updated"})
        mock_req.assert_called_once_with("PUT", "/projects/1", {"name": "Updated"})
        assert result == {"updated": True}

    def test_delete_delegates_to_request(self, client: Client, mocker: MockerFixture) -> None:
        mock_req = mocker.patch.object(client, "_request", return_value=None)
        result = client.delete("/projects/1")
        mock_req.assert_called_once_with("DELETE", "/projects/1")
        assert result is None

    def test_get_raw_delegates_to_request_in_raw_mode(
        self, client: Client, mocker: MockerFixture
    ) -> None:
        mock_req = mocker.patch.object(client, "_request", return_value="KEY=val")
        result = client.get_raw("/projects/1/secrets/export")
        mock_req.assert_called_once_with("GET", "/projects/1/secrets/export", raw=True)
        assert result == "KEY=val"

    def test_get_raw_returns_empty_string_when_none(
        self, client: Client, mocker: MockerFixture
    ) -> None:
        mocker.patch.object(client, "_request", return_value=None)
        result = client.get_raw("/projects/1/secrets/export")
        assert result == ""


class TestClientPersistCookies:
    """Tests for cookie persistence."""

    def test_persists_session_cookies(self, mocker: MockerFixture) -> None:
        mocker.patch("secryn_cli.client.load_cookies", return_value=None)
        mock_save = mocker.patch("secryn_cli.client.save_cookies")
        cfg = Config()

        client = Client(cfg)

        mock_cookie = MagicMock()
        mock_cookie.name = "jwt"
        mock_cookie.value = "token123"
        mock_cookie.domain = "test.local"
        mock_cookie.path = "/"
        mock_cookie.expires = 1234567890
        mock_cookie.secure = True

        mocker.patch.object(client.session.cookies, "__iter__", return_value=iter([mock_cookie]))

        client._persist_cookies()

        mock_save.assert_called_once()
        saved_data: list[dict[str, Any]] = mock_save.call_args[0][0]
        assert saved_data[0]["name"] == "jwt"
        assert saved_data[0]["value"] == "token123"


class TestClientSaveConfig:
    """Tests for save_config."""

    def test_delegates_to_config_module(self, mocker: MockerFixture) -> None:
        mocker.patch("secryn_cli.client.load_cookies", return_value=None)
        mock_save = mocker.patch("secryn_cli.client.save_config")
        cfg = Config()
        client = Client(cfg)
        client.save_config()

        mock_save.assert_called_once_with(cfg)


class TestClientLogout:
    """Tests for the logout method."""

    def test_clears_cookies_and_resets_identity(self, mocker: MockerFixture) -> None:
        mocker.patch("secryn_cli.client.load_cookies", return_value=None)
        mock_clear = mocker.patch("secryn_cli.client.clear_cookies")
        mock_save = mocker.patch.object(Config, "__init__", return_value=None)
        cfg = Config()
        cfg.user_id = "user-1"
        cfg.user_email = "user@test.com"

        client = Client(cfg)
        mock_post = mocker.patch.object(client, "post", return_value=None)

        client.logout()

        mock_post.assert_called_once_with("/auth/logout")
        mock_clear.assert_called_once()
        assert cfg.user_id is None
        assert cfg.user_email is None

    def test_handles_logout_server_error_gracefully(self, mocker: MockerFixture) -> None:
        mocker.patch("secryn_cli.client.load_cookies", return_value=None)
        mock_clear = mocker.patch("secryn_cli.client.clear_cookies")
        cfg = Config()

        client = Client(cfg)
        mock_post = mocker.patch.object(client, "post", side_effect=APIError(500, "Down"))
        mock_save = mocker.patch.object(client, "save_config")

        client.logout()

        mock_post.assert_called_once()
        mock_clear.assert_called_once()
        mock_save.assert_called_once()
        assert cfg.user_id is None
