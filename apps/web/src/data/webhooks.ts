import type { Webhook, WebhookEvent } from "@repo/shared";

/** Mock webhook records for development before the backend is integrated. */
export const mockWebhooks: Webhook[] = [
  {
    id: "1",
    url: "https://api.myapp.com/webhooks/secryn",
    events: ["secret.created", "secret.deleted"],
    status: "active",
    lastTriggered: "2026-06-02 09:15:23",
  },
  {
    id: "2",
    url: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX",
    events: ["project.created"],
    status: "active",
    lastTriggered: "2026-05-30 14:22:10",
  },
];

/** All webhook event types that can be subscribed to. */
export const availableEvents: WebhookEvent[] = [
  "secret.created",
  "secret.updated",
  "secret.deleted",
  "project.created",
  "project.deleted",
];
