import {readFileSync,existsSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'astro/zod';
import {parsePublicSnapshot} from '../../src/lib/media/publicSnapshot.server';
import {buildPublicCandidate} from './publication';
import {atomicPrivateJson,privatePath,readArchive,safeRead,productRoot} from './private-files';
const hash=z.string().regex(/^[a-f0-9]{64}$/);const rating=z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5)]).nullable();
const cover=z.object({src:z.string(),width:z.number().int().positive(),height:z.number().int().positive(),alt:z.string().min(1),credit:z.string().optional()}).strict();
const approvalSchema=z.object({schemaVersion:z.literal(1),expectedSnapshotHash:hash,decisions:z.record(z.object({approvedRevision:hash.nullable(),hidden:z.boolean(),override:z.object({comment:z.string().max(100000).optional(),myRating:rating.optional()}).strict().optional(),cover:cover.optional()}).strict()),unresolvedWithdrawals:z.array(z.string()),coverage:z.object({verifiedEmptyYears:z.array(z.number().int()),description:z.string().min(1)}).strict()}).strict();
export function snapshotHash():string{return createHash('sha256').update(readFileSync(resolve(productRoot,'src/data/media/public.json'))).digest('hex');}
export function writeCandidate(approvalPath:string,privateDir:string,expectedSnapshotHash:string,out=resolve(privateDir,'candidate.json')) {
 privatePath(privateDir);privatePath(out,privateDir);if(['archive.json','publication.json','last-report.json'].includes(basename(out))||resolve(out)===resolve(approvalPath))throw new Error('reserved-private-output-path');let approval:z.infer<typeof approvalSchema>;
 try{approval=approvalSchema.parse(JSON.parse(safeRead(approvalPath,privateDir).toString('utf8')));}catch{throw new Error('invalid-explicit-approval');}
 const check=()=>{if(expectedSnapshotHash!==approval.expectedSnapshotHash||snapshotHash()!==expectedSnapshotHash)throw new Error('stale-snapshot-hash');};check();
 const ledgerPath=resolve(privateDir,'publication.json');privatePath(ledgerPath,privateDir);
 if(existsSync(ledgerPath)){
  let previous:z.infer<typeof approvalSchema>;try{previous=approvalSchema.parse(JSON.parse(safeRead(ledgerPath,privateDir).toString('utf8')));}catch{throw new Error('invalid-persistent-publication-ledger');}
  for(const [id,decision] of Object.entries(previous.decisions)){
   const next=approval.decisions[id];
   if(next){
    if(decision.override)next.override={...decision.override,...next.override};
    if(decision.cover&&!next.cover)next.cover=decision.cover;
   }
   if(decision.hidden)approval.decisions[id]={...decision,...next,hidden:true};
  }
  approval.unresolvedWithdrawals=Array.from(new Set([...previous.unresolvedWithdrawals,...approval.unresolvedWithdrawals]));
 }
 const archive=readArchive(privateDir);const candidate=buildPublicCandidate(archive,approval,{now:new Date(),coverage:approval.coverage,publicBlogPaths:[]});
 if(candidate.blockers.length)throw new Error('candidate-blocked-by-import-withdrawal-or-conflict');
 const snapshot=parsePublicSnapshot(candidate.snapshot);atomicPrivateJson(ledgerPath,approval,privateDir,check);atomicPrivateJson(out,snapshot,privateDir,check);
 return {path:out,records:snapshot.entries.length,onlineStatus:'not-verified',productionReplaced:false};
}
if(import.meta.main){const args=process.argv.slice(2);const value=(key:string)=>args[args.indexOf(key)+1];try{for(const key of ['--approval','--private-dir','--expected-snapshot-hash'])if(!args.includes(key))throw new Error('missing');console.log(JSON.stringify(writeCandidate(value('--approval'),value('--private-dir'),value('--expected-snapshot-hash'),args.includes('--out')?value('--out'):undefined)));}catch{console.error('Candidate rejected; check approval, private paths, snapshot hash and unresolved blockers. Production unchanged.');process.exitCode=1;}}
