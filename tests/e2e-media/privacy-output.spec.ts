import {test,expect} from '@playwright/test';
test('withdrawn, unapproved and private ids have ordinary 404 with no content',async({page})=>{
 for(const id of [1,2,3]){const response=await page.goto(`/media/item/douban-book-${id}`);expect(response?.status()).toBe(404);await expect(page.locator('[data-media-detail]')).toHaveCount(0);}
 await page.goto('/media');for(const id of [1,2,3])await expect(page.locator(`[data-media-id="douban-book-${id}"]`)).toHaveCount(0);
});
