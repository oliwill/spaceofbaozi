import {test,expect} from '@playwright/test';
test('twenty synthetic years are reachable without claiming real coverage',async({page})=>{
 await page.goto('/media');await expect(page.locator('.media-fixture')).toContainText('合成测试记录');
 const years=page.getByRole('navigation',{name:'归档年份'});expect(await years.locator('a').count()).toBeGreaterThanOrEqual(22);
 await years.getByRole('link',{name:'2006',exact:true}).click();await expect(page.locator('[data-media-entry]')).toHaveCount(1);
 await page.goto('/media/y/2008');await expect(page.locator('[data-calendar-cell]')).toHaveCount(366);
 await page.goto('/media/y/2025/book');await expect(page.locator('.media-empty')).toContainText('这一年还没有公开记录');
});
