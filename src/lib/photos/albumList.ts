import {coverWidth,activeAlbumIndex,clampAlbumScroll} from "@/lib/photos/listModel";
import {mountAlbumUnfold,type AlbumUnfold} from '@/lib/photos/albumUnfold';
export function mountAlbumList(root:HTMLElement):()=>void {
  const strip=root.querySelector<HTMLElement>('[data-album-strip]');
  const controls=root.querySelector<HTMLElement>('[data-album-controls]');
  const previous=root.querySelector<HTMLButtonElement>('[data-album-prev]');
  const next=root.querySelector<HTMLButtonElement>('[data-album-next]');
  if(!strip||!controls||!previous||!next)return ()=>{};
  const names=root.querySelector<HTMLElement>("[data-album-segments]");
  const segments=Array.from(root.querySelectorAll<HTMLButtonElement>("[data-album-segment]"));
  const directoryToggle=root.querySelector<HTMLButtonElement>('[data-album-directory-toggle]');
  const currentName=root.querySelector<HTMLElement>('[data-album-current-name]');
  const mobile=matchMedia('(max-width: 767px)');
  let mobileDirectory=mobile.matches,directoryOpen=false;
  let directoryFocus:HTMLElement|null=null;
  let activeId="",geometry="";
  const abort=new AbortController(),{signal}=abort;
  let unfold:AlbumUnfold|undefined;
  const currentSegment=()=>segments.find(button=>button.dataset.albumSegment===activeId)??segments[0];
  const hiddenAtViewport=(element:HTMLElement,onMobile:boolean)=>onMobile?!!names?.contains(element):element===directoryToggle;
  document.addEventListener('focusin',event=>{
    const target=event.target;
    directoryFocus=target instanceof HTMLElement&&(target===directoryToggle||names?.contains(target))?target:null;
  },{capture:true,signal});
  document.addEventListener('focusout',event=>{
    if(event.target!==directoryFocus||!directoryFocus)return;
    // D-155：媒体查询可能先隐藏当前按钮，再触发 resize；只记住由断点隐藏造成的失焦。
    const hiddenByBreakpoint=mobileDirectory!==mobile.matches&&hiddenAtViewport(directoryFocus,mobile.matches)&&directoryFocus.getClientRects().length===0;
    if(event.relatedTarget||!hiddenByBreakpoint)directoryFocus=null;
  },{capture:true,signal});
  document.addEventListener('pointerdown',event=>{
    if(event.target instanceof Node&&!directoryFocus?.contains(event.target))directoryFocus=null;
  },{capture:true,signal});
  function renderDirectory(){
    if(!names||!directoryToggle)return;
    directoryToggle.hidden=false;
    names.hidden=mobileDirectory&&!directoryOpen;
    directoryToggle.setAttribute('aria-expanded',String(mobileDirectory&&directoryOpen));
  }
  function closeDirectory(){
    if(!mobileDirectory||!directoryToggle)return;
    directoryOpen=false;renderDirectory();directoryToggle.focus({preventScroll:true});
  }
  function syncDirectoryViewport(){
    const changed=mobileDirectory!==mobile.matches;
    const focused=document.activeElement===document.body&&changed&&directoryFocus&&hiddenAtViewport(directoryFocus,mobile.matches)
      ?directoryFocus:document.activeElement;
    mobileDirectory=mobile.matches;
    if(changed)directoryOpen=false;
    renderDirectory();
    if(!changed||!names||!directoryToggle)return;
    if(mobileDirectory&&names.contains(focused))directoryToggle.focus({preventScroll:true});
    else if(!mobileDirectory&&focused===directoryToggle)currentSegment()?.focus({preventScroll:true});
  }
  directoryToggle?.addEventListener('click',()=>{
    if(!mobileDirectory||!names)return;
    directoryOpen=!directoryOpen;renderDirectory();
    if(directoryOpen)currentSegment()?.focus({preventScroll:true});
  },{signal});
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&mobileDirectory&&directoryOpen){event.preventDefault();closeDirectory();}
  },{signal});
  function update(){
    if(!strip||!controls||!previous||!next)return;
    const style=getComputedStyle(strip),gap=parseFloat(style.columnGap)||0,paddingLeft=parseFloat(style.paddingLeft)||0,padding=paddingLeft+(parseFloat(style.paddingRight)||0),border=(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.borderRightWidth)||0);
    const viewport=strip.getBoundingClientRect().width-padding-border,ratio=parseFloat(style.getPropertyValue('--album-visible-ratio'))||1;
    const nextGeometry=`${viewport}/${gap}/${ratio}`;
    const items=Array.from(strip.children) as HTMLElement[];
    if(nextGeometry!==geometry){
      const selected=geometry?items.find(item=>item.querySelector<HTMLElement>('[data-album-id]')?.dataset.albumId===activeId):undefined;
      geometry=nextGeometry;
      strip.style.setProperty('--album-cover-width',`${coverWidth(viewport,gap,ratio)}px`);
      if(selected){unfold?.cancel();strip.scrollTo({left:clampAlbumScroll(selected.offsetLeft-paddingLeft,strip.scrollWidth-strip.clientWidth),behavior:'instant'});}
    }
    const max=Math.max(0,strip.scrollWidth-strip.clientWidth);controls.hidden=max<=1;previous.disabled=strip.scrollLeft<=1;next.disabled=strip.scrollLeft>=max-1;
    const positions=items.map(item=>item.offsetLeft-paddingLeft);
    unfold?.sync();
    const index=activeAlbumIndex(positions,strip.scrollLeft,max),id=items[index]?.querySelector<HTMLElement>('[data-album-id]')?.dataset.albumId;
    if(!id||id===activeId)return;activeId=id;root.dataset.activeAlbum=id;
    for(const button of segments){if(button.dataset.albumSegment===id){button.setAttribute('aria-current','true');if(currentName)currentName.textContent=button.textContent?.trim()??'';}else button.removeAttribute('aria-current');}
  }
  for(const button of segments)button.addEventListener('click',()=>{
    const target=Array.from(strip.querySelectorAll<HTMLElement>('[data-album-id]')).find(link=>link.dataset.albumId===button.dataset.albumSegment)?.parentElement;
    if(!target)return;unfold?.goTo(Array.from(strip.children).indexOf(target));
    closeDirectory();
  },{signal});
  function scroll(direction:number){unfold?.step(direction);}
  const onResize=()=>{syncDirectoryViewport();update();};
  previous.addEventListener('click',()=>scroll(-1),{signal});next.addEventListener('click',()=>scroll(1),{signal});strip.addEventListener('scroll',update,{signal,passive:true});window.addEventListener('resize',onResize,{signal});mobile.addEventListener('change',onResize,{signal});
  const resize=new ResizeObserver(update);resize.observe(strip);
  const mutations=new MutationObserver(update);mutations.observe(strip,{childList:true});
  renderDirectory();update();unfold=mountAlbumUnfold(strip,update);
  return()=>{unfold?.destroy();abort.abort();resize.disconnect();mutations.disconnect();};
}
