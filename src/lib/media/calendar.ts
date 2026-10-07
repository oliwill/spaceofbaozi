import type {CalendarDay} from './schema';
export const dayLevel=(count:number):number=>Math.min(4,Math.max(0,count));
export function monthToExpand(year:number,currentYear:number,currentMonth:number,days:CalendarDay[]):number {
 if(year===currentYear)return currentMonth;
 return Number(days.filter(d=>d.count>0).at(-1)?.date.slice(5,7)??1);
}
export function calendarKeyIndex(key:string,index:number,length:number,columnLayout=false):number {
 const next=key==='Home'?0:key==='End'?length-1:index+((columnLayout?{ArrowRight:7,ArrowLeft:-7,ArrowDown:1,ArrowUp:-1}:{ArrowRight:1,ArrowLeft:-1,ArrowDown:7,ArrowUp:-7})[key]??0);
 return Math.max(0,Math.min(length-1,next));
}
export function mountMediaCalendar(root:HTMLElement):()=>void {
 const cleanups:(()=>void)[]=[];
 for(const grid of root.querySelectorAll<HTMLElement>('[data-calendar-grid]')){
  const cells=Array.from(grid.querySelectorAll<HTMLElement>('[data-date]:not([data-future])'));
  const selected=cells.findIndex(c=>c.getAttribute('aria-current')==='date');
  cells.forEach((cell,i)=>cell.tabIndex=i===(selected<0?0:selected)?0:-1);
  const onKey=(event:KeyboardEvent)=>{
   if(!['Home','End','ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(event.key))return;
   const index=cells.indexOf(event.target as HTMLElement);if(index<0)return;
   event.preventDefault();const next=calendarKeyIndex(event.key,index,cells.length,grid.hasAttribute('data-desktop-calendar'));
   cells[index].tabIndex=-1;cells[next].tabIndex=0;cells[next].focus();
  };
  grid.addEventListener('keydown',onKey);cleanups.push(()=>grid.removeEventListener('keydown',onKey));
 }
 let focusedDate:string|undefined;
 const onFocus=(event:FocusEvent)=>{const target=event.target as HTMLElement;focusedDate=root.contains(target)?target.dataset.date:undefined;};
 document.addEventListener('focusin',onFocus);
 const breakpoint=matchMedia('(max-width:767px)');
 const onBreakpoint=()=>{
  if(!focusedDate||!root.isConnected)return;
  const selector=breakpoint.matches?'.media-calendar-mobile':'.media-calendar-desktop';
  const cell=root.querySelector<HTMLElement>(`${selector} [data-date="${focusedDate}"]`);
  if(!cell)return;
  const month=cell.closest('details');if(month)month.open=true;
  const grid=cell.closest('[data-calendar-grid]');grid?.querySelectorAll<HTMLElement>('[data-date]').forEach(item=>item.tabIndex=item===cell?0:-1);
  cell.focus({preventScroll:true});
 };
 breakpoint.addEventListener('change',onBreakpoint);
 cleanups.push(()=>document.removeEventListener('focusin',onFocus),()=>breakpoint.removeEventListener('change',onBreakpoint));
 return ()=>cleanups.forEach(cleanup=>cleanup());
}
