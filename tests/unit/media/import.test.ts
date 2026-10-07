import {it,expect,afterEach} from 'vitest';
import {mkdtempSync,writeFileSync,readFileSync,symlinkSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {syntheticRecord} from '../../fixtures/media/records';
import {readSafeJson} from '../../../scripts/media/adapters/safe-json';
import {runImport} from '../../../scripts/media/import';
import {writeCandidate} from '../../../scripts/media/publish-candidate';
const dirs:string[]=[];const temp=()=>{const d=realpathSync(mkdtempSync(join(tmpdir(),'media-safe-')));dirs.push(d);return d;};
afterEach(()=>dirs.forEach(d=>rmSync(d,{recursive:true,force:true})));
const safe=(records:unknown[]=[syntheticRecord()])=>JSON.stringify({schemaVersion:1,sourceAt:'2026-10-01T00:00:00Z',coverage:'complete',reliable:true,records});
const bytes=(text:string)=>new TextEncoder().encode(text);
it('rejects backup ZIP, account fields and credentials without echoing values',()=>{
 for(const input of ['PK\u0003\u0004',JSON.stringify({cookies:'SECRET_SENTINEL'}),safe([{...syntheticRecord(),token:'SECRET_SENTINEL'}])]){
  expect(()=>readSafeJson(bytes(input))).toThrow();try{readSafeJson(bytes(input));}catch(e){expect(String(e)).not.toContain('SECRET_SENTINEL');}
 }
});
it('limits bytes and row/comment count, validates URL and keeps row-only issues',()=>{
 expect(()=>readSafeJson(new Uint8Array(10*1024*1024+1))).toThrow(/limit/);
 expect(()=>readSafeJson(bytes(safe(Array(50001).fill(null))))).toThrow(/limit/);
 const batch=readSafeJson(bytes(safe([syntheticRecord(),{...syntheticRecord('2'),commentRaw:'PRIVATE_TEXT',doubanUrl:'javascript:alert(1)'},{...syntheticRecord('3'),commentRaw:'a'.repeat(100001)}])));
 expect(batch.records).toHaveLength(1);expect(batch.issues).toHaveLength(2);expect(JSON.stringify(batch.issues)).not.toContain('PRIVATE_TEXT');
});
it('preview never mutates archive or public snapshot; apply stays private',()=>{
 const dir=temp();const input=join(dir,'safe.json');writeFileSync(input,safe());
 const before=readFileSync('src/data/media/public.json');const report=runImport(input,dir);
 expect(report.mode).toBe('preview');expect(report.summary.added).toBe(1);expect(readFileSync('src/data/media/public.json')).toEqual(before);
 runImport(input,dir,{apply:true});expect(JSON.parse(readFileSync(join(dir,'archive.json'),'utf8')).importState).toBe('success');
});
it('rejects repository private path and symlinked inputs',()=>{
 const dir=temp();const input=join(dir,'safe.json');writeFileSync(input,safe());symlinkSync(input,join(dir,'link.json'));
 expect(()=>runImport(join(dir,'link.json'),dir)).toThrow(/path/);expect(()=>runImport(input,process.cwd())).toThrow(/path/);
});
it('candidate requires matching hash and explicit revision, never replaces production',()=>{
 const dir=temp();const input=join(dir,'safe.json');writeFileSync(input,safe());runImport(input,dir,{apply:true});
 const archive=JSON.parse(readFileSync(join(dir,'archive.json'),'utf8'));const old=readFileSync('src/data/media/public.json');const hash=createHash('sha256').update(old).digest('hex');
 const approval=join(dir,'approval.json');writeFileSync(approval,JSON.stringify({schemaVersion:1,expectedSnapshotHash:hash,decisions:{'douban-book-123':{approvedRevision:archive.latest['douban-book-123'],hidden:false}},unresolvedWithdrawals:[],coverage:{verifiedEmptyYears:[],description:'合成批准'}}));
 expect(()=>writeCandidate(approval,dir,'0'.repeat(64))).toThrow(/hash/);
 const result=writeCandidate(approval,dir,hash);expect(result.records).toBe(1);expect(readFileSync('src/data/media/public.json')).toEqual(old);expect(JSON.parse(readFileSync(result.path,'utf8')).entries).toHaveLength(1);
});
it('partial damaged import blocks candidate and does not fake last success',()=>{
 const dir=temp();const input=join(dir,'safe.json');writeFileSync(input,safe([syntheticRecord(),{password:'PRIVATE'}]));expect(()=>runImport(input,dir,{apply:true})).toThrow();
});
it('persistent hidden veto survives a later import and approval file',()=>{
 const dir=temp();const input=join(dir,'safe.json');writeFileSync(input,safe());runImport(input,dir,{apply:true});const archive=JSON.parse(readFileSync(join(dir,'archive.json'),'utf8'));
 const hash=createHash('sha256').update(readFileSync('src/data/media/public.json')).digest('hex');const approval=join(dir,'approval.json');
 const data={schemaVersion:1,expectedSnapshotHash:hash,decisions:{'douban-book-123':{approvedRevision:archive.latest['douban-book-123'],hidden:true}},unresolvedWithdrawals:[],coverage:{verifiedEmptyYears:[],description:'合成批准'}};
 writeFileSync(approval,JSON.stringify(data));writeCandidate(approval,dir,hash);data.decisions['douban-book-123'].hidden=false;writeFileSync(approval,JSON.stringify(data));runImport(input,dir,{apply:true});
 expect(writeCandidate(approval,dir,hash).records).toBe(0);
});
it('future marked date enters anomaly rather than private success',()=>{
 const record=syntheticRecord();record.markDate={raw:'2099-01-01',precision:'day',year:2099,month:1,day:1,calendarDate:'2099-01-01',instant:null,basis:'synthetic'};
 const batch=readSafeJson(bytes(safe([record])));expect(batch.records).toHaveLength(0);expect(batch.issues).toHaveLength(1);
});
it('interrupted atomic write leaves prior candidate intact',async()=>{
 const {atomicPrivateJson}=await import('../../../scripts/media/private-files');const dir=temp();const out=join(dir,'candidate.json');writeFileSync(out,'{"old":true}');
 expect(()=>atomicPrivateJson(out,{new:true},dir,()=>{throw new Error('interrupted');})).toThrow('interrupted');expect(readFileSync(out,'utf8')).toBe('{"old":true}');
});
it('failed applied input persists blocker but preserves last success timestamp',()=>{
 const dir=temp();const input=join(dir,'safe.json');writeFileSync(input,safe());runImport(input,dir,{apply:true});const old=JSON.parse(readFileSync(join(dir,'archive.json'),'utf8'));
 writeFileSync(input,'{"cookies":"PRIVATE"}');expect(()=>runImport(input,dir,{apply:true})).toThrow();const archive=JSON.parse(readFileSync(join(dir,'archive.json'),'utf8'));expect(archive.importState).toBe('failed');expect(archive.lastSuccessAt).toBe(old.lastSuccessAt);
});
it('repository protection is anchored to source even when cwd changes',async()=>{
 const {privatePath}=await import('../../../scripts/media/private-files');const source=process.cwd();const dir=temp();try{process.chdir(dir);for(const path of [source,join(source,'public'),join(source,'dist')])expect(()=>privatePath(path)).toThrow(/path/);}finally{process.chdir(source);}
});
it('site comment and rating overrides persist independently through reimport approval',()=>{
 const dir=temp();const input=join(dir,'safe.json');writeFileSync(input,safe());runImport(input,dir,{apply:true});
 const hash=createHash('sha256').update(readFileSync('src/data/media/public.json')).digest('hex');const approval=join(dir,'approval.json');
 const base={schemaVersion:1,expectedSnapshotHash:hash,unresolvedWithdrawals:[],coverage:{verifiedEmptyYears:[],description:'合成批准'}};
 const latest=()=>JSON.parse(readFileSync(join(dir,'archive.json'),'utf8')).latest['douban-book-123'];
 writeFileSync(approval,JSON.stringify({...base,decisions:{'douban-book-123':{approvedRevision:latest(),hidden:false,override:{comment:'本站编辑',myRating:null}}}}));writeCandidate(approval,dir,hash);
 const next=JSON.parse(safe([syntheticRecord('123',{commentRaw:'来源更新',myRating:5})]));next.sourceAt='2026-10-02T00:00:00Z';writeFileSync(input,JSON.stringify(next));runImport(input,dir,{apply:true});
 writeFileSync(approval,JSON.stringify({...base,decisions:{'douban-book-123':{approvedRevision:latest(),hidden:false}}}));const result=writeCandidate(approval,dir,hash);const entry=JSON.parse(readFileSync(result.path,'utf8')).entries[0];expect(entry.comment).toBe('本站编辑');expect(entry.myRating).toBeNull();
});
