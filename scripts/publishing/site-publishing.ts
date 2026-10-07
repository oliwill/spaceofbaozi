import type { AstroIntegration } from 'astro';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { legacyRoutes } from '../../src/lib/site/legacy-routes';
import { writeLegacyPages } from './write-legacy-pages';
import { cleanBuildMetadata } from './clean-build-metadata';

export function sitePublishing(): AstroIntegration {
  let base = '/';
  return {
    name: 'baozi-site-publishing',
    hooks: {
      'astro:config:setup': ({ command, injectRoute }) => {
        if (command !== 'dev') return;
        for (const name of ['home-v2', 'intro-oil', 'page-turn', 'toss-motion']) {
          injectRoute({ pattern: `/lab/${name}`, entrypoint: new URL(`../../src/dev-pages/lab/${name}.astro`, import.meta.url) });
        }
        injectRoute({ pattern: '/resume', entrypoint: new URL('../../src/dev-pages/resume.astro', import.meta.url) });
      },
      'astro:config:done': ({ config }) => { base = config.base; },
      'astro:build:done': async ({ dir, logger }) => {
        const removed = await cleanBuildMetadata(fileURLToPath(dir));
        logger.info(`Removed ${removed.length} verified Astro build helper files.`);
        await rm(join(fileURLToPath(dir), '_redirects'), { force: true });
        const files = await writeLegacyPages(fileURLToPath(dir), base, legacyRoutes);
        logger.info(`Wrote ${files.length} historical pages (2 HTML redirects, 9 neutral pages).`);
      },
    },
  };
}
