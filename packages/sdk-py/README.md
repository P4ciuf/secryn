# Secryn Python SDK

[![PyPI](https://img.shields.io/pypi/v/secryn)](https://pypi.org/project/secryn/)
[![Python](https://img.shields.io/pypi/pyversions/secryn.svg)](https://pypi.org/project/secryn/)
[![License](https://img.shields.io/pypi/l/secryn.svg)](https://github.com/P4ciuf/secryn/blob/main/LICENSE)

Python client for the [Secryn](https://secryn.xyz) secrets management API.  
Manage projects, secrets, API keys, and team members programmatically.

## Installation

```bash
pip install secryn
```

Requires Python 3.10+.

## Quick Start

```python
from secryn import SecrynClient

# Connect to your Secryn instance
client = SecrynClient(base_url="https://secryn.xyz/api/v1")

# Cookie-based auth
client.auth.login("user@example.com", "password")

# OR API-key-based auth
client = SecrynClient(
    base_url="https://secryn.xyz/api/v1",
    api_key="sc_...",
)
```

## Usage

All API resources are accessible as namespaced sub-objects with full autocompletion support.

### Auth

```python
client.auth.login("user@example.com", "password")
client.auth.register("new@example.com", "secure123")
client.auth.logout()                # clears session cookies
client.auth.refresh()               # extends JWT session
client.auth.forgot_password("user@example.com")
client.auth.reset_password(token, "new-password")
```

### Projects

```python
projects = client.projects.list()
project = client.projects.create("My Project", description="Backend secrets")
info = client.projects.get(project_id)
client.projects.update(project_id, name="Renamed")
client.projects.transfer(project_id, new_owner_id)
client.projects.delete(project_id)
```

### Members & Invites

```python
# Invite someone to a project
client.invites.create(project_id, email="dev@team.com")

# Accept an invitation by slug
client.invites.accept("abc123")

# Manage members
client.members.add_permissions(project_id, member_id, ["READ_SECRETS"])
client.members.remove_permissions(project_id, member_id, ["READ_SECRETS"])
client.members.remove(project_id, member_id)
```

### Secrets

```python
# Create, read, update, delete
secret = client.secrets.create(project_id, "API_KEY", "sk-abc123", notes="Production key")
secret = client.secrets.get(secret_id)
secrets = client.secrets.list(project_id)
client.secrets.update(secret_id, value="sk-new-value")

# Export as .env
dotenv = client.secrets.export_dotenv(project_id)  # str
with open(".env", "w") as f:
    f.write(dotenv)

client.secrets.delete(secret_id)
```

### API Keys

```python
key = client.api_keys.create("CI/CD Pipeline", permissions=["read"])
keys = client.api_keys.list()
client.api_keys.update(key_id, name="CI Pipeline v2")
client.api_keys.delete(key_id)
```

### Users

```python
profile = client.users.me()         # authenticated user
user = client.users.get(user_id)
client.users.update(name="New Name", email="new@example.com")
client.users.delete()               # deletes authenticated account
```

## Error Handling

```python
from secryn import SecrynApiError

try:
    client.secrets.get("nonexistent")
except SecrynApiError as e:
    print(e.status_code)  # 404
    print(e.code)         # "NOT_FOUND"
    print(e.message)      # "Secret not found"
    print(e.details)      # Optional structured context
```

## Configuration

| Param        | Default                     | Description                              |
| ------------ | --------------------------- | ---------------------------------------- |
| `base_url`   | `https://secryn.xyz/api/v1` | API base URL with `/api/v1` prefix       |
| `api_key`    | `None`                      | Optional API key for programmatic access |
| `user_agent` | `secryn-sdk-python/1.0.0`   | Custom User-Agent header                 |

## License

Apache 2.0 — see [LICENSE](https://github.com/P4ciuf/secryn/blob/main/LICENSE).
