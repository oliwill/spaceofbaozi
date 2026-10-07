function animate(element:HTMLElement,keyframes:Keyframe[],duration:number,signal:AbortSignal):void{
  if(signal.aborted||matchMedia('(prefers-reduced-motion: reduce)').matches||typeof element.animate!=='function')return;
  try{const animation=element.animate(keyframes,{duration,easing:'cubic-bezier(.2,.7,.2,1)'});const cancel=()=>animation.cancel();signal.addEventListener('abort',cancel,{once:true});void animation.finished.catch(()=>{}).finally(()=>signal.removeEventListener('abort',cancel));}catch{}
}
export function animateAlbumOpen(from:DOMRect|undefined,to:HTMLElement,signal:AbortSignal):void{const target=to.getBoundingClientRect(),x=from?Math.max(-16,Math.min(16,from.left-target.left)):0;animate(to,[{opacity:.55,transform:`translate(${x}px, 8px) scale(.98)`},{opacity:1,transform:'none'}],320,signal);}
export function animateAlbumClose(to:HTMLElement,signal:AbortSignal):void{animate(to,[{opacity:.6,transform:'scale(1.025)'},{opacity:1,transform:'none'}],320,signal);}
export function animateAlbumPage(root:HTMLElement,signal:AbortSignal):void{animate(root,[{opacity:.65,transform:'translateX(7px)'},{opacity:1,transform:'none'}],200,signal);}
