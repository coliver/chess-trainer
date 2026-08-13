import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import playwright from 'eslint-plugin-playwright'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Disable Playwright-only rules for everything by default
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'playwright/no-standalone-expect': 'off',
    },
  },

  // Enable Playwright linting ONLY where Playwright tests live
  // Change this glob to match your repo’s convention.
  {
    files: ['tests/playwright/**/*.{ts,tsx}', 'playwright/**/*.{ts,tsx}', '**/*.pw.{ts,tsx}', '**/*.playwright.{ts,tsx}'],
    extends: [playwright.configs['flat/recommended']],
  },
])
