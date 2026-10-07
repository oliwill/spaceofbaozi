import { servedUrl } from "@/lib/site/paths";
import {photoSrcset} from "@/lib/photos/imageCandidates";
import type {PublicAlbum} from "@/lib/photos/albums";
import {modeForWidth,visiblePhotoIds,stepPhoto,progressLabel,type ReaderState} from "@/lib/photos/readerModel";
import {acceptReaderKey,swipeDirection} from "@/lib/photos/gestures";
export function mountAlbumReader(root:HTMLElement,album:PublicAlbum,initialPhotoId:string,onChange:(state:ReaderState)=>void):{getState():ReaderState;restore(photoId:string):void;destroy():void}{
  const pages=root.querySelector<HTMLElement>('[data-album-pages]')!;
  const controls=root.querySelector<HTMLElement>('[data-reader-controls]')!;
  const prev=root.querySelector<HTMLButtonElement>('[data-prev]')!,next=root.querySelector<HTMLButtonElement>('[data-next]')!;
  const progress=root.querySelector<HTMLElement>('[data-progress]')!,blank=root.querySelector<HTMLElement>('[data-blank-page]')!;
  if(!pages||!controls||!prev||!next||!progress||!blank||!album.photos.length)throw new Error('相册暂不可用');
  const abort=new AbortController(),{signal}=abort;
  let state:ReaderState={photoId:album.photos.some(p=>p.id===initialPhotoId)?initialPhotoId:album.photos[0].id,mode:modeForWidth(root.clientWidth)};
  const figures=new Map(Array.from(root.querySelectorAll<HTMLElement>('[data-photo-id]')).map(figure=>[figure.dataset.photoId!,figure]));
  const warmed=new Set<string>(),prefetches=new Set<HTMLImageElement>(),bound=new Set<string>();
  function hydrate(id:string){
    const figure=figures.get(id);if(!figure||bound.has(id))return;bound.add(id);
    const existing=figure.querySelector<HTMLImageElement>('.album-photo__media > img');
    const template=figure.querySelector<HTMLTemplateElement>('[data-photo-image]')!;
    const image=existing??template.content.firstElementChild!.cloneNode(true) as HTMLImageElement;
    const status=figure.querySelector<HTMLElement>('[data-photo-status]')!,retry=figure.querySelector<HTMLButtonElement>('[data-retry]')!,message=figure.querySelector<HTMLElement>('[data-load-message]')!;
    const load=()=>{figure.dataset.load='loading';status.hidden=false;retry.hidden=true;message.textContent='照片加载中';image.sizes=`${Math.ceil(root.clientWidth/(state.mode==='spread'?2:1))}px`;if(image.dataset.srcset)image.srcset=image.dataset.srcset;image.src=image.dataset.src!;};
    const loaded=()=>{figure.dataset.load='loaded';status.hidden=true;};
    const failed=()=>{figure.dataset.load='error';status.hidden=false;retry.hidden=false;message.textContent=`${image.alt} · 照片暂时无法加载`;};
    image.addEventListener('load',loaded,{signal});image.addEventListener('error',failed,{signal});
    retry.addEventListener('click',()=>{image.removeAttribute('src');image.removeAttribute('srcset');load();},{signal});
    if(!existing){figure.querySelector('.album-photo__media')!.append(image);load();}
    if(image.complete){if(image.naturalWidth)loaded();else failed();}else if(figure.dataset.load==='error')failed();
  }
  function render(){
    const visible=visiblePhotoIds(album,state);for(const [id,figure]of figures){figure.hidden=!visible.includes(id);if(!figure.hidden)hydrate(id);const image=figure.querySelector<HTMLImageElement>('.album-photo__media > img');if(image&&!figure.hidden)image.sizes=`${Math.ceil(root.clientWidth/(state.mode==='spread'?2:1))}px`;}
    root.dataset.mode=state.mode;blank.hidden=state.mode!=='spread'||visible.length!==1;prev.disabled=stepPhoto(album,state,-1).photoId===state.photoId;next.disabled=stepPhoto(album,state,1).photoId===state.photoId;
    const label=progressLabel(album,state);if(progress.textContent!==label)progress.textContent=label;root.querySelector<HTMLElement>('[data-end]')!.hidden=!next.disabled;
    const following=stepPhoto(album,state,1);if(following.photoId!==state.photoId)for(const id of visiblePhotoIds(album,following)){if(warmed.has(id)||figures.get(id)?.dataset.load!=='idle')continue;warmed.add(id);const photo=album.photos.find(p=>p.id===id)!;const image=new Image();image.decoding='async';image.sizes=`${Math.ceil(root.clientWidth/(state.mode==='spread'?2:1))}px`;const srcset=photoSrcset(photo);if(srcset)image.srcset=srcset;image.src=servedUrl(photo.src);prefetches.add(image);}
    onChange({...state});
  }
  function step(delta:-1|1){const updated=stepPhoto(album,state,delta);if(updated.photoId===state.photoId)return;state=updated;render();root.dispatchEvent(new CustomEvent('album:page',{bubbles:true}));}
  prev.addEventListener('click',()=>step(-1),{signal});next.addEventListener('click',()=>step(1),{signal});
  root.addEventListener('keydown',event=>{const target=event.target as HTMLElement;const direction=acceptReaderKey({...event,key:event.key,repeat:event.repeat,ctrlKey:event.ctrlKey,metaKey:event.metaKey,altKey:event.altKey,shiftKey:event.shiftKey,editable:!!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')});if(direction){event.preventDefault();step(direction);}},{signal});
  const pointers=new Set<number>();let gesture:{x:number;y:number;time:number;id:number;max:number}|null=null;
  pages.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'||(event.target as HTMLElement).closest('a,button,input'))return;pointers.add(event.pointerId);if(pointers.size===1)gesture={x:event.clientX,y:event.clientY,time:performance.now(),id:event.pointerId,max:1};else if(gesture)gesture.max=pointers.size;},{signal,passive:true});
  pages.addEventListener('pointerup',event=>{if(gesture?.id===event.pointerId){const direction=swipeDirection({dx:event.clientX-gesture.x,dy:event.clientY-gesture.y,durationMs:performance.now()-gesture.time,pointers:gesture.max,startX:gesture.x,viewportWidth:innerWidth});gesture=null;if(direction)step(direction);}pointers.delete(event.pointerId);},{signal,passive:true});
  pages.addEventListener('pointercancel',()=>{gesture=null;pointers.clear();},{signal,passive:true});
  const resize=new ResizeObserver(()=>{if(signal.aborted)return;gesture=null;pointers.clear();const mode=modeForWidth(root.clientWidth);if(mode!==state.mode){state={...state,mode};render();}else for(const figure of figures.values()){const image=figure.querySelector<HTMLImageElement>('.album-photo__media > img');if(image&&!figure.hidden)image.sizes=`${Math.ceil(root.clientWidth/(mode==='spread'?2:1))}px`;}});resize.observe(root);
  render();root.dataset.enhanced='true';controls.hidden=false;root.querySelector<HTMLElement>('[data-static-sequence]')!.hidden=true;
  return {getState:()=>({...state}),restore(photoId){state={...state,photoId:album.photos.some(p=>p.id===photoId)?photoId:album.photos[0].id};render();},destroy(){abort.abort();resize.disconnect();prefetches.clear();gesture=null;pointers.clear();}};
}
