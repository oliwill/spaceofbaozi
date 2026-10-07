import {resolve} from 'node:path';
import {readSafeJson} from './adapters/safe-json';
import {reconcileBatch} from './reconcile';
import {atomicPrivateJson,privatePath,readArchive,safeRead} from './private-files';
export function runImport(inputPath:string,privateDir:string,options:{apply?:boolean}={}) {
 privatePath(privateDir);privatePath(inputPath,privateDir);const archive=readArchive(privateDir);let batch;
 try{batch=readSafeJson(safeRead(inputPath,privateDir));}catch{
  if(options.apply){atomicPrivateJson(resolve(privateDir,'archive.json'),{...archive,importState:'failed'},privateDir);atomicPrivateJson(resolve(privateDir,'last-report.json'),{status:'failed',reason:'rejected-input',lastSuccessAt:archive.lastSuccessAt},privateDir);}
  throw new Error('rejected-safe-input');
 }
 const result=reconcileBatch(archive,batch);
 const report={mode:options.apply?'private-write' as const:'preview' as const,summary:result.summary,issues:batch.issues,status:result.archive.importState,lastSuccessAt:result.archive.lastSuccessAt,lastCompleteSuccessAt:result.archive.lastCompleteSuccessAt,coverage:batch.coverage,onlineStatus:'not-verified'};
 if(options.apply){atomicPrivateJson(resolve(privateDir,'archive.json'),result.archive,privateDir);atomicPrivateJson(resolve(privateDir,'last-report.json'),report,privateDir);}
 return report;
}
if(import.meta.main){const args=process.argv.slice(2);const value=(key:string)=>args[args.indexOf(key)+1];try{if(!args.includes('--input')||!args.includes('--private-dir'))throw new Error('explicit-input-and-private-directory-required');console.log(JSON.stringify(runImport(value('--input'),value('--private-dir'),{apply:args.includes('--apply-private')})));}catch{console.error('Import rejected; check safe JSON contract, limits and private paths. No public snapshot was changed.');process.exitCode=1;}}
