import {clampAlbumScroll} from '@/lib/photos/listModel';

type Gesture={id:number;x:number;y:number;start:number;origin:number;active:boolean;lastX:number;lastTime:number;velocity:number};
export interface AlbumUnfold {sync():void;goTo(index:number,focus?:boolean):void;step(direction:number):void;cancel():void;destroy():void;}

export function mountAlbumUnfold(strip:HTMLElement,onScroll:()=>void):AlbumUnfold {
  const abort=new AbortController(),{signal}=abort;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const touches=new Set<number>();
  let gesture:Gesture|null=null,frame=0,targetIndex:number|null=null,suppressClick=false;
  let anchors:number[]=[],images:HTMLElement[]=[],links:HTMLAnchorElement[]=[];
  let settleTarget=0,settlePosition=0,settleVelocity=0,lastFrame=0,focusAfter=false;
  let lastWritten=strip.scrollLeft;
  strip.dataset.unfold='true';

  function progress(){
    const left=strip.scrollLeft;
    for(let i=0;i<anchors.length-1;i++)if(left<anchors[i+1]-.01)return i+(left-anchors[i])/Math.max(1,anchors[i+1]-anchors[i]);
    return Math.max(0,anchors.length-1);
  }
  function render(){
    const position=progress();
    images.forEach((image,index)=>{
      const angle=40*Math.max(-1,Math.min(1,index-position));
      image.style.transformOrigin=angle>=0?'left center':'right center';
      image.style.transform=reduced.matches?'none':`perspective(${image.clientWidth*2.8}px) rotateY(${angle}deg)`;
    });
  }
  function sync(){
    const padding=parseFloat(getComputedStyle(strip).paddingLeft)||0,max=strip.scrollWidth-strip.clientWidth;
    const items=Array.from(strip.children) as HTMLElement[];
    anchors=items.map(item=>clampAlbumScroll(item.offsetLeft-padding,max));
    images=Array.from(strip.querySelectorAll<HTMLElement>('.album-cover__image'));
    links=Array.from(strip.querySelectorAll<HTMLAnchorElement>('[data-album-id]'));
    render();
  }
  function write(left:number){strip.scrollLeft=left;lastWritten=strip.scrollLeft;onScroll();}
  function stop(){cancelAnimationFrame(frame);frame=0;targetIndex=null;focusAfter=false;}
  function finish(){
    const index=targetIndex,focus=focusAfter;
    stop();write(settleTarget);
    if(focus&&index!==null)links[index]?.focus({preventScroll:true});
  }
  function tick(time:number){
    if(Math.abs(strip.scrollLeft-lastWritten)>1){stop();onScroll();return;}
    const dt=Math.min(.025,(time-lastFrame)/1000);lastFrame=time;
    settleVelocity+=(210*(settleTarget-settlePosition)-29*settleVelocity)*dt;
    settlePosition+=settleVelocity*dt;write(settlePosition);
    if(Math.abs(settleTarget-settlePosition)<.15&&Math.abs(settleVelocity)<2)finish();
    else frame=requestAnimationFrame(tick);
  }
  function settle(left:number,index:number|null,focus=false){
    stop();settleTarget=left;settlePosition=strip.scrollLeft;lastWritten=strip.scrollLeft;settleVelocity=0;targetIndex=index;focusAfter=focus;
    if(reduced.matches||Math.abs(left-strip.scrollLeft)<.15){finish();return;}
    lastFrame=performance.now();frame=requestAnimationFrame(tick);
  }
  function goTo(index:number,focus=false){
    const target=Math.max(0,Math.min(anchors.length-1,index));
    if(anchors[target]!==undefined)settle(anchors[target],target,focus);
  }
  function step(direction:number){goTo((targetIndex??Math.round(progress()))+direction);}
  function release(){
    if(!gesture)return null;
    const previous=gesture;gesture=null;delete strip.dataset.dragging;
    if(strip.hasPointerCapture(previous.id))strip.releasePointerCapture(previous.id);
    return previous;
  }
  function cancel(){if(release()?.active)suppressClick=true;stop();}
  function cancelGesture(){
    const previous=release();
    if(previous?.active){suppressClick=true;settle(previous.start,null);}
  }
  document.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch')return;
    touches.add(event.pointerId);
    if(touches.size>1)cancelGesture();
  },{capture:true,signal});
  for(const type of ['pointerup','pointercancel'] as const)document.addEventListener(type,event=>touches.delete(event.pointerId),{capture:true,signal});
  strip.addEventListener('pointerdown',event=>{
    suppressClick=false;
    if(event.button!==0||!event.isPrimary||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||touches.size>1)return;
    if(event.pointerType==='touch'&&(event.clientX<24||event.clientX>innerWidth-24))return;
    const origin=targetIndex??Math.round(progress());stop();
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,start:strip.scrollLeft,origin,active:false,lastX:event.clientX,lastTime:performance.now(),velocity:0};
  },{signal});
  strip.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(!gesture.active){
      if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)){release();return;}
      if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy)*1.18)return;
      gesture.active=true;strip.setPointerCapture(event.pointerId);strip.dataset.dragging='true';
    }
    event.preventDefault();
    const time=performance.now();gesture.velocity=(event.clientX-gesture.lastX)/Math.max(1,time-gesture.lastTime);
    gesture.lastX=event.clientX;gesture.lastTime=time;
    write(clampAlbumScroll(gesture.start-dx,strip.scrollWidth-strip.clientWidth));
  },{signal});
  strip.addEventListener('pointerup',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const previous=release();if(!previous?.active)return;
    suppressClick=true;
    const dx=event.clientX-previous.x,direction=dx<0?1:-1;
    const stepSize=Math.abs((anchors[previous.origin+direction]??anchors[previous.origin])-anchors[previous.origin])||strip.clientWidth;
    const flick=performance.now()-previous.lastTime<100&&Math.abs(previous.velocity)>.5;
    if(Math.abs(dx)>=stepSize*.22||flick)goTo(previous.origin+direction);
    else settle(previous.start,null);
  },{signal});
  strip.addEventListener('pointercancel',event=>{if(event.pointerId===gesture?.id)cancelGesture();},{signal});
  strip.addEventListener('lostpointercapture',event=>{if(event.target===strip&&event.pointerId===gesture?.id)cancelGesture();},{signal});
  strip.addEventListener('pointerleave',()=>{if(gesture&&!gesture.active)release();},{signal});
  strip.addEventListener('click',event=>{
    if(suppressClick&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}
  },{capture:true,signal});
  strip.addEventListener('dragstart',event=>event.preventDefault(),{signal});
  strip.addEventListener('wheel',cancel,{passive:true,signal});
  strip.addEventListener('scroll',()=>{if(frame&&Math.abs(strip.scrollLeft-lastWritten)>1)stop();},{passive:true,signal});
  strip.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
    if(event.key==='Escape'){cancelGesture();return;}
    const index=targetIndex??Math.round(progress());
    const destination=event.key==='ArrowLeft'?index-1:event.key==='ArrowRight'?index+1:event.key==='Home'?0:event.key==='End'?anchors.length-1:null;
    if(destination!==null){event.preventDefault();goTo(destination,true);}
  },{signal});
  window.addEventListener('blur',cancelGesture,{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelGesture();},{signal});
  reduced.addEventListener('change',()=>{if(reduced.matches&&frame)finish();render();},{signal});
  for(const img of strip.querySelectorAll<HTMLImageElement>('img')){
    const error=img.parentElement?.querySelector<HTMLElement>('[data-album-cover-error]');
    const updateImage=()=>{const failed=img.complete&&img.naturalWidth===0;img.hidden=failed;if(error)error.hidden=!failed;};
    img.addEventListener('error',updateImage,{signal});img.addEventListener('load',updateImage,{signal});updateImage();
  }
  sync();
  return {sync,goTo,step,cancel,destroy(){cancel();abort.abort();delete strip.dataset.unfold;for(const image of images){image.style.removeProperty('transform');image.style.removeProperty('transform-origin');}}};
}
