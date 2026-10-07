import { parseNormalizedRecord, type PrivateArchive, type PublicationLedger, type PublishContext, type PublicSnapshot, type PublicMedia } from '../../src/lib/media/schema';
import { shanghaiDay } from '../../src/lib/media/dates';
import { revisionHash } from './reconcile';
export interface CandidateResult { snapshot:PublicSnapshot; blockers:{kind:string;id:string}[]; summary:{included:number;excluded:number}; onlineStatus:'not-verified' }
export function buildPublicCandidate(archive:PrivateArchive, ledger:PublicationLedger, context:PublishContext):CandidateResult {
  const blockers:CandidateResult['blockers']=[];const entries:PublicMedia[]=[];
  if(archive.importState==='failed') blockers.push({kind:'failed-import',id:''});
  const withdrawals=new Set([...archive.withdrawals,...ledger.unresolvedWithdrawals]);
  for(const id of withdrawals) if(!ledger.decisions[id]?.hidden) blockers.push({kind:'withdrawal',id});
  for(const id of archive.conflicts) if(!ledger.decisions[id]?.hidden) blockers.push({kind:'conflict',id});
  for(const [id,decision] of Object.entries(ledger.decisions)) {
    if(decision.hidden||!decision.approvedRevision||withdrawals.has(id)) continue;
    const revision=archive.revisions[id]?.find(r=>r.hash===decision.approvedRevision);
    const latest=archive.revisions[id]?.find(r=>r.hash===archive.latest[id]);
    if(!revision||!latest){blockers.push({kind:'missing-revision',id});continue;}
    try {
      const record=parseNormalizedRecord(revision.record);
      if(record.id!==id||revisionHash(record)!==revision.hash) throw new Error('invalid-revision');
      if(record.sourceVisibility!=='public'||record.status!=='completed'||latest.record.sourceVisibility!=='public'||latest.record.status!=='completed') continue;
      if(record.markDate.calendarDate && record.markDate.calendarDate>shanghaiDay(context.now)) throw new Error('future-mark');
      const { raw: _raw, basis: _basis, ...markDate }=record.markDate;
      const entry:PublicMedia={id,type:record.type,title:record.title,myRating:decision.override?.myRating===undefined?record.myRating:decision.override.myRating,markDate,comment:decision.override?.comment??record.commentRaw,tags:[...record.tags],credits:record.credits.map(c=>({...c}))};
      if(record.doubanUrl) entry.doubanUrl=record.doubanUrl;
      if(record.blogHref&&context.publicBlogPaths.includes(record.blogHref)&&/^\/blog\/[a-zA-Z0-9_-]+\/?$/.test(record.blogHref)) entry.blogHref=record.blogHref;
      if(decision.cover) {
        const c=decision.cover;
        if(!/^\/assets\/media\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(png|jpe?g|webp|avif)$/.test(c.src)||!Number.isInteger(c.width)||!Number.isInteger(c.height)||c.width<=0||c.height<=0||!c.alt.trim()) throw new Error('invalid-cover');
        entry.cover={src:c.src,width:c.width,height:c.height,alt:c.alt,...(c.credit?{credit:c.credit}:{})};
      }
      entries.push(entry);
    }catch{blockers.push({kind:'invalid-approved-record',id});}
  }
  entries.sort((a,b)=>a.id.localeCompare(b.id));
  return {snapshot:{schemaVersion:1,generatedAt:context.now.toISOString(),archiveTimezone:'Asia/Shanghai',coverage:context.coverage,entries},blockers,summary:{included:entries.length,excluded:Object.keys(archive.latest).length-entries.length},onlineStatus:'not-verified'};
}
