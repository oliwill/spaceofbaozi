import { isPublishable } from "@/lib/content/gates";
import type { PhotoAlbumData, PhotoImage } from "@/lib/photos/schema";
export type { PhotoAlbumData, PhotoImage } from "@/lib/photos/schema";
export interface PhotoAlbum { id:string; data:PhotoAlbumData; }
export type PublicPhoto = PhotoImage & {id:string;caption?:string};
export interface PublicAlbum {id:string;title:string;introduction:string;periodLabel?:string;order:number;date?:Date;updated?:Date;cover:PhotoImage;coverPosition?:PhotoAlbumData["coverPosition"];photos:PublicPhoto[];}
export interface PhotoLightboxItem {slug:string;title:string;src:string;alt:string;description?:string;}
const publicImage = (image:PhotoImage):PhotoImage => ({src:image.src,width:image.width,height:image.height,alt:image.alt,...(image.variants ? {variants:image.variants.map(v=>({src:v.src,width:v.width,height:v.height}))}:{}),...(image.credit ? {credit:image.credit}:{})});
export function publishableAlbums(entries:PhotoAlbum[]):PublicAlbum[] {
  return entries.filter(entry=>isPublishable(entry.data)).flatMap(({id,data})=>{
    const photos:PublicPhoto[]=data.photos.filter(isPublishable).map(photo=>({...publicImage(photo),id:photo.id,...(photo.caption?{caption:photo.caption}:{})}));
    if(!photos.length) return [];
    let cover:PhotoImage=photos[0];
    if(data.coverPhotoId){const requested=photos.find(photo=>photo.id===data.coverPhotoId);if(!requested)throw new Error(`相册 ${id} 的指定封面未获批准`);cover=requested;}
    if(data.coverImage){if(!isPublishable(data.coverImage))throw new Error(`相册 ${id} 的独立封面未获批准`);cover=publicImage(data.coverImage);}
    return [{id,title:data.title,introduction:data.description,periodLabel:data.periodLabel,order:data.order,date:data.date,updated:data.updated,cover:publicImage(cover),...(data.coverPosition ? {coverPosition:{x:data.coverPosition.x,y:data.coverPosition.y}} : {}),photos}];
  }).sort((a,b)=>a.order-b.order || (b.date?.getTime() ?? -Infinity)-(a.date?.getTime() ?? -Infinity) || a.id.localeCompare(b.id));
}
export function splitAlbums(entries:PhotoAlbum[]):{featured?:PublicAlbum;recent:PublicAlbum[]} {const [featured,...recent]=publishableAlbums(entries);return {featured,recent};}
export function albumLightboxItems(entries:PhotoAlbum[]):PhotoLightboxItem[]{return publishableAlbums(entries).map(album=>({slug:album.id,title:album.title,src:album.cover.src,alt:album.cover.alt,description:album.introduction||undefined}));}
export function latestAlbumDate(entries:PhotoAlbum[]):Date|undefined{const latest=publishableAlbums(entries)[0];return latest?.updated??latest?.date;}
