import type { Rating,PublicMarkDate,MediaType } from '@/lib/media/schema';
export const ratingLabel=(rating:Rating):string=>rating===null?'未评分':`我的评分：${rating} / 5`;
export const typeLabel=(type:MediaType):string=>({book:'书',movie:'影',music:'音'})[type];
export function dateLabel(date:PublicMarkDate):string {
 if(date.calendarDate)return date.calendarDate;
 if(date.year)return `${date.year}${date.month?'-'+String(date.month).padStart(2,'0'):''} · 日期待补`;
 return '日期待补';
}
export function publicBlogHref(href:string|undefined,publishedPaths:string[]):string|undefined {
 return href&&/^\/blog\/[a-zA-Z0-9_-]+$/.test(href)&&publishedPaths.includes(href)?href:undefined;
}
