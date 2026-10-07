import { lstat, mkdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { normalizeBase, withBase } from '../../src/lib/site/paths';
import type { LegacyRoute } from '../../src/lib/site/legacy-routes';

const approvedTargets = new Set(['/blog', '/projects']);
function validateRoutePath(path: string): void {
  if (!/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/.test(path)) throw new Error(`Invalid legacy path: ${path}`);
}
async function statIfExists(path: string) {
  try { return await lstat(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}
async function assertSafeAncestors(root: string, file: string): Promise<void> {
  for (let path = dirname(file); path !== root; path = dirname(path)) {
    const stat = await statIfExists(path);
    if (stat?.isSymbolicLink()) throw new Error(`Legacy output symlink conflict: ${path}`);
    if (stat && !stat.isDirectory()) throw new Error(`Legacy output directory conflict: ${path}`);
  }
}
const htmlEscape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const shell = (body: string, script = '') => `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>baozi.space</title><style>body{margin:0;padding:clamp(24px,6vw,80px);background:#eef0ea;color:#292825;font:16px/1.8 system-ui,sans-serif;background-image:radial-gradient(circle,rgba(63,78,82,.14) 1px,transparent 1px);background-size:24px 24px}main{max-width:680px;margin:auto;padding:clamp(24px,5vw,56px);background:#faf9f6}a{color:inherit}nav{display:flex;gap:24px;flex-wrap:wrap}</style></head><body><main>${body}</main>${script}</body></html>\n`;
export function legacyPageHTML(route: LegacyRoute, base: string): string {
  if (route.kind === 'neutral') {
    const home = htmlEscape(withBase('/#home', base));
    const section = route.section === '/' ? '' : `<a href="${htmlEscape(withBase(route.section, base))}">${route.section === '/blog' ? '文章' : '项目'}</a>`;
    return shell(`<p>这一页暂时没有可展示的内容。</p><nav aria-label="页面导航"><a href="${home}">回到首页</a>${section}</nav>`);
  }
  const to = withBase(route.to, base);
  const script = `<script>location.replace(${JSON.stringify(to)} + location.search + location.hash);</script>`;
  return shell(`<p>页面已移至新位置。</p><a href="${htmlEscape(to)}">继续浏览${route.to === '/blog' ? '文章' : '项目'}</a>`, script);
}

export async function writeLegacyPages(distDir: string, base: string, routes: readonly LegacyRoute[]): Promise<string[]> {
  normalizeBase(base);
  const root = await realpath(resolve(distDir));
  const sources = new Map<string, LegacyRoute>();
  for (const route of routes) {
    validateRoutePath(route.from);
    if (sources.has(route.from)) throw new Error(`Duplicate legacy path: ${route.from}`);
    sources.set(route.from, route);
  }
  for (const route of routes) {
    const visited = new Set<string>();
    let current: LegacyRoute | undefined = route;
    while (current?.kind === 'redirect') {
      if (visited.has(current.from)) throw new Error(`Legacy redirect loop: ${route.from}`);
      visited.add(current.from);
      current = sources.get(current.to);
    }
  }
  const files: string[] = [];
  for (const route of routes) {
    if (route.kind === 'redirect') {
      validateRoutePath(route.to);
      if (!approvedTargets.has(route.to) || sources.has(route.to)) throw new Error(`Legacy redirect target is not an approved destination: ${route.to}`);
      const target = join(root, route.to.slice(1), 'index.html');
      await assertSafeAncestors(root, target);
      if (!(await statIfExists(target))?.isFile()) throw new Error(`Missing approved redirect target: ${route.to}`);
    } else if (route.kind !== 'neutral' || !['/', ...approvedTargets].includes(route.section)) {
      throw new Error('Invalid neutral section target');
    }
    const file = join(root, route.from.slice(1), 'index.html');
    await assertSafeAncestors(root, file);
    if (await statIfExists(file)) throw new Error(`Legacy output conflict: ${route.from}`);
    files.push(file);
  }
  for (let index = 0; index < routes.length; index++) {
    const file = files[index];
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, legacyPageHTML(routes[index], base), { flag: 'wx' });
  }
  return files;
}
