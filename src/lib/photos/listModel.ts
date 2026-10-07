export const coverWidth=(viewport:number,gap:number,visibleRatio:number):number=>Math.max(1,(viewport-gap)/visibleRatio);
export const clampAlbumScroll=(target:number,max:number):number=>Math.max(0,Math.min(Math.max(0,max),target));
export function activeAlbumIndex(positions:number[],scroll:number,max:number):number{if(positions.length<2||scroll<=1)return 0;if(max>1&&scroll>=max-1)return positions.length-1;let nearest=0;positions.forEach((position,index)=>{if(Math.abs(position-scroll)<Math.abs(positions[nearest]-scroll))nearest=index;});return nearest;}

export function restoreAlbumScroll(saved:number,selectedLeft:number,selectedWidth:number,viewport:number,max:number,alignmentInset=0):number{const left=clampAlbumScroll(saved,max);return selectedLeft<left-1||selectedLeft+selectedWidth>left+viewport+1?clampAlbumScroll(selectedLeft-alignmentInset,max):left;}
