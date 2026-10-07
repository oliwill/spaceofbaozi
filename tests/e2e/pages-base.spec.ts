import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { legacyRoutes } from '../../src/lib/site/legacy-routes';
import { fixtureProjects } from '../fixtures/projects/projects';
import { auditRenderedProjectImages } from '../support/project-output-audit';
import { absolute, base, decoded, expect, fixture, kind, metadata, observe, origin, ready, served, test, verifyObservation } from '../support/pages-base';

const article = '/blog/ryoutei-menu-05', synthetic = '/blog/synthetic-base-proof', older = '/blog/synthetic-base-older';

if (kind === 'formal') {
  test('home loads actual mounted resources and correct metadata', async ({ page, observed }) => {
    expect((await page.goto(absolute('/')))?.status()).toBe(200);
    await expect(page.locator('body')).toContainText('从文章开始');
    await metadata(page, '/');
    await expect.poll(() => observed.resources.length).toBeGreaterThan(0);
    expect(observed.resources.some(url => new URL(url).pathname.includes('/_astro/'))).toBe(true);
    await expect(page.locator('[data-waline-comments]')).toHaveCount(0);
  });

  test('approved Blog list, article refresh, tag and return navigate mounted paths', async ({ page }) => {
    await page.goto(absolute('/blog'));
    const featured = page.locator('.editorial-feature h2 a');
    await expect(featured).toHaveAttribute('href', served(article)); await featured.click();
    await expect(page.locator('.article-page__header h1')).toHaveText('料亭菜单 NO.5——将心注入');
    await page.reload(); await metadata(page, article);
    const tag = page.locator('.article-page__meta .editorial-tag').first();
    await expect(tag).toHaveAttribute('href', served('/blog/tag/' + encodeURIComponent('漫才')));
    await tag.click(); await expect(page).toHaveURL(absolute('/blog/tag/' + encodeURIComponent('漫才')));
    await page.locator(`main a[href="${served(article)}"]`).first().click();
    await page.locator('.article-page__back').click(); await expect(page).toHaveURL(absolute('/blog'));
  });

  test('approved article direct narrow navigation has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(absolute(article)); await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator('.article-page__back').click(); await expect(page).toHaveURL(absolute('/blog'));
  });

  test('approved article and return work without JavaScript', async ({ browser }, info) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage(), observed = observe(page);
    try {
      await page.goto(absolute(article)); await expect(page.locator('[data-reading-prose]')).toContainText('努力就会有回报');
      await page.locator('.article-page__back').click(); await expect(page).toHaveURL(absolute('/blog'));
      await verifyObservation(observed, info, 'no-js-resources');
    } finally { await context.close(); }
  });

  for (const route of legacyRoutes) test(`legacy ${route.from} preserves approved disposition and query/hash`, async ({ page, request }) => {
    const suffix = '?migration=proof#retained';
    await page.goto(absolute(route.from) + suffix);
    if (route.kind === 'redirect') {
      await expect(page).toHaveURL(absolute(route.to) + suffix);
      expect((await request.get(absolute(route.to))).status()).toBe(200);
      await expect(page.locator('main h1')).toBeVisible();
    } else {
      await expect(page).toHaveURL(absolute(route.from) + suffix);
      await expect(page.locator('main')).toContainText('这一页暂时没有可展示的内容。');
      const hrefs = await page.locator('main a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
      expect(hrefs).toEqual([served('/#home'), ...(route.section === '/' ? [] : [served(route.section)])]);
      for (const href of hrefs) expect((await request.get(origin + href!)).status()).toBe(200);
    }
  });

  test('all eleven historical fallback links remain ordinary links without scripts', async ({ browser, request }, info) => {
    const context = await browser.newContext({ javaScriptEnabled: false }), page = await context.newPage(), observed = observe(page);
    try {
      for (const route of legacyRoutes) {
        await page.goto(absolute(route.from) + '?from=old#retained');
        await expect(page).toHaveURL(absolute(route.from) + '?from=old#retained');
        const links = await page.locator('main a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!));
        expect(links).toEqual(route.kind === 'redirect' ? [served(route.to)] : [served('/#home'), ...(route.section === '/' ? [] : [served(route.section)])]);
        for (const href of links) expect((await request.get(origin + href)).status()).toBe(200);
      }
      await verifyObservation(observed, info, 'legacy-no-js-resources');
    } finally { await context.close(); }
  });

  test('unavailable resume, Labs and unknown paths return real 404 without guessed redirects', async ({ page, request }) => {
    for (const path of ['/resume', '/lab/home-v2', '/lab/intro-oil', '/lab/page-turn', '/lab/toss-motion', '/thoughts/unknown-gridea', '/missing/nested/page']) {
      expect((await request.get(absolute(path))).status(), path).toBe(404);
    }
    expect((await page.goto(absolute('/missing/nested/page')))?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('内容暂不可用'); await metadata(page, '/404');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    const css = page.locator('link[rel="stylesheet"]'); expect(await css.count()).toBeGreaterThan(0);
    for (const href of await css.evaluateAll(nodes => nodes.map(node => (node as HTMLLinkElement).href))) expect((await request.get(href)).status()).toBe(200);
  });

  test('directory indexes, prefix boundary and absent feeds match static artifact', async ({ request }) => {
    expect((await request.get(absolute('/blog/'))).status()).toBe(200);
    for (const path of ['/rss.xml', '/sitemap.xml', '/sitemap-index.xml']) expect((await request.get(absolute(path))).status()).toBe(404);
    if (base) {
      for (const path of ['/blog', '/assets/home/cover@A.webp', '/spaceofbaozi-lookalike/blog']) expect((await request.get(origin + path)).status()).toBe(404);
      expect((await request.get(absolute('/assets/home/cover@A.webp'))).status()).toBe(200);
    }
  });
}

if (kind === 'fixture') {
  if (!fixture) throw new Error('PAGES_FIXTURE_MANIFEST is required for fixture tests');
  const year = fixture.year;

  test('Photos directory cover, reader return and forward preserve selection and focus', async ({ page, observed }, info) => {
    await page.goto(absolute('/photos'));
    const cover = page.locator('[data-album-id="synthetic-1"]');
    await decoded(cover.locator('img'), info, 'album-cover'); await cover.click();
    await expect(page.locator('[data-album-reader]')).toHaveAttribute('data-enhanced', 'true');
    await page.locator('[data-next]').click(); const href = page.url();
    await page.locator('[data-album-return]').first().click();
    await expect(page).toHaveURL(absolute('/photos')); await expect(cover).toBeFocused();
    await cover.click(); await expect(page).toHaveURL(href);
    await page.goBack(); await expect(page).toHaveURL(absolute('/photos'));
    await page.goForward(); await expect(page).toHaveURL(href);
    await expect(page.locator('main')).toHaveCount(1);
    expect(observed.images.length).toBeGreaterThan(0); await expect(page.locator('body')).not.toContainText('PRIVATE-');
  });

  test('Photos current and adjacent groups use successful prefixed images and original ratios', async ({ page, observed }, info) => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(absolute('/photos/synthetic-4#photo-a'));
    await expect(page.locator('[data-album-reader]')).toHaveAttribute('data-mode', 'single');
    await decoded(page.locator('[data-photo-id="a"] .album-photo__media > img'), info, 'photo-a');
    await expect.poll(() => observed.images.filter(url => /synthetic-4-b(?:-small)?\.png$/.test(url)).length).toBeGreaterThan(0);
    const photoRequests = () => observed.images.filter(url => url.includes('/assets/photos/'));
    expect(photoRequests().length).toBeGreaterThan(0); expect(photoRequests().every(url => /synthetic-4-[ab](?:-small)?\.png$/.test(url))).toBe(true);
    await page.locator('[data-next]').click(); await expect(page).toHaveURL(absolute('/photos/synthetic-4#photo-b'));
    const image = page.locator('[data-photo-id="b"] .album-photo__media > img');
    await decoded(image, info, 'photo-b');
    await expect.poll(() => page.locator('[data-photo-id="b"] .album-photo__media').evaluate(element => {
      const box = element.getBoundingClientRect(); return box.width / box.height;
    })).toBeCloseTo(2 / 3, 3);
    await expect(image).toHaveAttribute('srcset', /240w/); await expect(image).toHaveCSS('object-fit', 'contain');
    await expect(image).toHaveCSS('object-position', '50% 50%');
    expect(photoRequests().every(url => /synthetic-4-[abc](?:-small)?\.png$/.test(url))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });

  test('Photos narrow no-JS images and original fallbacks are real mounted assets', async ({ browser, request }, info) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage(), observed = observe(page);
    try {
      await page.goto(absolute('/photos/synthetic-1')); await expect(page.locator('[data-photo-id] noscript img')).toHaveCount(3);
      for (const [index, image] of (await page.locator('[data-photo-id] noscript img').all()).entries()) await decoded(image, info, `no-js-photo-${index}`);
      for (const href of await page.locator('.album-photo__fallback').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!))) expect((await request.get(origin + href)).status()).toBe(200);
      expect(observed.images.length).toBeGreaterThan(0); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator('[data-album-return]').first().click(); await expect(page).toHaveURL(absolute('/photos'));
      await verifyObservation(observed, info, 'photos-no-js');
    } finally { await context.close(); }
  });

  for (const project of fixtureProjects.filter(project => project.body.includes('<img'))) test(`Projects ${project.slug} covers, raw HTML, refresh and return retain registered assets`, async ({ page, request, observed }, info) => {
    await page.goto(absolute('/projects')); await ready(page);
    const link = page.locator(`[data-project-id="${project.slug}"]`), item = page.locator('.project-item').filter({ has: link });
    await decoded(item.locator('img'), info, 'project-cover'); await link.click(); await ready(page);
    const response = await request.get(absolute(`/projects/${project.slug}`)); expect(response.status()).toBe(200);
    const html = await response.text(); expect(html).toBe(readFileSync(join(process.env.PAGES_DIST!, `projects/${project.slug}/index.html`), 'utf8'));
    expect(auditRenderedProjectImages(html, project.images, base || '/')).toHaveLength(1);
    const image = page.locator('[data-project-detail] img');
    const decodedImage = await decoded(image, info, 'project-body'); expect(decodedImage.srcset).toContain(served(project.images[0].src));
    expect(decodedImage.naturalWidth / decodedImage.naturalHeight).toBeCloseTo(project.images[0].width / project.images[0].height, 3);
    await page.reload(); await ready(page); await metadata(page, `/projects/${project.slug}`);
    await page.locator('[data-project-return]').first().click(); await expect(page).toHaveURL(absolute('/projects')); await expect(link).toBeFocused();
    expect(observed.images.length).toBeGreaterThan(0);
  });

  test('Media deep page two detail refresh returns to the exact allowlisted path and focused record', async ({ page }) => {
    const from = `/media/y/${year}/book/d/${year}-01-01/p/2`; await page.goto(absolute(from));
    const sourceURL = page.url(), sourceIndex = await page.evaluate(() => history.state?.index);
    expect(Number.isInteger(sourceIndex)).toBe(true);
    const link = page.locator('[data-media-entry] h2 a').first(), id = await link.getAttribute('data-media-id');
    expect(id).toBeTruthy(); const destination = served(from) + '#media-' + id;
    await expect(link).toHaveAttribute('href', served(`/media/item/${id}`) + '?from=' + encodeURIComponent(destination));
    await link.click(); await expect(page.locator('[data-media-detail]')).toBeVisible(); await page.reload();
    await expect(page.locator('[data-media-return]')).toHaveAttribute('href', destination);
    await page.locator('[data-media-return]').click(); await expect(page).toHaveURL(sourceURL);
    await expect.poll(() => page.evaluate(() => history.state?.index)).toBe(sourceIndex);
    await expect(page.locator(`[data-media-id="${id}"]`).first()).toBeFocused();
  });

  test('Media cover, related Blog, escaped HTML and malicious from stay safe', async ({ page, observed }, info) => {
    await page.goto(absolute('/media/item/douban-book-1?from=https%3A%2F%2Fevil.test'));
    await expect(page.locator('[data-media-return]')).toHaveAttribute('href', served(`/media/y/${year}`));
    await expect(page.locator('.media-full-comment')).toContainText('<script>window.mediaInjected=true</script>');
    await expect(page.locator('.media-full-comment script,.media-full-comment img,.media-full-comment iframe')).toHaveCount(0);
    expect(await page.evaluate(() => 'mediaInjected' in window)).toBe(false);
    const image = await decoded(page.locator('.media-detail-cover img'), info, 'media-cover'); expect(image.naturalWidth).toBe(60);
    const related = page.getByRole('link', { name: '阅读完整长文' }); await expect(related).toHaveAttribute('href', served(synthetic));
    await related.click(); await expect(page).toHaveURL(absolute(synthetic)); expect(observed.images.length).toBeGreaterThan(0);
  });

  test('Media no-JS detail keeps ordinary default return and native back', async ({ browser }, info) => {
    const context = await browser.newContext({ javaScriptEnabled: false }), page = await context.newPage(), observed = observe(page);
    try {
      const from = `/media/y/${year}/book/p/2`; await page.goto(absolute(from)); await page.locator('[data-media-entry] h2 a').first().click();
      await expect(page.locator('[data-media-return]')).toHaveAttribute('href', served(`/media/y/${year}`));
      await page.goBack(); await expect(page).toHaveURL(absolute(from)); await page.goForward();
      await page.locator('[data-media-return]').click(); await expect(page).toHaveURL(absolute(`/media/y/${year}`));
      await verifyObservation(observed, info, 'media-no-js');
    } finally { await context.close(); }
  });

  test('synthetic Blog cover, Markdown and raw HTML resources load from this base', async ({ page, request, observed }, info) => {
    await page.goto(absolute(synthetic)); await metadata(page, synthetic);
    await decoded(page.locator('.article-page__cover img'), info, 'blog-cover');
    await decoded(page.locator('img[alt="Markdown 合成图"]'), info, 'blog-markdown');
    const image = await decoded(page.locator('#raw-image'), info, 'blog-raw'); expect(image.srcset).toContain(served('/assets/blog/synthetic-base-small.png'));
    await expect(page.locator('#raw-video')).toHaveAttribute('poster', served('/assets/blog/synthetic-base.png'));
    expect((await request.get(origin + await page.locator('#raw-video').getAttribute('poster'))).status()).toBe(200);
    await expect(page.locator('[data-reading-prose] pre code')).toHaveText('<img src="/assets/blog/code-only.png"> /blog/code-only?x=1#literal');
    await expect(page.locator('#external-link')).toHaveAttribute('href', 'https://example.com/synthetic?q=1#external');
    await expect(page.locator('#protocol-link')).toHaveAttribute('href', '//example.com/synthetic');
    await expect(page.locator('#hash-link')).toHaveAttribute('href', '#中文标题'); await expect(page.locator('#query-link')).toHaveAttribute('href', '?query=synthetic');
    expect(observed.images.length).toBeGreaterThan(0);
  });

  test('synthetic Blog Chinese duplicate TOC, Markdown/raw links, adjacent article and tag navigate', async ({ page }) => {
    await page.goto(absolute(synthetic)); await ready(page);
    expect(await page.locator('[data-reading-prose] h2').evaluateAll(nodes => nodes.map(node => node.id))).toEqual(['中文标题', '重复标题', '重复标题-1']);
    const chapter = page.locator('[data-reading-link="重复标题-1"]'); await chapter.click();
    await expect(page).toHaveURL(absolute(synthetic) + '#' + encodeURIComponent('重复标题-1'));
    await page.getByRole('link', { name: 'Markdown 内部链接', exact: true }).click(); await expect(page).toHaveURL(absolute(older) + '?via=markdown#destination');
    await page.goBack(); await page.locator('#raw-link').click(); await expect(page).toHaveURL(absolute(older) + '?via=raw#destination');
    await page.locator(`.article-page__nav a[href="${served(synthetic)}"]`).click(); await expect(page).toHaveURL(absolute(synthetic));
    await page.locator('.article-page__meta .editorial-tag').click(); await expect(page).toHaveURL(absolute('/blog/tag/' + encodeURIComponent('合成验证')));
    await expect(page.locator(`main a[href="${served(older)}"]`)).toHaveCount(1);
  });

  test('synthetic Blog narrow no-JS body, images and raw ordinary navigation stay available', async ({ browser }, info) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } }), page = await context.newPage(), observed = observe(page);
    try {
      await page.goto(absolute(synthetic)); await decoded(page.locator('#raw-image'), info, 'blog-no-js-image');
      await expect(page.locator('[data-reading-prose] h2')).toHaveCount(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator('#raw-link').click(); await expect(page).toHaveURL(absolute(older) + '?via=raw#destination');
      expect(observed.images.length).toBeGreaterThan(0); await verifyObservation(observed, info, 'blog-no-js');
    } finally { await context.close(); }
  });
}
