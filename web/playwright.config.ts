import { defineConfig, devices } from "@playwright/test";

// Browser tests (#51). The API is stubbed in the browser (see e2e/fixtures.ts), so they need no
// API, model or Docker: only the built web app. Run with `npm run e2e` from web/.
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  // Traces only when a failed test is retried, so a green run records nothing.
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  projects: [{ name: "android", use: { ...devices["Pixel 5"] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
