import {expect,test,type CDPSession,type Locator,type Page} from '@playwright/test';
import {chooseAlbum} from './directory-helpers';

const stripFor=(page:Page)=>page.locator('[data-album-strip]');
const coverFor=(page:Page,index:number)=>page.locator('[data-album-id]').nth(index);
const imageFor=(page:Page,index:number)=>coverFor(page,index).locator('.album-cover__image');
async function angle(image:Locator):Promise<number>{
  return image.evaluate(element=>{
    const transform=getComputedStyle(element).transform;
    if(transform==='none')return 0;
    const matrix=new DOMMatrixReadOnly(transform);
    return Math.abs(Math.atan2(matrix.m13,matrix.m11)*180/Math.PI);
  });
}
async function expectFlat(page:Page,index:number){await expect.poll(()=>angle(imageFor(page,index))).toBeLessThan(.2);}
async function expectCurrent(page:Page,index:number){
  await expect(page.locator(`[data-album-segment="synthetic-${index+1}"]`)).toHaveAttribute('aria-current','true');
  await expectFlat(page,index);
}
async function stepWidth(page:Page){return stripFor(page).evaluate(strip=>{
  const children=Array.from(strip.children) as HTMLElement[];
  return children[1].offsetLeft-children[0].offsetLeft;
});}
async function pointOnStrip(page:Page,fraction=.8){
  const strip=stripFor(page);await strip.scrollIntoViewIfNeeded();
  const box=(await strip.boundingBox())!;
  const image=(await imageFor(page,0).boundingBox())!;
  return {x:box.x+box.width*fraction,y:box.y+Math.min(70,image.height*.45)};
}
async function mouseDrag(page:Page,dx:number,steps=12){
  const start=await pointOnStrip(page,dx<0?.82:.18);
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  await page.mouse.move(start.x+dx,start.y,{steps});await page.mouse.up();
}
type Point={x:number;y:number;id?:number};
async function touch(cdp:CDPSession,type:'touchStart'|'touchMove'|'touchEnd'|'touchCancel',points:Point[]){
  await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(point=>({...point,radiusX:4,radiusY:4,force:1}))});
}
async function touchDrag(page:Page,cdp:CDPSession,dx:number,dy=0,end:'touchEnd'|'touchCancel'='touchEnd'){
  const start=await pointOnStrip(page,dx<0?.84:dx>0?.16:.5);
  await touch(cdp,'touchStart',[{...start,id:1}]);
  for(let i=1;i<=12;i++){
    await touch(cdp,'touchMove',[{x:start.x+dx*i/12,y:start.y+dy*i/12,id:1}]);
    await page.waitForTimeout(18);
  }
  await touch(cdp,end,[]);
}

for(const width of [1440,390])test(`${width===1440?'desktop':'mobile'} renders the next cover at 40 degrees and the final cover flat`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/photos');
  await expectFlat(page,0);
  await expect.poll(()=>angle(imageFor(page,1))).toBeCloseTo(40,1);
  const size=await imageFor(page,0).boundingBox();expect(size!.width/size!.height).toBeCloseTo(1.5,2);
  await expect(coverFor(page,1).locator('.album-cover__meta')).toHaveCSS('transform','none');
  await chooseAlbum(page,'synthetic-6');await expectCurrent(page,5);
  const last=await coverFor(page,5).boundingBox(),strip=await stripFor(page).boundingBox();
  expect(last!.x).toBeGreaterThanOrEqual(strip!.x-1);
  expect(last!.x+last!.width).toBeLessThanOrEqual(strip!.x+strip!.width+1);
});

test('mouse follows the hand while the next photo unfolds and settles flat',async({page})=>{
  await page.goto('/photos');const step=await stepWidth(page),start=await pointOnStrip(page);
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  await page.mouse.move(start.x-step*.22,start.y,{steps:6});
  const first=await angle(imageFor(page,1));expect(first).toBeGreaterThan(0);expect(first).toBeLessThan(40);
  await page.mouse.move(start.x-step*.48,start.y,{steps:6});
  expect(await angle(imageFor(page,1))).toBeLessThan(first);
  await page.mouse.move(start.x-step*.72,start.y,{steps:6});await page.mouse.up();
  await expectCurrent(page,1);await expect(page).toHaveURL(/\/photos$/);
});

test('mouse reverse restores the previous cover and a short drag returns to its origin',async({page})=>{
  await page.goto('/photos');await chooseAlbum(page,'synthetic-2');await expectCurrent(page,1);
  const step=await stepWidth(page);await mouseDrag(page,step*.72);await expectCurrent(page,0);
  const start=await pointOnStrip(page);await page.mouse.move(start.x,start.y);await page.mouse.down();
  await page.mouse.move(start.x-step*.09,start.y,{steps:6});await page.waitForTimeout(180);await page.mouse.up();
  await expectCurrent(page,0);await expect(page).toHaveURL(/\/photos$/);
});

