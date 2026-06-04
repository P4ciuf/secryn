/** Event types that a webhook endpoint can subscribe to. */
export type WebhookEvent =
  | "secret.created"
  | "secret.updated"
  | "secret.deleted"
  | "project.created"
  | "project.deleted";

/**
 * A registered webhook endpoint receiving real-time event notifications.
 *
 * @property id - Unique webhook identifier
 * @property url - The HTTPS endpoint that receives POST notifications
 * @property events - The set of {@link WebhookEvent} types this webhook is subscribed to
 * @property status - {@code "active"} or {@code "inactive"}
 * @property lastTriggered - ISO-8601 timestamp of the last delivery attempt, or "Never"
 */
export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  status: "active" | "inactive";
  lastTriggered: string;
}
