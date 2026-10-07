import {expect,it,vi,afterEach} from 'vitest';
import {mountAlbumReader} from '@/lib/photos/albumReader';
import type {PublicAlbum} from '@/lib/photos/albums';
class Element extends EventTarget{
 dataset:Record<string,string>={};hidden=false;disabled=false;textContent='';clientWidth=500;children:Element[]=[];lookups=new Map<string,unknown>();
 querySelector(selector:string):unknown{return this.lookups.get(selector)??null;}
 querySelectorAll(){return this.children;}
 closest(){return null;}
 append(element:Element){this.children.push(element);}
}
class ImageElement extends Element{
 assignments=0;alt='合成测试图';sizes='';srcset='';complete=false;naturalWidth=0;private source='';
 set src(value:string){this.source=value;this.assignments++;}get src(){return this.source;}
 removeAttribute(name:string){if(name==='src')this.source='';if(name==='srcset')this.srcset='';}
}
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 const root=new Element(),figure=new Element(),media=new Element(),status=new Element(),retry=new Element(),message=new Element();figure.dataset={photoId:'a',load:'idle'};root.children=[figure];
 for(const selector of ['[data-album-pages]','[data-reader-controls]','[data-prev]','[data-next]','[data-progress]','[data-blank-page]','[data-end]','[data-static-sequence]'])root.lookups.set(selector,new Element());
 let image:ImageElement;
 figure.querySelector=(selector:string)=>selector==='.album-photo__media > img'?media.children[0]??null:selector==='[data-photo-image]'?{content:{firstElementChild:{cloneNode(){image=new ImageElement();image.dataset.src='/assets/photos/a.png';return image;}}}}:selector==='[data-photo-status]'?status:selector==='[data-retry]'?retry:selector==='[data-load-message]'?message:selector==='.album-photo__media'?media:null;
 const album={id:'example',photos:[{id:'a',src:'/assets/photos/a.png',width:10,height:10,alt:'合成测试图'}]} as PublicAlbum;
 return {root,figure,status,retry,image:()=>image!,mount:()=>mountAlbumReader(root as unknown as HTMLElement,album,'a',()=>{})};
}
it('reattaches retry and image load listeners on the same DOM after Astro/BFCache remount',()=>{const f=fixture();const first=f.mount();f.image().dispatchEvent(new Event('error'));expect(f.figure.dataset.load).toBe('error');first.destroy();const second=f.mount();f.retry.dispatchEvent(new Event('click'));expect(f.image().assignments).toBe(2);f.image().dispatchEvent(new Event('load'));expect(f.figure.dataset.load).toBe('loaded');expect(f.status.hidden).toBe(true);second.destroy();});
it('settles an image completed while the reader was unmounted',()=>{const f=fixture();const first=f.mount();first.destroy();f.image().complete=true;f.image().naturalWidth=10;const second=f.mount();expect(f.figure.dataset.load).toBe('loaded');expect(f.status.hidden).toBe(true);second.destroy();});
it('does not reload or duplicate handlers for an already loaded remount',()=>{const f=fixture();const first=f.mount();f.image().complete=true;f.image().naturalWidth=10;f.image().dispatchEvent(new Event('load'));first.destroy();const second=f.mount();expect(f.image().assignments).toBe(1);f.image().dispatchEvent(new Event('error'));f.retry.dispatchEvent(new Event('click'));expect(f.image().assignments).toBe(2);second.destroy();});

it('does not request a new size for hidden previously read photos on resize',()=>{
 let resize=()=>{};vi.stubGlobal('ResizeObserver',class{constructor(callback:()=>void){resize=callback}observe(){}disconnect(){}});vi.stubGlobal('Image',ImageElement);
 const root=new Element(),images=new Map<string,ImageElement>();
 for(const selector of ['[data-album-pages]','[data-reader-controls]','[data-prev]','[data-next]','[data-progress]','[data-blank-page]','[data-end]','[data-static-sequence]'])root.lookups.set(selector,new Element());
 for(const id of ['a','b']){const figure=new Element(),media=new Element();figure.dataset={photoId:id,load:'idle'};for(const selector of ['[data-photo-status]','[data-retry]','[data-load-message]'])figure.lookups.set(selector,new Element());figure.lookups.set('.album-photo__media',media);figure.lookups.set('[data-photo-image]',{content:{firstElementChild:{cloneNode(){const image=new ImageElement();image.dataset.src=`/assets/photos/${id}.png`;images.set(id,image);return image;}}}});const lookup=figure.querySelector.bind(figure);figure.querySelector=(selector:string)=>selector==='.album-photo__media > img'?media.children[0]??null:lookup(selector);root.children.push(figure);}
 const album={id:'example',photos:['a','b'].map(id=>({id,src:`/assets/photos/${id}.png`,width:1000,height:700,alt:id}))} as PublicAlbum;
 const controller=mountAlbumReader(root as unknown as HTMLElement,album,'a',()=>{});(root.lookups.get('[data-next]') as Element).dispatchEvent(new Event('click'));
 expect(root.children[0].hidden).toBe(true);const before=images.get('a')!.sizes;root.clientWidth=600;resize();expect(images.get('a')!.sizes).toBe(before);expect(images.get('b')!.sizes).toBe('600px');controller.destroy();
});
