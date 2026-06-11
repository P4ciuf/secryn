import type { ApiKey } from "@repo/shared";

/** Mock API key records for development before the backend is integrated. */
export const mockApiKeys: ApiKey[] = [
  {
    id: "1",
    keyName: "Production API Key",
    key: "sc_prod_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
    userId: "user-1",
    isActive: true,
    createdAt: "2026-05-15T10:00:00.000Z",
    updatedAt: "2026-06-02T08:30:00.000Z",
    expiresAt: "2026-08-15T10:00:00.000Z",
    permissions: ["read", "write"],
  },
  {
    id: "2",
    keyName: "Development API Key",
    key: "sc_dev_xyz789abc012def345ghi678jkl901mno234pqr567stu890vw",
    userId: "user-1",
    isActive: true,
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-06-01T08:30:00.000Z",
    expiresAt: "2026-07-20T10:00:00.000Z",
    permissions: ["read"],
  },
];
