import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { auditDist, type DistPolicy } from '../../scripts/publishing/audit-dist';
import { writeLegacyPages } from '../../scripts/publishing/write-legacy-pages';
const dirs: string[] = []; afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const site = 'https://example.test';
async function fixture(base = '/') {
  const dir = await mkdtemp(join(tmpdir(), 'dist-audit-')); dirs.push(dir);
  const prefix = base === '/' ? '' : base;
  const policy: DistPolicy = { htmlRoutes: ['/', '/blog', '/projects', '/blog/中文', '/404'], publicFiles: { 'assets/blog/sample.webp': hash('image'), 'fonts/font.woff2': hash('font') }, generatedFiles: {}, legacyRoutes: [{ from: '/thoughts', kind: 'redirect', to: '/blog' }, { from: '/about/me', kind: 'neutral', section: '/' }], runtimeManifests: [] };
  async function put(path: string, body: string) { await mkdir(dirname(join(dir, path)), { recursive: true }); await writeFile(join(dir, path), body); }
  function html(route: string, body = '') { const url = new URL(`${site}${prefix}${route}`).href; return `<!doctype html><html><head><link rel="canonical" href="${url}"><meta property="og:url" content="${url}"></head><body><main id="home">${body}</main></body></html>`; }
  for (const route of policy.htmlRoutes) await put(route === '/404' ? '404.html' : `${route.slice(1)}${route === '/' ? '' : '/'}index.html`, html(route));
  await put('assets/blog/sample.webp', 'image'); await put('fonts/font.woff2', 'font');
  await writeLegacyPages(dir, base, policy.legacyRoutes);
  return { dir, policy, put, html, prefix };
}
describe('output inventory and reference graph', () => {
  it.each(['/', '/spaceofbaozi'])('accepts declared output and encoded/hash/query refs at %s', async base => {
    const f = await fixture(base);
    await f.put('index.html', f.html('/', `<a href="${f.prefix}/blog/%E4%B8%AD%E6%96%87?q=1#home">Read</a><img src="${f.prefix}/assets/blog/sample.webp"><a href="https://elsewhere.test/page">External</a><pre>&lt;img src="/missing.webp"&gt;</pre><img srcset="${f.prefix}/assets/blog/sample.webp 1x, ${f.prefix}/assets/blog/sample.webp 2x"><video poster="${f.prefix}/assets/blog/sample.webp"></video>`));
    expect(await auditDist(f.dir, site, base, f.policy)).toEqual([]);
  });
  it.each(['resume/index.html', 'lab/intro/index.html', 'blog/private/index.html', 'docs/private.md', 'evidence/run.json', '_astro/app.js.map', '_redirects', 'assets/intro/new.webp', 'collections/private.schema.json', '_astro/private.abcdef.webp'])('rejects undeclared file %s', async file => {
    const f = await fixture(); await f.put(file, 'unexpected'); expect(await auditDist(f.dir, site, '/', f.policy)).toContainEqual(expect.objectContaining({ code: 'unexpected-file', path: file }));
  });
  it('requires public files and exact preserved bytes', async () => {
    const f = await fixture(); await f.put('assets/blog/sample.webp', 'changed'); await rm(join(f.dir, 'fonts/font.woff2'));
    const issues = await auditDist(f.dir, site, '/', f.policy);
    expect(issues).toContainEqual(expect.objectContaining({ code: 'file-identity-changed' })); expect(issues).toContainEqual(expect.objectContaining({ code: 'missing-file' }));
  });
  it('rejects neutral copy contamination despite noindex', async () => {
    const f = await fixture(); const path = join(f.dir, 'about/me/index.html'); await writeFile(path, (await readFile(path, 'utf8')).replace('</main>', '<p>Private original text</p></main>'));
    expect(await auditDist(f.dir, site, '/', f.policy)).toContainEqual(expect.objectContaining({ code: 'legacy-content-mismatch' }));
  });
  it.each(['<img src="/missing.webp">', '<img srcset="/assets/blog/sample.webp 1x, /missing.webp 2x">', '<video poster="/missing.webp">', '<a href="/blog#missing">broken</a>', '<a href="https://example.test/missing">broken</a>', '<div style="background:url(/missing.webp)"></div>', '<style>@font-face{src:url(/missing.woff2)}</style>'])('rejects missing references: %s', async body => {
    const f = await fixture(); await f.put('index.html', f.html('/', body)); expect((await auditDist(f.dir, site, '/', f.policy)).length).toBeGreaterThan(0);
  });
  it.each(['/spaceofbaozi/spaceofbaozi/blog', '/blog', '/spaceofbaozi/%2e%2e/blog', '/spaceofbaozi/assets%2fblog/sample.webp', '/spaceofbaozi/%252e%252e/private'])('rejects base/path attack %s', async target => {
    const f = await fixture('/spaceofbaozi'); await f.put('index.html', f.html('/', `<a href="${target}">bad</a>`)); expect((await auditDist(f.dir, site, '/spaceofbaozi', f.policy)).length).toBeGreaterThan(0);
  });
  it('rejects root traversal before URL normalization hides it', async () => {
    const f = await fixture(); await f.put('index.html', f.html('/', '<a href="/../blog">escape</a>'));
    expect(await auditDist(f.dir, site, '/', f.policy)).toContainEqual(expect.objectContaining({ code: 'unsafe-reference' }));
  });
  it('rejects missing CSS imports', async () => {
    const f = await fixture(); await f.put('_astro/a.abc123.css', '@import "./missing.css";');
    expect(await auditDist(f.dir, site, '/', f.policy)).toContainEqual(expect.objectContaining({ code: 'missing-reference' }));
  });
  it('rejects wrong canonical and og even when those paths exist', async () => {
    const f = await fixture(); await f.put('blog/index.html', f.html('/')); expect(await auditDist(f.dir, site, '/', f.policy)).toContainEqual(expect.objectContaining({ code: 'canonical-mismatch' }));
  });
  it('requires redirect target and rejects policy loops/collisions', async () => {
    const f = await fixture(); await rm(join(f.dir, 'blog/index.html'));
    expect((await auditDist(f.dir, site, '/', f.policy)).length).toBeGreaterThan(0);
    f.policy.legacyRoutes.push({ from: '/thoughts', kind: 'redirect', to: '/projects' });
    expect(await auditDist(f.dir, site, '/', f.policy)).toContainEqual(expect.objectContaining({ code: 'invalid-policy' }));
  });
  it('validates compiled CSS font/import URLs and runtime manifest src', async () => {
    const f = await fixture(); await f.put('_astro/a.abc123.css', '@font-face{src:url(../fonts/missing.woff2)}');
    await f.put('manifest/runtime.json', '{"sequences":{"ball":{"src":"/missing.webp"}}}'); f.policy.publicFiles['manifest/runtime.json'] = hash('{"sequences":{"ball":{"src":"/missing.webp"}}}'); f.policy.runtimeManifests.push('manifest/runtime.json');
    const issues = await auditDist(f.dir, site, '/', f.policy); expect(issues.filter(i => i.code === 'missing-reference')).toHaveLength(2);
  });
  it('rejects relative nested-404 resources', async () => {
    const f = await fixture(); await f.put('404.html', f.html('/404', '<img src="assets/blog/sample.webp">')); expect(await auditDist(f.dir, site, '/', f.policy)).toContainEqual(expect.objectContaining({ code: 'nested-404-relative-resource' }));
  });
  it('rejects symlink escape and paths escaping supplied policy', async () => {
    const f = await fixture(); await symlink('/tmp', join(f.dir, 'outside'));
    expect(await auditDist(f.dir, site, '/', f.policy)).toContainEqual(expect.objectContaining({ code: 'unsafe-filesystem-entry' }));
    f.policy.publicFiles['../outside'] = hash('oops'); expect(await auditDist(f.dir, site, '/', f.policy)).toContainEqual(expect.objectContaining({ code: 'invalid-policy' }));
  });
});