test('pointer cancellation releases the drag and leaves the next control usable',async({page})=>{
  await page.goto('/photos');const start=await pointOnStrip(page),step=await stepWidth(page);
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  await page.mouse.move(start.x-step*.38,start.y,{steps:8});
  await stripFor(page).dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true});
  await page.mouse.move(1,1);await page.mouse.up();
  await expectCurrent(page,0);await page.locator('[data-album-next]').click();await expectCurrent(page,1);
});

test('rapid repeated drags interrupt settling without stale selection or navigation',async({page})=>{
  await page.goto('/photos');const step=await stepWidth(page);
  await mouseDrag(page,-step*.68,8);await mouseDrag(page,-step*.68,8);
  await expectCurrent(page,2);await mouseDrag(page,step*.68,8);await expectCurrent(page,1);
  await expect(page).toHaveURL(/\/photos$/);
});

test('a drag cannot open an album but the next ordinary click can',async({page})=>{
  await page.goto('/photos');await mouseDrag(page,-(await stepWidth(page))*.72);
  await expectCurrent(page,1);await expect(page).toHaveURL(/\/photos$/);
  await coverFor(page,1).click();await expect(page).toHaveURL(/\/photos\/synthetic-2#photo-a$/);
  await expect(page.locator('[data-album-reader]')).toBeVisible();
});

test('a real wheel interruption cannot turn an active mouse drag into a link click',async({page})=>{
  await page.goto('/photos');const cover=coverFor(page,0),box=(await cover.boundingBox())!;
  await page.mouse.move(box.x+box.width*.7,box.y+60);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.7-100,box.y+60,{steps:8});
  expect(await stripFor(page).evaluate(element=>element.scrollLeft)).toBeGreaterThan(80);
  await page.mouse.wheel(20,0);await page.waitForTimeout(90);await page.mouse.up();
  await page.waitForTimeout(500);await expect(page).toHaveURL(/\/photos$/);
  await expect(page.locator('[data-album-reader]')).toHaveCount(0);
  await cover.click();await expect(page).toHaveURL(/\/photos\/synthetic-1#photo-a$/);
  await expect(page.locator('[data-album-reader]')).toBeVisible();
});

test('cover arrow and boundary keys move selection and focus within the strip',async({page})=>{
  await page.goto('/photos');await coverFor(page,0).focus();
  const y=await page.evaluate(()=>scrollY);
  for(const [key,index] of [['ArrowRight',1],['ArrowLeft',0],['End',5],['Home',0]] as const){
    await page.keyboard.press(key);await expectCurrent(page,index);await expect(coverFor(page,index)).toBeFocused();
    await expect(page).toHaveURL(/\/photos$/);
    expect(Math.abs(await page.evaluate(()=>scrollY)-y)).toBeLessThanOrEqual(1);
  }
  await page.locator('.shell-brand').focus();await page.keyboard.press('ArrowRight');
  await expect(page.locator('.shell-brand')).toBeFocused();await expectCurrent(page,0);
});

test('keyboard directory and cover links remain usable with reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/photos');
  const fourth=page.locator('[data-album-segment="synthetic-4"]');await fourth.focus();
  const y=await page.evaluate(()=>scrollY);await page.keyboard.press('Enter');await expectCurrent(page,3);
  expect(Math.abs(await page.evaluate(()=>scrollY)-y)).toBeLessThanOrEqual(1);
  const before=await stripFor(page).evaluate(element=>element.scrollLeft);
  await page.locator('[data-album-next]').focus();await page.keyboard.press('Enter');await expectCurrent(page,4);
  expect(await stripFor(page).evaluate(element=>element.scrollLeft)).toBeGreaterThan(before);
  expect(await stripFor(page).evaluate(element=>element.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length)).toBe(0);
  await coverFor(page,4).focus();await page.keyboard.press('Enter');await expect(page.locator('[data-album-reader]')).toBeVisible();
});

test('changing reduced motion during settling leaves a stable flat selection',async({page})=>{
  await page.goto('/photos');await mouseDrag(page,-(await stepWidth(page))*.72,8);
  await page.emulateMedia({reducedMotion:'reduce'});await expectCurrent(page,1);
  const left=await stripFor(page).evaluate(element=>element.scrollLeft);
  await page.waitForTimeout(350);
  expect(await stripFor(page).evaluate(element=>element.scrollLeft)).toBeCloseTo(left,0);
  expect(await stripFor(page).evaluate(element=>element.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length)).toBe(0);
});

