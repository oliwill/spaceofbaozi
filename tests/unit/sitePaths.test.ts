import { describe, it, expect, vi, afterEach } from 'vitest';
import { withBase, stripBase, servedUrl, logicalPath, canonicalUrl } from '@/lib/site/paths';
import { siteConfig } from '@/lib/site/config';
import rehypeBaseUrls from '@/lib/site/rehype-base-urls';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { createFixtureSnapshot } from '../../scripts/media/fixtures';
import { listPath, listHref, detailHref, validateReturnHref, returnLinksById } from '@/lib/media/routes';
import { canReturnToMediaList } from '@/lib/media/history';
import { canReturnToProjectList } from '@/lib/projects/history';
import { albumHref, isAlbumTransition } from '@/lib/photos/routes';
import { photoSrcset } from '@/lib/photos/imageCandidates';
import { loadManifestV2 } from '@/lib/intro-oil/v2';
import manifest from '../../public/manifest/asset-manifest.v2.json';

afterEach(()=>vi.unstubAllEnvs());
describe.each(['/', '/spaceofbaozi/'])('deployment %s', base=>{
 const prefix=base==='/'?'':'/spaceofbaozi';
 it('adds exactly one prefix and retains encoded segments, query and fragment',()=>{
  for(const path of ['/','#home','?q=1','/blog/中文','/blog/%E4%B8%AD?x=1#章','/blog/tag/a%2Fb']){
   const expected=path.startsWith('/')?prefix+path:path;
   expect(withBase(path,base)).toBe(expected);expect(withBase(expected,base)).toBe(expected);
  }
 });
 it.each(['https://example.com/x','//cdn.test/x','data:image/png;base64,abc','mailto:a@b.test','tel:123','./image.png','__ASTRO_IMAGE_0__'])('preserves nonroot URL %s',path=>expect(withBase(path,base)).toBe(path));
 it('maps served paths strictly and safely',()=>{
  expect(stripBase(prefix+'/blog?q=1#x',base)).toBe('/blog?q=1#x');
  for(const bad of ['/../blog','/%2e%2e/blog','/a\\b','//host/blog'])expect(stripBase(prefix+bad,base)).toBeNull();
  if(prefix){for(const bad of ['/blog','/spaceofbaoziness/blog','/spaceofbaozi-space/blog'])expect(stripBase(bad,base)).toBeNull();}
 });
 it('uses runtime BASE_URL and clean canonical origin',()=>{
  vi.stubEnv('BASE_URL',base);
  expect(servedUrl('/blog')).toBe(prefix+'/blog');expect(logicalPath(prefix+'/blog')).toBe('/blog');
  expect(canonicalUrl(prefix+'/blog?x=1#heading','https://example.test',base)).toBe('https://example.test'+prefix+'/blog');
 });
 it('rewrites actual Markdown and parsed raw HTML without damaging srcset/data/code',async()=>{
  const processor=await createMarkdownProcessor({rehypePlugins:[[rehypeBaseUrls,{base}]]});
  const result=await processor.render('[内部](/blog?q=1#章)\n\n![图片](/assets/blog/a.png)\n\n<video src="/assets/blog/v.mp4" poster="/assets/blog/p.png"><source srcset="data:image/png;base64,AAAA 1x, /assets/blog/b.png 2x"></video><a href="//example.test/x">外链</a><img src="/assets/blog/a.png" srcset="/assets/blog/a.png 100w, /assets/blog/b.png 200w">\n\n`<img src="/assets/blog/code.png">`');
  for(const asset of ['/assets/blog/a.png','/assets/blog/b.png','/assets/blog/v.mp4','/assets/blog/p.png'])expect(result.code).toContain(prefix+asset);
  expect(result.code).toContain(`href="${prefix}/blog?q=1#%E7%AB%A0"`);
  expect(result.code).toContain('data:image/png;base64,AAAA 1x, '+prefix+'/assets/blog/b.png 2x');
  expect(result.code).toContain('href="//example.test/x"');expect(result.code).toContain('src="/assets/blog/code.png"');
 });
 it('preserves plain template text through the complete Astro pipeline',async()=>{
  const input='<template>plain text &amp; 中文</template>';
  const processor=await createMarkdownProcessor({rehypePlugins:[[rehypeBaseUrls,{base}]]});
  const baseline=await createMarkdownProcessor();
  expect((await processor.render(input)).code).toBe((await baseline.render(input)).code);
 });
 it('preserves nested template trees and rewrites their URLs without rewriting code or data candidates',async()=>{
  const input='<div><template id="outer">plain text<img src="/assets/blog/a.png" srcset="data:image/png;base64,AAAA 1x, /assets/blog/b.png 2x" data-src="/assets/blog/lazy.png" data-srcset="data:image/png;base64,BBBB 1x, /assets/blog/lazy-2.png 2x"><a href="/blog/test?q=1#section">Open</a><template id="inner"><video poster="/assets/blog/poster.png" src="/assets/blog/v.mp4"></video><a href="#same">Same</a></template><pre><code>&lt;img src="/assets/blog/code.png"&gt;</code></pre></template></div>';
  const processor=await createMarkdownProcessor({rehypePlugins:[[rehypeBaseUrls,{base}]]});
  const baseline=await createMarkdownProcessor();
  const expectedInput=input.replaceAll('/assets/blog/a.png',prefix+'/assets/blog/a.png').replaceAll('/assets/blog/b.png',prefix+'/assets/blog/b.png').replaceAll('/assets/blog/lazy.png',prefix+'/assets/blog/lazy.png').replaceAll('/assets/blog/lazy-2.png',prefix+'/assets/blog/lazy-2.png').replaceAll('/blog/test',prefix+'/blog/test').replaceAll('/assets/blog/poster.png',prefix+'/assets/blog/poster.png').replaceAll('/assets/blog/v.mp4',prefix+'/assets/blog/v.mp4');
  const result=await processor.render(input);
  expect(result.code).toBe((await baseline.render(expectedInput)).code);
  expect(result.code).toContain('src="/assets/blog/code.png"');
 });
 it('keeps inert template headings out of body heading metadata',async()=>{
  const input='## Body heading\n\n<div><template><h2>Inert heading</h2><template><h3>Nested inert heading</h3></template></template></div>\n\n## Body heading';
  const processor=await createMarkdownProcessor({rehypePlugins:[[rehypeBaseUrls,{base}]]});
  const baseline=await createMarkdownProcessor();
  const actual=await processor.render(input),expected=await baseline.render(input);
  expect(actual.code).toBe(expected.code);expect(actual.metadata.headings).toEqual(expected.metadata.headings);
  expect(actual.metadata.headings.map(h=>h.slug)).toEqual(['body-heading','body-heading-1']);
 });
 it('preserves template content within pre/code without transforming its URLs',async()=>{
  const input='<pre><template><a href="/blog/code">example</a><img src="/assets/blog/code.png"></template></pre><code><template>plain code</template></code>';
  const processor=await createMarkdownProcessor({rehypePlugins:[[rehypeBaseUrls,{base}]]});
  const baseline=await createMarkdownProcessor();
  expect((await processor.render(input)).code).toBe((await baseline.render(input)).code);
 });
 it('preserves local image import placeholders and same-page navigation',async()=>{
  const processor=await createMarkdownProcessor({rehypePlugins:[[rehypeBaseUrls,{base}]]});
  const renderOptions={frontmatter:{},fileURL:new URL('file:///synthetic/post.md')};
  const result=await processor.render('![local](./local.png)\n\n[here](#section) [query](?x=1)\n\n<img src="__ASTRO_IMAGE_0__"><a href="/blog/tag/a%2Fb">tag</a>', renderOptions);
  expect(result.metadata.localImagePaths).toContain('./local.png');
  expect(result.code).toContain('__ASTRO_IMAGE_0__');expect(result.code).toContain('href="#section"');expect(result.code).toContain('href="?x=1"');
  expect(result.code).toContain(`href="${prefix}/blog/tag/a%2Fb"`);
 });
 it('keeps static params and return membership logical with populated archive',()=>{
  vi.stubEnv('BASE_URL',base);const now=new Date('2026-10-06');const snapshot=createFixtureSnapshot('mixed',now);
  const state={year:2026,type:'book' as const,day:'2026-01-01',page:2};const path='/media/y/2026/book/d/2026-01-01/p/2';
  expect(listPath(state)).toBe(path);expect(listHref(state)).toBe(prefix+path);
  const returns=returnLinksById(snapshot,now);const [id,links]=[...returns].find(([,links])=>links.some(link=>link.startsWith(prefix+path+'#')))!;
  const href=prefix+path+'#media-'+id;expect(links).toContain(href);expect(validateReturnHref(href,snapshot,now,id)).toBe(href);
  expect(detailHref(id,href)).toBe(prefix+'/media/item/'+id+'?from='+encodeURIComponent(href));
  for(const invalid of ['//evil.test/x',prefix+path+'#media-other',prefix+'/media/y/2026/movie',prefix+'/../'+path,prefix+'/media/%2Fy/2026',prefix+'/media/y/%32%30%32%36',prefix+'/media/y/2026/book/d/2026-01-01/p/02',prefix+prefix+path+'#media-'+id]){
   if(invalid!==href)expect(validateReturnHref(invalid,snapshot,now,id)).toBeNull();
  }
  const meta={version:1 as const,list:{key:path,mediaId:id,scrollY:100},originIndex:1,detailId:id};
  expect(canReturnToMediaList(meta,2,prefix+'/media/item/'+id)).toBe(true);expect(canReturnToMediaList(meta,3,prefix+'/media/item/'+id)).toBe(false);
  if(prefix)expect(canReturnToMediaList(meta,2,'/media/item/'+id)).toBe(false);
 });
 it('supports project and nested album route identity without changing IDs',()=>{
  vi.stubEnv('BASE_URL',base);
  expect(albumHref('test/中文','photo-a')).toBe(prefix+'/photos/test/%E4%B8%AD%E6%96%87#photo-photo-a');
  expect(isAlbumTransition(prefix+'/photos',prefix+'/photos/test')).toBe(true);
  if(prefix)expect(isAlbumTransition('/photos',prefix+'/photos/test')).toBe(false);
  const meta={version:1 as const,list:{key:'uuid',projectId:'test',scrollY:10},originIndex:0,detailId:'test'};
  expect(canReturnToProjectList(meta,1,prefix+'/projects/test')).toBe(true);
 });
 it('prefixes photo candidates and runtime manifest assets without mutating geometry',async()=>{
  vi.stubEnv('BASE_URL',base);
  expect(photoSrcset({src:'/assets/photos/a.png',width:100,height:100,alt:'a',variants:[{src:'/assets/photos/b.png',width:50,height:50}]})).toBe(prefix+'/assets/photos/b.png 50w, '+prefix+'/assets/photos/a.png 100w');
  const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify(manifest)));
  try{const loaded=await loadManifestV2();expect(fetcher).toHaveBeenCalledWith(prefix+'/manifest/asset-manifest.v2.json');
   for(const [id,sequence] of Object.entries(manifest.sequences))expect(loaded.sequences[id]).toEqual({...sequence,src:prefix+sequence.src});
   expect(loaded.introTimeline).toEqual(manifest.introTimeline);expect(loaded.fallback.src).toBe(prefix+manifest.fallback.src);
  }finally{fetcher.mockRestore();}
 });
});
it('validates origin-only SITE_URL and strict SITE_BASE',()=>{
 expect(siteConfig({})).toEqual({site:'https://baozi.space',base:'/'});
 expect(siteConfig({SITE_URL:'https://oliwill.github.io',SITE_BASE:'/spaceofbaozi/'})).toEqual({site:'https://oliwill.github.io',base:'/spaceofbaozi'});
 for(const SITE_URL of ['javascript:foo','https://example.test/path','https://user:pass@example.test','https://example.test?x=1'])expect(()=>siteConfig({SITE_URL})).toThrow();
 for(const SITE_BASE of ['//evil','/../x','/x?y','x','/space of baozi','/x:y','/%2Fsite'])expect(()=>siteConfig({SITE_BASE})).toThrow();
});
