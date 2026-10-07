import { createHash } from 'node:crypto';
import { parseNormalizedRecord, type PrivateArchive, type ImportBatch, type NormalizedRecord, type Revision } from '../../src/lib/media/schema';
export const revisionHash = (record: NormalizedRecord): string => createHash('sha256').update(JSON.stringify(parseNormalizedRecord(record))).digest('hex');
export interface Reconciliation { archive: PrivateArchive; summary: { added:number; modified:number; duplicate:number; anomaly:number; withdrawal:number; unchanged:number } }
const trustedNewer = (next:Revision, previous:Revision):boolean => next.reliable && !!next.sourceAt && !!previous.sourceAt && Number.isFinite(Date.parse(next.sourceAt)) && Date.parse(next.sourceAt) > Date.parse(previous.sourceAt);
export function reconcileBatch(previous:PrivateArchive, batch:ImportBatch):Reconciliation {
  const archive=structuredClone(previous);
  const summary={added:0,modified:0,duplicate:0,anomaly:batch.issues.length,withdrawal:0,unchanged:0};
  const groups=new Map<string,NormalizedRecord[]>();
  for(const input of batch.records) {
    try { const r=parseNormalizedRecord(input); groups.set(r.id,[...(groups.get(r.id)??[]),r]); }
    catch { summary.anomaly++; }
  }
  for(const [id,records] of groups) {
    const hashes=records.map(revisionHash);
    if(new Set(hashes).size>1){ summary.anomaly+=records.length; archive.conflicts=Array.from(new Set([...archive.conflicts,id])); continue; }
    summary.duplicate+=records.length-1;
    const record=records[0];const hash=hashes[0];
    const revisions=archive.revisions[id]??[];
    const current=revisions.find(r=>r.hash===archive.latest[id]);
    const next:Revision={hash,record,sourceAt:batch.sourceAt,importedAt:batch.importedAt,reliable:batch.reliable};
    if(current?.hash===hash) {
      if(current.sourceAt && batch.sourceAt && Date.parse(batch.sourceAt)<Date.parse(current.sourceAt)) { summary.anomaly++; continue; }
      if(archive.batches.includes(batch.contentHash)) summary.duplicate++; else summary.unchanged++;
      if(trustedNewer(next,current)) Object.assign(current,{sourceAt:next.sourceAt,importedAt:next.importedAt,reliable:true});
      continue;
    }
    if(!revisions.some(r=>r.hash===hash)) revisions.push(next);
    archive.revisions[id]=revisions;
    if(!current) { archive.latest[id]=hash;summary.added++;continue; }
    if(!trustedNewer(next,current)) {
      summary.anomaly++;
      archive.conflicts=Array.from(new Set([...archive.conflicts,id]));
      continue;
    }
    Object.assign(revisions.find(r=>r.hash===hash)!, {sourceAt:next.sourceAt,importedAt:next.importedAt,reliable:next.reliable});
    archive.latest[id]=hash;summary.modified++;
    if(record.sourceVisibility!=='public'||record.status!=='completed'){
      archive.withdrawals=Array.from(new Set([...archive.withdrawals,id]));summary.withdrawal++;
    }
  }
  if(!archive.batches.includes(batch.contentHash)) archive.batches.push(batch.contentHash);
  archive.importState=summary.anomaly>0?'failed':batch.coverage==='partial'?'partial':'success';
  if(summary.anomaly===0) {
    archive.lastSuccessAt=batch.importedAt;
    if(batch.coverage==='complete' && batch.reliable && batch.sourceAt && Number.isFinite(Date.parse(batch.sourceAt)) && (!archive.lastCompleteSourceAt || Date.parse(batch.sourceAt)>=Date.parse(archive.lastCompleteSourceAt))) { archive.lastCompleteSuccessAt=batch.importedAt;archive.lastCompleteSourceAt=batch.sourceAt; }
  }
  return {archive,summary};
}
