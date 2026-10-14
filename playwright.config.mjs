import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  // Animation tests depend on frames arriving; on this 2014 4-core MacBook, 4 parallel
  // Chromiums starve each other's tickers and flake. 2 workers is stable.
  workers: 2,
  webServer: {
    command: 'python3 tools/serve.py 4173',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: true,
  },
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, testIgnore: /perf\.spec/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: /perf\.spec/ },
    { name: 'perf', use: { ...devices['Pixel 7'] }, testMatch: /perf\.spec/ },
  ],
});
