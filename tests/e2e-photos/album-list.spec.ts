import {expect,test} from "@playwright/test";
import {chooseAlbum,openDirectory} from "./directory-helpers";
for (const ending of ['pointercancel', 'lostpointercapture']) {
  test(`${ending} leaves the next cover-control click usable`, async ({page}) => {
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/photos');
    const strip=page.locator('[data-album-strip]');
    const box=(await page.locator('[data-album-id]').first().boundingBox())!;
    await page.mouse.move(box.x+box.width*.8,box.y+60);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width*.8-80,box.y+60,{steps:8});
    await expect(strip).toHaveAttribute('data-dragging','true');
    await strip.dispatchEvent(ending,{pointerId:1,pointerType:'mouse',bubbles:true});
    await page.mouse.move(10,10);
    await page.mouse.up();
    const before=await strip.evaluate(e=>e.scrollLeft);
    await page.locator('[data-album-next]').click();
    await expect.poll(()=>strip.evaluate(e=>e.scrollLeft)).toBeGreaterThan(before);
    await expect(page).toHaveURL(/\/photos$/);
  });
}
test("six 3:2 cropped covers form a horizontal strip with native controls",async({page})=>{await page.goto("/photos");const strip=page.locator('[data-album-strip]');await expect(page.locator('[data-album-id]')).toHaveCount(6);expect(await strip.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);await expect(page.locator('[data-album-next]')).toBeVisible();await expect(page.locator('[data-album-prev]')).toBeDisabled();await expect(page.locator('[data-album-id] img').first()).toHaveCSS("object-fit","cover");await page.locator('[data-album-next]').click();await expect.poll(()=>strip.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);});
test("mouse drag suppresses navigation and a keyboard link still opens",async({page})=>{await page.goto("/photos");const cover=page.locator('[data-album-id]').first();const box=(await cover.boundingBox())!;await page.mouse.move(box.x+box.width*.8,box.y+60);await page.mouse.down();await page.mouse.move(box.x+30,box.y+60,{steps:10});await page.mouse.up();await expect(page).toHaveURL(/\/photos$/);await cover.focus();await page.keyboard.press("Enter");await expect(page.locator('[data-album-reader]')).toBeVisible();});
test("one cover stays left and fitting strips have no controls",async({page})=>{await page.goto('/photos');await page.evaluate(()=>{document.querySelectorAll('[data-album-strip] > li').forEach((e,i)=>{if(i>0)e.remove()});dispatchEvent(new Event('resize'));});await expect(page.locator('[data-album-controls]')).toBeHidden();});
test("mobile navigation and long titles never overflow the document",async({page})=>{await page.setViewportSize({width:360,height:844});await page.goto('/photos');expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);await openDirectory(page);await expect(page.locator('[data-album-segment]').last()).toContainText('不省略');expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);for(const button of await page.locator('[data-album-controls] button').all()){const b=await button.boundingBox();if(b){expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}}});
for(const width of [360,390,1440])test(`${width<=767?1.4:1.6} covers and named segments at ${width}px`,async({page})=>{await page.setViewportSize({width,height:900});await page.goto('/photos');const strip=page.locator('[data-album-strip]');await expect.poll(()=>strip.evaluate(e=>{const first=e.firstElementChild!.getBoundingClientRect(),second=e.children[1].getBoundingClientRect(),style=getComputedStyle(e);const viewport=e.getBoundingClientRect().width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-parseFloat(style.borderLeftWidth)-parseFloat(style.borderRightWidth);return (viewport-(second.left-first.right))/first.width})).toBeCloseTo(width<=767?1.4:1.6,2);const y=await page.evaluate(()=>scrollY);await chooseAlbum(page,'synthetic-4');await expect(page.locator('[data-album-segment="synthetic-4"]')).toHaveAttribute('aria-current','true');await expect(page).toHaveURL(/\/photos$/);expect(await page.evaluate(()=>scrollY)).toBe(y);await strip.evaluate(e=>e.scrollLeft=0);await expect(page.locator('[data-album-segment="synthetic-1"]')).toHaveAttribute('aria-current','true');await chooseAlbum(page,'synthetic-6');await expect(page.locator('[data-album-segment="synthetic-6"]')).toHaveAttribute('aria-current','true');await expect.poll(()=>strip.evaluate(e=>e.lastElementChild!.getBoundingClientRect().right-e.getBoundingClientRect().right)).toBeLessThanOrEqual(1);const end=await strip.evaluate(e=>{const s=e.getBoundingClientRect(),last=e.lastElementChild!.getBoundingClientRect();return {left:last.left-s.left,right:last.right-s.right,overflow:document.documentElement.scrollWidth-innerWidth,spineContent:getComputedStyle(e.querySelector('.album-cover__image')!,'::before').content}});expect(end.left).toBeGreaterThanOrEqual(0);expect(end.right).toBeLessThanOrEqual(1);expect(end.overflow).toBeLessThanOrEqual(1);expect(end.spineContent).toBe('none');});
