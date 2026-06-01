import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "test",
      POSTGRES_DB: "test",
      ENCRYPTION_KEY: "test-encryption-key-32-chars-min!!",
      JWT_SECRET: "test-jwt-secret",
    },
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/main.ts"],
    },
  },
});
