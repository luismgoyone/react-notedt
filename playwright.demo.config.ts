import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

/**
 * Records the portfolio demo clip: `npm run demo:record`.
 * Reuses the e2e web server, which serves the production build (`vite preview`).
 */
export default defineConfig({
  ...base,
  testDir: "e2e-demo",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  use: { ...base.use, video: "off", trace: "off", screenshot: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
