import type { FormEvent } from "react";
import { useState } from "react";
import { Modal } from "../../../components/common/Modal";
import type { CreateProjectInput } from "@repo/shared";

interface CreateProjectModalProps {
  /** Whether the modal is currently visible. */
  open: boolean;
  /** Called when the user dismisses the modal (Cancel, backdrop click, or Esc). */
  onClose: () => void;
  /** Called when the form is submitted with valid name and description values. */
  onSubmit: (input: CreateProjectInput) => void;
}

/**
 * Controlled modal for creating a new project.
 *
 * Captures a name and an optional description. On submit it calls
 * {@code onSubmit} with the captured values, then resets its local state
 * so the form is clean the next time the modal opens. Reset happens
 * synchronously — it does not wait for the parent's async operation.
 */
export function CreateProjectModal({ open, onClose, onSubmit }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description });
    // Reset before the parent's async handler resolves so the form is
    // immediately clean for the next interaction.
    setName("");
    setDescription("");
  };

  /**
   * Closes the modal and resets all local form state so a fresh
   * instance is shown the next time it opens.
   */
  const handleClose = () => {
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create New Project" maxWidth="max-w-md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-2">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="My Project"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Project description..."
            rows={3}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Create
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
