import type { FormEvent } from "react";
import { Modal } from "../../../components/common/Modal";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Lightweight modal to capture a project name and optional description.
 *
 * Currently a visual stub — submission simply closes the modal.
 */
export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Create New Project" maxWidth="max-w-md">
      <form
        className="space-y-4"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onClose();
        }}
      >
        <div>
          <label className="block text-sm font-medium mb-2">Project Name</label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="My Project"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
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
