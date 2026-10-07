import { describe, expect, it } from "vitest";
import { albumLightboxItems, latestAlbumDate, publishableAlbums, splitAlbums, type PhotoAlbum } from "@/lib/photos/albums";
const photo = (id: string, approved = true) => ({id, src:`/assets/photos/${id}.webp`,width:1200,height:800,alt:`照片 ${id}`,draft:!approved,approved});
const entry = (id:string, extras:Record<string,unknown> = {}) => ({id,data:{title:id,description:"作者引言",tags:[],draft:false,approved:true,order:0,photos:[photo("a"),photo("b")],...extras}}) as PhotoAlbum;
const albums = [entry("draft-album",{draft:true}),entry("older-album",{date:new Date("2026-08-01")}),entry("newer-album",{date:new Date("2026-09-01"),updated:new Date("2026-09-12"),coverPhotoId:"b"})];
describe("photos album helpers",()=>{
 it("keeps only approved public albums sorted newest first",()=>expect(publishableAlbums(albums).map(a=>a.id)).toEqual(["newer-album","older-album"]));
 it("splits the newest album as the editorial feature",()=>{const {featured,recent}=splitAlbums(albums); expect(featured?.id).toBe("newer-album");expect(recent.map(a=>a.id)).toEqual(["older-album"]);});
 it("builds compatibility lightbox items from independently approved covers",()=>expect(albumLightboxItems(albums)).toEqual([{slug:"newer-album",title:"newer-album",src:"/assets/photos/b.webp",alt:"照片 b",description:"作者引言"},{slug:"older-album",title:"older-album",src:"/assets/photos/a.webp",alt:"照片 a",description:"作者引言"}]));
 it("uses the latest update date when present",()=>expect(latestAlbumDate(albums)?.toISOString()).toBe(new Date("2026-09-12").toISOString()));
 it("projects only approved albums and ordered approved photos without gate metadata",()=>{const result=publishableAlbums([entry("draft",{draft:true}),entry("unapproved",{approved:false}),entry("empty",{photos:[]}),entry("mixed",{photos:[photo("b"),photo("secret",false),photo("a")]})]);expect(result.map(a=>a.id)).toEqual(["mixed"]);expect(result[0].photos.map(p=>p.id)).toEqual(["b","a"]);expect(JSON.stringify(result)).not.toMatch(/secret|approved|draft/);});
 it("rejects explicitly unapproved or unknown cover references",()=>{for(const coverPhotoId of ["secret","missing"]) expect(()=>publishableAlbums([entry("x",{coverPhotoId,photos:[photo("a"),photo("secret",false)]})])).toThrow();});
 it("rejects an explicit unapproved separate cover",()=>expect(()=>publishableAlbums([entry("x",{coverImage:photo("secret",false)})])).toThrow());
 it("sorts by order, date then stable id without inventing dates",()=>expect(publishableAlbums([entry("z"),entry("a"),entry("ordered",{order:-1}),entry("dated",{date:new Date("2020-01-01")})]).map(a=>a.id)).toEqual(["ordered","dated","a","z"]));
 it("projects cover position at album level without changing inner photos or source dimensions",()=>{
  const data=entry("positioned",{coverPhotoId:"b",photos:[photo("b"),photo("secret",false),photo("a")]});
  const [original]=publishableAlbums([data]);
  const coverPosition={x:0,y:100};
  const positioned=entry(data.id,{...data.data,coverPosition});
  const [result]=publishableAlbums([positioned]);
  expect(result.coverPosition).toEqual(coverPosition);
  expect(result.coverPosition).not.toBe(coverPosition);
  expect(result.cover).toEqual(original.cover);
  expect(result.photos).toEqual(original.photos);
  expect(result.photos.map(p=>p.id)).toEqual(["b","a"]);
  expect(result.photos.every(p=>!("coverPosition" in p))).toBe(true);
  expect(result.cover).not.toHaveProperty("coverPosition");
  expect(JSON.stringify(result)).not.toMatch(/secret|approved|draft/);
  expect(positioned.data.photos).toEqual(data.data.photos);
 });
 it("leaves a public album without a cover position unchanged",()=>{
  expect(publishableAlbums([entry("centered")])[0]).not.toHaveProperty("coverPosition");
 });
 it("keeps separate cover selection and inner original ratios with cover positioning",()=>{
  const coverImage={...photo("cover"),width:800,height:1200};
  const [result]=publishableAlbums([entry("separate",{coverPosition:{x:25.5,y:72},coverImage})]);
  expect(result.coverPosition).toEqual({x:25.5,y:72});
  expect(result.cover).toMatchObject({src:"/assets/photos/cover.webp",width:800,height:1200});
  expect(result.photos.map(p=>({id:p.id,width:p.width,height:p.height}))).toEqual([{id:"a",width:1200,height:800},{id:"b",width:1200,height:800}]);
 });
 it("does not treat a positioned cover as album or photo publication approval",()=>{
  const coverPosition={x:50,y:50};
  const result=publishableAlbums([
   entry("draft",{coverPosition,draft:true}),
   entry("unapproved",{coverPosition,approved:false}),
   entry("empty",{coverPosition,photos:[]}),
   entry("private-photos",{coverPosition,photos:[photo("secret",false)]}),
  ]);
  expect(result).toEqual([]);
 });
 it("still rejects unknown, draft or unapproved cover references with a cover position",()=>{
  for(const coverPhotoId of ["missing","draft","unapproved"]){
   expect(()=>publishableAlbums([entry("x",{coverPosition:{x:50,y:50},coverPhotoId,photos:[photo("a"),{...photo("draft"),draft:true},{...photo("unapproved"),approved:false}]})])).toThrow("指定封面未获批准");
  }
 });
 it("still requires independent publication approval for a positioned separate cover",()=>{
  for(const coverImage of [{...photo("cover"),draft:true},{...photo("cover"),approved:false}]){
   expect(()=>publishableAlbums([entry("x",{coverPosition:{x:50,y:50},coverImage})])).toThrow("独立封面未获批准");
  }
 });
});
