import {test,expect} from '@playwright/test';
test('detail refresh returns to deep page and anchor',async({page})=>{
 const source='/media/y/2026/book/d/2026-01-01/p/2';await page.goto(source);
 const link=page.locator('[data-media-entry] h2 a').first();const id=await link.getAttribute('data-media-id');await link.click();
 await expect(page.locator('[data-media-detail]')).toBeVisible();await page.reload();
 await expect(page.locator('[data-media-return]')).toHaveAttribute('href',`${source}#media-${id}`);
 await page.locator('[data-media-return]').click();await expect(page).toHaveURL(new RegExp(source+'(?:#.*)?$'));
 await expect(page.locator(`[data-media-id="${id}"]`).first()).toBeFocused();
});
test('direct detail and malicious from keep safe ordinary fallback',async({page})=>{
 await page.goto('/media/item/douban-book-1?from=https%3A%2F%2Fevil.test');
 await expect(page.locator('[data-media-return]')).toHaveAttribute('href','/media/y/2026');
 await expect(page.locator('.media-full-comment')).toContainText('合成测试短评');
 await page.goto('/media/item/douban-book-999999');await expect(page.locator('[data-media-detail]')).toHaveCount(0);
});
test('without scripts default return and native back stay useful',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 await page.goto(`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT??4420}/media/y/2026/book/p/2`);await page.locator('[data-media-entry] h2 a').first().click();
 await expect(page.locator('[data-media-return]')).toHaveAttribute('href','/media/y/2026');await page.goBack();await expect(page).toHaveURL(/book\/p\/2$/);await context.close();
});
test('detail escapes HTML, preserves full review and omits absent fields',async({page})=>{
 await page.goto('/media/item/douban-book-1');await expect(page.locator('.media-full-comment')).toContainText('<script>window.mediaInjected=true</script>');
 expect(await page.evaluate(()=>('mediaInjected' in window))).toBe(false);await expect(page.locator('.media-full-comment script,.media-full-comment iframe,.media-full-comment img')).toHaveCount(0);
 await expect(page.getByRole('list',{name:'标签'})).toContainText('合成标签');await expect(page.locator('.media-credits')).toContainText('合成作者');
 const image=page.locator('.media-detail-cover img');await expect(image).toHaveJSProperty('naturalWidth',60);const box=await image.boundingBox();expect(box!.height/box!.width).toBeCloseTo(1.5,2);
 await page.goto('/media/item/douban-book-4');await expect(page.locator('.media-full-comment,.media-detail-cover,.media-tags,.media-credits')).toHaveCount(0);
});
