import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.spec.ts",
  testIgnore: ["playwright-prod-smoke.spec.ts", "playwright-prod-register.spec.ts"],
  use: {
    video: {
      mode: "retain-on-failure",
      size: { width: 1280, height: 720 },
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
