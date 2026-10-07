import { z } from 'astro/zod';
import data from '@/data/media/public.json';
import { eligibleAt } from '@/lib/media/model';
import { validDay, shanghaiDay } from '@/lib/media/dates';
import type { PublicSnapshot } from '@/lib/media/schema';
const text=z.string().max(100000);
const nonempty=z.string().min(1).max(2000).refine(s=>s.trim().length>0);
const mark=z.object({precision:z.enum(['day','month','year','unknown']),year:z.number().int().min(1000).max(9999).nullable(),month:z.number().int().min(1).max(12).nullable(),day:z.number().int().min(1).max(31).nullable(),calendarDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),instant:z.string().datetime().nullable()}).strict().superRefine((d,c)=>{
 const fail=()=>c.addIssue({code:'custom',message:'invalid-public-date'});
 if(d.precision==='unknown'&&[d.year,d.month,d.day,d.calendarDate,d.instant].some(v=>v!==null))fail();
 if(d.precision==='year'&&(d.year===null||[d.month,d.day,d.calendarDate,d.instant].some(v=>v!==null)))fail();
 if(d.precision==='month'&&(d.year===null||d.month===null||[d.day,d.calendarDate,d.instant].some(v=>v!==null)))fail();
 if(d.precision==='day'&&(d.year===null||d.month===null||d.day===null||!validDay(d.year,d.month,d.day)||d.calendarDate!==`${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`))fail();
 if(d.instant&&(!Number.isFinite(Date.parse(d.instant))||shanghaiDay(new Date(d.instant))!==d.calendarDate))fail();
});
const entry=z.object({id:z.string().regex(/^(douban-(book|movie|music)-\d+|manual-[a-z0-9-]+)$/),type:z.enum(['book','movie','music']),title:nonempty,myRating:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5)]).nullable(),markDate:mark,comment:text,tags:z.array(nonempty).max(100),credits:z.array(z.object({label:nonempty,value:nonempty}).strict()).max(30),doubanUrl:z.string().regex(/^https:\/\/(book|movie|music)\.douban\.com\/subject\/\d+\/$/).optional(),blogHref:z.string().regex(/^\/blog\/[a-zA-Z0-9_-]+\/?$/).optional(),cover:z.object({src:z.string().regex(/^\/assets\/media\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(png|jpe?g|webp|avif)$/),width:z.number().int().positive(),height:z.number().int().positive(),alt:nonempty,credit:nonempty.optional()}).strict().optional()}).strict();
const schema=z.object({schemaVersion:z.literal(1),generatedAt:z.string().datetime(),archiveTimezone:z.literal('Asia/Shanghai'),coverage:z.object({verifiedEmptyYears:z.array(z.number().int().min(1000).max(9999)),description:nonempty}).strict(),entries:z.array(entry).max(50000)}).strict();
export function parsePublicSnapshot(input:unknown, now=new Date()):PublicSnapshot {
 const snapshot=schema.parse(input);
 if(new Set(snapshot.entries.map(e=>e.id)).size!==snapshot.entries.length)throw new Error('duplicate-public-id');
 for(const e of snapshot.entries)if(e.id.startsWith('douban-')&&!e.id.startsWith(`douban-${e.type}-`))throw new Error('identity-type-mismatch');
 const today=shanghaiDay(now);
 for(const e of snapshot.entries){
  if(!eligibleAt(e,now,today))throw new Error('future-public-mark');
  if(e.doubanUrl&&e.doubanUrl!==`https://${e.type==='book'?'book':e.type==='movie'?'movie':'music'}.douban.com/subject/${e.id.split('-').at(-1)}/`)throw new Error('subject-url-mismatch');
 }
 return snapshot;
}
export const readPublicSnapshot=():PublicSnapshot=>parsePublicSnapshot(data);
