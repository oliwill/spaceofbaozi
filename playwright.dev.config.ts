import { defineConfig } from '@playwright/test';
import productionConfig from './playwright.config';

const port = Number(process.env.PLAYWRIGHT_DEV_PORT ?? 4331);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig(productionConfig, {
  testDir: './tests/e2e-dev',
  testIgnore: [],
  workers: 2,
  retries: 0,
  outputDir: `test-results/dev-${port}`,
  use: { baseURL },
  webServer: {
    command: `bun x astro dev --host 127.0.0.1 --port ${port}`,
    url: `${baseURL}/`,
    reuseExistingServer: false,
  },
});
