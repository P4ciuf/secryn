/** Programming language identifiers used in API documentation code examples. */
export type CodeLanguage = "curl" | "node" | "python";

/**
 * Describes a single API endpoint rendered on the API docs page.
 *
 * @property {"GET" | "POST" | "PUT" | "DELETE"} method - HTTP method for the endpoint badge
 * @property {string} path - Route path relative to the API base URL (e.g. "/v1/projects/:id")
 * @property {string} description - Short human-readable summary of the endpoint's purpose
 * @property {string} color - Tailwind CSS background utility class used to color the method badge (e.g. "bg-green-600")
 */
export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  color: string;
}
