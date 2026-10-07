import { afterEach, describe, expect, it } from 'vitest';
import { link, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanBuildMetadata } from '../../scripts/publishing/clean-build-metadata';
import { productionPolicy } from '../../scripts/publishing/publication-policy';

const temporary: string[] = [];
async function fixture() { const root = await realpath(await mkdtemp(join(tmpdir(), 'baozi-metadata-'))); temporary.push(root); return root; }
afterEach(async () => { for (const root of temporary.splice(0)) await rm(root, { recursive: true, force: true }); });
describe('known Astro build metadata cleanup', () => {
  for (const output of ['source/dist', 'external-dist']) it(`removes exact helper bytes at ${output} and preserves unrelated files`, async () => {
    const root = await fixture(), dist = join(root, output); await mkdir(dist, { recursive: true });
    await writeFile(join(dist, 'content-assets.mjs'), 'export default new Map();');
    await writeFile(join(dist, 'content-modules.mjs'), 'export default new Map();');
    await writeFile(join(dist, 'index.html'), 'public page');
    await writeFile(join(dist, 'unknown.mjs'), 'not approved');
    expect(await cleanBuildMetadata(dist)).toEqual(['content-assets.mjs', 'content-modules.mjs']);
    await expect(readFile(join(dist, 'content-assets.mjs'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(join(dist, 'index.html'), 'utf8')).toBe('public page');
    expect(await readFile(join(dist, 'unknown.mjs'), 'utf8')).toBe('not approved');
  });
  it('permits all helpers absent and formal policy requires none', async () => {
    expect(await cleanBuildMetadata(await fixture())).toEqual([]);
    expect((await productionPolicy(process.cwd())).generatedFiles).toEqual({});
  });
  it('validates every existing helper before removing any', async () => {
    const root = await fixture(); await writeFile(join(root, 'content-assets.mjs'), 'export default new Map();');
    await writeFile(join(root, 'content-modules.mjs'), 'unapproved content');
    await expect(cleanBuildMetadata(root)).rejects.toThrow('changed-build-metadata');
    expect(await readFile(join(root, 'content-assets.mjs'), 'utf8')).toBe('export default new Map();');
    expect(await readFile(join(root, 'content-modules.mjs'), 'utf8')).toBe('unapproved content');
  });
  it('rejects symlink files without touching their target', async () => {
    const root = await fixture(), target = join(root, 'target'); await writeFile(target, 'export default new Map();');
    await symlink('target', join(root, 'content-assets.mjs'));
    await expect(cleanBuildMetadata(root)).rejects.toThrow('unsafe-metadata-file');
    expect(await readFile(target, 'utf8')).toBe('export default new Map();');
  });
  it('rejects a symlink ancestor even when its known children are absent', async () => {
    const root = await fixture(); await mkdir(join(root, 'target')); await symlink('target', join(root, 'collections'));
    await expect(cleanBuildMetadata(root)).rejects.toThrow('unsafe-metadata-ancestor');
  });
  it('rejects directories and hard links in known file positions', async () => {
    const root = await fixture(); await mkdir(join(root, 'content-assets.mjs'));
    await expect(cleanBuildMetadata(root)).rejects.toThrow('unsafe-metadata-file');
    await rm(join(root, 'content-assets.mjs'), { recursive: true });
    await writeFile(join(root, 'original'), 'export default new Map();'); await link(join(root, 'original'), join(root, 'content-assets.mjs'));
    await expect(cleanBuildMetadata(root)).rejects.toThrow('unsafe-metadata-file');
  });
  it('rejects a symlink output root', async () => {
    const root = await fixture(); await mkdir(join(root, 'target')); await symlink('target', join(root, 'alias'));
    await expect(cleanBuildMetadata(join(root, 'alias'))).rejects.toThrow('unsafe-metadata-root');
  });
});
