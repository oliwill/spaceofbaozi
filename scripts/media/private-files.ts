import {existsSync,lstatSync,readFileSync,realpathSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import {isAbsolute,resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {parseNormalizedRecord,type PrivateArchive} from '../../src/lib/media/schema';
import {revisionHash} from './reconcile';
export const productRoot=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
export function privatePath(path:string,privateDir?:string):string {
 if(!isAbsolute(path))throw new Error('private-path-must-be-absolute');
 const absolute=resolve(path);let cursor=absolute;
 while(cursor!==dirname(cursor)){if(existsSync(cursor)&&lstatSync(cursor).isSymbolicLink())throw new Error('private-path-symlink');cursor=dirname(cursor);}
 const actual=existsSync(absolute)?realpathSync(absolute):resolve(realpathSync(dirname(absolute)),absolute.slice(dirname(absolute).length+1));
 const repo=productRoot;if(actual===repo||actual.startsWith(repo+sep))throw new Error('private-path-inside-repository');
 if(privateDir){const root=privatePath(privateDir);if(actual===root||!actual.startsWith(root+sep))throw new Error('private-path-outside-maintenance-directory');}
 return actual;
}
export function atomicPrivateJson(path:string,value:unknown,privateDir:string,beforeRename?:()=>void):void {
 const target=privatePath(path,privateDir);const temp=target+'.'+randomUUID()+'.tmp';
 try{writeFileSync(temp,JSON.stringify(value,null,2),{flag:'wx',mode:0o600});JSON.parse(readFileSync(temp,'utf8'));beforeRename?.();privatePath(target,privateDir);renameSync(temp,target);}finally{if(existsSync(temp))unlinkSync(temp);}
}
export function emptyArchive():PrivateArchive{return {revisions:{},latest:{},batches:[],lastSuccessAt:null,lastCompleteSuccessAt:null,withdrawals:[],conflicts:[]};}
export function readArchive(privateDir:string):PrivateArchive {
 const path=privatePath(resolve(privateDir,'archive.json'),privateDir);if(!existsSync(path))return emptyArchive();
 try{
  const archive:PrivateArchive=JSON.parse(readFileSync(path,'utf8'));
  if(!archive||!archive.revisions||!archive.latest||![archive.batches,archive.withdrawals,archive.conflicts].every(Array.isArray))throw new Error();
  for(const [id,revisions] of Object.entries(archive.revisions))for(const revision of revisions){const record=parseNormalizedRecord(revision.record);if(record.id!==id||revisionHash(record)!==revision.hash)throw new Error();}
  return archive;
 }catch{throw new Error('invalid-private-archive');}
}
export function safeRead(path:string,privateDir:string):Buffer {
 const valid=privatePath(path,privateDir);if(lstatSync(valid).size>10*1024*1024)throw new Error('input-byte-limit');return readFileSync(valid);
}
