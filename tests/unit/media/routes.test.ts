import { expect,it } from 'vitest';
import { listHref,enumerateArchiveStates,detailHref,validateReturnHref,changeArchiveState } from '@/lib/media/routes';
import type { PublicSnapshot } from '@/lib/media/schema';
const now=new Date('2026-10-05T00:00:00Z');
const s:PublicSnapshot={schemaVersion:1,generatedAt:now.toISOString(),archiveTimezone:'Asia/Shanghai',coverage:{description:'合成',verifiedEmptyYears:[]},entries:[]};
it('uses the canonical static URL grammar',()=>{
 expect(listHref({year:2026,type:'book',day:'2026-02-01',page:2})).toBe('/media/y/2026/book/d/2026-02-01/p/2');
 expect(listHref({year:'undated',type:'all',day:null,page:1})).toBe('/media/undated');
});
it('does not manufacture empty days or extra pages',()=>{
 const states=enumerateArchiveStates(s,now);expect(states.every(v=>v.day===null&&v.page===1)).toBe(true);expect(states.map(listHref)).toContain('/media/y/2026');
});
it.each(['//evil','https://evil.test/','/media/y/2026/../../private','/media/%2e%2e/','/media/y/2026/d/2026-02-01/'])('rejects invalid return %s',value=>expect(validateReturnHref(value,s,now,'douban-book-1')).toBeNull());
it('changing year clears day and page; type preserves only valid day',()=>{
 const state={year:2026,type:'all' as const,day:'2026-02-01',page:2};
 expect(changeArchiveState(state,{year:2025},s,now)).toMatchObject({type:'all',day:null,page:1});
 expect(changeArchiveState(state,{type:'movie'},s,now)).toMatchObject({type:'movie',day:null,page:1});
});
it('detail path rejects arbitrary identity',()=>expect(()=>detailHref('../private')).toThrow());
it('malformed external return is rejected before accessing the archive',()=>{
 const sentinel=new Proxy(s,{get(){throw new Error('should not read archive');}});
 expect(validateReturnHref('//evil',sentinel,now,'douban-book-1')).toBeNull();
});
