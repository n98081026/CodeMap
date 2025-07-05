import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import prettierConfig from "eslint-config-prettier"; // Correctly named, standard for disabling ESLint stylistic rules
import prettierPlugin from "eslint-plugin-prettier";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      ".next/**",
      "out/**",
      "coverage/**",
      // Add other generated files or specific directories if needed
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true, // Automatically find tsconfig.json, or specify path like "./tsconfig.json"
        tsconfigRootDir: import.meta.dirname, // Ensures tsconfig.json is found relative to eslint.config.js
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // ...globals.node, // Add Node.js globals if you have backend files linted with this config too
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "import": importPlugin, // Ensure key matches plugin name if it's aliased
      "react": reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
      "@next/next": nextPlugin,
      "prettier": prettierPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
      // Import plugin settings if needed, e.g., for resolving aliases
      'import/resolver': {
        typescript: {}, // Tells eslint-plugin-import to use TypeScript's path resolution
        node: true,
      },
    },
    rules: {
      // Base ESLint recommended rules (usually good to have)
      "constructor-super": "error",
      "for-direction": "error",
      "getter-return": "error",
      "no-async-promise-executor": "error",
      "no-case-declarations": "error",
      "no-class-assign": "error",
      "no-compare-neg-zero": "error",
      "no-cond-assign": "error",
      "no-const-assign": "error",
      "no-constant-condition": "error",
      "no-control-regex": "error",
      "no-debugger": "error",
      "no-delete-var": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-dupe-else-if": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-empty": "warn",
      "no-empty-character-class": "error",
      "no-empty-pattern": "error",
      "no-ex-assign": "error",
      "no-extra-boolean-cast": "error",
      // "no-extra-semi": "error", // Conflicts with Prettier usually
      "no-fallthrough": "error",
      "no-func-assign": "error",
      "no-global-assign": "error",
      "no-import-assign": "error",
      "no-invalid-regexp": "error",
      "no-irregular-whitespace": "error",
      "no-loss-of-precision": "error",
      "no-misleading-character-class": "error",
      "no-new-symbol": "error", // Changed from no-new-native-nonconstructor in ESLint v9
      "no-obj-calls": "error",
      "no-octal": "error",
      "no-prototype-builtins": "error",
      "no-redeclare": "error",
      "no-regex-spaces": "error",
      "no-self-assign": "error",
      "no-setter-return": "error",
      "no-shadow-restricted-names": "error",
      "no-sparse-arrays": "error",
      "no-this-before-super": "error",
      "no-undef": "error", // TypeScript should catch this, but good for plain JS files
      "no-unexpected-multiline": "error",
      "no-unreachable": "warn", // Changed from "error" to "warn"
      "no-unsafe-finally": "error",
      "no-unsafe-negation": "error",
      "no-unsafe-optional-chaining": "error",
      "no-unused-labels": "error",
      "no-useless-backreference": "error",
      "no-useless-catch": "error",
      "no-useless-escape": "error",
      "no-with": "error",
      "require-yield": "error",
      "use-isnan": "error",
      "valid-typeof": "error",

      // TypeScript specific rules (from @typescript-eslint/eslint-plugin)
      // Spread recommended rules, then override or add specifics
      ...tseslint.configs.recommended.rules,
      // ...tseslint.configs["recommended-requiring-type-checking"].rules, // Optional: for stricter type-aware rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off", // Common to turn off in Next.js
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-var-requires": "warn",
      "@typescript-eslint/ban-types": "warn",

      // Import plugin rules (from eslint-plugin-import)
      ...importPlugin.configs.recommended.rules,
      "import/order": [
        "warn",
        {
          "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
          "newlines-between": "always",
          "alphabetize": { "order": "asc", "caseInsensitive": true }
        }
      ],
      "import/no-unresolved": "off", // Often handled by TypeScript or specific bundler settings

      // React plugin rules (from eslint-plugin-react)
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed with Next.js 17+ / React 17+
      "react/jsx-uses-react": "off", // Not needed with Next.js 17+ / React 17+
      "react/prop-types": "off", // Using TypeScript for prop types

      // React Hooks plugin rules (from eslint-plugin-react-hooks)
      ...reactHooksPlugin.configs.recommended.rules,

      // JSX-A11y plugin rules (from eslint-plugin-jsx-a11y)
      ...jsxA11yPlugin.configs.recommended.rules,

      // Next.js plugin rules (from @next/eslint-plugin-next)
      ...nextPlugin.configs.recommended.rules,
      // You might want to use 'core-web-vitals' rules specifically
      // ...nextPlugin.configs['core-web-vitals'].rules, // If available and desired

      // Prettier rules (MUST BE LAST to override other formatting rules)
      ...prettierConfig.rules, // Disables ESLint's stylistic rules that conflict with Prettier
      "prettier/prettier": "error", // Turns Prettier formatting issues into ESLint errors
    },
  },
];
