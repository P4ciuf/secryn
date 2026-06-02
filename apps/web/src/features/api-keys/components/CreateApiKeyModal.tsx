import type { FormEvent } from "react";
import { useState } from "react";
import { Modal } from "../../../components/common/Modal";
import type { ApiKeyPermission } from "../../../types";

interface CreateApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen name and permission set when the form is submitted. */
  onSubmit: (name: string, permissions: ApiKeyPermission[]) => void;
}

/**
 * Modal for creating a new API key with a name and read/write permission toggles.
 *
 * Resets local state after a successful submission so the form is clean on
 * the next open.
 */
export function CreateApiKeyModal({ open, onClose, onSubmit }: CreateApiKeyModalProps) {
  const [name, setName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<ApiKeyPermission[]>(["read"]);

  const togglePermission = (permission: ApiKeyPermission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(name, selectedPermissions);
    setName("");
    setSelectedPermissions(["read"]);
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New API Key" maxWidth="max-w-md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-2">Key Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="My API Key"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Permissions</label>
          <div className="space-y-2">
            {(["read", "write"] as const).map((perm) => (
              <label key={perm} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(perm)}
                  onChange={() => togglePermission(perm)}
                  className="rounded"
                />
                <span className="capitalize">{perm}</span>
              </label>
            ))}
          </div>
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
