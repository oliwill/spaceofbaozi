import { cpSync,existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync,realpathSync } from 'node:fs';
import { resolve,isAbsolute,relative,sep } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { createFixtureSnapshot } from './fixtures';
const args=process.argv.slice(2);const value=(key:string)=>args[args.indexOf(key)+1];
const name=value('--case');const out=value('--out');const source=realpathSync(process.cwd());
if(!['empty','mixed','twenty-years','withdrawal'].includes(name)||!out||!isAbsolute(out))throw new Error('Explicit case and absolute out required');
const destination=resolve(out);
if(destination===source||destination.startsWith(source+sep)||existsSync(destination))throw new Error('Fixture output must be new and outside source');
const parent=realpathSync(resolve(destination,'..'));if(parent===source||parent.startsWith(source+sep))throw new Error('Invalid real fixture parent');
const excluded=new Set(['node_modules','.git','.astro','dist','test-results','playwright-report','_handoff']);
const hashTree=():Record<string,string>=>{
 const hashes:Record<string,string>={};
 function visit(dir:string){for(const item of readdirSync(dir,{withFileTypes:true})){if(excluded.has(item.name))continue;const path=resolve(dir,item.name);if(item.isSymbolicLink())throw new Error('Unexpected source symlink');if(item.isDirectory())visit(path);else hashes[relative(source,path)]=createHash('sha256').update(readFileSync(path)).digest('hex');}}
 visit(source);return hashes;
};
const before=hashTree();mkdirSync(destination);cpSync(source,destination,{recursive:true,filter:p=>!relative(source,p).split(sep).some(part=>excluded.has(part))});
cpSync(resolve(source,'node_modules'),resolve(destination,'node_modules'),{recursive:true,verbatimSymlinks:true});
const snapshot=createFixtureSnapshot(name,new Date());const entries=snapshot.entries;
if(entries.some(entry=>entry.cover)){mkdirSync(resolve(destination,'public/assets/media'),{recursive:true});await sharp({create:{width:60,height:90,channels:3,background:'#c8c6bd'}}).png().toFile(resolve(destination,'public/assets/media/synthetic-cover.png'));}
writeFileSync(resolve(destination,'src/data/media/public.json'),JSON.stringify(snapshot,null,2));
const after=hashTree();if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Source changed during fixture preparation');
writeFileSync(resolve(destination,'fixture-manifest.json'),JSON.stringify({case:name,source,sourceHashes:before,synthetic:true,records:entries.length},null,2));
const build=spawnSync('bun',['run','build'],{cwd:destination,stdio:'inherit'});if(build.status!==0)process.exit(build.status??1);
console.log(JSON.stringify({case:name,directory:destination,records:entries.length,sourceUnchanged:true}));
