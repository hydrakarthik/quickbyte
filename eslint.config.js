// @ts-check
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['**/dist', '**/coverage', '**/node_modules']),

  // Baseline JavaScript rules for every linted file.
  js.configs.recommended,

  // Type-checked TypeScript rules for application source and tests.
  {
    files: ['apps/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // API runs on Node.js.
  {
    files: ['apps/api/**/*.{js,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Web app runs in the browser and uses React hooks.
  {
    files: ['apps/web/**/*.{js,ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Plain JavaScript config files (for example this file) run on Node.js
  // and are not part of any TypeScript project.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
  },
);
