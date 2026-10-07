import {test,expect} from '@playwright/test';
test('synthetic archive has 24 entries and persistent second page',async({page})=>{
 await page.goto('/media');await expect(page.locator('main')).toContainText('合成测试记录');
 await expect(page.locator('[data-media-entry]')).toHaveCount(24);
 await page.getByRole('link',{name:'下一页',exact:true}).click();await expect(page).toHaveURL(/\/p\/2$/);
 await page.reload();await expect(page.locator('[data-media-entry]')).toHaveCount(10);
 await page.getByRole('link',{name:'上一页',exact:true}).click();await expect(page.locator('[data-media-entry]')).toHaveCount(24);
});
test('small screens preserve text and no horizontal overflow',async({page})=>{
 for(const width of [360,390,767,768,1024,1440]){
  await page.setViewportSize({width,height:900});await page.goto('/media');
  await expect(page.locator('main h1')).toHaveText('书影音');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
test('book filter and partial date group are real links',async({page})=>{
 await page.goto('/media');await page.getByRole('navigation',{name:'作品类型'}).getByRole('link',{name:'书',exact:true}).click();
 await expect(page).toHaveURL(/\/book$/);await expect(page.locator('[data-media-entry]')).toHaveCount(24);
 await page.getByRole('link',{name:'日期待补',exact:true}).click();await expect(page.locator('[data-media-entry]')).toHaveCount(1);
});
