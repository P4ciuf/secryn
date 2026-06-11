import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { Modal } from "../../../components/common/Modal";
import type { ApiKey, ApiKeyPermission, UpdateApiKeyInput } from "@repo/shared";

interface EditApiKeyModalProps {
  open: boolean;
  apiKey: ApiKey | null;
  onClose: () => void;
  onSubmit: (id: string, input: UpdateApiKeyInput) => void;
}

/**
 * Modal for editing an existing API key's name, active status, and permissions.
 *
 * When the modal opens, form fields are populated from the current state of
 * the given {@link ApiKey}. On save, the modal computes a diff against the
 * original permission set so only added and removed permissions are sent to
 * the backend — unchanged permissions are not included in the request.
 */
export function EditApiKeyModal({ open, apiKey, onClose, onSubmit }: EditApiKeyModalProps) {
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<ApiKeyPermission[]>(["read"]);

  useEffect(() => {
    if (apiKey) {
      setName(apiKey.keyName);
      setIsActive(apiKey.isActive);
      setSelectedPermissions(apiKey.permissions);
    }
  }, [apiKey, open]);

  const togglePermission = (permission: ApiKeyPermission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    );
  };

  /**
   * Builds an {@link UpdateApiKeyInput} payload containing only the
   * fields that differ from the original key. Unchanged properties are
   * sent as {@code undefined} so the backend ignores them.
   */
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;

    const originalPerms = apiKey.permissions;
    const addPermissions = selectedPermissions.filter((p) => !originalPerms.includes(p));
    const removePermissions = originalPerms.filter((p) => !selectedPermissions.includes(p));

    onSubmit(apiKey.id, {
      name: name !== apiKey.keyName ? name : undefined,
      isActive: isActive !== apiKey.isActive ? isActive : undefined,
      addPermissions: addPermissions.length > 0 ? addPermissions : undefined,
      removePermissions: removePermissions.length > 0 ? removePermissions : undefined,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit API Key" maxWidth="max-w-md">
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Active</span>
          </label>
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
            Save
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
