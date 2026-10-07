import { logicalPath } from "@/lib/site/paths";
import {animateAlbumOpen,animateAlbumClose,animateAlbumPage} from "@/lib/photos/albumMotion";
import {mountAlbumCharacters} from "@/lib/photos/characters";
import type {PublicAlbum} from "@/lib/photos/albums";
import {restoreAlbumScroll} from "@/lib/photos/listModel";
import {mountAlbumList} from "@/lib/photos/albumList";
import {mountAlbumReader} from "@/lib/photos/albumReader";
import {albumHref,resolvePhotoId} from "@/lib/photos/routes";
import {readSession,writeSession,browserStorage,albumHistory,mergeAlbumHistory,canReturnToList,validPosition,type AlbumSession,type AlbumHistory,type ListPosition} from "@/lib/photos/session";
import {scrollDocumentTo} from "@/lib/scroll/lenis";
let initialized=false;
export function initAlbumLifecycle():void{
  if(initialized)return;initialized=true;
  let session:AlbumSession=readSession(browserStorage()),cleanup:(()=>void)|undefined,frame=0;
  let pending:{albumId:string;listKey:string;originIndex?:number;cover:DOMRect}|null=null;
  let returning=false,preparing=false,navigationGeneration=0;
  const save=()=>writeSession(browserStorage(),session);
  const replace=(updates:Partial<AlbumHistory>,href?:string)=>{try{history.replaceState(mergeAlbumHistory(history.state,updates),'',href);}catch{}};
  function dispose(){cancelAnimationFrame(frame);cleanup?.();cleanup=undefined;}
  function mount(){
    dispose();preparing=false;const abort=new AbortController(),{signal}=abort;const disposers:(()=>void)[]=[()=>abort.abort()];
    let visual=new AbortController();
    const resetVisual=()=>{visual.abort();visual=new AbortController();};
    disposers.push(()=>visual.abort());
    window.addEventListener("resize",resetVisual,{signal});
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",resetVisual,{signal});cleanup=()=>disposers.forEach(dispose=>dispose());
    const list=document.querySelector<HTMLElement>('[data-album-list]');
    if(list){
      disposers.push(mountAlbumList(list));const strip=list.querySelector<HTMLElement>('[data-album-strip]')!;const saved=albumHistory(history.state);
      const key=saved.listKey??crypto.randomUUID();const snapshot=validPosition(saved.list)?saved.list:session.lists[key];
      replace({listKey:key});
      if(validPosition(snapshot))frame=requestAnimationFrame(()=>{
        if(signal.aborted)return;
        const link=Array.from(list.querySelectorAll<HTMLAnchorElement>('[data-album-id]')).find(link=>link.dataset.albumId===snapshot.focusAlbumId);
        const item=link?.parentElement,style=getComputedStyle(strip),bounds=strip.getBoundingClientRect();const padding=parseFloat(style.paddingLeft)||0,borderLeft=parseFloat(style.borderLeftWidth)||0,max=Math.max(0,strip.scrollWidth-strip.clientWidth);
        const viewport=bounds.width-borderLeft-(parseFloat(style.borderRightWidth)||0),itemBounds=item?.getBoundingClientRect();
        strip.scrollLeft=itemBounds?restoreAlbumScroll(snapshot.scrollLeft,itemBounds.left-bounds.left-borderLeft+strip.scrollLeft,itemBounds.width,viewport,max,padding):Math.min(snapshot.scrollLeft,max);
        scrollDocumentTo(Math.min(snapshot.scrollY,Math.max(0,document.documentElement.scrollHeight-innerHeight)),{immediate:true});
        (link??list.querySelector<HTMLElement>('#album-list-title'))?.focus({preventScroll:true});
        if(returning&&link)animateAlbumClose(link,visual.signal);returning=false;
      });
      list.addEventListener('click',event=>{
        if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
        const link=(event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-album-id]');if(!link||link.target==='_blank'||!list.contains(link))return;
        const id=link.dataset.albumId!;
        if(pending){event.preventDefault();return;}
        const position:ListPosition={key,selectedAlbumId:id,scrollLeft:Math.max(0,strip.scrollLeft),scrollY:Math.max(0,window.scrollY),focusAlbumId:id};session.lists[key]=position;replace({listKey:key,list:position});save();
        pending={albumId:id,listKey:key,originIndex:typeof history.state?.index==='number'?history.state.index:undefined,cover:link.getBoundingClientRect()};
        link.href=albumHref(id,session.readings[id]);
      },{signal});
    }
    const reader=document.querySelector<HTMLElement>('[data-album-reader]');
    if(reader){
      try{
        const album=JSON.parse(reader.querySelector('[data-album-data]')!.textContent!) as PublicAlbum;
        const opening=pending?.albumId===album.id?pending:undefined;
        if(pending?.albumId===album.id)replace({albumId:album.id,listKey:pending.listKey,originIndex:pending.originIndex});
        pending=null;
        const isCurrent=()=>!signal.aborted&&!preparing&&reader.isConnected&&location.pathname.replace(/\/$/,'')===new URL(albumHref(album.id),location.href).pathname;
        const controller=mountAlbumReader(reader,album,resolvePhotoId(album,location.hash),state=>{if(!isCurrent())return;session.readings[album.id]=state.photoId;save();replace({albumId:album.id,photoId:state.photoId},albumHref(album.id,state.photoId));});disposers.push(()=>controller.destroy());
        if(opening)animateAlbumOpen(opening.cover,reader,visual.signal);
        mountAlbumCharacters(!!opening,signal);
        reader.addEventListener("album:page",()=>{resetVisual();animateAlbumPage(reader.querySelector<HTMLElement>("[data-album-pages]")!,visual.signal);},{signal});
        window.addEventListener('hashchange',()=>{if(isCurrent())controller.restore(resolvePhotoId(album,location.hash));},{signal});
        document.querySelectorAll<HTMLAnchorElement>('[data-album-return]').forEach(link=>link.addEventListener('click',event=>{if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;if(canReturnToList(albumHistory(history.state),history.state?.index,session)){event.preventDefault();history.back();}},{signal}));
      }catch{pending=null;}
    }else {pending=null;mountAlbumCharacters(false,signal);}
  }
  document.addEventListener('astro:before-preparation',event=>{
    const generation=++navigationGeneration;preparing=true;
    returning=/^\/photos\/.+/.test(logicalPath(event.from.pathname)??"")&&/^\/photos\/?$/.test(logicalPath(event.to.pathname)??"");
    event.signal.addEventListener('abort',()=>{if(generation===navigationGeneration){preparing=false;pending=null;}},{once:true});
    if(pending&&event.to.pathname!==new URL(albumHref(pending.albumId),location.href).pathname)pending=null;
  });
  document.addEventListener('astro:before-swap',dispose);
  document.addEventListener('astro:page-load',mount);
  window.addEventListener('pagehide',()=>{dispose();pending=null;});
  window.addEventListener('pageshow',event=>{if(event.persisted)mount();});
  mount();
}
