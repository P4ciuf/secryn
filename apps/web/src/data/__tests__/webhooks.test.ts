import { describe, it, expect } from "vitest";
import { mockWebhooks, availableEvents } from "@/data/webhooks";
import type { Webhook, WebhookEvent } from "@repo/shared";

describe("mockWebhooks", () => {
  it("should be an array of Webhook objects", () => {
    expect(Array.isArray(mockWebhooks)).toBe(true);
    expect(mockWebhooks.length).toBeGreaterThan(0);
  });

  it("should have required fields on every webhook", () => {
    for (const webhook of mockWebhooks) {
      expect(webhook).toHaveProperty("id");
      expect(typeof webhook.id).toBe("string");
      expect(webhook).toHaveProperty("url");
      expect(typeof webhook.url).toBe("string");
      expect(webhook).toHaveProperty("events");
      expect(Array.isArray(webhook.events)).toBe(true);
      expect(webhook.events.length).toBeGreaterThan(0);
      expect(webhook).toHaveProperty("status");
      expect(["active", "inactive"]).toContain(webhook.status);
      expect(webhook).toHaveProperty("lastTriggered");
      expect(typeof webhook.lastTriggered).toBe("string");
    }
  });

  it("should have valid URLs on every webhook", () => {
    for (const webhook of mockWebhooks) {
      expect(webhook.url).toMatch(/^https?:\/\//);
    }
  });

  it("should have valid event types on every webhook", () => {
    for (const webhook of mockWebhooks) {
      for (const event of webhook.events) {
        expect(availableEvents).toContain(event);
      }
    }
  });

  it("should have unique IDs", () => {
    const ids = mockWebhooks.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should use the Webhook type from @repo/shared", () => {
    const typed: Webhook[] = mockWebhooks;
    expect(typed).toBe(mockWebhooks);
  });
});

describe("availableEvents", () => {
  it("should be a non-empty array of WebhookEvent strings", () => {
    expect(Array.isArray(availableEvents)).toBe(true);
    expect(availableEvents.length).toBeGreaterThan(0);
    for (const event of availableEvents) {
      expect(typeof event).toBe("string");
    }
  });

  it("should match the WebhookEvent type from @repo/shared", () => {
    const typed: WebhookEvent[] = availableEvents;
    expect(typed).toBe(availableEvents);
  });

  it("should contain only unique values", () => {
    expect(new Set(availableEvents).size).toBe(availableEvents.length);
  });
});
