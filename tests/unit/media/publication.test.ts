import { expect,it } from 'vitest';
import { reconcileBatch } from '../../../scripts/media/reconcile';
import { buildPublicCandidate } from '../../../scripts/media/publication';
import { emptyArchive,syntheticBatch,syntheticRecord,now } from '../../fixtures/media/records';
const context={now,coverage:{verifiedEmptyYears:[],description:'合成测试'},publicBlogPaths:[]};
const setup=()=>{ const r=syntheticRecord();const archive=reconcileBatch(emptyArchive(),syntheticBatch([r])).archive;return {r,archive,ledger:{decisions:{[r.id]:{approvedRevision:archive.latest[r.id],hidden:false}},unresolvedWithdrawals:[]}};};
it('approval_binds_revision_and_pending_edit_preserves_approved_comment',()=>{
 const {r,archive,ledger}=setup();const next=reconcileBatch(archive,syntheticBatch([{...r,commentRaw:'pending'}],{contentHash:'new',sourceAt:'2026-10-02T00:00:00Z'}));
 expect(buildPublicCandidate(next.archive,ledger,context).snapshot.entries[0].comment).toBe(r.commentRaw);
});
it('site_hidden_survives_reimport',()=>{
 const {r,archive,ledger}=setup();ledger.decisions[r.id].hidden=true;
 const next=reconcileBatch(archive,syntheticBatch([r],{contentHash:'again'}));
 expect(buildPublicCandidate(next.archive,ledger,context).snapshot.entries).toHaveLength(0);
});
it.each(['private','unknown'] as const)('private_and_unknown_never_auto_publish: %s',visibility=>{
 const {r,ledger}=setup();const archive=reconcileBatch(emptyArchive(),syntheticBatch([{...r,sourceVisibility:visibility}])).archive;
 ledger.decisions[r.id].approvedRevision=archive.latest[r.id];
 expect(buildPublicCandidate(archive,ledger,context).snapshot.entries).toHaveLength(0);
});
it('private_change_is_publication_blocker_and_candidate_excludes_record',()=>{
 const {r,archive,ledger}=setup();const next=reconcileBatch(archive,syntheticBatch([{...r,sourceVisibility:'private'}],{contentHash:'private',sourceAt:'2026-10-02T00:00:00Z'}));
 const candidate=buildPublicCandidate(next.archive,ledger,context);
 expect(candidate.snapshot.entries).toHaveLength(0);
 expect(candidate.blockers).toContainEqual(expect.objectContaining({kind:'withdrawal',id:r.id}));
 expect(candidate.onlineStatus).toBe('not-verified');
});
it('site_override_wins_and_snapshot_drops_maintenance_fields',()=>{
 const {r,archive,ledger}=setup();
 const candidate=buildPublicCandidate(archive,{...ledger,decisions:{[r.id]:{...ledger.decisions[r.id],override:{comment:'本站编辑',myRating:null}}}},context);
 expect(candidate.snapshot.entries[0]).toMatchObject({comment:'本站编辑',myRating:null});
 const serialized=JSON.stringify(candidate.snapshot);expect(serialized).not.toContain('commentRaw');expect(serialized).not.toContain('sourceVisibility');expect(serialized).not.toContain('approvedRevision');
});
it('unknown_or_forged_revision_cannot_publish',()=>{
 const {r,archive,ledger}=setup();ledger.decisions[r.id].approvedRevision='forged';
 expect(buildPublicCandidate(archive,ledger,context).snapshot.entries).toHaveLength(0);
});
it('failed_batch_blocks_even_an_empty_candidate',()=>{
 const a=reconcileBatch(emptyArchive(),syntheticBatch([],{issues:[{row:0,reason:'parse failed'}]})).archive;
 expect(buildPublicCandidate(a,{decisions:{},unresolvedWithdrawals:[]},context).blockers).toContainEqual(expect.objectContaining({kind:'failed-import'}));
});
