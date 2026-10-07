import {test,expect} from '@playwright/test';
test('archive requests no Douban and ships only paginated records',async({page})=>{
 const requests:string[]=[];page.on('request',request=>requests.push(request.url()));await page.goto('/media');
 await expect(page.locator('main h1')).toHaveText('书影音');expect(requests.some(url=>new URL(url).hostname.endsWith('douban.com'))).toBe(false);
 expect(await page.locator('[data-media-entry]').count()).toBeLessThanOrEqual(24);expect(await page.locator('[data-calendar-cell]').count()).toBeLessThanOrEqual(366);
 expect(await page.locator('[data-media-entry] img').count()).toBeLessThanOrEqual(24);
 expect(requests.some(url=>/public\.json|archive\.json|publication\.json/.test(url))).toBe(false);
});
test('reduced motion retains native back forward and broken cover retains text',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/assets/media/**',route=>route.abort());await page.goto('/media/y/2026/book/p/2');
 const link=page.locator('[data-media-entry] h2 a').first();const href=await link.getAttribute('href');await link.click();await expect(page.locator('[data-media-detail]')).toBeVisible();
 await page.goBack();await expect(page).toHaveURL(/book\/p\/2$/);await page.goForward();await expect(page).toHaveURL(new RegExp(href!.split('?')[0]));await expect(page.locator('[data-media-detail] h1')).toBeVisible();
});
test('no-JS month expands and real marked date link works',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:360,height:900}});const page=await context.newPage();await page.goto(baseURL+'/media');
 await page.locator('[data-month="1"] summary').click();await page.locator('[data-month="1"] a[data-date="2026-01-01"]').click();await expect(page).toHaveURL(/\/d\/2026-01-01$/);await expect(page.locator('[data-media-entry]')).toHaveCount(24);await context.close();
});
