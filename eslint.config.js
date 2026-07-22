import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "dist",
      "dist-worker",
      "dist-cleanup",
      "coverage",
      ".wrangler",
      "public/sw.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.worker } },
  },
  { files: ["scripts/*.mjs"], languageOptions: { globals: globals.node } },
  {
    files: ["scripts/screenshots/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
