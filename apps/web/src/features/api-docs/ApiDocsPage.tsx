import { motion } from "framer-motion";
import { Book, Shield, Code, Terminal } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { codeExamples, endpoints } from "../../data/api-docs";
import type { CodeLanguage } from "../../types";

/**
 * Introductory card explaining how to authenticate API requests with a
 * Bearer token header.
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
 * Tabbed code-snippet viewer that shows request examples in cURL, Node.js,
 * and Python based on the currently selected language tab.
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
 * Styled list of available API endpoints, each showing its HTTP method,
 * path, and a short description.
 */
function EndpointList() {
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
        {endpoints.map((endpoint, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors"
          >
            <span className={`px-3 py-1 ${endpoint.color} rounded font-mono text-sm font-semibold`}>
              {endpoint.method}
            </span>
            <code className="flex-1 font-mono text-sm text-slate-300">{endpoint.path}</code>
            <span className="text-slate-400 text-sm">{endpoint.description}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * API Documentation page — renders the Getting-Started guide, Security
 * notes, code examples, and a full endpoint reference.
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
