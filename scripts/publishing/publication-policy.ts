import { readdir, lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getContentEntryIdAndSlug } from '../../node_modules/astro/dist/content/utils.js';
import { legacyRoutes } from '../../src/lib/site/legacy-routes';
import { parsePublicSnapshot } from '../../src/lib/media/publicSnapshot.server';
import { enumerateArchiveStates, listPath } from '../../src/lib/media/routes';
import { parseArticle, readLocalDocuments, assertArticlePath } from './content-snapshot';
import { sha256, type DistPolicy } from './audit-dist';
import inventory from './publication-files.json';
export function blogRoutes(documents: Record<string, string>): string[] {
  const routes: string[] = []; const tags = new Set<string>(); const identities = new Set<string>();
  for (const path of Object.keys(documents).sort()) {
    assertArticlePath(path); const article = parseArticle(documents[path]);
    const { slug } = getContentEntryIdAndSlug({ entry: pathToFileURL(`/candidate/${path}`), contentDir: pathToFileURL('/candidate/src/content/blog/'), collection: '' });
    if (!slug || identities.has(slug) || slug === 'tag' || slug.startsWith('tag/')) throw new Error('article-route-collision');
    identities.add(slug);
    if (!article.identity.public) continue;
    routes.push(`/blog/${slug}`);
    for (const tag of article.tags) {
      if (!tag.trim() || /[\\/%?#\u0000-\u001f]/.test(tag) || tag === '.' || tag === '..') throw new Error('unsafe-blog-tag');
      tags.add(tag);
    }
  }
  return [...routes, ...[...tags].sort().map(tag => `/blog/tag/${tag}`)];
}
async function filesUnder(root: string, relative: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  async function walk(path: string): Promise<void> {
    for (const name of await readdir(join(root, path))) {
      const child = `${path}/${name}`; const stat = await lstat(join(root, child));
      if (stat.isSymbolicLink() || !stat.isDirectory() && !stat.isFile()) throw new Error('source-filesystem-entry');
      if (stat.isDirectory()) await walk(child); else files[child] = sha256(await readFile(join(root, child)));
    }
  }
  await walk(relative); return files;
}
export async function productionPolicy(root: string, now = new Date()): Promise<DistPolicy> {
  if (!Number.isFinite(+now)) throw new Error('invalid-policy-time');
  const publicFiles: Record<string, string> = {};
  const sourcePublic = await filesUnder(root, 'public');
  for (const [path, digest] of Object.entries(inventory.publicFiles)) if (sourcePublic[`public/${path}`] !== digest) throw new Error(`preserved-public-source-changed: ${path}`);
  for (const [source, digest] of Object.entries(sourcePublic)) {
    const path = source.slice('public/'.length);
    if (!(path in inventory.publicFiles) && !/^assets\/blog\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.(jpg|jpeg|png|webp)$/.test(path)) throw new Error(`unapproved-public-source: ${path}`);
    if (path !== '_redirects') publicFiles[path] = digest;
  }
  const contentFiles = await filesUnder(root, 'src/content');
  const fixedContent = Object.fromEntries(Object.entries(contentFiles).filter(([path]) => !path.startsWith('src/content/blog/') && !path.startsWith('src/content/_templates/')));
  if (Object.keys(fixedContent).length !== Object.keys(inventory.nonBlogSources).length || Object.entries(inventory.nonBlogSources).some(([path, digest]) => fixedContent[path] !== digest)) throw new Error('non-blog-publication-scope-changed');
  const media = await readFile(join(root, 'src/data/media/public.json'));
  if (sha256(media) !== inventory.mediaSource) throw new Error('media-publication-scope-changed');
  const snapshot = parsePublicSnapshot(JSON.parse(media.toString('utf8')), now);
  return {
    htmlRoutes: ['/', '/404', '/about', '/blog', '/books', '/drinks', '/movies', '/music', '/photos', '/projects', '/media',
      ...blogRoutes(await readLocalDocuments(root)), ...enumerateArchiveStates(snapshot, now).map(listPath)],
    publicFiles, generatedFiles: {}, legacyRoutes: [...legacyRoutes], runtimeManifests: ['manifest/asset-manifest.v2.json'],
  };
}
