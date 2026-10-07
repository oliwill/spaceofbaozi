import { expect, it } from 'vitest';
import { normalizeRating, parseNormalizedRecord } from '@/lib/media/schema';
const record = { id:'douban-book-123', source:'douban', subjectId:'123', type:'book', title:'合成示例', sourceStatus:'read', status:'completed', sourceVisibility:'public', myRating:null, markDate:{raw:null, precision:'unknown', year:null, month:null, day:null, calendarDate:null, instant:null, basis:'synthetic'}, commentRaw:'', tags:[], credits:[] };
it('identity_preserves_type_and_edition', () => {
 expect(parseNormalizedRecord(record).id).toBe('douban-book-123');
 expect(parseNormalizedRecord({...record,type:'movie',id:'douban-movie-123'}).id).not.toBe(record.id);
 expect(parseNormalizedRecord({...record,subjectId:'456',id:'douban-book-456'}).id).not.toBe(record.id);
});
it('missing_identity_is_quarantined', () => {
 expect(() => parseNormalizedRecord({...record,subjectId:null})).toThrow();
 expect(() => parseNormalizedRecord({...record,id:'douban-movie-123'})).toThrow();
 expect(() => parseNormalizedRecord({...record,source:'manual',id:'manual-test',subjectId:null})).toThrow();
 expect(parseNormalizedRecord({...record,source:'manual',id:'manual-test',subjectId:null,localIdentityConfirmed:true}).id).toBe('manual-test');
});
it('rating_zero_is_format_specific', () => {
 expect(normalizeRating(0,{zeroMeansUnrated:true}).value).toBeNull();
 expect(normalizeRating(1,{zeroMeansUnrated:true}).value).toBe(1);
 expect(normalizeRating(0,{zeroMeansUnrated:false}).issues.length).toBeGreaterThan(0);
 expect(normalizeRating(8.7,{zeroMeansUnrated:false}).issues.length).toBeGreaterThan(0);
 expect(normalizeRating(null,{zeroMeansUnrated:false}).value).toBeNull();
});
it('rejects private fields and invalid enums at contract boundary', () => {
 expect(() => parseNormalizedRecord({...record,cookies:'synthetic-sentinel'})).toThrow();
 expect(() => parseNormalizedRecord({...record,status:'approved'})).toThrow();
 expect(() => parseNormalizedRecord({...record,myRating:0})).toThrow();
});
it('preserves raw comment without executing or replacing it', () => {
 expect(parseNormalizedRecord({...record,commentRaw:'<script>synthetic</script>'}).commentRaw).toBe('<script>synthetic</script>');
});
it('rejects an instant inconsistent with its calendar date', () => {
 expect(() => parseNormalizedRecord({...record,markDate:{raw:'2026-01-01T20:00:00Z',precision:'day',year:2026,month:1,day:1,calendarDate:'2026-01-01',instant:'2026-01-01T20:00:00.000Z',basis:'synthetic'}})).toThrow();
});
it('trusted_instant_requires_matching_offset_bearing_raw_value', () => {
 const markDate={raw:'2026-01-01',precision:'day',year:2026,month:1,day:1,calendarDate:'2026-01-01',instant:'2025-12-31T16:00:00.000Z',basis:'synthetic'};
 expect(() => parseNormalizedRecord({...record,markDate})).toThrow();
 expect(() => parseNormalizedRecord({...record,markDate:{...markDate,raw:'2026-01-01T00:00:00'}})).toThrow();
 expect(() => parseNormalizedRecord({...record,markDate:{...markDate,raw:'2026-01-01T01:00:00+08:00'}})).toThrow();
 expect(parseNormalizedRecord({...record,markDate:{...markDate,raw:'2026-01-01T00:00:00+08:00'}}).markDate.instant).toBe(markDate.instant);
});
