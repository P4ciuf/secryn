import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  cacheDir: "../../node_modules/.vite",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "framer-motion": resolve(__dirname, "src/__mocks__/framer-motion.tsx"),
    },
  },
  test: {
    testTimeout: 15000,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/main.tsx", "src/**/*.test.*", "src/**/*.d.ts"],
    },
  },
});
