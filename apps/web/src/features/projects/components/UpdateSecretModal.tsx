import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Modal } from "../../../components/common/Modal";
import type { Secret, UpdateSecretInput } from "@repo/shared";

interface UpdateSecretModalProps {
  /** Controls modal visibility — the modal is rendered only when {@code true}. */
  open: boolean;
  /** Callback invoked when the user clicks Cancel or the backdrop. */
  onClose: () => void;
  /**
   * Callback invoked with the patch payload when the user submits.
   * Only changed fields are included; empty strings are coerced to
   * {@code undefined} so optional DTO fields are not sent as empty strings.
   */
  onSubmit: (input: UpdateSecretInput & { id: string }) => void;
  /** The secret record whose fields will populate the form on mount. */
  secret: Secret;
}

/**
 * Modal form for updating an existing secret.
 *
 * Pre-populates fields from the provided secret on mount and resets local
 * state after submission. Only fields that differ from their original values
 * are included in the payload; empty strings are coerced to {@code undefined}.
 * The modal closes automatically after a successful submit.
 */
export function UpdateSecretModal({ open, onClose, onSubmit, secret }: UpdateSecretModalProps) {
  const [name, setName] = useState<string | undefined>(undefined);
  const [value, setValue] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState<string | undefined>(undefined);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: secret.id,
      name: name || undefined,
      value: value || undefined,
      notes: notes || undefined,
    });
    setName(undefined);
    setValue(undefined);
    setNotes(undefined);
    onClose();
  };

  useEffect(() => {
    if (secret) {
      setName(secret.name);
      setValue(secret.value);
      setNotes(secret.notes);
    }
  }, [secret]);

  return (
    <Modal open={open} onClose={onClose} title="Update Secret">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-2">Secret Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
            placeholder="API_KEY"
          />
          <p className="text-xs text-slate-400 mt-1">
            Use uppercase with underscores (e.g., DATABASE_URL)
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Secret Value</label>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
            placeholder="your-secret-value-here"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
            placeholder="notes"
            rows={3}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Update Secret
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
