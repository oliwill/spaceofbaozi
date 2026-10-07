import { test as baseTest, expect, type Page, type Locator, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';

export const base = process.env.PAGES_BASE === '/' ? '' : (process.env.PAGES_BASE ?? '').replace(/\/$/, '');
export const origin = `http://127.0.0.1:${process.env.PAGES_PORT ?? 4460}`;
export const site = process.env.PAGES_SITE ?? (base ? 'https://oliwill.github.io' : 'https://baozi.space');
export const served = (path: string): string => `${base}${path}`;
export const absolute = (path: string): string => origin + served(path);
export const kind = process.env.PAGES_KIND;
export const fixture = process.env.PAGES_FIXTURE_MANIFEST ? JSON.parse(readFileSync(process.env.PAGES_FIXTURE_MANIFEST, 'utf8')) as { year: number; stagedIdentity: string; sourceIdentity: string } : undefined;

export interface Observation {
  images: string[]; resources: string[]; errors: string[]; failures: string[];
  cancellations: { url: string; method: string; resourceType: string; secPurpose: string; errorText: string }[];
}
export function observe(page: Page): Observation {
  const record: Observation = { images: [], resources: [], errors: [], failures: [], cancellations: [] };
  page.on('pageerror', error => record.errors.push(error.message));
  page.on('response', response => {
    const request = response.request();
    if (new URL(response.url()).origin !== origin || request.resourceType() === 'document') return;
    if (response.status() >= 400) record.failures.push(`${response.status()} ${response.url()}`);
    else { record.resources.push(response.url()); if (request.resourceType() === 'image') record.images.push(response.url()); }
  });
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin !== origin || request.resourceType() === 'document') return;
    const errorText = request.failure()?.errorText, secPurpose = request.headers()['sec-purpose'];
    if (request.method() === 'GET' && request.resourceType() === 'other' && secPurpose === 'prefetch' && errorText === 'net::ERR_ABORTED') {
      record.cancellations.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), secPurpose, errorText });
    } else record.failures.push(`${errorText} ${request.url()}`);
  });
  return record;
}
export async function verifyObservation(record: Observation, info: TestInfo, label = 'resources') {
  await info.attach(label, { body: JSON.stringify(record, null, 2), contentType: 'application/json' });
  expect(record.errors, 'uncaught page errors').toEqual([]); expect(record.failures, 'local resource failures').toEqual([]);
  for (const url of record.resources) expect(new URL(url).pathname.startsWith(base + '/')).toBe(true);
}
export const test = baseTest.extend<{ observed: Observation }>({
  observed: [async ({ page }, use, info) => {
    const record = observe(page); await use(record); await verifyObservation(record, info);
  }, { auto: true }],
});
export { expect };
export async function decoded(image: Locator, info: TestInfo, name: string) {
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const details = await image.evaluate(node => { const image = node as HTMLImageElement; return { currentSrc: image.currentSrc, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, srcset: image.srcset }; });
  expect(details.currentSrc).toBeTruthy(); expect(new URL(details.currentSrc).pathname.startsWith(base + '/assets/')).toBe(true);
  await info.attach(name, { body: JSON.stringify(details), contentType: 'application/json' }); return details;
}
export async function metadata(page: Page, logical: string) {
  const canonical = new URL(served(logical), site).href;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
}
export async function ready(page: Page) {
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('[data-turn-mask]')).toHaveAttribute('data-phase', 'idle');
}
