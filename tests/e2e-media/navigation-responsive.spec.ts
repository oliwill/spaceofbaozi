import {test,expect} from '@playwright/test';
test('four active navigation items and the disabled Resume slot keep original type sizes and full mobile row',async({page})=>{
 for(const width of [360,390,767,768,1024,1440]){
  await page.setViewportSize({width,height:900});for(const path of ['/#home','/blog/ryoutei-menu-05','/photos','/media']){await page.goto(path);const nav=page.getByRole('navigation',{name:'主要栏目'});const links=nav.locator('a');
  await expect(nav.locator('.shell-links__inactive')).toHaveAttribute('aria-disabled','true');
  await expect(nav.locator('.shell-links__inactive')).not.toHaveAttribute('href');
  await expect(links).toHaveCount(4);expect(await links.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')))).toEqual(['/blog','/photos','/projects','/media']);
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(path==='/#home'?0:1);
  const boxes=await links.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,font:getComputedStyle(n).fontSize,number:getComputedStyle(n.querySelector('span')!).fontSize};}));
  for(const box of boxes){expect(box.h).toBeGreaterThanOrEqual(44);expect(box.font).toBe(width<=767?'12px':'16px');expect(box.number).toBe(width<=767?'9px':'12px');}
  if(width<=767){expect(new Set(boxes.map(b=>b.y)).size).toBe(1);for(let i=1;i<boxes.length;i++)expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i-1].x+boxes[i-1].w);}
  for(const link of await links.all()){expect(await link.evaluate(node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
 }
});
