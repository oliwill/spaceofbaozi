import { z } from 'astro/zod';
import { validDay, shanghaiDay, normalizeMarkDate, type MarkDate } from '@/lib/media/dates';
export type { MarkDate } from '@/lib/media/dates';
export type MediaType = 'book' | 'movie' | 'music';
export type MediaFilter = 'all' | MediaType;
export type Rating = 1 | 2 | 3 | 4 | 5 | null;
export interface RatingFormat { zeroMeansUnrated: boolean }
export interface RatingResult { value: Rating; issues: string[] }
export function normalizeRating(value: unknown, format: RatingFormat): RatingResult {
  if (value === null || value === undefined || value === '' || (value === 0 && format.zeroMeansUnrated === true)) return { value: null, issues: [] };
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
    ? { value: value as Rating, issues: [] } : { value: null, issues: ['invalid-personal-rating'] };
}
const text = z.string().max(100000);
const title = z.string().min(1).max(2000).refine(s => s.trim().length > 0);
const mediaType = z.enum(['book', 'movie', 'music']);
const rating = z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5)]).nullable();
export const markDateSchema = z.object({
  raw: text.nullable(), precision: z.enum(['day','month','year','unknown']),
  year: z.number().int().min(1000).max(9999).nullable(), month: z.number().int().min(1).max(12).nullable(), day: z.number().int().min(1).max(31).nullable(),
  calendarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), instant: z.string().datetime().nullable(), basis: title,
}).strict().superRefine((date, ctx) => {
  const fail = () => ctx.addIssue({ code: 'custom', message: 'inconsistent-mark-date' });
  if (date.instant && normalizeMarkDate(date.raw, { basis: date.basis, meaningVerified: true, sourceTimezone: null, now: new Date(date.instant) }).value.instant !== date.instant) fail();
  if (date.instant && (!Number.isFinite(Date.parse(date.instant)) || shanghaiDay(new Date(date.instant)) !== date.calendarDate)) fail();
  if (date.precision === 'unknown' && [date.year,date.month,date.day,date.calendarDate,date.instant].some(v => v !== null)) fail();
  if (date.precision === 'year' && (date.year === null || [date.month,date.day,date.calendarDate,date.instant].some(v => v !== null))) fail();
  if (date.precision === 'month' && (date.year === null || date.month === null || [date.day,date.calendarDate,date.instant].some(v => v !== null))) fail();
  if (date.precision === 'day' && (date.year === null || date.month === null || date.day === null || !validDay(date.year,date.month,date.day) || date.calendarDate !== `${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`)) fail();
});
const credits = z.array(z.object({ label: title, value: title }).strict()).max(30);
export const normalizedSchema = z.object({
  id: z.string().regex(/^(douban-(book|movie|music)-[0-9]+|manual-[a-z0-9-]+)$/), source:z.enum(['douban','manual']), subjectId:z.string().regex(/^\d+$/).nullable(), type:mediaType, title,
  sourceStatus:text, status:z.enum(['completed','other','unknown']), sourceVisibility:z.enum(['public','private','unknown']), myRating:rating,
  markDate:markDateSchema, commentRaw:text, tags:z.array(title).max(100).default([]), credits:credits.default([]),
  doubanUrl:z.string().url().optional(), blogHref:z.string().optional(), localIdentityConfirmed:z.literal(true).optional(),
}).strict().superRefine((r,ctx) => {
  if ((r.source === 'douban' && (!r.subjectId || r.id !== `douban-${r.type}-${r.subjectId}`)) || (r.source === 'manual' && (!r.localIdentityConfirmed || !r.id.startsWith('manual-') || r.subjectId !== null))) ctx.addIssue({code:'custom',message:'unconfirmed-identity'});
  if (r.doubanUrl) {
    const host = {book:'book.douban.com',movie:'movie.douban.com',music:'music.douban.com'}[r.type];
    if (r.doubanUrl !== `https://${host}/subject/${r.subjectId}/`) ctx.addIssue({code:'custom',message:'invalid-subject-url'});
  }
});
export type NormalizedRecord = z.infer<typeof normalizedSchema>;
export const parseNormalizedRecord = (input: unknown): NormalizedRecord => normalizedSchema.parse(input);
export type PublicMarkDate = Omit<MarkDate,'raw'|'basis'>;
export interface Cover { src:string; width:number; height:number; alt:string; credit?:string }
export interface PublicMedia { id:string; type:MediaType; title:string; myRating:Rating; markDate:PublicMarkDate; comment:string; tags:string[]; credits:{label:string;value:string}[]; doubanUrl?:string; blogHref?:string; cover?:Cover }
export interface Coverage { verifiedEmptyYears:number[]; description:string }
export interface PublicSnapshot { schemaVersion:1; generatedAt:string; archiveTimezone:'Asia/Shanghai'; coverage:Coverage; entries:PublicMedia[] }
export interface ImportBatch { schemaVersion:1; contentHash:string; importedAt:string; sourceAt:string|null; coverage:'complete'|'partial'; reliable:boolean; records:NormalizedRecord[]; issues:{row:number;reason:string}[] }
export interface Revision { hash:string; record:NormalizedRecord; sourceAt:string|null; importedAt:string; reliable:boolean }
export interface PrivateArchive { importState?: 'success'|'partial'|'failed'; lastCompleteSourceAt?:string|null; revisions:Record<string,Revision[]>; latest:Record<string,string>; batches:string[]; lastSuccessAt:string|null; lastCompleteSuccessAt:string|null; withdrawals:string[]; conflicts:string[] }
export interface PublicationDecision { approvedRevision:string|null; hidden:boolean; override?:{comment?:string;myRating?:Rating}; cover?:Cover }
export interface PublicationLedger { decisions:Record<string,PublicationDecision>; unresolvedWithdrawals:string[] }
export interface PublishContext { now:Date; coverage:Coverage; publicBlogPaths:string[] }
export interface ArchiveState { year:number|'undated'; type:MediaFilter; day:string|null; page:number }
export interface CalendarDay { date:string; count:number; future:boolean }
export interface ArchiveView { state:ArchiveState; entries:PublicMedia[]; totalPages:number; totalEntries:number; calendar:CalendarDay[]; availableYears:number[]; partialDates:number; currentYear:number; currentMonth:number; coverage:Coverage; hasPublicEntries:boolean; newestYear:number|null }
