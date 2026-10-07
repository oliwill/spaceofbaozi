import {expect,it} from 'vitest';
import {ratingLabel,dateLabel,typeLabel} from '@/lib/media/presentation';
it('unknown rating is not zero stars',()=>{expect(ratingLabel(null)).toBe('未评分');expect(ratingLabel(1)).toBe('我的评分：1 / 5');});
it('partial dates are marked without invented days',()=>{
 expect(dateLabel({precision:'year',year:2006,month:null,day:null,calendarDate:null,instant:null})).toBe('2006 · 日期待补');
 expect(dateLabel({precision:'unknown',year:null,month:null,day:null,calendarDate:null,instant:null})).toBe('日期待补');
 expect(typeLabel('music')).toBe('音');
});
it('longform only links to a known published article',async()=>{
 const {publicBlogHref}=await import('@/lib/media/presentation');
 expect(publicBlogHref('/blog/missing',['/blog/existing'])).toBeUndefined();
 expect(publicBlogHref('/blog/existing',['/blog/existing'])).toBe('/blog/existing');
 expect(publicBlogHref('javascript:alert(1)',['javascript:alert(1)'])).toBeUndefined();
});
