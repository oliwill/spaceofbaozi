import { describe, expect, it } from 'vitest';
import { cp, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { productionPolicy, blogRoutes } from '../../scripts/publishing/publication-policy';
const doc = (gate: string, tags = '[样本]') => `---\ntitle: Sample\ndate: 2024-01-01\ntags: ${tags}\n${gate}\n---\nSample`;
describe('publication policy derives only validated approved Blog routes', () => {
  it('only false/true contributes details and tags', () => {
    const docs = Object.fromEntries(['draft: true\napproved: true', 'draft: false\napproved: false', 'draft: true\napproved: false', 'draft: false\napproved: true'].map((g, i) => [`src/content/blog/p${i}.md`, doc(g, `[tag${i}]`)]));
    expect(blogRoutes(docs)).toEqual(['/blog/p3', '/blog/tag/tag3']);
  });
  it('validates drafts before deriving any allow list', () => expect(() => blogRoutes({ 'src/content/blog/private.md': doc('draft: "false"\napproved: false') })).toThrow());
  it('uses the actual Astro filename identity for Chinese and uppercase names', () => expect(blogRoutes({ 'src/content/blog/中文 Name.md': doc('draft: false\napproved: true') })).toEqual(['/blog/中文-name', '/blog/tag/样本']));
  it('rejects route collisions and dangerous tags', () => {
    expect(() => blogRoutes({ 'src/content/blog/A.md': doc('approved: true'), 'src/content/blog/a.md': doc('approved: true') })).toThrow();
    expect(() => blogRoutes({ 'src/content/blog/a.md': doc('approved: true', '["../private"]') })).toThrow();
  });
  it('accepts an explicitly published new Blog plus safe source-matched image, but no new non-Blog assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'publishing-policy-'));
    try {
      for (const path of ['public', 'src/content', 'src/data/media']) {
        await mkdir(join(root, path), { recursive: true }); await cp(path, join(root, path), { recursive: true });
      }
      await writeFile(join(root, 'src/content/blog/synthetic-public.md'), doc('draft: false\napproved: true', '[synthetic]'));
      await writeFile(join(root, 'public/assets/blog/synthetic.webp'), 'fixture-only-selected-bytes');
      const policy = await productionPolicy(root);
      expect(policy.htmlRoutes).toContain('/blog/synthetic-public'); expect(policy.htmlRoutes).toContain('/blog/tag/synthetic');
      expect(policy.publicFiles).toHaveProperty('assets/blog/synthetic.webp');
      await writeFile(join(root, 'public/assets/photos/not-approved.webp'), 'fixture-only');
      await expect(productionPolicy(root)).rejects.toThrow('unapproved-public-source');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('preserves current real scope and derives year routes from the existing media model', async () => {
    const policy = await productionPolicy(process.cwd(), new Date('2027-06-01T00:00:00Z'));
    expect(policy.htmlRoutes).toContain('/media/y/2027'); expect(policy.htmlRoutes).not.toContain('/media/y/2026');
    expect(policy.htmlRoutes).toContain('/blog');
    expect(Object.keys(policy.publicFiles).length).toBeGreaterThanOrEqual(27); expect(policy.publicFiles).not.toHaveProperty('_redirects');
  });
});
