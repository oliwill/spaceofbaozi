import { expect, test, type Locator, type Page } from "@playwright/test";

import { chooseAlbum } from "./directory-helpers";

const widths = [360, 390, 767, 768, 1280, 1440, 1920, 2560];
const stripFor = (page: Page) => page.locator('[data-album-strip]');
const coverFor = (page: Page, id: string) => page.locator(`[data-album-id="${id}"]`);
const segmentFor = (page: Page, id: string) => page.locator(`[data-album-segment="${id}"]`);

async function geometry(page: Page) {
  return stripFor(page).evaluate((strip) => {
    const style = getComputedStyle(strip), bounds = strip.getBoundingClientRect();
    const first = strip.children[0].getBoundingClientRect(), second = strip.children[1].getBoundingClientRect();
    const image = strip.querySelector('.album-cover__image')!.getBoundingClientRect();
    const list = strip.closest('[data-album-list]')!.getBoundingClientRect();
    const paper = strip.closest('.photos-page')!.getBoundingClientRect();
    const directory = strip.closest('[data-album-list]')!.querySelector('.album-directory')!.getBoundingClientRect();
    const gallery = strip.closest('.album-gallery')!.getBoundingClientRect();
    const contentWidth = bounds.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
    return {
      ratio: (contentWidth - (second.left - first.right)) / first.width,
      gap: second.left - first.right, coverWidth: image.width, coverHeight: image.height,
      listWidth: list.width, stripWidth: bounds.width, galleryWidth: gallery.width,
      directoryGap: bounds.left - directory.right, directoryLeft: directory.left - paper.left,
      outsidePaper: Math.max(0, paper.left - list.left, list.right - paper.right),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

async function waitForStripToSettle(strip: Locator) {
  await expect.poll(() => strip.evaluate(async (element) => {
    const samples = [element.scrollLeft];
    for (let frame = 0; frame < 4; frame++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      samples.push(element.scrollLeft);
    }
    return Math.max(...samples) - Math.min(...samples);
  })).toBeLessThanOrEqual(0.1);
}

async function expectCurrentCover(page: Page, id: string) {
  await expect(segmentFor(page, id)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-album-list]')).toHaveAttribute('data-active-album', id);
  await waitForStripToSettle(stripFor(page));
  await expect.poll(() => coverFor(page, id).evaluate((cover) => {
    const bounds = cover.getBoundingClientRect(), strip = cover.closest('[data-album-strip]')!.getBoundingClientRect();
    return Math.max(0, strip.left - bounds.left, bounds.right - strip.right);
  })).toBeLessThanOrEqual(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await expect(segmentFor(page, id)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-album-list]')).toHaveAttribute('data-active-album', id);
}

async function expectRatio(page: Page, width: number) {
  await expect.poll(async () => (await geometry(page)).ratio).toBeCloseTo(width <= 767 ? 1.4 : 1.6, 3);
}

for (const width of widths) {
  test(`responsive cover geometry stays within the paper at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto('/photos');
    await expectRatio(page, width);
    const actual = await geometry(page);
    expect(actual.gap).toBeCloseTo(width <= 767 ? 18 : 26, 2);
    expect(actual.coverWidth / actual.coverHeight).toBeCloseTo(3 / 2, 3);
    expect(actual.outsidePaper).toBeLessThanOrEqual(1);
    expect(actual.overflow).toBeLessThanOrEqual(1);
    expect(Math.abs(actual.stripWidth - actual.galleryWidth)).toBeLessThanOrEqual(1);
    if (width >= 768) {
      expect(actual.coverWidth).toBeLessThanOrEqual(384.02);
      expect(actual.coverHeight).toBeLessThanOrEqual(256.02);
      expect(actual.directoryGap).toBeGreaterThanOrEqual(19.99);
      expect(actual.directoryLeft).toBeGreaterThanOrEqual(-1);
      expect(actual.stripWidth).toBeLessThanOrEqual(648.42);
    }
    if (width >= 1920) expect(actual.stripWidth).toBeCloseTo(648.4, 1);
    for (const cover of await page.locator('[data-album-id]').all()) {
      const image = cover.locator('img');
      await expect(image).toHaveCSS('object-fit', 'cover');
      await expect(image).toHaveCSS('object-position', await cover.getAttribute('data-album-id') === 'synthetic-1' ? '50% 100%' : '50% 50%');
      const presentation = await cover.evaluate((element) => {
        const slot = element.querySelector('.album-cover__image')!;
        const photo = element.querySelector('img')!;
        const metadata = element.querySelector('.album-cover__meta')!.getBoundingClientRect();
        const slotBounds = slot.getBoundingClientRect(), photoBounds = photo.getBoundingClientRect();
        const style = getComputedStyle(slot);
        return {
          background: style.backgroundColor, backgroundImage: style.backgroundImage,
          borders: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
          shadow: style.boxShadow, padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
          before: getComputedStyle(slot, '::before').content, after: getComputedStyle(slot, '::after').content,
          metadataGap: metadata.top - Math.max(slotBounds.bottom, photoBounds.bottom),
          photoBottomGap: Math.abs(slotBounds.bottom - photoBounds.bottom),
          photoOutsideSlot: Math.max(0, slotBounds.left - photoBounds.left, photoBounds.right - slotBounds.right,
            slotBounds.top - photoBounds.top, photoBounds.bottom - slotBounds.bottom),
        };
      });
      expect(presentation).toMatchObject({
        background: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', borders: ['0px', '0px', '0px', '0px'],
        shadow: 'none', padding: ['0px', '0px', '0px', '0px'], before: 'none', after: 'none',
      });
      expect(presentation.metadataGap).toBeGreaterThanOrEqual(0);
      expect(presentation.photoBottomGap).toBeLessThanOrEqual(1);
      expect(presentation.photoOutsideSlot).toBeLessThanOrEqual(1);
    }
  });
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`keyboard names, horizontal wheel and final cover stay synchronized with ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/photos');
    await expectRatio(page, 1440);
    const fourth = segmentFor(page, 'synthetic-4');
    await fourth.focus();
    const beforeY = await page.evaluate(() => scrollY);
    await page.keyboard.press('Enter');
    if (reducedMotion === 'reduce') {
      const offset = await coverFor(page, 'synthetic-4').evaluate((cover) => {
        const strip = cover.closest('[data-album-strip]')!;
        return cover.getBoundingClientRect().left - strip.getBoundingClientRect().left - parseFloat(getComputedStyle(strip).paddingLeft);
      });
      expect(Math.abs(offset)).toBeLessThanOrEqual(1);
    }
    await expectCurrentCover(page, 'synthetic-4');
    await expect(page).toHaveURL(/\/photos$/);
    expect(Math.abs(await page.evaluate(() => scrollY) - beforeY)).toBeLessThanOrEqual(1);
    const strip = stripFor(page);
    await strip.hover({ position: { x: 60, y: 30 } });
    await page.mouse.wheel(-10000, 0);
    await expect.poll(() => strip.evaluate((element) => element.scrollLeft)).toBeLessThanOrEqual(1);
    await expectCurrentCover(page, 'synthetic-1');
    await segmentFor(page, 'synthetic-6').focus();
    await page.keyboard.press('Enter');
    await expectCurrentCover(page, 'synthetic-6');
    await expect(page.locator('[data-album-next]')).toBeDisabled();
    await expect(page).toHaveURL(/\/photos$/);
  });
}

for (const sequence of [[767, 768, 767], [1920, 390, 2560]]) {
  test(`resizing ${sequence.join(' → ')} retains middle and final album anchors`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: sequence[0], height: 900 });
    await page.goto('/photos');
    for (const id of ['synthetic-4', 'synthetic-6']) {
      await chooseAlbum(page, id);
      await expectCurrentCover(page, id);
      for (const width of sequence.slice(1)) {
        await page.setViewportSize({ width, height: 900 });
        await expectRatio(page, width);
        await expectCurrentCover(page, id);
      }
      await page.setViewportSize({ width: sequence[0], height: 900 });
      await expectRatio(page, sequence[0]);
      await expectCurrentCover(page, id);
    }
  });
}

for (const [from, to] of [[1920, 390], [390, 1920]]) {
  test(`history return across ${from} → ${to}px restores the entire selected cover`, async ({ page }) => {
    await page.setViewportSize({ width: from, height: 900 });
    await page.goto('/photos');
    await chooseAlbum(page, 'synthetic-4');
    await expectCurrentCover(page, 'synthetic-4');
    await coverFor(page, 'synthetic-4').click();
    await expect(page.locator('[data-album-reader]')).toHaveAttribute('data-enhanced', 'true');
    await page.locator('[data-next]').click();
    const readingURL = page.url();
    await page.setViewportSize({ width: to, height: 900 });
    await page.goBack();
    await expect(page).toHaveURL(/\/photos$/);
    await expect(coverFor(page, 'synthetic-4')).toBeFocused();
    await expectRatio(page, to);
    await expectCurrentCover(page, 'synthetic-4');
    await page.goForward();
    await expect(page).toHaveURL(readingURL);
    await expect(page.locator('[data-album-reader]')).toHaveAttribute('data-enhanced', 'true');
    const photoId = new URL(readingURL).hash.replace('#photo-', '');
    await expect(page.locator(`[data-photo-id="${photoId}"]`)).toBeVisible();
    await page.locator('[data-album-return]').first().click();
    await expect(coverFor(page, 'synthetic-4')).toBeFocused();
    await expectCurrentCover(page, 'synthetic-4');
  });
}

test('return fully reveals a cover clipped by the strip padding when opened with the mouse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/photos');
  await expectRatio(page, 1920);
  const cover = coverFor(page, 'synthetic-4');
  await cover.evaluate((element) => {
    const strip = element.closest<HTMLElement>('[data-album-strip]')!;
    const item = element.parentElement!;
    const left = item.offsetLeft - parseFloat(getComputedStyle(strip).paddingLeft);
    strip.scrollLeft = left + item.getBoundingClientRect().width - strip.clientWidth;
  });
  await waitForStripToSettle(stripFor(page));
  const opening = await cover.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const strip = element.closest('[data-album-strip]')!.getBoundingClientRect();
    return {
      clippedRight: bounds.right - strip.right,
      x: (Math.max(bounds.left, strip.left, 0) + Math.min(bounds.right, strip.right, innerWidth)) / 2,
      y: (Math.max(bounds.top, strip.top, 0) + Math.min(bounds.bottom, strip.bottom, innerHeight)) / 2,
    };
  });
  expect(opening.clippedRight).toBeGreaterThan(2);
  expect(opening.clippedRight).toBeLessThan(6);
  await page.mouse.click(opening.x, opening.y);
  await expect(page.locator('[data-album-reader]')).toHaveAttribute('data-enhanced', 'true');
  await page.locator('[data-album-return]').first().click();
  await expect(page).toHaveURL(/\/photos$/);
  await expect(cover).toBeFocused();
  await waitForStripToSettle(stripFor(page));
  await expect.poll(() => cover.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const strip = element.closest('[data-album-strip]')!.getBoundingClientRect();
    return Math.max(0, strip.left - bounds.left, bounds.right - strip.right);
  })).toBeLessThanOrEqual(1);
});
