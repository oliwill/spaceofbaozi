import { expect,it } from 'vitest';
import { buildArchiveView } from '@/lib/media/model';
import type { PublicMedia,PublicSnapshot } from '@/lib/media/schema';
const entry=(i:number):PublicMedia=>({id:`douban-book-${i}`,type:'book',title:'合成',myRating:null,comment:'',tags:[],credits:[],markDate:{precision:'day',year:2026,month:2,day:1,calendarDate:'2026-02-01',instant:null}});
const snapshot=(n:number):PublicSnapshot=>({schemaVersion:1,generatedAt:'2026-10-05T00:00:00Z',archiveTimezone:'Asia/Shanghai',coverage:{verifiedEmptyYears:[],description:'合成'},entries:Array.from({length:n},(_,i)=>entry(i))});
const state={year:2026,type:'all' as const,day:null,page:1};const now=new Date('2026-10-05T00:00:00Z');
it.each([24,25,48,49])('paginates %i without loss',n=>{
 const s=snapshot(n);const views=Array.from({length:Math.ceil(n/24)},(_,i)=>buildArchiveView(s,{...state,page:i+1},now));
 expect(views.flatMap(v=>v.entries)).toHaveLength(n);expect(new Set(views.flatMap(v=>v.entries.map(e=>e.id))).size).toBe(n);
 for(const view of views){expect(view.entries.length).toBeLessThanOrEqual(24);expect(view.calendar.length).toBeLessThanOrEqual(366);}
});
it('current empty year remains current while twenty-year records are reachable',()=>{
 const s=snapshot(1);s.entries[0].markDate={precision:'year',year:2006,month:null,day:null,calendarDate:null,instant:null};
 const v=buildArchiveView(s,state,now);expect(v.entries).toHaveLength(0);expect(v.availableYears).toEqual([2026,2006]);expect(v.newestYear).toBe(2006);
});
it('day filters list but calendar retains full typed year',()=>{
 const s=snapshot(2);s.entries[1].markDate={...s.entries[1].markDate,day:2,calendarDate:'2026-02-02'};
 const v=buildArchiveView(s,{...state,day:'2026-02-01'},now);expect(v.entries).toHaveLength(1);expect(v.calendar.reduce((n,d)=>n+d.count,0)).toBe(2);
});
it('partial and unknown dates separate from known days and years',()=>{
 const s=snapshot(3);s.entries[1].markDate={precision:'year',year:2026,month:null,day:null,calendarDate:null,instant:null};s.entries[2].markDate={precision:'unknown',year:null,month:null,day:null,calendarDate:null,instant:null};
 expect(buildArchiveView(s,state,now).partialDates).toBe(1);expect(buildArchiveView(s,{...state,year:'undated'},now).entries).toHaveLength(1);
});
it('Shanghai build year changes at local midnight',()=>{
 expect(buildArchiveView(snapshot(0),state,new Date('2025-12-31T15:59:59Z')).currentYear).toBe(2025);
 expect(buildArchiveView(snapshot(0),state,new Date('2025-12-31T16:00:00Z')).currentYear).toBe(2026);
});
it('same-day order is a total order: trusted instants then stable ids',()=>{
 const s=snapshot(3);s.entries[1].markDate.instant='2026-02-01T12:00:00.000Z';
 expect(buildArchiveView(s,state,now).entries.map(e=>e.id)).toEqual(['douban-book-1','douban-book-0','douban-book-2']);
});
it('future partial month and later same-day instant are excluded',()=>{
 const s=snapshot(2);s.entries[0].markDate={precision:'month',year:2026,month:12,day:null,calendarDate:null,instant:null};
 s.entries[1].markDate={precision:'day',year:2026,month:10,day:5,calendarDate:'2026-10-05',instant:'2026-10-05T12:00:00.000Z'};
 expect(buildArchiveView(s,state,now).entries).toHaveLength(0);
});
it('empty filtered year points to nearest year of that type',()=>{
 const s=snapshot(2);s.entries[0].markDate={precision:'year',year:2025,month:null,day:null,calendarDate:null,instant:null};s.entries[1]={...s.entries[1],id:'douban-movie-2',type:'movie',markDate:{precision:'year',year:2024,month:null,day:null,calendarDate:null,instant:null}};
 expect(buildArchiveView(s,{...state,type:'movie'},now).newestYear).toBe(2024);
});
