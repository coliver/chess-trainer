import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import playwright from 'eslint-plugin-playwright'
import testingLibrary from 'eslint-plugin-testing-library'
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
      jsxA11y.flatConfigs.recommended,
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

  // Testing Library linting for vitest/RTL specs (catches missing
  // await/act wrapping, wrong query priority, etc.) — excludes the
  // Playwright specs above, which use their own API.
  {
    files: ['**/*.test.{ts,tsx}'],
    extends: [testingLibrary.configs['flat/react']],
  },
])
