import {expect,it} from 'vitest';
import {dayLevel,monthToExpand,calendarKeyIndex} from '@/lib/media/calendar';
it.each([[0,0],[1,1],[2,2],[3,3],[4,4],[7,4]])('maps %i to grey %i', (n,level)=>expect(dayLevel(n)).toBe(level));
it('current month wins; historical latest marked month, else January',()=>{
 expect(monthToExpand(2026,2026,10,[{date:'2026-02-01',count:1,future:false}])).toBe(10);
 expect(monthToExpand(2025,2026,10,[{date:'2025-02-01',count:1,future:false}])).toBe(2);
 expect(monthToExpand(2025,2026,10,[])).toBe(1);
});
it('keyboard arrows and boundaries use a roving index',()=>{
 expect(calendarKeyIndex('ArrowRight',0,31)).toBe(1);expect(calendarKeyIndex('ArrowDown',0,31)).toBe(7);expect(calendarKeyIndex('End',0,31)).toBe(30);expect(calendarKeyIndex('Home',5,31)).toBe(0);expect(calendarKeyIndex('ArrowLeft',0,31)).toBe(0);
});
it('desktop column layout uses matching visual arrow steps',()=>{
 expect(calendarKeyIndex('ArrowRight',0,31,true)).toBe(7);
 expect(calendarKeyIndex('ArrowDown',0,31,true)).toBe(1);
});
