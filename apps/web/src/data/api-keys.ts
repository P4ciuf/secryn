import type { ApiKey } from "../types";

/** Mock API key records for development before the backend is integrated. */
export const mockApiKeys: ApiKey[] = [
  {
    id: "1",
    name: "Production API Key",
    key: "sv_prod_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
    createdAt: "2026-05-15",
    lastUsed: "2026-06-02",
    permissions: ["read", "write"],
  },
  {
    id: "2",
    name: "Development API Key",
    key: "sv_dev_xyz789abc012def345ghi678jkl901mno234pqr567stu890vw",
    createdAt: "2026-04-20",
    lastUsed: "2026-06-01",
    permissions: ["read"],
  },
];
