export interface MarkDate {
  raw: string | null; precision: 'day' | 'month' | 'year' | 'unknown';
  year: number | null; month: number | null; day: number | null;
  calendarDate: string | null; instant: string | null; basis: string;
}
export interface DateContext { basis: string; meaningVerified: boolean; sourceTimezone: string | null; now: Date }
export interface DateResult { value: MarkDate; issues: string[] }
export const shanghaiDay = (date: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export function validDay(year: number, month: number, day: number): boolean {
  return year >= 1000 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}
export function normalizeMarkDate(raw: string | null, context: DateContext): DateResult {
  const unknown: MarkDate = { raw, precision: 'unknown', year: null, month: null, day: null, calendarDate: null, instant: null, basis: context.basis };
  const fail = (issue: string): DateResult => ({ value: unknown, issues: [issue] });
  if (!raw) return { value: unknown, issues: [] };
  if (!context.meaningVerified || !context.basis.trim()) return fail('unverified-mark-meaning');
  if (!Number.isFinite(context.now.getTime())) return fail('invalid-now');
  const parts = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(raw);
  const timestamp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/.exec(raw);
  if (!parts && !timestamp) return fail('invalid-date');
  const match = parts ?? timestamp!;
  let year = Number(match[1]); let month = match[2] ? Number(match[2]) : null; let day = match[3] ? Number(match[3]) : null;
  if (!validDay(year, month ?? 1, day ?? 1)) return fail('invalid-date');
  let instant: string | null = null;
  let calendarDate = day ? raw.slice(0, 10) : null;
  if (timestamp) {
    if (Number(timestamp[4]) > 23 || Number(timestamp[5]) > 59 || Number(timestamp[6]) > 59) return fail('invalid-time');
    const offset = timestamp[7];
    if (offset) {
      if (offset !== 'Z' && (Number(offset.slice(1,3)) > 14 || Number(offset.slice(4)) > 59 || (Number(offset.slice(1,3)) === 14 && Number(offset.slice(4)) !== 0))) return fail('invalid-offset');
      const date = new Date(raw);
      if (!Number.isFinite(date.getTime()) || date > context.now) return fail('invalid-or-future-instant');
      instant = date.toISOString(); calendarDate = shanghaiDay(date);
      [year, month, day] = calendarDate.split('-').map(Number);
    }
  }
  const today = shanghaiDay(context.now);
  const comparison = calendarDate ?? raw;
  if (comparison > today.slice(0, comparison.length)) return fail('future-mark');
  return { value: { raw, precision: day ? 'day' : month ? 'month' : 'year', year, month, day, calendarDate, instant, basis: context.basis }, issues: [] };
}
