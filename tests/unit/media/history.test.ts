import {it,expect} from 'vitest';
import {readMediaHistory,mergeMediaHistory,canReturnToMediaList} from '@/lib/media/history';
const list={key:'/media/y/2026/book/d/2026-01-01/p/2',mediaId:'douban-book-9',scrollY:500};
const meta={version:1 as const,list,originIndex:3,detailId:list.mediaId};
it('preserves other namespaces and validates its own state',()=>{
 const state={index:4,baoziProjects:{keep:true},baoziMedia:meta};
 expect(mergeMediaHistory(state,{detailId:undefined})).toEqual({...state,baoziMedia:{version:1,list,originIndex:3}});
 expect(readMediaHistory({baoziMedia:{...meta,list:{...list,scrollY:Infinity}}})).toEqual({version:1});
 expect(readMediaHistory({baoziMedia:{...meta,list:{...list,key:'https://evil.test/'}}})).toEqual({version:1});
});
it('only returns through adjacent matching detail history',()=>{
 expect(canReturnToMediaList(meta,4,'/media/item/douban-book-9')).toBe(true);
 expect(canReturnToMediaList(meta,5,'/media/item/douban-book-9')).toBe(false);
 expect(canReturnToMediaList(meta,4,'/media/item/douban-book-10')).toBe(false);
});
