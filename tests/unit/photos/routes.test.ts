import {expect,it} from "vitest";
import {albumHref,resolvePhotoId,isAlbumTransition} from "@/lib/photos/routes";
import type {PublicAlbum} from "@/lib/photos/albums";
const a={photos:[{id:"a"},{id:"b"}]} as PublicAlbum;
it("encodes nested original slugs and optional photo anchor",()=>{expect(albumHref("旅行/one two","b")).toBe("/photos/%E6%97%85%E8%A1%8C/one%20two#photo-b");expect(albumHref("a")).toBe("/photos/a");});
it.each(["","#unknown","#photo-missing","#photo-%E0%A4%A","#photo-%","#photo-secret"])('falls back safely for %s',hash=>expect(resolvePhotoId(a,hash)).toBe("a"));
it("resolves explicit photos",()=>expect(resolvePhotoId(a,"#photo-b")).toBe("b"));
it("coordinates only list-detail transitions",()=>{expect(isAlbumTransition("/photos","/photos/trip/day")).toBe(true);expect(isAlbumTransition("/photos/trip/day","/photos/")).toBe(true);expect(isAlbumTransition("/blog/a","/photos")).toBe(false);expect(isAlbumTransition("/photos/a","/photos/b")).toBe(false);});
