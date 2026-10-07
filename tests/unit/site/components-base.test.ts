import { describe, it, expect } from 'vitest';
import { renderAstro } from '../../support/astro-component';
import { photoAlbumSchema } from '@/lib/photos/schema';
import { publishableAlbums } from '@/lib/photos/albums';
import { fixtureAlbums, hiddenFixtures } from '../../fixtures/photos/albums';
import { fixtureProjects } from '../../fixtures/projects/projects';
import { selectPublicProjects } from '@/lib/projects/projects';
import { createFixtureSnapshot } from '../../../scripts/media/fixtures';
import { parseHTML, elements, attribute, textContent } from '../../support/project-output-audit';

describe.each(['/', '/spaceofbaozi'])('populated component contracts %s', base => {
 const prefix=base==='/'?'':base;
 const albums=publishableAlbums([...fixtureAlbums,...hiddenFixtures].map(({slug,...data})=>({id:slug,data:photoAlbumSchema.parse(data)})));
 const projects=selectPublicProjects(fixtureProjects.map(({slug,body:_body,...data})=>({id:slug,data}))).map(({project})=>project);
 it('renders approved album covers, lazy/noscript variants, fallback links and logical serialized data',async()=>{
  const list=await renderAstro('src/components/photos/AlbumList.astro',{albums},base);
  expect(list.html).toContain(`href="${prefix}/photos/synthetic-1"`);
  expect(list.html).toContain(`src="${prefix}${albums[0].cover.src}"`);expect(list.html).not.toContain('PRIVATE');
  const reader=await renderAstro('src/components/photos/AlbumReader.astro',{album:albums[0]},base);
  for(const photo of albums[0].photos){
   expect(reader.html).toContain(`data-src="${prefix}${photo.src}"`);
   expect(reader.html).toContain(`href="${prefix}${photo.src}"`);
   expect(reader.html).toContain(`src="${prefix}${photo.src}"`);
   expect(reader.html).toContain(`${prefix}${photo.variants![0].src} ${photo.variants![0].width}w`);
  }
  const nodes=elements(parseHTML(reader.html));
  const data=nodes.find(node=>attribute(node,'data-album-data')!==undefined)!;
  expect(JSON.parse(textContent(data))).toEqual(albums[0]);
  expect(reader.html).toContain(`href="${prefix}/photos"`);expect(reader.html).not.toContain('PRIVATE');
 });
 it('renders project cover variants and logical registry-derived links',async()=>{
  const list=await renderAstro('src/components/projects/ProjectList.astro',{projects},base);
  const image=projects.find(p=>p.cover)!.cover!;
  expect(list.html).toContain(`src="${prefix}${image.src}"`);
  expect(list.html).toContain(`${prefix}${image.variants![0].src} ${image.variants![0].width}w`);
  expect(list.html).toContain(`href="${prefix}${projects[0].href}"`);
  expect(projects[0].href).toMatch(/^\/projects\//);expect(image.src).toMatch(/^\/assets\/projects\//);
 });
 it('renders a populated media list with encoded served return and escaped hostile comment',async()=>{
  const snapshot=createFixtureSnapshot('mixed',new Date('2026-10-06'));
  const from=prefix+'/media/y/2026/book/d/2026-01-01';const entry=snapshot.entries[0];
  const list=await renderAstro('src/components/media/MediaList.astro',{entries:[entry],from},base);
  expect(list.html).toContain(`src="${prefix}${entry.cover!.src}"`);
  expect(list.html).toContain(`href="${prefix}/media/item/${entry.id}?from=${encodeURIComponent(from+'#media-'+entry.id)}"`);
  expect(list.html).not.toContain('<script>window.mediaInjected');expect(list.html).toContain('&lt;script&gt;');
 });
});
