function validatePath(path: string): void {
  const pathname = path.split(/[?#]/, 1)[0];
  if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('//')) throw new Error('Invalid site path');
  for (const segment of pathname.split('/')) {
    let decoded: string;
    try { decoded = decodeURIComponent(segment); } catch { throw new Error('Invalid site path encoding'); }
    if (decoded === '.' || decoded === '..' || /[\\\u0000-\u001f]/.test(decoded)) throw new Error('Invalid site path segment');
  }
}

export function normalizeBase(base: string): string {
  if (!/^\/(?:[A-Za-z0-9._~-]+\/?)*$/.test(base)) throw new Error('Invalid site base');
  try { validatePath(base); } catch { throw new Error('Invalid site base'); }
  return base === '/' ? '' : base.replace(/\/$/, '');
}

export function stripBase(path: string, base: string): string | null {
  const prefix = normalizeBase(base);
  try { validatePath(path); } catch { return null; }
  if (!prefix) return path;
  if (path === prefix) return '/';
  if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length);
  if (path.startsWith(`${prefix}?`) || path.startsWith(`${prefix}#`)) return `/${path.slice(prefix.length)}`;
  return null;
}

export function withBase(path: string, base: string): string {
  const prefix = normalizeBase(base);
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  validatePath(path);
  return `${prefix}${stripBase(path, base) ?? path}`;
}

export const servedUrl = (path: string): string => withBase(path, import.meta.env.BASE_URL);
export const logicalPath = (path: string): string | null => stripBase(path, import.meta.env.BASE_URL);
export function canonicalUrl(path: string, site: string | URL, base: string = import.meta.env.BASE_URL): string {
  return new URL(withBase(path.split(/[?#]/, 1)[0], base), new URL(site).origin).href;
}
