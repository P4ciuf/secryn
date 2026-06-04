import type { WebhookEvent } from "../entities/webhook.js";

/**
 * Request body for {@code POST /webhooks}.
 *
 * @property url - The HTTPS endpoint that will receive POST notifications
 * @property events - Array of {@link WebhookEvent} types to subscribe to
 */
export interface CreateWebhookInput {
  url: string;
  events: WebhookEvent[];
}
