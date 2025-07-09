import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier'; // Correctly named, standard for disabling ESLint stylistic rules
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '.next/**',
      'out/**',
      'coverage/**',
      '**/.trunk/tmp/**',
      '**/tailwind.config.ts',
      'playwright.config.ts', // Added playwright config
      'postcss.config.mjs', // Added postcss config
      'src/ai/tools/python_ast_parser.py', // Ignore python script
      'src/stores/concept-map-store.js', // Specifically ignore this .js file from typed linting
      // Add other generated files or specific directories if needed
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node, // Add Node.js globals
      },
    },
    linterOptions: {
      noInlineConfig: true, // Disable inline comments like /* eslint-disable */
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin, // Ensure key matches plugin name if it's aliased
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      // "prettier" plugin is correctly placed here for global application
      prettier: prettierPlugin,
      // "@next/next" plugin will be applied more specifically below
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          project: './tsconfig.json', // Explicitly point to tsconfig for resolver
          alwaysTryTypes: true,
        },
        node: true,
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'], // Ensure import plugin uses TS parser for TS files
      },
    },
    rules: {
      // Import plugin rules (from eslint-plugin-import)
      // Turn off problematic import rules causing "Resolve error: typescript with invalid interface loaded as resolver"
      'import/namespace': 'off',
      'import/default': 'off',
      'import/named': 'off',
      'import/no-duplicates': 'warn', // Keep this as a warning, might be useful
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/export': 'off', // Often problematic with TS re-exports

      // General ESLint, TypeScript, React, Hooks, JSX-A11y rules
      'constructor-super': 'error',
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-case-declarations': 'error',
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-const-assign': 'error',
      'no-constant-condition': 'error',
      'no-control-regex': 'error',
      'no-debugger': 'error',
      'no-delete-var': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'warn',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-global-assign': 'error',
      'no-import-assign': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-loss-of-precision': 'error',
      'no-misleading-character-class': 'error',
      'no-new-symbol': 'error',
      'no-obj-calls': 'error',
      'no-octal': 'error',
      'no-prototype-builtins': 'error',
      'no-redeclare': 'off', // Disabled because @typescript-eslint/no-redeclare handles this better for TS
      '@typescript-eslint/no-redeclare': ['error'],
      'no-regex-spaces': 'error',
      'no-self-assign': 'error',
      'no-setter-return': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-undef': 'off', // TypeScript handles this
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'warn',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-labels': 'error',
      'no-useless-backreference': 'error',
      'no-useless-catch': 'error',
      'no-useless-escape': 'error',
      'no-with': 'error',
      'require-yield': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // TypeScript specific rules
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-var-requires': 'warn',
      '@typescript-eslint/ban-types': 'warn',

      // Import plugin: keep order rule
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-unresolved': 'off', // Still often handled better by TS/bundler

      // React plugin rules
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off',

      // React Hooks plugin rules
      ...reactHooksPlugin.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'off',

      // JSX-A11y plugin rules
      ...jsxA11yPlugin.configs.recommended.rules,

      // Prettier rules (MUST BE LAST)
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
    },
  },
  // Configuration specific to Next.js / React component files
  {
    files: [
      'src/app/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      // 'src/pages/**/*.{ts,tsx}', // pages dir doesn't exist
      'src/hooks/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
      'src/services/**/*.{ts,tsx}',
      'src/stores/**/*.{ts,tsx}',
      'src/types/**/*.{ts,tsx}',
      'src/ai/**/*.{ts,tsx}',
    ],
    ignores: ['**/__tests__/**', 'src/stores/concept-map-store.js'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      // ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-duplicate-head': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/tests/**/*.ts?(x)'], // Added src/tests
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.vitest,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off', // Allow test globals
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests for mocking
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in tests
      'import/namespace': 'off',
      'import/default': 'off',
      'import/named': 'off',
      'import/no-duplicates': 'off',
      'import/order': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'react/no-unescaped-entities': 'off',
      'jsx-a11y/no-noninteractive-tabindex': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/heading-has-content': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/ban-types': 'off',
    },
  },
];
