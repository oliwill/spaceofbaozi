import {expect,test} from "@playwright/test";
test("return restores strip, document scroll and focus; reopening resumes",async({page})=>{
  await page.goto('/photos');
  const strip=page.locator('[data-album-strip]');
  await strip.evaluate(e=>e.scrollLeft=900);
  const cover=page.locator('[data-album-id="synthetic-4"]');
  await page.evaluate(()=>window.scrollTo(0,150));
  // Record the visible position the user opens from, after click preparation can scroll.
  await cover.click({trial:true});
  const left=await strip.evaluate(e=>e.scrollLeft);
  const scrollY=await page.evaluate(()=>window.scrollY);
  expect(scrollY).toBeGreaterThan(0);
  await cover.click();
  await expect(page.locator('[data-album-reader]')).toBeVisible();
  await page.locator('[data-next]').click();
  const hash=new URL(page.url()).hash;
  const length=await page.evaluate(()=>history.length);
  await page.locator('[data-next]').click();
  expect(await page.evaluate(()=>history.length)).toBe(length);
  const finalHash=new URL(page.url()).hash;
  await page.locator('[data-album-return]').first().click();
  await expect(page).toHaveURL(/\/photos$/);
  await expect(cover).toBeFocused();
  expect(await strip.evaluate(e=>e.scrollLeft)).toBeCloseTo(left,0);
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeCloseTo(scrollY,0);
  await cover.click();
  await expect(page).toHaveURL(new RegExp(finalHash+'$'));
  expect(hash).not.toBe(finalHash);
});
test("browser back and forward restore content with one main",async({page})=>{await page.goto('/photos');await page.locator('[data-album-id="synthetic-1"]').click();await page.locator('[data-next]').click();const href=page.url();await page.goBack();await expect(page.locator('h1')).toHaveText('摄影');await page.goForward();await expect(page).toHaveURL(href);await expect(page.locator('main')).toHaveCount(1);await expect(page.locator('h1')).toHaveText('合成测试影集 1');});
test("direct no-hash visit starts first and direct return stays on site",async({page})=>{await page.goto('/photos/synthetic-1#photo-c');await expect(page.locator('[data-progress]')).toHaveText('3 / 3');await page.goto('/photos/synthetic-1');await expect(page.locator('[data-photo-id="a"]')).toBeVisible();await page.locator('[data-album-return]').first().click();await expect(page).toHaveURL(/\/photos$/);});
test("storage denial and malformed hash remain readable",async({page})=>{await page.addInitScript(()=>{Object.defineProperty(window,'sessionStorage',{get(){throw Error('denied')}})});await page.goto('/photos/synthetic-1#photo-%E0%A4');await expect(page.locator('[data-photo-id="a"]')).toBeVisible();await page.locator('[data-next]').click();await expect(page.locator('main')).toHaveCount(1);});
test("invalid and withdrawn URLs use generic noindex without private metadata",async({page})=>{for(const path of ['/photos/synthetic-secret','/photos/synthetic-empty','/photos/unknown']){await page.goto(path);await expect(page.locator('h1')).toHaveText('内容暂不可用');await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex');await expect(page.locator('body')).not.toContainText('PRIVATE-');}});
test("rapid navigation finishes at the latest page without stale content",async({page})=>{await page.goto('/photos');await page.locator('[data-album-id="synthetic-1"]').click();await page.locator('[data-next]').click();await page.locator('.shell-links a[href="/blog"]').click();await expect(page.locator('.editorial-hero h1')).toHaveText('文章');await expect(page.locator('main')).toHaveCount(1);await expect(page.locator('[data-album-reader]')).toHaveCount(0);});
test('returning after desktop-mobile resize keeps selected cover visible and focused',async({page})=>{await page.goto('/photos');await page.locator('[data-album-segment="synthetic-4"]').click();const cover=page.locator('[data-album-id="synthetic-4"]');await cover.click();await page.setViewportSize({width:390,height:844});await page.locator('[data-album-return]').first().click();await expect(cover).toBeFocused();const strip=(await page.locator('[data-album-strip]').boundingBox())!,box=(await cover.boundingBox())!;expect(box.x+box.width).toBeGreaterThan(strip.x);expect(box.x).toBeLessThan(strip.x+strip.width);});
test('Back during delayed list preparation does not rewrite list URL/history',async({page})=>{await page.goto('/photos');await page.locator('[data-album-id="synthetic-1"]').click();await page.locator('[data-next]').click();await page.route('**/photos',async route=>{await new Promise(resolve=>setTimeout(resolve,400));await route.continue()});await page.goBack();await expect(page).toHaveURL(/\/photos$/);await expect(page.locator('h1')).toHaveText('摄影');await page.goForward();await expect(page.locator('h1')).toHaveText('合成测试影集 1');await expect(page.locator('[data-photo-id="c"]')).toBeVisible();});

test('overlapping duplicate album opens and newer Blog navigation leave only latest content',async({page})=>{const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/photos');await page.route('**/photos/synthetic-1',async route=>{await new Promise(resolve=>setTimeout(resolve,350));await route.continue()});await page.evaluate(()=>{const cover=document.querySelector<HTMLAnchorElement>('[data-album-id="synthetic-1"]')!;cover.click();cover.click();document.querySelector<HTMLAnchorElement>('.shell-links a[href="/blog"]')!.click()});await expect(page.locator('.editorial-hero h1')).toHaveText('文章');await expect(page.locator('main')).toHaveCount(1);await expect(page.locator('[data-album-reader]')).toHaveCount(0);expect(errors).toEqual([]);});
