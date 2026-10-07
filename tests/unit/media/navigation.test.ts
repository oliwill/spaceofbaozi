import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {transform} from '@astrojs/compiler';
it('media is the fifth compiled rail link with the unavailable Resume slot disabled',async()=>{
 const source=readFileSync('src/components/layout/SiteRail.astro','utf8');const result=await transform(source,{filename:'SiteRail.astro'});
 expect(source).toContain('{ label: "简历", number: "03" }');
 expect(result.code).toContain('"/media"');expect(source.match(/href: "\/(blog|photos|resume|projects|media)"/g)).toEqual(['href: "/blog"','href: "/photos"','href: "/projects"','href: "/media"']);
});
