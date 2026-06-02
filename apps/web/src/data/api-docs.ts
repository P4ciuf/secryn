import type { CodeLanguage, ApiEndpoint } from "../types";

/** Code snippets for each supported language, displayed on the API docs page. */
export const codeExamples: Record<CodeLanguage, string> = {
  curl: `curl -X GET https://api.securevault.dev/v1/projects \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
  node: `const SecureVault = require('securevault-sdk');

const client = new SecureVault({
  apiKey: 'YOUR_API_KEY'
});

async function getProjects() {
  const projects = await client.projects.list();
  console.log(projects);
}`,
  python: `import securevault

client = securevault.Client(
    api_key='YOUR_API_KEY'
)

projects = client.projects.list()
print(projects)`,
};

/** Available API endpoints listed on the API docs page. */
export const endpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/v1/projects",
    description: "List all projects",
    color: "bg-green-600",
  },
  {
    method: "POST",
    path: "/v1/projects",
    description: "Create a new project",
    color: "bg-blue-600",
  },
  {
    method: "GET",
    path: "/v1/projects/:id/secrets",
    description: "Get secrets for a project",
    color: "bg-green-600",
  },
  {
    method: "POST",
    path: "/v1/projects/:id/secrets",
    description: "Create a new secret",
    color: "bg-blue-600",
  },
  {
    method: "DELETE",
    path: "/v1/secrets/:id",
    description: "Delete a secret",
    color: "bg-red-600",
  },
];
