import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import "@testing-library/jest-dom/vitest";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/tests/**/*.test.{ts,tsx}', 'src/tests/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
    },
  }
})
