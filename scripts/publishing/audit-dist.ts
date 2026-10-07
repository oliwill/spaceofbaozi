import { lstat, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import postcss from 'postcss';
import { tokenize, tokenTypes, ident, string as cssString, url as cssUrl } from 'css-tree';
import { normalizeBase, stripBase, withBase } from '../../src/lib/site/paths';
import type { LegacyRoute } from '../../src/lib/site/legacy-routes';
import { legacyPageHTML } from './write-legacy-pages';
import type { Issue } from './check-content-changes';
export interface DistPolicy {
  htmlRoutes: string[];
  publicFiles: Record<string, string>;
  generatedFiles: Record<string, string>;
  legacyRoutes: LegacyRoute[];
  runtimeManifests: string[];
}
export const sha256 = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex');
export const routeFile = (route: string): string => route === '/404' ? '404.html' : `${route.slice(1)}${route === '/' ? '' : '/'}index.html`;
type Node = DefaultTreeAdapterMap['node'];
interface Reference { value: string; resource: boolean; canonical?: boolean }
interface Page { route: string; ids: Set<string>; refs: Reference[]; canonical: string[]; og: string[] }
function safePath(path: string): boolean {
  return path !== '' && !path.startsWith('/') && !/[\\%?#\u0000-\u001f]/.test(path) && path.split('/').every(s => s && s !== '.' && s !== '..');
}
function normalizeCssResourceNames(value: string): string {
  let normalized = ''; let cursor = 0;
  tokenize(value, (type, start, end) => {
    const isUrl = type === tokenTypes.Function && ident.decode(value.slice(start, end - 1)).toLowerCase() === 'url';
    const isImport = type === tokenTypes.AtKeyword && ident.decode(value.slice(start + 1, end)).toLowerCase() === 'import';
    if (isUrl || isImport) {
      normalized += value.slice(cursor, start) + (isUrl ? 'url(' : '@import'); cursor = end;
    }
  });
  return normalized + value.slice(cursor);
}
function cssValueUrls(value: string, isImport = false): string[] {
  const tokens: { type: number; text: string }[] = [];
  tokenize(value, (type, start, end) => {
    if (type === tokenTypes.BadString || type === tokenTypes.BadUrl) throw new Error('invalid-css-resource-token');
    if (type !== tokenTypes.WhiteSpace && type !== tokenTypes.Comment) tokens.push({ type, text: value.slice(start, end) });
  });
  const urls: string[] = [];
  if (isImport && tokens[0]?.type === tokenTypes.String) urls.push(cssString.decode(tokens[0].text));
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === tokenTypes.Url) urls.push(cssUrl.decode(token.text));
    else if (token.type === tokenTypes.Function && token.text === 'url(') {
      if (tokens[index + 1]?.type !== tokenTypes.String || tokens[index + 2]?.type !== tokenTypes.RightParenthesis) throw new Error('invalid-css-url-function');
      urls.push(cssString.decode(tokens[index + 1].text)); index += 2;
    }
  }
  return urls;
}
function cssUrls(text: string): string[] {
  const urls: string[] = [];
  const root = postcss.parse(normalizeCssResourceNames(text));
  root.walkDecls(decl => { urls.push(...cssValueUrls(decl.value)); });
  root.walkAtRules(rule => { urls.push(...cssValueUrls(rule.params, ident.decode(rule.name).toLowerCase() === 'import')); });
  return urls;
}
function srcsetUrls(value: string): string[] {
  const urls: string[] = []; let cursor = 0;
  while (cursor < value.length) {
    while (cursor < value.length && /[\s,]/.test(value[cursor])) cursor++;
    const start = cursor; while (cursor < value.length && !/\s/.test(value[cursor])) cursor++;
    const token = value.slice(start, cursor); const url = token.replace(/,+$/, ''); if (url) urls.push(url);
    if (url.length !== token.length) continue;
    let depth = 0;
    while (cursor < value.length) { const char = value[cursor++]; if (char === '(') depth++; if (char === ')') depth--; if (char === ',' && !depth) break; }
  }
  return urls;
}
function inspectHtml(html: string, route: string): Page {
  const page: Page = { route, ids: new Set(), refs: [], canonical: [], og: [] };
  const visit = (node: Node) => {
    if ('tagName' in node) {
      const attrs = Object.fromEntries(node.attrs.map(a => [a.name, a.value]));
      if (attrs.id) page.ids.add(attrs.id);
      if (node.tagName === 'base') throw new Error('html-base-forbidden');
      const canonical = node.tagName === 'link' && attrs.rel === 'canonical';
      if (canonical) page.canonical.push(attrs.href);
      if (node.tagName === 'meta' && attrs.property === 'og:url') page.og.push(attrs.content);
      for (const key of ['href', 'src', 'poster']) if (attrs[key]) page.refs.push({ value: attrs[key], resource: key !== 'href' || ['link', 'use'].includes(node.tagName), canonical });
      if (attrs.srcset) page.refs.push(...srcsetUrls(attrs.srcset).map(value => ({ value, resource: true })));
      if (attrs.style) page.refs.push(...cssUrls(`a{${attrs.style}}`).map(value => ({ value, resource: true })));
      if (node.tagName === 'style') page.refs.push(...cssUrls(node.childNodes.filter(n => n.nodeName === '#text').map(n => (n as DefaultTreeAdapterMap['textNode']).value).join('')).map(value => ({ value, resource: true })));
      if ('content' in node) visit(node.content as Node);
    }
    if ('childNodes' in node) node.childNodes.forEach(visit);
  };
  visit(parse(html)); return page;
}
export async function auditDist(distDir: string, site: string, base: string, policy: DistPolicy): Promise<Issue[]> {
  const issues: Issue[] = []; const add = (code: string, path?: string) => issues.push({ code, ...(path ? { path } : {}) });
  const origin = new URL(site).origin; const prefix = normalizeBase(base);
  const expected = new Map<string, string | null>(); const routes = new Map<string, string>();
  try {
    for (const route of policy.htmlRoutes) {
      if (!route.startsWith('/') || (route !== '/' && !safePath(route.slice(1))) || routes.has(route)) throw new Error('route');
      routes.set(route, routeFile(route)); expected.set(routeFile(route), null);
    }
    for (const route of policy.legacyRoutes) {
      if (!safePath(route.from.slice(1)) || !route.from.startsWith('/') || routes.has(route.from)) throw new Error('legacy-route');
      if (route.kind === 'redirect' && !policy.htmlRoutes.includes(route.to)) throw new Error('redirect-target');
      if (route.kind === 'neutral' && !policy.htmlRoutes.includes(route.section)) throw new Error('neutral-target');
      routes.set(route.from, routeFile(route.from)); expected.set(routeFile(route.from), null);
    }
    for (const [path, hash] of Object.entries({ ...policy.publicFiles, ...policy.generatedFiles })) {
      if (!safePath(path) || !/^[a-f0-9]{64}$/.test(hash) || expected.has(path) || path === '_redirects') throw new Error('file');
      expected.set(path, hash);
    }
    if (policy.runtimeManifests.some(path => !expected.has(path))) throw new Error('manifest');
  } catch { return [{ code: 'invalid-policy' }]; }
  const files = new Map<string, Buffer>();
  async function walk(path = ''): Promise<void> {
    const stat = await lstat(join(distDir, path));
    if (stat.isSymbolicLink() || (!stat.isDirectory() && (!stat.isFile() || stat.nlink > 1))) { add('unsafe-filesystem-entry', path || '.'); return; }
    if (stat.isDirectory()) { for (const name of await readdir(join(distDir, path))) await walk(path ? `${path}/${name}` : name); return; }
    if (!safePath(path)) { add('unsafe-filesystem-entry', path); return; }
    files.set(path, await readFile(join(distDir, path)));
  }
  await walk();
  for (const [path, bytes] of files) {
    if (!expected.has(path) && !/^_astro\/[A-Za-z0-9_.-]+\.[A-Za-z0-9_-]{6,}\.(css|js)$/.test(path)) add('unexpected-file', path);
    const hash = expected.get(path); if (hash && sha256(bytes) !== hash) add('file-identity-changed', path);
  }
  for (const path of expected.keys()) if (!files.has(path)) add('missing-file', path);
  const pages = new Map<string, Page>();
  for (const [route, path] of routes) {
    if (!files.has(path)) continue;
    try {
      const page = inspectHtml(files.get(path)!.toString('utf8'), route); pages.set(path, page);
      if (policy.legacyRoutes.some(r => r.from === route)) continue;
      const canonical = new URL(withBase(route, base), origin).href;
      if (page.canonical.length !== 1 || page.canonical[0] !== canonical) add('canonical-mismatch', path);
      if (page.og.length !== 1 || page.og[0] !== canonical) add('og-url-mismatch', path);
    } catch { add('invalid-html-or-css', path); }
  }
  for (const route of policy.legacyRoutes) {
    const path = routeFile(route.from);
    if (files.has(path) && files.get(path)!.toString('utf8') !== legacyPageHTML(route, base)) add('legacy-content-mismatch', path);
  }
  function check(reference: Reference, from: string, browserPath: string, nested404 = false): void {
    const raw = reference.value.trim();
    if (!raw || raw.startsWith('#') && raw.length === 1 || /^(?:data:|mailto:|tel:|javascript:|blob:)/i.test(raw)) return;
    if (nested404 && reference.resource && !/^(?:\/|[a-z][a-z\d+.-]*:)/i.test(raw)) add('nested-404-relative-resource', from);
    const pathPart = raw.split(/[?#]/, 1)[0];
    if (/\\|%2f|%5c|%25|[\u0000-\u001f]/i.test(pathPart)) { add('unsafe-reference', from); return; }
    try {
      if (pathPart.split('/').some(segment => ['.', '..'].includes(decodeURIComponent(segment)) && /%/.test(segment))) throw new Error('encoded-traversal');
      const relativePath = pathPart.replace(/^(?:https?:)?\/\/[^/]+/i, '');
      let depth = relativePath.startsWith('/') ? 0 : browserPath.split('/').filter(Boolean).length - (browserPath.endsWith('/') ? 0 : 1);
      for (const segment of relativePath.split('/')) {
        if (segment === '..') { if (--depth < 0) throw new Error('root-traversal'); }
        else if (segment && segment !== '.') depth++;
      }
      const url = new URL(raw, `${origin}${browserPath}`);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('scheme');
      if (url.origin !== origin) return;
      const logical = stripBase(url.pathname, base);
      if (logical === null || prefix && (logical === prefix || logical.startsWith(`${prefix}/`))) throw new Error('base');
      const decoded = decodeURIComponent(logical); if (/[\\\u0000-\u001f]/.test(decoded)) throw new Error('path');
      const clean = decoded.length > 1 ? decoded.replace(/\/$/, '') : decoded;
      const target = files.has(clean.slice(1)) ? clean.slice(1) : routes.get(clean);
      if (!target || !files.has(target)) { add('missing-reference', from); return; }
      if (url.hash && pages.has(target)) {
        const id = decodeURIComponent(url.hash.slice(1));
        if (!pages.get(target)!.ids.has(id)) add('missing-fragment', from);
      }
    } catch { add('unsafe-reference', from); }
  }
  for (const [path, page] of pages) for (const ref of page.refs) check(ref, path, withBase(page.route, base), page.route === '/404');
  for (const [path, bytes] of files) if (path.endsWith('.css')) {
    try { for (const value of cssUrls(bytes.toString('utf8'))) check({ value, resource: true }, path, withBase(`/${path}`, base)); }
    catch { add('invalid-css', path); }
  }
  for (const path of policy.runtimeManifests) {
    if (!files.has(path)) continue;
    try {
      const visit = (value: unknown): void => {
        if (!value || typeof value !== 'object') return;
        for (const [key, entry] of Object.entries(value)) {
          if (['src', 'start_url'].includes(key) && typeof entry === 'string') check({ value: entry.startsWith('/') ? withBase(entry, base) : entry, resource: true }, path, withBase(`/${path}`, base));
          else visit(entry);
        }
      };
      visit(JSON.parse(files.get(path)!.toString('utf8')));
    } catch { add('invalid-runtime-manifest', path); }
  }
  return issues;
}
