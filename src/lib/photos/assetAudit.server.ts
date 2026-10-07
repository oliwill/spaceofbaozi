import { readdir, lstat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { PublicAlbum, PhotoImage } from "@/lib/photos/albums";
export async function auditPublicPhotoAssets(albums:readonly PublicAlbum[],publicDir:string):Promise<void>{
  const allowed=new Map<string,{width:number;height:number}>();
  const add=(image:PhotoImage)=>{for(const asset of [image,...(image.variants??[])]){const old=allowed.get(asset.src);if(old&&(old.width!==asset.width||old.height!==asset.height))throw new Error(`图片尺寸声明冲突: ${asset.src}`);allowed.set(asset.src,asset);}};
  albums.forEach(album=>{add(album.cover);album.photos.forEach(add);});
  const seen=new Set<string>();
  const walk=async(directory:string,url:string):Promise<void>=>{
    let names:string[];try{names=await readdir(directory);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT'&&allowed.size===0)return;throw error;}
    for(const name of names){const path=join(directory,name),src=`${url}/${name}`,stat=await lstat(path);if(stat.isSymbolicLink())throw new Error(`照片资源禁止符号链接: ${src}`);if(stat.isDirectory()){await walk(path,src);continue;}if(name==='.gitkeep')continue;const dimensions=allowed.get(src);if(!dimensions)throw new Error(`未批准的公开照片资源: ${src}`);const metadata=await sharp(path).metadata();if(metadata.width!==dimensions.width||metadata.height!==dimensions.height)throw new Error(`照片尺寸不符: ${src}`);seen.add(src);}
  };
  await walk(join(publicDir,'assets/photos'),'/assets/photos');
  for(const src of allowed.keys())if(!seen.has(src))throw new Error(`公开照片资源缺失: ${src}`);
}
