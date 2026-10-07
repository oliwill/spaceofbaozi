import { servedUrl, logicalPath } from "@/lib/site/paths";
import type { ArchiveState,MediaFilter,PublicSnapshot } from '@/lib/media/schema';
import { buildArchiveView,eligibleAt,compareEntries } from '@/lib/media/model';
export const filters:MediaFilter[]=['all','book','movie','music'];
export function listPath(s:ArchiveState):string {
 if(!filters.includes(s.type)||!Number.isInteger(s.page)||s.page<1||(s.year!=='undated'&&(!Number.isInteger(s.year)||s.year<1000||s.year>9999))||(s.day&&!/^\d{4}-\d{2}-\d{2}$/.test(s.day))||(s.year==='undated'&&s.day))throw new Error('invalid-archive-state');
 return `/media/${s.year==='undated'?'undated':`y/${s.year}`}/${s.type==='all'?'':s.type+'/'}${s.day?'d/'+s.day+'/':''}${s.page===1?'':'p/'+s.page+'/'}`.replace(/\/$/,'');
}
export function listHref(s:ArchiveState):string { return servedUrl(listPath(s)); }
export function enumerateArchiveStates(snapshot:PublicSnapshot,now:Date):ArchiveState[]{
 const years=buildArchiveView(snapshot,{year:'undated',type:'all',day:null,page:1},now).availableYears;
 const states:ArchiveState[]=[];
 for(const year of [...years,'undated' as const])for(const type of filters){
  const base:ArchiveState={year,type,day:null,page:1};const view=buildArchiveView(snapshot,base,now);
  for(let page=1;page<=view.totalPages;page++)states.push({...base,page});
  for(const day of view.calendar.filter(d=>d.count>0&&!d.future)){
   const selected={...base,day:day.date};
   for(let page=1;page<=Math.ceil(day.count/24);page++)states.push({...selected,page});
  }
 }
 return states;
}
export function detailHref(id:string,from?:string):string {
 if(!/^(douban-(book|movie|music)-\d+|manual-[a-z0-9-]+)$/.test(id))throw new Error('invalid-id');
 return servedUrl(`/media/item/${id}${from?'?from='+encodeURIComponent(from):''}`);
}
export function validateReturnHref(value:string,snapshot:PublicSnapshot,now:Date,id:string):string|null {
 const logical=logicalPath(value);if(logical===null)return null;
 const [path,anchor,...extra]=logical.split('#');if(extra.length||anchor&&anchor!==`media-${id}`)return null;
 const match=/^\/media\/(?:y\/(\d{4})|(undated))\/(?:(book|movie|music)\/)?(?:d\/(\d{4}-\d{2}-\d{2})\/)?(?:p\/([1-9]\d*)\/)?$/.exec(path+'/');
 if(!match)return null;
 const state:ArchiveState={year:match[2]?'undated':Number(match[1]),type:(match[3]??'all') as MediaFilter,day:match[4]??null,page:Number(match[5]??1)};
 try{if(listPath(state)!==path)return null;}catch{return null;}
 const view=buildArchiveView(snapshot,state,now);
 if((state.year!=='undated'&&!view.availableYears.includes(state.year))||!view.entries.some(e=>e.id===id))return null;
 return servedUrl(path+`#media-${id}`);
}
export function changeArchiveState(state:ArchiveState,change:Partial<ArchiveState>,snapshot:PublicSnapshot,now:Date):ArchiveState {
 const next={...state,...change,page:1};
 if(change.year!==undefined&&change.year!==state.year)next.day=null;
 if(next.day&&!buildArchiveView(snapshot,{...next,day:null},now).calendar.some(d=>d.date===next.day&&d.count>0&&!d.future))next.day=null;
 return next;
}
/** Build per-record return hints; only that record's small allowlist reaches its detail. */
export function returnLinksById(snapshot:PublicSnapshot,now:Date):Map<string,string[]> {
 const groups=new Map<string,{state:ArchiveState;entries:PublicSnapshot['entries']}>();
 const eligible=snapshot.entries.filter(e=>eligibleAt(e,now));
 for(const entry of eligible)for(const type of ['all',entry.type] as MediaFilter[])for(const day of [null,...(entry.markDate.calendarDate?[entry.markDate.calendarDate]:[])]){
  const state:ArchiveState={year:entry.markDate.year??'undated',type,day,page:1};const key=listHref(state);
  const group=groups.get(key)??{state,entries:[]};group.entries.push(entry);groups.set(key,group);
 }
 const result=new Map<string,string[]>();
 for(const group of groups.values())group.entries.sort(compareEntries).forEach((entry,index)=>{
  const paths=result.get(entry.id)??[];paths.push(listHref({...group.state,page:Math.floor(index/24)+1})+`#media-${entry.id}`);result.set(entry.id,paths);
 });
 return result;
}
