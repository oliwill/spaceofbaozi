import {test,expect} from '@playwright/test';
test('calendar keeps full year while selecting a day',async({page})=>{
 await page.goto('/media');await expect(page.locator('[data-calendar-cell]')).toHaveCount(365);
 await expect(page.locator('main')).toContainText('按标记日期');
 await page.locator('[data-desktop-calendar] a[data-date="2026-01-01"]').click();
 await expect(page).toHaveURL(/\/d\/2026-01-01$/);await expect(page.locator('[data-media-entry]')).toHaveCount(24);
 await expect(page.locator('[data-calendar-cell]')).toHaveCount(365);
 await page.getByRole('link',{name:'查看全年',exact:true}).click();await expect(page).toHaveURL(/\/media\/y\/2026$/);
});
test('phone month expands with large targets and keyboard movement',async({page})=>{
 await page.setViewportSize({width:360,height:844});await page.goto('/media');
 await page.locator('[data-month="1"] summary').click();const day=page.locator('[data-month="1"] a[data-date="2026-01-01"]');
 await expect(day).toBeVisible();const box=await day.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
 await day.focus();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-month="1"] [data-date="2026-01-02"]')).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('desktop arrows and responsive focus preserve the selected day',async({page})=>{
 await page.goto('/media');const day=page.locator('[data-desktop-calendar] [data-date="2026-01-01"]');await day.focus();await day.press('ArrowDown');
 await expect(page.locator('[data-desktop-calendar] [data-date="2026-01-02"]')).toBeFocused();
 await page.setViewportSize({width:360,height:900});await expect(page.locator('[data-month="1"] [data-date="2026-01-02"]')).toBeFocused();
 await expect(page.locator('[data-month="1"]')).toHaveAttribute('open','');
 expect(await page.locator('[data-month="2"] summary [data-level]').count()).toBeGreaterThan(0);
});
