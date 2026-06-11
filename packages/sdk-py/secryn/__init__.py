"""Secryn Python SDK — manage secrets, projects, and API keys programmatically."""

from .client import SecrynClient
from .errors import SecrynApiError

__all__ = ["SecrynClient", "SecrynApiError"]
__version__ = "1.0.0"
