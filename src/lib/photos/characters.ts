import { servedUrl } from "@/lib/site/paths";
export type AlbumCharacterPhase='invite'|'opening'|'reading';
export interface CharacterAsset{src:string;width:number;height:number;visibleBounds:{left:number;top:number;width:number;height:number};groundAnchor:{x:number;y:number};approved:boolean;}
export interface CharacterManifest{approved:boolean;poses:Record<string,CharacterAsset>;}
export function characterPose(phase:AlbumCharacterPhase,reducedMotion:boolean):{person:string;jiale:string}{if(phase==='invite')return {person:'person-invite',jiale:'jiale-lie'};if(phase==='opening'&&!reducedMotion)return {person:'person-open',jiale:'jiale-head-up'};return {person:'person-watch',jiale:'jiale-rest'};}
export function approvedCharacterAssets(value:unknown):CharacterManifest|undefined{
  if(!value||typeof value!=='object')return;const manifest=value as CharacterManifest;if(manifest.approved!==true||!manifest.poses)return;
  const names=['person-invite','person-open','person-watch','jiale-lie','jiale-head-up','jiale-rest'];
  for(const name of names){const asset=manifest.poses[name];if(!asset||asset.approved!==true||!/^\/assets\/photos-characters\/[a-z0-9-]+\.(webp|png)$/.test(asset.src)||!Number.isInteger(asset.width)||asset.width<=0||!Number.isInteger(asset.height)||asset.height<=0||!asset.visibleBounds||!asset.groundAnchor)return;}
  return manifest;
}
export function mountAlbumCharacters(opening:boolean,signal:AbortSignal):void{
  const motion=matchMedia('(prefers-reduced-motion: reduce)');let timer:number|undefined;
  const apply=(phase:AlbumCharacterPhase)=>{const pose=characterPose(phase,motion.matches);document.querySelectorAll<HTMLElement>('[data-album-character]').forEach(root=>{const role=root.dataset.albumCharacter as 'person'|'jiale',image=root.querySelector('img');if(!image)return;try{const assets=JSON.parse(root.dataset.characterPoses??'{}') as Record<string,CharacterAsset>;const asset=assets[pose[role]];if(!asset)return;image.src=servedUrl(asset.src);image.width=asset.width;image.height=asset.height;root.dataset.pose=pose[role];}catch{root.hidden=true;}});};
  const reading=!!document.querySelector('[data-album-reader]');apply(reading&&opening?'opening':reading?'reading':'invite');
  if(reading&&opening&&!motion.matches)timer=window.setTimeout(()=>{if(!signal.aborted)apply('reading');},320);
  motion.addEventListener('change',()=>{clearTimeout(timer);apply(reading?'reading':'invite');},{signal});signal.addEventListener('abort',()=>clearTimeout(timer),{once:true});
}
