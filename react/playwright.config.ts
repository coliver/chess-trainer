import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.spec.ts",
  use: {
    video: {
      mode: "retain-on-failure",
      size: { width: 1280, height: 720 },
    },
  },
});
