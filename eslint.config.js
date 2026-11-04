import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Architecture guard: the core layers stay framework-free and never reach into the UI.
    files: ['src/audio/**/*.ts', 'src/lessons/**/*.ts', 'src/persistence/**/*.ts', 'src/insights/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-dom/*', 'react-router', 'lucide-react'],
              message: 'Core layers (audio, lessons, persistence, insights) must not depend on UI libraries.',
            },
            {
              group: ['**/features/**', '**/components/**', '**/app/**', '**/state/**'],
              message: 'Core layers must not import from the UI layers.',
            },
          ],
        },
      ],
    },
  },
  {
    // Context modules export both a provider component and its hook.
    files: ['src/**/*Context.tsx', 'src/**/*Provider.tsx', 'src/test/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
]);
