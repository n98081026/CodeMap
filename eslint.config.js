// ESLint configuration for monorepo and modern TypeScript/Node.js
// Auto-generated for ESLint v9+ compatibility

import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        NodeJS: "readonly",
      },
    },
    parser: tsParser,
    parserOptions: {
      project: ["./tsconfig.json"],
      tsconfigRootDir: __dirname,
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/ban-types": "off",
    },
    configs: [
      'eslint:recommended',
      tseslint.recommended,
      tseslint.recommendedRequiringTypeChecking,
      tseslint.strict,
      tseslint.strictTypeChecking,
      tseslint.stylistic,
      importPlugin.configs.recommended,
      importPlugin.configs.typescript,
      prettierPlugin.configs.recommended,
    ],
  },
];
