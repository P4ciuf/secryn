import { motion } from "framer-motion";
import { Book, Shield, Code, Terminal } from "lucide-react";
import { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { api } from "../../lib/api";
import type { CodeLanguage, ApiEndpoint } from "../../types";

/**
 * Prominent "Getting Started" card showing the required Bearer token header format
 * used for all authenticated API requests.
 */
function GettingStartedCard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-6"
    >
      <Book className="w-12 h-12 text-blue-400 mb-4" />
      <h3 className="text-xl font-semibold mb-2">Getting Started</h3>
      <p className="text-slate-400 mb-4">
        Create an API key from the API Keys page and include it in the Authorization header of your
        requests.
      </p>
      <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm">
        <span className="text-slate-500">Authorization:</span>{" "}
        <span className="text-green-400">Bearer</span>{" "}
        <span className="text-blue-300">YOUR_API_KEY</span>
      </div>
    </motion.div>
  );
}

/**
 * Security best-practices card reminding that all traffic must use HTTPS
 * and API keys belong on the server side only.
 */
function SecurityCard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-6"
    >
      <Shield className="w-12 h-12 text-green-400 mb-4" />
      <h3 className="text-xl font-semibold mb-2">Security</h3>
      <p className="text-slate-400 mb-4">
        All API requests must be made over HTTPS. API keys should be kept secure and never exposed
        in client-side code.
      </p>
      <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm">
        <span className="text-orange-400">⚠️</span>{" "}
        <span className="text-slate-300">Keep your API keys secret</span>
      </div>
    </motion.div>
  );
}

/**
 * Static code snippets displayed in the tabbed code-example viewer.
 * These are illustrative references, not fetched from the backend.
 */
const codeExamples: Record<CodeLanguage, string> = {
  curl: `curl -X GET https://api.securevault.dev/v1/projects \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json"`,
  node: `const SecureVault = require('securevault-sdk');\n\nconst client = new SecureVault({ apiKey: 'YOUR_API_KEY' });\n\nasync function getProjects() { const projects = await client.projects.list(); console.log(projects); }`,
  python: `import securevault\n\nclient = securevault.Client(api_key='YOUR_API_KEY')\n\nprojects = client.projects.list()\nprint(projects)`,
};

/**
 * Tabbed code-snippet viewer showing request examples in cURL, Node.js,
 * and Python. Switches displayed snippet based on the active language tab.
 */
function CodeExamples() {
  const [activeTab, setActiveTab] = useState<CodeLanguage>("curl");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <Code className="w-6 h-6 text-purple-400" />
        <h2 className="text-2xl font-bold">Code Examples</h2>
      </div>

      <div className="flex gap-2 mb-4">
        {(["curl", "node", "python"] as const).map((lang) => (
          <motion.button
            key={lang}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(lang)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === lang
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {lang.toUpperCase()}
          </motion.button>
        ))}
      </div>

      <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
        <pre className="text-sm">
          <code className="text-slate-300">{codeExamples[activeTab]}</code>
        </pre>
      </div>
    </motion.div>
  );
}

/**
 * Endpoint reference list for the API docs page.
 *
 * Attempts to fetch the endpoint catalog from {@code GET /docs/endpoints}. If the
 * backend does not expose this route yet, it falls back to a hardcoded list of the
 * currently implemented endpoints. The health-check call is fire-and-forget —
 * its only purpose is to warm the backend connection and verify reachability
 * without blocking the UI.
 */
function EndpointList() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fire-and-forget health ping: verifies the backend is reachable without
    // blocking the endpoint-list rendering on its result.
    api.get<{ status: string }>("/health").catch(() => undefined);
    api
      .get<ApiEndpoint[]>("/docs/endpoints")
      .then(setEndpoints)
      .catch(() => {
        // Fallback to a static catalog when the backend does not yet expose
        // a /docs/endpoints route. Keep this in sync with the route definitions
        // under apps/api/src/routes/.
        setEndpoints([
          { method: "GET", path: "/v1/health", description: "Health check", color: "bg-green-600" },
          {
            method: "POST",
            path: "/v1/auth/register",
            description: "Register a new user",
            color: "bg-blue-600",
          },
          {
            method: "POST",
            path: "/v1/auth/login",
            description: "Authenticate user",
            color: "bg-blue-600",
          },
          {
            method: "POST",
            path: "/v1/auth/logout",
            description: "Clear auth session",
            color: "bg-red-600",
          },
          {
            method: "POST",
            path: "/v1/projects",
            description: "Create a new project",
            color: "bg-blue-600",
          },
          {
            method: "GET",
            path: "/v1/projects/:id",
            description: "Get a project",
            color: "bg-green-600",
          },
          {
            method: "PUT",
            path: "/v1/projects/:id",
            description: "Rename a project",
            color: "bg-yellow-600",
          },
          {
            method: "DELETE",
            path: "/v1/projects/:id",
            description: "Delete a project",
            color: "bg-red-600",
          },
          {
            method: "POST",
            path: "/v1/projects/:id/transfer",
            description: "Transfer ownership",
            color: "bg-blue-600",
          },
          {
            method: "POST",
            path: "/v1/projects/:id/invites",
            description: "Create invitation",
            color: "bg-blue-600",
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <Terminal className="w-6 h-6 text-cyan-400" />
        <h2 className="text-2xl font-bold">API Endpoints</h2>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 bg-slate-700 rounded-lg" />
            ))}
          </div>
        ) : (
          endpoints.map((endpoint, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors"
            >
              <span
                className={`px-3 py-1 ${endpoint.color} rounded font-mono text-sm font-semibold`}
              >
                {endpoint.method}
              </span>
              <code className="flex-1 font-mono text-sm text-slate-300">{endpoint.path}</code>
              <span className="text-slate-400 text-sm">{endpoint.description}</span>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

/**
 * API Documentation landing page.
 *
 * Renders the Getting-Started guide, security notes, code examples in multiple
 * languages, and a full endpoint reference list sourced from the backend with
 * a static fallback.
 */
export default function ApiDocsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <PageHeader
        title="API Documentation"
        subtitle="Learn how to integrate SecureVault into your applications"
      />

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <GettingStartedCard />
        <SecurityCard />
      </div>

      <CodeExamples />
      <EndpointList />
    </motion.div>
  );
}
