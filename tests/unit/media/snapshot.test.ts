import {expect,it} from 'vitest';
import { parsePublicSnapshot,readPublicSnapshot } from '@/lib/media/publicSnapshot.server';
const snapshot={schemaVersion:1,generatedAt:'2026-10-05T00:00:00Z',archiveTimezone:'Asia/Shanghai',coverage:{description:'已收录',verifiedEmptyYears:[]},entries:[]};
it('production starts empty',()=>expect(readPublicSnapshot().entries).toHaveLength(0));
it('rejects raw backup or maintenance fields',()=>{
 expect(()=>parsePublicSnapshot({...snapshot,cookies:'SYNTHETIC_PRIVATE'})).toThrow();
 expect(()=>parsePublicSnapshot({...snapshot,entries:[{id:'manual-1',commentRaw:'private'}]})).toThrow();
});
it('subject URL must match type and stable identity',()=>{
 const e={id:'douban-book-123',type:'book',title:'合成',myRating:null,comment:'',tags:[],credits:[],markDate:{precision:'unknown',year:null,month:null,day:null,calendarDate:null,instant:null},doubanUrl:'https://movie.douban.com/subject/999/'};
 expect(()=>parsePublicSnapshot({...snapshot,entries:[e]})).toThrow();
});
