import type { ArchiveState,ArchiveView,PublicMedia,PublicSnapshot,CalendarDay } from '@/lib/media/schema';
import { shanghaiDay } from '@/lib/media/dates';
export function eligibleAt(e:Pick<PublicMedia,'markDate'>,now:Date,today=shanghaiDay(now)):boolean {
 const d=e.markDate;
 const value=d.calendarDate??(d.year?`${d.year}${d.month?'-'+String(d.month).padStart(2,'0'):''}`:null);
 return (!value||value<=today.slice(0,value.length))&&(!d.instant||Date.parse(d.instant)<=now.getTime());
}
export const compareEntries=(a:PublicMedia,b:PublicMedia):number=>{
 const ad=a.markDate;const bd=b.markDate;
 if(!!ad.calendarDate!==!!bd.calendarDate)return ad.calendarDate?-1:1;
 if(ad.calendarDate&&bd.calendarDate){
  const date=bd.calendarDate.localeCompare(ad.calendarDate);if(date)return date;
  if(!!ad.instant!==!!bd.instant)return ad.instant?-1:1;
  const instant=(bd.instant??'').localeCompare(ad.instant??'');if(instant)return instant;
 }else{const month=(bd.month??0)-(ad.month??0);if(month)return month;}
 return a.id<b.id?-1:a.id>b.id?1:0;
};
export function buildArchiveView(snapshot:PublicSnapshot,state:ArchiveState,now:Date):ArchiveView {
 const today=shanghaiDay(now);const currentYear=Number(today.slice(0,4));
 const eligible=snapshot.entries.filter(e=>eligibleAt(e,now,today));
 const availableYears=Array.from(new Set([currentYear,...snapshot.coverage.verifiedEmptyYears.filter(y=>y<=currentYear),...eligible.flatMap(e=>e.markDate.year?[e.markDate.year]:[])])).sort((a,b)=>b-a);
 const annual=eligible.filter(e=>(state.year==='undated'?e.markDate.year===null:e.markDate.year===state.year)&&(state.type==='all'||e.type===state.type));
 const calendar:CalendarDay[]=[];
 if(state.year!=='undated'){
  const counts=new Map<string,number>();for(const e of annual)if(e.markDate.calendarDate)counts.set(e.markDate.calendarDate,(counts.get(e.markDate.calendarDate)??0)+1);
  for(let d=new Date(Date.UTC(state.year,0,1));d.getUTCFullYear()===state.year;d.setUTCDate(d.getUTCDate()+1)){
   const date=d.toISOString().slice(0,10);calendar.push({date,count:counts.get(date)??0,future:date>today});
  }
 }
 const filtered=annual.filter(e=>!state.day||e.markDate.calendarDate===state.day).sort(compareEntries);
 return {state,entries:filtered.slice((state.page-1)*24,state.page*24),totalPages:Math.max(1,Math.ceil(filtered.length/24)),totalEntries:filtered.length,calendar,availableYears,partialDates:annual.filter(e=>!e.markDate.calendarDate).length,currentYear,currentMonth:Number(today.slice(5,7)),coverage:snapshot.coverage,hasPublicEntries:eligible.length>0,newestYear:eligible.filter(e=>state.type==='all'||e.type===state.type).reduce<number|null>((y,e)=>e.markDate.year===null?y:Math.max(y??0,e.markDate.year),null)};
}
