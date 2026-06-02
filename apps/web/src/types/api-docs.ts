/** Programming language identifiers used in API documentation code examples. */
export type CodeLanguage = "curl" | "node" | "python";

/** Describes a single API endpoint for the API docs page. */
export interface ApiEndpoint {
  method: "GET" | "POST" | "DELETE";
  path: string;
  description: string;
  color: string;
}
