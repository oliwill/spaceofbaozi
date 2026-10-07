import { servedUrl, logicalPath } from "@/lib/site/paths";
import type {PublicAlbum} from "@/lib/photos/albums";
export const albumHref=(id:string,photo?:string):string=>servedUrl(`/photos/${id.split("/").map(encodeURIComponent).join("/")}${photo?`#photo-${encodeURIComponent(photo)}`:""}`);
export function resolvePhotoId(album:PublicAlbum,hash:string):string{let id="";try{if(hash.startsWith("#photo-"))id=decodeURIComponent(hash.slice(7));}catch{}return album.photos.find(photo=>photo.id===id)?.id??album.photos[0]?.id??"";}
export function isAlbumTransition(from:string,to:string):boolean{const list=(path:string)=>/^\/photos\/?$/.test(path),detail=(path:string)=>/^\/photos\/.+/.test(path);const a=logicalPath(from),b=logicalPath(to);return a!==null&&b!==null&&((list(a)&&detail(b))||(detail(a)&&list(b)));}