test('opening and returning keeps the unfolded selection, strip position and focus',async({page})=>{
  await page.goto('/photos');await mouseDrag(page,-(await stepWidth(page))*.72);await expectCurrent(page,1);
  const cover=coverFor(page,1);await cover.click({trial:true});
  const left=await stripFor(page).evaluate(element=>element.scrollLeft),y=await page.evaluate(()=>scrollY);
  await cover.click();await expect(page.locator('[data-album-reader]')).toBeVisible();
  await page.locator('[data-album-return]').first().click();await expect(page).toHaveURL(/\/photos$/);
  await expect(cover).toBeFocused();await expectCurrent(page,1);
  await expect.poll(()=>stripFor(page).evaluate(element=>element.scrollLeft)).toBeCloseTo(left,0);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(y,0);
  await page.waitForTimeout(400);expect(await stripFor(page).evaluate(element=>element.scrollLeft)).toBeCloseTo(left,0);
});

test('a failed cover preserves its photo slot, directory and usable album link',async({page})=>{
  await page.route('**/assets/photos/synthetic-1-a*.png',route=>route.abort());await page.goto('/photos');
  const image=imageFor(page,0),photo=coverFor(page,0).locator('img');
  await expect.poll(()=>photo.evaluate((element:HTMLImageElement)=>element.complete&&element.naturalWidth===0)).toBe(true);
  const box=(await image.boundingBox())!;expect(box.width/box.height).toBeCloseTo(1.5,2);
  await expect(coverFor(page,0)).toHaveAccessibleName('合成测试影集 1');
  await chooseAlbum(page,'synthetic-2');await expectCurrent(page,1);
  await chooseAlbum(page,'synthetic-1');await expectCurrent(page,0);
  await coverFor(page,0).click();await expect(page.locator('[data-album-reader]')).toBeVisible();
  await expect(page.locator('[data-retry]:visible')).toHaveCount(1);
});

test.describe('real Chromium touch input',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  test('touch follows the hand forward and reverse without opening the album',async({page,context})=>{
    await page.goto('/photos');const cdp=await context.newCDPSession(page),step=await stepWidth(page);
    const start=await pointOnStrip(page,.84);await touch(cdp,'touchStart',[{...start,id:1}]);
    for(let i=1;i<=6;i++){await touch(cdp,'touchMove',[{x:start.x-step*.4*i/6,y:start.y,id:1}]);await page.waitForTimeout(20);}
    const middle=await angle(imageFor(page,1));expect(middle).toBeGreaterThan(0);expect(middle).toBeLessThan(40);
    await touch(cdp,'touchMove',[{x:start.x-step*.75,y:start.y,id:1}]);await touch(cdp,'touchEnd',[]);
    await expectCurrent(page,1);await touchDrag(page,cdp,step*.75);await expectCurrent(page,0);
    await expect(page).toHaveURL(/\/photos$/);await cdp.detach();
  });
  test('touch cancel restores the origin and a repeated gesture still works',async({page,context})=>{
    await page.goto('/photos');const cdp=await context.newCDPSession(page),step=await stepWidth(page);
    await touchDrag(page,cdp,-step*.38,0,'touchCancel');await expectCurrent(page,0);
    await touchDrag(page,cdp,-step*.7);await expectCurrent(page,1);
    await touchDrag(page,cdp,-step*.7);await touchDrag(page,cdp,-step*.7);await expectCurrent(page,3);
    await expect(page).toHaveURL(/\/photos$/);await cdp.detach();
  });
  test('vertical touch scrolls the document without changing albums',async({page,context})=>{
    await page.goto('/photos');const cdp=await context.newCDPSession(page);await pointOnStrip(page);
    const y=await page.evaluate(()=>scrollY),left=await stripFor(page).evaluate(element=>element.scrollLeft);
    await touchDrag(page,cdp,3,-145);
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(y+20);
    expect(await stripFor(page).evaluate(element=>element.scrollLeft)).toBeCloseTo(left,0);
    await expectCurrent(page,0);await expect(page).toHaveURL(/\/photos$/);await cdp.detach();
  });
  test('multiple fingers yield without changing selection or blocking a later swipe',async({page,context})=>{
    await page.goto('/photos');const cdp=await context.newCDPSession(page),start=await pointOnStrip(page,.65);
    await touch(cdp,'touchStart',[{x:start.x-45,y:start.y,id:1},{x:start.x+20,y:start.y,id:2}]);
    await touch(cdp,'touchMove',[{x:start.x-115,y:start.y,id:1},{x:start.x-50,y:start.y,id:2}]);
    await touch(cdp,'touchEnd',[]);await expectCurrent(page,0);
    await touchDrag(page,cdp,-(await stepWidth(page))*.72);await expectCurrent(page,1);await cdp.detach();
  });
});
