/** Events that can trigger a webhook delivery. */
export type WebhookEvent =
  | "secret.created"
  | "secret.updated"
  | "secret.deleted"
  | "project.created"
  | "project.deleted";

/** A registered webhook endpoint with its subscription and status. */
export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  status: "active" | "inactive";
  lastTriggered: string;
}

/** Payload for creating a new webhook subscription. */
export interface CreateWebhookInput {
  url: string;
  events: WebhookEvent[];
}
