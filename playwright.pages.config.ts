import { defineConfig, devices } from '@playwright/test';
import { isAbsolute, join } from 'node:path';
import { normalizeBase } from './src/lib/site/paths';

const port = Number(process.env.PAGES_PORT ?? 4460), base = normalizeBase(process.env.PAGES_BASE ?? '/');
const output = process.env.PAGES_EVIDENCE, dist = process.env.PAGES_DIST;
if (!output || !dist || !isAbsolute(output) || !isAbsolute(dist)) throw new Error('PAGES_EVIDENCE and PAGES_DIST require explicit absolute paths');
if (!['formal', 'fixture'].includes(process.env.PAGES_KIND ?? '')) throw new Error('PAGES_KIND must be formal or fixture');
export default defineConfig({
  testDir: './tests/e2e', testMatch: 'pages-base.spec.ts', fullyParallel: true,
  workers: 2, retries: 0, timeout: 30_000, expect: { timeout: 5_000 },
  outputDir: join(output, 'results'), reporter: [['line'], ['json', { outputFile: join(output, 'results.json') }]],
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'on', screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : undefined },
  projects: [{ name: `${process.env.PAGES_KIND}-${base ? 'project' : 'root'}`, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: { command: 'bun scripts/pages/serve.ts', url: `http://127.0.0.1:${port}${base}/`, reuseExistingServer: false },
});
