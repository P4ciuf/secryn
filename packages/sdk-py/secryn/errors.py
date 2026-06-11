"""Error types for the Secryn Python SDK."""

from typing import Any, Optional


class SecrynApiError(Exception):
    """Raised when the Secryn API returns a non-2xx status code.

    Attributes:
        status_code: HTTP status code returned by the server.
        message: Human-readable error description.
        code: Machine-readable error identifier.
        details: Optional structured context (e.g. validation errors).
    """

    def __init__(
        self,
        message: str,
        status_code: int,
        code: str = "UNKNOWN",
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
