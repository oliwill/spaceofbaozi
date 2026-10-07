import {expect,it} from 'vitest';
import {photoSrcset} from '@/lib/photos/imageCandidates';
it('includes original width and deduplicates responsive variants',()=>expect(photoSrcset({src:'/assets/photos/a.png',width:1200,height:800,alt:'图',variants:[{src:'/assets/photos/a-small.png',width:600,height:400},{src:'/assets/photos/a.png',width:1200,height:800}]})).toBe('/assets/photos/a-small.png 600w, /assets/photos/a.png 1200w'));
