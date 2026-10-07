import {readFileSync,readdirSync} from 'node:fs';
import {privatePath,safeRead} from './private-files';
import {resolve,relative,dirname} from 'node:path';
import type {PublicSnapshot} from '../../src/lib/media/schema';
import {parsePublicSnapshot} from '../../src/lib/media/publicSnapshot.server';
function decoded(text:string):string {
 let value=text;for(let i=0;i<2;i++){value=value.replace(/\\u([0-9a-f]{4})/gi,(_,code:string)=>String.fromCharCode(parseInt(code,16))).replace(/\\x([0-9a-f]{2})/gi,(_,code:string)=>String.fromCharCode(parseInt(code,16))).replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex:string,decimal:string)=>String.fromCodePoint(Math.min(0x10ffff,parseInt(hex??decimal,hex?16:10))));try{value=decodeURIComponent(value);}catch{}}
 return value;
}
export function auditMediaOutput(distDir:string,expected:PublicSnapshot,forbidden:string[]=[]){
 const issues:{path:string;reason:string}[]=[];const ids=new Set(expected.entries.map(e=>e.id));const covers=new Set(expected.entries.flatMap(e=>e.cover?[e.cover.src.slice(1)]:[]));let files=0;const outputs=new Set<string>();
 const bad=(path:string,reason:string)=>issues.push({path,reason});
 function visit(dir:string){for(const item of readdirSync(dir,{withFileTypes:true})){const absolute=resolve(dir,item.name);const path=relative(distDir,absolute);if(item.isSymbolicLink()){bad(path,'symlink-output');continue;}if(item.isDirectory()){visit(absolute);continue;}files++;outputs.add(path);
  const bytes=readFileSync(absolute);const text=bytes.toString('utf8');const decodedOutput=decoded(path+' '+text);
  if(forbidden.some(s=>s&&decodedOutput.includes(s)))bad('[redacted-output-path]','forbidden-private-sentinel');
  for(const id of decodedOutput.matchAll(/douban-(?:book|movie|music)-\d+|manual-[a-z0-9-]+/g))if(!ids.has(id[0]))bad(path,'unapproved-detail-reference');
  if(path.startsWith('assets/media/')&&!covers.has(path))bad(path,'unapproved-media-asset');
  if(/"(?:commentRaw|sourceVisibility|approvedRevision|unresolvedWithdrawals)"\s*:/.test(text))bad(path,'private-field-output');
 }}visit(resolve(distDir));
 for(const entry of expected.entries){if(!outputs.has(`media/item/${entry.id}/index.html`))bad(`media/item/${entry.id}`,'missing-approved-detail');if(entry.cover&&!outputs.has(entry.cover.src.slice(1)))bad(entry.cover.src,'missing-approved-cover');}
 return {ok:issues.length===0,files,issues,searchIndex:[...outputs].some(p=>/search.*\.(json|js)$/.test(p))?'present':'not-applicable',sitemap:[...outputs].some(p=>/sitemap.*\.xml$/.test(p))?'present':'not-applicable'};
}
if(import.meta.main){const args=process.argv.slice(2);const value=(key:string)=>args[args.indexOf(key)+1];try{const snapshot=parsePublicSnapshot(JSON.parse(readFileSync(value('--snapshot'),'utf8')));let forbidden:string[]=[];if(args.includes('--forbidden')){const path=privatePath(value('--forbidden'));const input:unknown=JSON.parse(safeRead(path,dirname(path)).toString('utf8'));if(!Array.isArray(input)||input.length>50000||!input.every(item=>typeof item==='string'&&item.length>0&&item.length<=100000))throw new Error('invalid-sentinels');forbidden=input;}const report=auditMediaOutput(resolve(value('--dist')),snapshot,forbidden);console.log(JSON.stringify(report));if(!report.ok)process.exitCode=1;}catch{console.error('Output audit could not complete.');process.exitCode=1;}}
