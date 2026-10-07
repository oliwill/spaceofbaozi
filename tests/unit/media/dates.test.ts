import { describe, expect, it } from 'vitest';
import { normalizeMarkDate } from '@/lib/media/dates';
const context = { basis: 'synthetic verified mark field', meaningVerified: true, sourceTimezone: null, now: new Date('2026-10-05T00:00:00Z') };
describe('mark dates', () => {
 it('retains calendar dates and leap days without UTC conversion', () => {
  expect(normalizeMarkDate('2024-02-29', context).value.calendarDate).toBe('2024-02-29');
  expect(normalizeMarkDate('2026-01-01', context).value.calendarDate).toBe('2026-01-01');
 });
 it.each(['2025-02-29', '2026-13-01', '2026-04-31', '2027-01-01', '2026-11', '2027'])('quarantines invalid or future %s', raw => expect(normalizeMarkDate(raw, context).issues.length).toBeGreaterThan(0));
 it('keeps partial dates out of day aggregation', () => {
  expect(normalizeMarkDate('2006', context).value).toMatchObject({ year: 2006, month: null, calendarDate: null, precision: 'year' });
  expect(normalizeMarkDate('2006-02', context).value).toMatchObject({ year: 2006, month: 2, calendarDate: null, precision: 'month' });
  expect(normalizeMarkDate(null, context).value.precision).toBe('unknown');
 });
 it('converts explicit offsets to Shanghai across midnight and year', () => {
  expect(normalizeMarkDate('2025-12-31T18:00:00Z', context).value.calendarDate).toBe('2026-01-01');
  expect(normalizeMarkDate('2026-01-01T01:00:00+09:00', context).value.instant).toBe('2025-12-31T16:00:00.000Z');
 });
 it('never invents an instant for an offset-free timestamp', () => {
  expect(normalizeMarkDate('2026-01-01T12:30:00', context).value).toMatchObject({ calendarDate: '2026-01-01', instant: null });
 });
 it('quarantines unverified meaning rather than treating import time as mark time', () => {
  const result = normalizeMarkDate('2026-01-01', { ...context, meaningVerified: false });
  expect(result.issues.length).toBeGreaterThan(0);
  expect(result.value.calendarDate).toBeNull();
 });
 it.each(['2025-02-29T12:00:00Z', '2026-01-01T25:00:00Z','2026-01-01T12:00:00+99:00'])('rejects normalized-over invalid timestamp %s', raw => expect(normalizeMarkDate(raw, context).issues.length).toBeGreaterThan(0));
});
