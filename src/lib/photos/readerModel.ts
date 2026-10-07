import type {PublicAlbum} from "@/lib/photos/albums";
export type ReaderMode="single"|"spread";
export interface ReaderState {photoId:string;mode:ReaderMode;}
export const modeForWidth=(width:number):ReaderMode=>width>=760?"spread":"single";
const anchorIndex=(album:PublicAlbum,state:ReaderState)=>Math.max(0,album.photos.findIndex(photo=>photo.id===state.photoId));
const startIndex=(album:PublicAlbum,state:ReaderState)=>state.mode==="spread"?Math.floor(anchorIndex(album,state)/2)*2:anchorIndex(album,state);
export function visiblePhotoIds(album:PublicAlbum,state:ReaderState):string[]{const start=startIndex(album,state);return album.photos.slice(start,start+(state.mode==="spread"?2:1)).map(photo=>photo.id);}
export function stepPhoto(album:PublicAlbum,state:ReaderState,delta:-1|1):ReaderState{const size=state.mode==="spread"?2:1,start=startIndex(album,state),next=start+size*delta;if(next<0||next>=album.photos.length)return state;return {...state,photoId:album.photos[next].id};}
export function progressLabel(album:PublicAlbum,state:ReaderState):string{if(!album.photos.length)return "0 / 0";const start=startIndex(album,state)+1,end=Math.min(album.photos.length,start+(state.mode==="spread"?1:0));return `${start}${end>start?`–${end}`:""} / ${album.photos.length}`;}
