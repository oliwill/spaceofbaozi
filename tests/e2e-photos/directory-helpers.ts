import { expect, type Page } from '@playwright/test';

export async function openDirectory(page: Page) {
  const toggle = page.locator('[data-album-directory-toggle]');
  await expect(toggle).not.toHaveAttribute('hidden', '');
  if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') !== 'true') {
    await toggle.click();
  }
  await expect(page.locator('[data-album-segments]')).toBeVisible();
}

export async function chooseAlbum(page: Page, id: string) {
  await openDirectory(page);
  await page.locator(`[data-album-segment="${id}"]`).click();
  await expect(page.locator('[data-album-list]')).toHaveAttribute('data-active-album', id);
}
