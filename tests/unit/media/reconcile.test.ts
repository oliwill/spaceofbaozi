import { expect, it } from 'vitest';
import { reconcileBatch } from '../../../scripts/media/reconcile';
import { emptyArchive, syntheticBatch, syntheticRecord } from '../../fixtures/media/records';
it('same_file_is_idempotent', () => {
 const b=syntheticBatch([syntheticRecord()]); const first=reconcileBatch(emptyArchive(),b);
 const twice=reconcileBatch(first.archive,b);
 expect(Object.keys(twice.archive.revisions)).toHaveLength(1);
 expect(twice.archive.revisions[b.records[0].id]).toHaveLength(1);
 expect(twice.summary.duplicate).toBe(1);
});
it('state_change_preserves_identity_and_older_export_does_not_win', () => {
 const record=syntheticRecord(); const first=reconcileBatch(emptyArchive(),syntheticBatch([record]));
 const older=reconcileBatch(first.archive,syntheticBatch([{...record,commentRaw:'old'}],{contentHash:'old',sourceAt:'2025-01-01T00:00:00Z'}));
 expect(older.archive.latest).toEqual(first.archive.latest);
 expect(older.summary.anomaly).toBe(1);
 const newer=reconcileBatch(first.archive,syntheticBatch([{...record,status:'other'}],{contentHash:'new',sourceAt:'2026-10-02T00:00:00Z'}));
 expect(Object.keys(newer.archive.revisions)).toEqual([record.id]);
 expect(newer.archive.withdrawals).toContain(record.id);
});
it('incomplete_batch_does_not_delete_or_advance_complete_success', () => {
 const first=reconcileBatch(emptyArchive(),syntheticBatch([syntheticRecord()]));
 const next=reconcileBatch(first.archive,syntheticBatch([],{contentHash:'partial',coverage:'partial',importedAt:'2026-10-06T00:00:00Z'}));
 expect(next.archive.latest).toEqual(first.archive.latest);
 expect(next.archive.lastCompleteSuccessAt).toBe(first.archive.lastCompleteSuccessAt);
});
it('unknown_age_and_older_private_claim_require_review', () => {
 const r=syntheticRecord();const first=reconcileBatch(emptyArchive(),syntheticBatch([r]));
 for(const sourceAt of [null,'2025-01-01T00:00:00Z']) {
  const next=reconcileBatch(first.archive,syntheticBatch([{...r,sourceVisibility:'private'}],{contentHash:String(sourceAt),sourceAt}));
  expect(next.archive.latest).toEqual(first.archive.latest);
  expect(next.archive.conflicts).toContain(r.id);
 }
});
it('same_subject_with_conflicting_rows_is_quarantined', () => {
 const r=syntheticRecord();const result=reconcileBatch(emptyArchive(),syntheticBatch([r,{...r,commentRaw:'conflict'}]));
 expect(result.archive.latest[r.id]).toBeUndefined();
 expect(result.summary.anomaly).toBeGreaterThan(0);
});
it('returning_content_keeps_latest_trusted_observation_time',()=>{
 const r=syntheticRecord();let a=reconcileBatch(emptyArchive(),syntheticBatch([r],{sourceAt:'2026-10-01T00:00:00Z'})).archive;
 a=reconcileBatch(a,syntheticBatch([{...r,commentRaw:'B'}],{contentHash:'b',sourceAt:'2026-10-03T00:00:00Z'})).archive;
 a=reconcileBatch(a,syntheticBatch([r],{contentHash:'a-new',sourceAt:'2026-10-05T00:00:00Z'})).archive;
 const result=reconcileBatch(a,syntheticBatch([{...r,commentRaw:'C'}],{contentHash:'c-old',sourceAt:'2026-10-04T00:00:00Z'}));
 expect(result.archive.latest).toEqual(a.latest);expect(result.summary.anomaly).toBe(1);
});
it('same_content_older_backup_does_not_advance_complete_success',()=>{
 const r=syntheticRecord();const a=reconcileBatch(emptyArchive(),syntheticBatch([r],{sourceAt:'2026-10-03T00:00:00Z',importedAt:'2026-10-04T00:00:00Z'})).archive;
 const result=reconcileBatch(a,syntheticBatch([r],{contentHash:'old-identical',sourceAt:'2026-10-01T00:00:00Z',importedAt:'2026-10-05T00:00:00Z'}));
 expect(result.archive.lastCompleteSuccessAt).toBe(a.lastCompleteSuccessAt);
});
