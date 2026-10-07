import {expect,it} from "vitest";
import {readFileSync} from "node:fs";
it("keeps a semantic directory, native strip and 3:2 cropped covers",()=>{
  const component=readFileSync('src/components/photos/AlbumList.astro','utf8');
  const css=readFileSync('src/components/photos/photos.css','utf8');
  for(const hook of ['data-album-strip','data-album-controls','data-album-id','data-album-directory-toggle','data-album-current-name','data-album-segments']) expect(component).toContain(hook);
  expect(component).toMatch(/aria-controls="album-directory-options" hidden/);
  expect(component).toMatch(/<nav[^>]+data-album-segments/);
  expect(css).toMatch(/aspect-ratio:\s*3\s*\/\s*2/);
  expect(css).toMatch(/object-fit:\s*cover/);
  expect(css).toMatch(/overflow-x:\s*auto/);
});
