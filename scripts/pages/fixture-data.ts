import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { fixtureAlbums, hiddenFixtures } from '../../tests/fixtures/photos/albums';
import { projectsForCase } from '../../tests/fixtures/projects/projects';
import { createFixtureSnapshot } from '../media/fixtures';
import { enumerateArchiveStates, listPath } from '../../src/lib/media/routes';
import { blogRoutes } from '../publishing/publication-policy';
import { sha256 } from '../publishing/audit-dist';

export const syntheticBlogPath = '/blog/synthetic-base-proof';
export const syntheticOlderPath = '/blog/synthetic-base-older';
export const syntheticCode = '<img src="/assets/blog/code-only.png"> /blog/code-only?x=1#literal';
export function syntheticBlogDocuments(): Record<string, string> {
  const document = (title: string, date: string, body: string, cover = false) => `---\n${JSON.stringify({ title, description: '仅供隔离双 base 验证，不是真实文章。', date, tags: ['合成验证'], draft: false, approved: true, ...(cover ? { cover: '/assets/blog/synthetic-base.png', coverAlt: '合成几何封面', coverCredit: 'SYNTHETIC' } : {}) }, null, 2)}\n---\n\n${body}\n`;
  return {
    'src/content/blog/synthetic-base-proof.md': document('SYNTHETIC 双 base 验证', '2026-01-03', `## 中文标题\n\n合成文字，仅用于隔离验证。\n\n![Markdown 合成图](/assets/blog/synthetic-base.png)\n\n[Markdown 内部链接](${syntheticOlderPath}?via=markdown#destination)\n\n## 重复标题\n\n${'合成阅读内容。'.repeat(100)}\n\n## 重复标题\n\n<a id="raw-link" href="${syntheticOlderPath}?via=raw#destination">Raw 内部链接</a>\n\n<img id="raw-image" src="/assets/blog/synthetic-base.png" srcset="/assets/blog/synthetic-base-small.png 320w, /assets/blog/synthetic-base.png 640w" sizes="320px" width="640" height="400" alt="Raw 合成图" />\n\n<video id="raw-video" poster="/assets/blog/synthetic-base.png" preload="none" width="320" height="200"></video>\n\n<a id="external-link" href="https://example.com/synthetic?q=1#external">外部链接</a>\n<a id="protocol-link" href="//example.com/synthetic">协议相对链接</a>\n<a id="hash-link" href="#中文标题">本页标题</a>\n<a id="query-link" href="?query=synthetic">本页查询</a>\n\n\`\`\`text\n${syntheticCode}\n\`\`\``, true),
    'src/content/blog/synthetic-base-older.md': document('SYNTHETIC 相邻文章', '2026-01-02', '## Destination\n\n合成相邻文章，供真实导航和片段定位验证。'),
  };
}
export async function writeFixtures(root: string, now: Date) {
  const publicFiles: Record<string, string> = {}, generatedSources: string[] = [];
  const assets: Record<string, { width: number; height: number; sha256: string }> = {};
  async function png(src: string, width: number, height: number, kind: 'photo' | 'project' | 'plain') {
    if (assets[src]) return;
    const target = join(root, 'public', src); await mkdir(dirname(target), { recursive: true });
    if (kind === 'plain') await sharp({ create: { width, height, channels: 3, background: '#c8c6bd' } }).png().toFile(target);
    else {
      const svg = kind === 'photo'
        ? `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#d7d4cc"/><rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="none" stroke="#292825" stroke-width="12"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#77746d"/></svg>`
        : `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ebe7de"/><rect x="4%" y="8%" width="27%" height="84%" fill="#bcc5cb"/><rect x="36.5%" y="8%" width="27%" height="84%" fill="#a1adb6"/><rect x="69%" y="8%" width="27%" height="84%" fill="#bcc5cb"/><circle cx="50%" cy="50%" r="${Math.min(width, height) / 4}" fill="#333e48"/></svg>`;
      await sharp(Buffer.from(svg)).png().toFile(target);
    }
    const digest = sha256(await readFile(target));
    assets[src] = { width, height, sha256: digest }; publicFiles[src.slice(1)] = digest;
  }
  async function source(path: string, body: string) {
    await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), body); generatedSources.push(path);
  }
  for (const { slug, ...data } of [...fixtureAlbums, ...hiddenFixtures]) await source(`src/content/photos/${slug}.md`, `---\n${JSON.stringify(data, null, 2)}\n---\n`);
  for (const album of fixtureAlbums) for (const photo of album.photos.filter(photo => !photo.draft && photo.approved)) for (const asset of [photo, ...photo.variants]) await png(asset.src, asset.width, asset.height, 'photo');
  const projects = projectsForCase('mixed');
  for (const { slug, body, ...data } of projects) await source(`src/content/projects/${slug}.md`, `---\n${JSON.stringify(data, null, 2)}\n---\n\n${body}\n`);
  for (const project of projects.filter(project => !project.draft && project.approved)) for (const image of project.images) for (const asset of [image, ...(image.variants ?? [])]) await png(asset.src, asset.width, asset.height, 'project');
  const snapshot = createFixtureSnapshot('mixed', now);
  snapshot.entries[0].blogHref = syntheticBlogPath;
  await source('src/data/media/public.json', JSON.stringify(snapshot, null, 2) + '\n');
  await png('/assets/media/synthetic-cover.png', 60, 90, 'plain');
  await png('/assets/blog/synthetic-base.png', 640, 400, 'project');
  await png('/assets/blog/synthetic-base-small.png', 320, 200, 'project');
  const blogs = syntheticBlogDocuments(); for (const [path, body] of Object.entries(blogs)) await source(path, body);
  const routes = [...fixtureAlbums.map(album => `/photos/${album.slug}`), ...projects.filter(project => !project.draft && project.approved).map(project => `/projects/${project.slug}`), ...enumerateArchiveStates(snapshot, now).map(listPath), ...snapshot.entries.map(entry => `/media/item/${entry.id}`), ...blogRoutes(blogs)];
  return { publicFiles, assets, generatedSources, routes, year: snapshot.entries[0].markDate.year, records: snapshot.entries.length, publicAlbums: fixtureAlbums.length, publicProjects: projects.filter(project => !project.draft && project.approved).length };
}
