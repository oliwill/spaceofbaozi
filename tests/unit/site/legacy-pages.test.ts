import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeLegacyPages } from '../../../scripts/publishing/write-legacy-pages';
import { legacyRoutes, type LegacyRoute } from '../../../src/lib/site/legacy-routes';
import { withBase, stripBase } from '../../../src/lib/site/paths';
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.map(d => rm(d, {recursive:true, force:true}))); dirs.length = 0; });
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'legacy-pages-')); dirs.push(dir);
  for (const route of ['blog', 'projects']) { await mkdir(join(dir,route)); await writeFile(join(dir,route,'index.html'), '<h1>Approved section</h1>'); }
  return dir;
}
const neutral: LegacyRoute = {from:'/thoughts/read-me', kind:'neutral', section:'/blog'};
describe('historical output', () => {
  it.each(['/', '/spaceofbaozi', '/spaceofbaozi/'])('writes all 11 routes under directory HTML output with base %s', async base => {
    const dir = await fixture(); const files = await writeLegacyPages(dir,base,legacyRoutes);
    expect(files).toHaveLength(11);
    for (const route of legacyRoutes) {
      const html = await readFile(join(dir,route.from.slice(1),'index.html'),'utf8');
      if (route.kind === 'neutral') {
        expect(html).toContain('这一页暂时没有可展示的内容。');
        expect(html).toContain('name="robots" content="noindex"');
        expect(html).toContain(`href="${withBase('/#home',base)}"`);
        if (route.section !== "/") expect(html).toContain(`href="${withBase(route.section,base)}"`);
        expect(html).not.toMatch(/<script|draft|approved|审核|未批准|\/resume|关于包子/);
      } else {
        expect(html).toContain(`href="${withBase(route.to,base)}"`);
        expect(html).toContain('location.search'); expect(html).toContain('location.hash');
        expect(html).not.toMatch(/301|http-equiv="refresh"/);
      }
    }
    expect(await readFile(join(dir,'blog/index.html'),'utf8')).toBe('<h1>Approved section</h1>');
  });
  it.each(['/../escape','/safe/../../escape','/%2e%2e/escape','/safe/%2fescape','/safe\\escape','//escape','/safe?x=1','/safe#x','relative','/safe/'])('rejects unsafe source %s',async from => {
    await expect(writeLegacyPages(await fixture(),'/',[{...neutral,from}])).rejects.toThrow(/path/i);
  });
  it('rejects duplicate source paths before writing any output',async () => {
    const dir=await fixture(); await expect(writeLegacyPages(dir,'/',[neutral,neutral])).rejects.toThrow(/duplicate/i);
    await expect(readFile(join(dir,'thoughts/read-me/index.html'))).rejects.toThrow();
  });
  it('rejects self redirects and mapping loops',async () => {
    const dir=await fixture();
    await expect(writeLegacyPages(dir,'/',[{from:'/blog',kind:'redirect',to:'/blog'}])).rejects.toThrow(/loop/i);
    await expect(writeLegacyPages(dir,'/',[{from:'/blog',kind:'redirect',to:'/projects'},{from:'/projects',kind:'redirect',to:'/blog'}])).rejects.toThrow(/loop/i);
  });
  it('fails when an approved redirect target was not built',async () => {
    const dir=await fixture(); await rm(join(dir,'blog'),{recursive:true});
    await expect(writeLegacyPages(dir,'/',legacyRoutes)).rejects.toThrow(/target/i);
    await expect(readFile(join(dir,'thoughts/index.html'))).rejects.toThrow();
  });
  it('rejects unapproved redirect destinations even when an HTML file exists',async () => {
    const dir=await fixture(); await mkdir(join(dir,'resume')); await writeFile(join(dir,'resume/index.html'),'draft');
    await expect(writeLegacyPages(dir,'/',[{from:'/about/me',kind:'redirect',to:'/resume'}] as unknown as LegacyRoute[])).rejects.toThrow(/approved/i);
  });
  it('never overwrites output, including conflicts later in the route list',async () => {
    const dir=await fixture(); await mkdir(join(dir,'about/me'),{recursive:true}); await writeFile(join(dir,'about/me/index.html'),'existing');
    await expect(writeLegacyPages(dir,'/',legacyRoutes)).rejects.toThrow(/conflict/i);
    expect(await readFile(join(dir,'about/me/index.html'),'utf8')).toBe('existing');
    await expect(readFile(join(dir,'thoughts/index.html'))).rejects.toThrow();
  });
  it('rejects output ancestors which are symlinks',async () => {
    const dir=await fixture(), outside=await fixture(); await symlink(outside,join(dir,'thoughts'));
    await expect(writeLegacyPages(dir,'/',[neutral])).rejects.toThrow(/symlink/i);
    await expect(readFile(join(outside,'read-me/index.html'))).rejects.toThrow();
  });
});
describe('explicit runtime base helpers', () => {
  it.each(['/', '/spaceofbaozi', '/spaceofbaozi/'])('prefixes exactly once and round trips query/hash for %s',base => {
    const path='/blog?tag=a#heading'; expect(stripBase(withBase(path,base),base)).toBe(path);
    expect(withBase(withBase(path,base),base)).toBe(withBase(path,base));
    expect(withBase('/#home',base)).toBe(base==='/'?'/#home':'/spaceofbaozi/#home');
    expect(stripBase('/spaceofbaoziness/blog','/spaceofbaozi')).toBeNull();
  });
  it.each(['../escape','https://example.com','//example.com'])('preserves non-root runtime URLs %s',path => expect(withBase(path,'/spaceofbaozi')).toBe(path));
  it.each(['/../escape','/%2e%2e/escape','/safe\\escape'])('rejects invalid runtime paths %s',path => expect(()=>withBase(path,'/')).toThrow(/path/i));
  it.each(['/../escape','//escape','https://example.com','/safe?x=1'])('rejects invalid bases %s',base => expect(()=>withBase('/blog',base)).toThrow(/base/i));
});
