import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  webServer: {
    command: 'npm start -- --host localhost --port 5174 --strictPort',
    url: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    channel: process.env.CI ? undefined : 'chrome',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    viewport: {
      width: 1280,
      height: 800
    }
  }
})
