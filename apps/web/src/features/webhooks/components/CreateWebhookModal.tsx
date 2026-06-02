import type { FormEvent } from "react";
import { useState } from "react";
import { Modal } from "../../../components/common/Modal";
import { availableEvents } from "../../../data/webhooks";
import type { WebhookEvent } from "../../../types";

interface CreateWebhookModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the endpoint URL and selected event types on submission. */
  onSubmit: (url: string, events: WebhookEvent[]) => void;
}

/**
 * Modal for registering a new webhook endpoint.
 *
 * The submit button is disabled until at least one event type is selected.
 * Local state resets after a successful submission.
 */
export function CreateWebhookModal({ open, onClose, onSubmit }: CreateWebhookModalProps) {
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);

  const toggleEvent = (event: WebhookEvent) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(url, selectedEvents);
    setUrl("");
    setSelectedEvents([]);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Webhook" maxWidth="max-w-md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-2">Webhook URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="https://api.example.com/webhook"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Events</label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableEvents.map((event) => (
              <label key={event} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event)}
                  onChange={() => toggleEvent(event)}
                  className="rounded"
                />
                <span className="text-sm font-mono">{event}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            disabled={selectedEvents.length === 0}
          >
            Create
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
