export interface ListPosition{key:string;selectedAlbumId:string;scrollLeft:number;scrollY:number;focusAlbumId:string;}
export interface AlbumHistory{version:1;listKey?:string;photoId?:string;albumId?:string;list?:ListPosition;originIndex?:number;}
export interface AlbumSession{version:1;readings:Record<string,string>;lists:Record<string,ListPosition>;}
const KEY='baozi-album-v1';
const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const text=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=1000;
export const validPosition=(value:unknown):value is ListPosition=>record(value)&&text(value.key)&&text(value.selectedAlbumId)&&text(value.focusAlbumId)&&typeof value.scrollLeft==='number'&&Number.isFinite(value.scrollLeft)&&value.scrollLeft>=0&&typeof value.scrollY==='number'&&Number.isFinite(value.scrollY)&&value.scrollY>=0;
export function readSession(storage:Storage|undefined):AlbumSession{
  const empty:AlbumSession={version:1,readings:{},lists:{}};
  try{const raw=storage?.getItem(KEY);if(!raw||raw.length>100000)return empty;const data:unknown=JSON.parse(raw);if(!record(data)||data.version!==1)return empty;
    const readings=record(data.readings)?Object.fromEntries(Object.entries(data.readings).filter(([key,value])=>text(key)&&text(value)&&/^[a-z0-9][a-z0-9-]*$/.test(value)).slice(-100)):{};
    const lists=record(data.lists)?Object.fromEntries(Object.entries(data.lists).filter(([key,value])=>validPosition(value)&&key===value.key).slice(-30)):{};
    return {version:1,readings:readings as Record<string,string>,lists:lists as Record<string,ListPosition>};
  }catch{return empty;}
}
export function writeSession(storage:Storage|undefined,session:AlbumSession):void{try{storage?.setItem(KEY,JSON.stringify(session));}catch{}}
export function albumHistory(state:unknown):AlbumHistory{if(!record(state)||!record(state.baoziAlbum)||state.baoziAlbum.version!==1)return {version:1};return state.baoziAlbum as unknown as AlbumHistory;}
export function mergeAlbumHistory(state:unknown,updates:Partial<AlbumHistory>):Record<string,unknown>{return {...(record(state)?state:{}),baoziAlbum:{...albumHistory(state),...updates,version:1}};}
export function canReturnToList(history:AlbumHistory,index:unknown,session:AlbumSession):boolean{return typeof index==='number'&&Number.isInteger(history.originIndex)&&index===history.originIndex!+1&&!!history.listKey&&validPosition(session.lists[history.listKey]);}
export function browserStorage():Storage|undefined{try{return window.sessionStorage;}catch{return undefined;}}
