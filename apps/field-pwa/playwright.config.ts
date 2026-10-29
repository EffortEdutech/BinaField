import { defineConfig, devices } from '@playwright/test';
// Port 3037 is the reserved test/preview port (docs/implementation/adr-0001-acceptance-and-dev-ports.md).
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  webServer: { command: 'npm run build && npx vite preview --port 3037 --strictPort', port: 3037, reuseExistingServer: true, timeout: 180_000 },
  use: { baseURL: 'http://localhost:3037' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {} } }]
});