describe.each(['/', '/spaceofbaozi'])('CSS escaped references at base %s', base => {
  const forms = [
    ['escaped argument', (path: string) => String.raw`url(\2f ${path.slice(1)})`],
    ['escaped function', (path: string) => String.raw`u\72l(${path})`],
    ['quoted escaped argument/function', (path: string) => String.raw`u\72l('\2f ${path.slice(1)}')`],
  ] as const;
  for (const context of ['compiled', 'inline', 'style'] as const) {
    async function cssFixture(value: string) {
      const f = await fixture(base);
      if (context === 'compiled') await f.put('_astro/escaped.abcdef.css', `a{background:${value}}`);
      else await f.put('index.html', f.html('/', context === 'inline' ? `<div style="background:${value}"></div>` : `<style>a{background:${value}}</style>`));
      return f;
    }
    it.each(forms)(`${context}: catches missing resource with %s`, async (_name, form) => {
      const prefix = base === '/' ? '' : base; const f = await cssFixture(form(`${prefix}/missing.webp`));
      expect(await auditDist(f.dir, site, base, f.policy)).toContainEqual(expect.objectContaining({ code: 'missing-reference' }));
    });
    it.each(forms)(`${context}: permits declared existing resource with %s`, async (_name, form) => {
      const prefix = base === '/' ? '' : base; const f = await cssFixture(form(`${prefix}/assets/blog/sample.webp`));
      expect(await auditDist(f.dir, site, base, f.policy)).toEqual([]);
    });
  }
  it('decodes escaped import names and strings', async () => {
    const f = await fixture(base);
    await f.put('_astro/escaped.abcdef.css', String.raw`@im\70ort '\2f ${f.prefix.slice(1)}${f.prefix ? '/' : ''}_astro/dependency.abcdef.css';`);
    expect(await auditDist(f.dir, site, base, f.policy)).toContainEqual(expect.objectContaining({ code: 'missing-reference' }));
    await f.put('_astro/dependency.abcdef.css', 'a{color:red}');
    expect(await auditDist(f.dir, site, base, f.policy)).toEqual([]);
  });
  it('does not treat a quoted content string or a comment as a fetched URL', async () => {
    const f = await fixture(base); await f.put('_astro/literal.abcdef.css', 'a::before{content:"url(/missing.webp)"}/* url(/other-missing.webp) */');
    expect(await auditDist(f.dir, site, base, f.policy)).toEqual([]);
  });
});
