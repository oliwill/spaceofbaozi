import {cp,mkdir,mkdtemp,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import sharp from "sharp";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
const run=(args:string[],cwd:string,env:NodeJS.ProcessEnv)=>new Promise<number>((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd,env,stdio:"inherit"});child.on("error",reject);child.on("exit",code=>resolve(code??1));});
import {fixtureAlbums,hiddenFixtures} from "../../tests/fixtures/photos/albums";
const root=fileURLToPath(new URL("../../",import.meta.url)),output=await mkdtemp(join(tmpdir(),"baozi-album-fixtures-"));
await cp(root,output,{recursive:true,filter:source=>!source.slice(root.length).split(/[\\/]/).some(part=>["node_modules","dist",".git",".astro",".local-config",".superpowers","test-results","playwright-report","_handoff","design-assets"].includes(part)||part.startsWith(".env")||part.startsWith(".dev.vars"))});
if(await run(["install","--frozen-lockfile"],output,process.env)!==0)process.exit(1);
await mkdir(join(output,"public/assets/photos"),{recursive:true});
for(const album of fixtureAlbums)for(const photo of album.photos.filter(p=>!p.draft&&p.approved))for(const asset of [photo,...photo.variants]){const {width,height}=asset;const svg=`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#d7d4cc"/><rect x="8" y="8" width="${width-16}" height="${height-16}" fill="none" stroke="#292825" stroke-width="12"/><circle cx="${width/2}" cy="${height/2}" r="${Math.min(width,height)/4}" fill="#77746d"/><text x="50%" y="50%" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${Math.min(width,height)/14}">SYNTHETIC ${album.slug}/${photo.id}</text></svg>`;await sharp(Buffer.from(svg)).png().toFile(join(output,'public',asset.src));}
const indexPath=join(output,'src/pages/photos/index.astro');await writeFile(indexPath,(await readFile(indexPath,'utf8')).replace('<AlbumList albums={albums} />','<AlbumList albums={albums} /><div data-fixture-scroll-spacer style="height:500px" aria-hidden="true"></div>'));
for(const {slug,...data} of [...fixtureAlbums,...hiddenFixtures])await writeFile(join(output,`src/content/photos/${slug}.md`),`---\n${JSON.stringify(data,null,2)}\n---\n`);
await writeFile(join(root,"_handoff/album-evidence/fixture-location.txt"),output+"\n");
console.log(`Isolated synthetic fixture: ${output}`);
const env={...process.env,ASTRO_TELEMETRY_DISABLED:"1",XDG_CONFIG_HOME:join(output,".local-config"),PLAYWRIGHT_PORT:"4367"};
if(await run(["run","build"],output,env)!==0)process.exit(1);
if(!process.argv.includes("--build-only")){const args=process.argv.slice(2);process.exitCode=await run(["x","playwright","test","--config","playwright.photos.config.ts",...args],output,env);}
