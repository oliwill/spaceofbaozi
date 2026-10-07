import { normalizeBase } from './paths';
export function siteConfig(env: { SITE_URL?: string; SITE_BASE?: string }): { site: string; base: string } {
  const site = new URL(env.SITE_URL ?? 'https://baozi.space');
  if (!['http:', 'https:'].includes(site.protocol) || site.username || site.password || site.pathname !== '/' || site.search || site.hash) throw new Error('SITE_URL must be an HTTP(S) origin');
  return { site: site.origin, base: normalizeBase(env.SITE_BASE ?? '/') || '/' };
}
