import type { ProjectSecretsData } from "../types";

/** Mock secrets grouped by project ID, for development before the backend is integrated. */
export const mockSecretsData: Record<string, ProjectSecretsData> = {
  "1": {
    name: "Production App",
    secrets: [
      {
        id: "s1",
        name: "DISCORD_TOKEN",
        value: "MTIzNDU2Nzg5MDEyMzQ1Njc4OTA.GaBcDe.FgHiJkLmNoPqRsTuVwXyZ123456789",
        updatedAt: "2026-06-01",
      },
      {
        id: "s2",
        name: "STRIPE_SECRET_KEY",
        value: "sk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890",
        updatedAt: "2026-05-30",
      },
      {
        id: "s3",
        name: "DATABASE_URL",
        value: "postgresql://user:pass@db.example.com:5432/proddb",
        updatedAt: "2026-05-28",
      },
      {
        id: "s4",
        name: "OPENAI_API_KEY",
        value: "sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890",
        updatedAt: "2026-06-02",
      },
    ],
  },
  "2": {
    name: "Staging Environment",
    secrets: [
      {
        id: "s5",
        name: "DATABASE_URL",
        value: "postgresql://user:pass@db-staging.example.com:5432/stagingdb",
        updatedAt: "2026-05-28",
      },
      {
        id: "s6",
        name: "AWS_ACCESS_KEY_ID",
        value: "AKIAIOSFODNN7EXAMPLE",
        updatedAt: "2026-05-27",
      },
      {
        id: "s7",
        name: "AWS_SECRET_ACCESS_KEY",
        value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        updatedAt: "2026-05-27",
      },
    ],
  },
  "3": {
    name: "Development",
    secrets: [
      {
        id: "s8",
        name: "GITHUB_TOKEN",
        value: "ghp_1234567890abcdefghijklmnopqrstuvwxyz",
        updatedAt: "2026-06-02",
      },
      {
        id: "s9",
        name: "SENDGRID_API_KEY",
        value: "SG.AbCdEfGhIjKlMnOpQrStUv.WxYz1234567890AbCdEfGhIjKlMnOpQrSt",
        updatedAt: "2026-06-01",
      },
      {
        id: "s10",
        name: "JWT_SECRET",
        value: "your-256-bit-secret-key-here-keep-it-safe",
        updatedAt: "2026-05-29",
      },
    ],
  },
  "4": {
    name: "External APIs",
    secrets: [
      {
        id: "s11",
        name: "TWILIO_ACCOUNT_SID",
        value: "AC1234567890abcdef1234567890abcdef",
        updatedAt: "2026-05-30",
      },
      {
        id: "s12",
        name: "TWILIO_AUTH_TOKEN",
        value: "1234567890abcdef1234567890abcdef",
        updatedAt: "2026-05-30",
      },
    ],
  },
};
