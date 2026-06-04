import type { FormEvent } from "react";
import { useState } from "react";
import { Modal } from "../../../components/common/Modal";
import type { CreateSecretInput } from "@repo/shared";

interface CreateSecretModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateSecretInput) => void;
}

/**
 * Modal form for adding a new secret.
 *
 * Displays a helper note encouraging SCREAMING_SNAKE_CASE naming and resets
 * local state after submission.
 */
export function CreateSecretModal({ open, onClose, onSubmit }: CreateSecretModalProps) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ name, value });
    setName("");
    setValue("");
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Secret">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-2">Secret Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
            placeholder="API_KEY"
            required
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
            required
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Add Secret
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
