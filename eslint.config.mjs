import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig([
  {
    // env.ts is auto-generated; register-paths.js is a build helper; *todo.md tracks internal notes
    ignores: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/test-setup.ts",
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/out/**",
      "**/logs/**",
      "**/coverage/**",
      "**/env.ts",
      "**/register-paths.js",
      "**/TODO.md",
      "**/.vercel/**",
    ],
  },

  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  tseslint.configs.recommended,

  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        // Requires TS 5.5+ — enables project references and type-aware linting
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
      // Use TS-aware rule instead of base — handles enums, interfaces, and type imports correctly
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      semi: ["error", "always"],
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      ...prettierConfig.rules,
      // Enforce Prettier formatting as an ESLint error
      "prettier/prettier": "error",
    },
  },

  {
    files: ["**/*.json"],
    ignores: ["**/tsconfig.json", "**/tsconfig.*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.jsonc", "**/tsconfig.json", "**/tsconfig.*.json"],
    plugins: { json },
    language: "json/jsonc",
    extends: ["json/recommended"],
  },

  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/commonmark",
    extends: ["markdown/recommended"],
  },

  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
    rules: {
      "css/no-invalid-at-rules": "off",
      "css/no-invalid-properties": "off",
    },
  },
]);
