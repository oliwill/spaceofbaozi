import {test,expect} from '@playwright/test';
test('capture private synthetic preview',async({page},testInfo)=>{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto('/media');await expect(page.locator('main h1')).toHaveText('书影音');
  await page.screenshot({path:testInfo.outputPath(`media-${width}.png`),fullPage:false});
 }
});
