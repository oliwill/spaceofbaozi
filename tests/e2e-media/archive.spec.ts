import {test,expect} from '@playwright/test';
test('empty production is honest and noindex',async({page})=>{
 await page.goto('/media');await expect(page.locator('main h1')).toHaveText('书影音');
 await expect(page.locator('main')).toContainText('书影音正在整理。');
 await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex');
 await expect(page.locator('[data-media-entry]')).toHaveCount(0);
});
test('plain links work without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 await page.goto('/media');await expect(page.locator('main h1')).toHaveText('书影音');
 await page.getByRole('link',{name:'2026',exact:true}).click();await expect(page).toHaveURL(/\/media\/y\/2026$/);
 await context.close();
});
