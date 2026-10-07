import { servedUrl } from "@/lib/site/paths";
import type {PhotoImage} from '@/lib/photos/schema';
export function photoSrcset(photo:PhotoImage):string|undefined{if(!photo.variants?.length)return;const candidates=new Map(photo.variants.map(variant=>[variant.width,variant.src]));candidates.set(photo.width,photo.src);return [...candidates].sort(([a],[b])=>a-b).map(([width,src])=>`${servedUrl(src)} ${width}w`).join(', ');}
