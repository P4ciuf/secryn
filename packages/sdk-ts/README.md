# secryn

[![npm](https://img.shields.io/npm/v/secryn)](https://www.npmjs.com/package/secryn)
[![License](https://img.shields.io/npm/l/secryn.svg)](https://github.com/P4ciuf/secryn/blob/main/LICENSE)

TypeScript/JavaScript client for the [Secryn](https://secryn.xyz) secrets management API.  
Manage projects, secrets, API keys, and team members programmatically from Node.js.

## Installation

```bash
npm install secryn
# or
pnpm add secryn
```

Requires Node.js 22+.

## Quick Start

```typescript
import { SecrynClient } from "secryn";

// Connect to your Secryn instance
const client = new SecrynClient({
  baseUrl: "https://secryn.xyz/api/v1",
});

// Cookie-based auth
await client.auth.login("user@example.com", "password");

// OR API-key-based auth
const client = new SecrynClient({
  baseUrl: "https://secryn.xyz/api/v1",
  apiKey: "sc_...",
});
```

> **Cookie persistence**: The SDK includes an internal `CookieJar` that
> automatically stores and replays `Set-Cookie` headers across requests — no
> browser needed.

## Usage

All API resources are exposed as typed sub-objects with full IntelliSense support.

### Auth

```typescript
await client.auth.login("user@example.com", "password");
await client.auth.register("new@example.com", "secure123");
await client.auth.logout(); // clears cookie jar
await client.auth.refresh(); // extends JWT session
await client.auth.forgotPassword("user@example.com");
await client.auth.resetPassword(token, "new-password");
client.auth.isAuthenticated(); // true if cookies present
```

### Projects

```typescript
const projects = await client.projects.list();
const project = await client.projects.create("My Project", "Backend secrets");
await client.projects.update(projectId, { name: "Renamed" });
await client.projects.transfer(projectId, newOwnerId);
await client.projects.delete(projectId);
```

### Members & Invites

```typescript
// Invite someone to a project
await client.invites.create(projectId, "dev@team.com");

// Accept an invitation by slug
await client.invites.accept("abc123");

// Manage members
await client.members.addPermissions(projectId, memberId, ["READ_SECRETS"]);
await client.members.removePermissions(projectId, memberId);
await client.members.remove(projectId, memberId);
```

### Secrets

```typescript
const secret = await client.secrets.create(projectId, "API_KEY", "sk-abc123", "Production key");
const secret = await client.secrets.get(secretId);
const secrets = await client.secrets.list(projectId);
await client.secrets.update(secretId, { value: "sk-new-value" });

// Export as .env string
const dotenv = await client.secrets.exportDotenv(projectId);
await client.secrets.delete(secretId);
```

### API Keys

```typescript
const key = await client.apiKeys.create("CI/CD Pipeline", ["read"]);
const keys = await client.apiKeys.list();
await client.apiKeys.update(keyId, { name: "CI Pipeline v2" });
await client.apiKeys.delete(keyId);
```

### Users

```typescript
const profile = await client.users.me();
const user = await client.users.get(userId);
await client.users.update({ name: "New Name" });
await client.users.delete();
```

## Error Handling

```typescript
import { SecrynApiError } from "secryn";

try {
  await client.secrets.get("nonexistent");
} catch (err) {
  if (err instanceof SecrynApiError) {
    console.log(err.statusCode); // 404
    console.log(err.code); // "NOT_FOUND"
    console.log(err.message); // "Secret not found"
    console.log(err.details); // Optional structured context
  }
}
```

## Configuration

| Option    | Default                     | Description                              |
| --------- | --------------------------- | ---------------------------------------- |
| `baseUrl` | `https://secryn.xyz/api/v1` | API base URL with `/api/v1` prefix       |
| `apiKey`  | `undefined`                 | Optional API key for programmatic access |

## License

Apache 2.0 — see [LICENSE](https://github.com/P4ciuf/secryn/blob/main/LICENSE).
