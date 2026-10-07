import { expect, test, type Page } from '@playwright/test';
import { chooseAlbum, openDirectory } from './directory-helpers';

const toggleFor = (page: Page) => page.locator('[data-album-directory-toggle]');
const namesFor = (page: Page) => page.locator('[data-album-segments]');
const segmentFor = (page: Page, id: string) => page.locator(`[data-album-segment="${id}"]`);

async function expectCurrentName(page: Page, id: string) {
  await expect(page.locator('[data-album-list]')).toHaveAttribute('data-active-album', id);
  await expect(segmentFor(page, id)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-album-current-name]')).toHaveText((await segmentFor(page, id).innerText()).trim());
}

async function expectVisibleFocus(page: Page) {
  expect(await page.evaluate(() => {
    const active = document.activeElement;
    return active instanceof HTMLElement && active !== document.body && active.checkVisibility();
  })).toBe(true);
}

test('mobile keyboard opens at current name, selection closes, and Escape restores trigger focus', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/photos');
  const toggle = toggleFor(page), names = namesFor(page);
  await expect(toggle).toBeVisible();
  await expect(names).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.focus();
  const y = await page.evaluate(() => scrollY), url = page.url();
  await page.keyboard.press('Enter');
  await expect(names).toBeVisible();
  await expect(segmentFor(page, 'synthetic-1')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(segmentFor(page, 'synthetic-2')).toBeFocused();
  await page.keyboard.press('Enter');
  await expectCurrentName(page, 'synthetic-2');
  await expect(names).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page).toHaveURL(url);
  expect(Math.abs(await page.evaluate(() => scrollY) - y)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Enter');
  await expect(segmentFor(page, 'synthetic-2')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(names).toBeHidden();
  await expect(toggle).toBeFocused();
  await expectCurrentName(page, 'synthetic-2');
  expect(errors).toEqual([]);
});

test('mobile native scrolling synchronizes the current name and return restores collapsed directory', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/photos');
  const strip = page.locator('[data-album-strip]');
  await expect(toggleFor(page)).toBeVisible();
  await strip.hover({ position: { x: 40, y: 30 } });
  await page.mouse.wheel(10000, 0);
  await expectCurrentName(page, 'synthetic-6');
  await expect(namesFor(page)).toBeHidden();
  await page.mouse.wheel(-10000, 0);
  await expectCurrentName(page, 'synthetic-1');
  await chooseAlbum(page, 'synthetic-4');
  const cover = page.locator('[data-album-id="synthetic-4"]');
  await cover.click({ trial: true });
  const left = await strip.evaluate(element => element.scrollLeft);
  const y = await page.evaluate(() => scrollY);
  await cover.click();
  await expect(page.locator('[data-album-reader]')).toHaveAttribute('data-enhanced', 'true');
  await page.locator('[data-album-return]').first().click();
  await expect(page).toHaveURL(/\/photos$/);
  await expect(cover).toBeFocused();
  await expectCurrentName(page, 'synthetic-4');
  await expect(namesFor(page)).toBeHidden();
  await expect(toggleFor(page)).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => strip.evaluate(element => element.scrollLeft)).toBeCloseTo(left, 0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(y, 0);
  await toggleFor(page).focus();
  await page.keyboard.press('Enter');
  await expect(segmentFor(page, 'synthetic-4')).toBeFocused();
});

for (const [mobile, desktop] of [[767, 768], [390, 1440]]) {
  test(`directory focus remains visible and expansion resets across ${mobile} ↔ ${desktop}px`, async ({ page }) => {
    await page.setViewportSize({ width: mobile, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/photos');
    await chooseAlbum(page, 'synthetic-4');
    await openDirectory(page);
    await expect(segmentFor(page, 'synthetic-4')).toBeFocused();
    await page.setViewportSize({ width: desktop, height: 900 });
    await expect(toggleFor(page)).toBeHidden();
    await expect(namesFor(page)).toBeVisible();
    await expect(toggleFor(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(segmentFor(page, 'synthetic-4')).toBeFocused();
    await expectVisibleFocus(page);
    await expectCurrentName(page, 'synthetic-4');
    await page.setViewportSize({ width: mobile, height: 900 });
    await expect(namesFor(page)).toBeHidden();
    await expect(toggleFor(page)).toBeFocused();
    await expect(toggleFor(page)).toHaveAttribute('aria-expanded', 'false');
    await expectVisibleFocus(page);
    await expectCurrentName(page, 'synthetic-4');
    await page.setViewportSize({ width: desktop, height: 900 });
    await expect(segmentFor(page, 'synthetic-4')).toBeFocused();
    await expectVisibleFocus(page);
    const brand = page.locator('.shell-brand');
    await brand.focus();
    await page.setViewportSize({ width: mobile, height: 900 });
    await expect(brand).toBeFocused();
    await page.setViewportSize({ width: desktop, height: 900 });
    await expect(brand).toBeFocused();
    await page.setViewportSize({ width: mobile, height: 900 });
    await toggleFor(page).focus();
    expect(await page.evaluate(() => document.elementFromPoint(1, 1)?.closest('a,button,input,select,textarea,[tabindex]') === null)).toBe(true);
    await page.mouse.click(1, 1);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await page.setViewportSize({ width: desktop, height: 900 });
    await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await page.setViewportSize({ width: mobile, height: 900 });
    await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });
}

for (const width of [360, 1440]) {
  test(`long directory names remain readable and selectable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/photos');
    await openDirectory(page);
    const last = segmentFor(page, 'synthetic-6');
    await expect(last).toContainText('不裁切也不省略');
    const text = await last.locator('span').last().evaluate(element => {
      const box = element.getBoundingClientRect(), button = element.parentElement!.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { clipped: Math.max(0, button.left - box.left, box.right - button.right, box.bottom - button.bottom),
        extraWidth: element.scrollWidth - element.clientWidth, whiteSpace: style.whiteSpace, ellipsis: style.textOverflow };
    });
    expect(text.clipped).toBeLessThanOrEqual(1);
    expect(text.extraWidth).toBeLessThanOrEqual(1);
    expect(text.whiteSpace).toBe('normal');
    expect(text.ellipsis).not.toBe('ellipsis');
    await last.focus();
    await page.keyboard.press('Enter');
    await expectCurrentName(page, 'synthetic-6');
    if (width <= 767) {
      await expect(namesFor(page)).toBeHidden();
      await expect(toggleFor(page)).toBeFocused();
      await expect(toggleFor(page)).toContainText('不裁切也不省略');
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

for (const width of [390, 1440]) {
  test(`without JavaScript all directory names and native album links remain available at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    try {
      const page = await context.newPage();
      await page.goto('/photos');
      await expect(toggleFor(page)).toBeHidden();
      await expect(namesFor(page)).toBeVisible();
      await expect(namesFor(page).locator('button')).toHaveCount(6);
      for (const name of await namesFor(page).locator('button').all()) await expect(name).toBeVisible();
      await expect(page.locator('[data-album-controls]')).toBeHidden();
      await expect(page.locator('[data-album-id]')).toHaveCount(6);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator('[data-album-id="synthetic-6"]').click();
      await expect(page).toHaveURL(/\/photos\/synthetic-6$/);
      await expect(page.locator('h1')).toContainText('不裁切也不省略');
      await expect(page.locator('[data-photo-id] noscript img')).toHaveCount(3);
    } finally { await context.close(); }
  });
}
