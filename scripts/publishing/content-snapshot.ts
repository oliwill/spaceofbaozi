import { readFile, readdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDocument, isMap } from 'yaml';
import { entrySchema } from '../../src/lib/content/entrySchema';
import { isPublishable } from '../../src/lib/content/gates';
export interface Scope { repository: string; ref: string; environment: 'github-pages' }
export interface ArticleIdentity { date: string; updated?: string; draft: boolean; approved: boolean; public: boolean }
export interface ContentSnapshot extends Scope { sourceSha: string; articles: Record<string, ArticleIdentity> }
export function assertSha(sha: string): void { if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('invalid-source-sha'); }
export function assertScope(scope: Scope): void {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(scope.repository) || scope.repository.split('/').some(p => p === '.' || p === '..') ||
    !/^refs\/heads\/[A-Za-z0-9_/-]+$/.test(scope.ref) || scope.ref.includes('//') || scope.ref.endsWith('/') || scope.environment !== 'github-pages') throw new Error('invalid-publication-scope');
}
export function assertArticlePath(path: string): void {
  if (!/^src\/content\/blog\/(?:[^/]+\/)*[^/]+\.mdx?$/.test(path) || path.split('/').some(p => p === '.' || p === '..') || /[\\%\u0000-\u001f]/.test(path)) throw new Error('invalid-article-path');
}
function dateValue(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(value)) throw new Error('invalid-date');
  const date = new Date(value);
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value.slice(0, 10)) throw new Error('invalid-date');
  return date.toISOString();
}
export function parseArticle(text: string): { identity: ArticleIdentity; tags: string[] } {
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) throw new Error('missing-frontmatter');
  const doc = parseDocument(match[1], { uniqueKeys: true, schema: 'core' });
  if (doc.errors.length || !isMap(doc.contents)) throw new Error('invalid-frontmatter');
  const raw: Record<string, unknown> = doc.toJS();
  if ('slug' in raw) throw new Error('raw-slug-forbidden');
  if (typeof raw.title !== 'string' || !raw.title.trim()) throw new Error('invalid-title');
  const date = dateValue(raw.date);
  const updated = 'updated' in raw ? dateValue(raw.updated) : undefined;
  if (updated && updated < date) throw new Error('updated-before-first-date');
  const parsed = entrySchema.safeParse(raw);
  if (!parsed.success) throw new Error('invalid-article-fields');
  const { draft, approved, tags } = parsed.data;
  return { identity: { date, ...(updated ? { updated } : {}), draft, approved, public: isPublishable({ draft, approved }) }, tags };
}
export function snapshotFromDocuments(identity: Scope & { sourceSha: string }, docs: Record<string, string>): ContentSnapshot {
  assertScope(identity); assertSha(identity.sourceSha);
  const articles: ContentSnapshot['articles'] = {};
  for (const path of Object.keys(docs).sort()) {
    assertArticlePath(path);
    try { articles[path] = parseArticle(docs[path]).identity; } catch (error) { throw new Error(`${path}: ${(error as Error).message}`); }
  }
  return { ...identity, articles };
}
export async function readLocalDocuments(root: string): Promise<Record<string, string>> {
  const documents: Record<string, string> = {};
  async function walk(relative: string): Promise<void> {
    for (const name of await readdir(join(root, relative))) {
      const path = `${relative}/${name}`; const stat = await lstat(join(root, path));
      if (stat.isSymbolicLink()) throw new Error('content-symlink');
      if (stat.isDirectory()) await walk(path);
      else if (/\.mdx?$/.test(name)) { assertArticlePath(path); documents[path] = await readFile(join(root, path), 'utf8'); }
    }
  }
  await walk('src/content/blog'); return documents;
}
export async function readLocalSnapshot(root: string, identity: Scope & { sourceSha: string }): Promise<ContentSnapshot> {
  return snapshotFromDocuments(identity, await readLocalDocuments(root));
}
