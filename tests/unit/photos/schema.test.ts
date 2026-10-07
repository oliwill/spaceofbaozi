import { expect, it } from "vitest";
import { photoAlbumSchema, photoImageSchema, photoRecordSchema } from "@/lib/photos/schema";
const image={id:"a",src:"/assets/photos/a.webp",width:1200,height:800,alt:"几何图"};
it("defaults albums and photos to unapproved drafts",()=>{const data=photoAlbumSchema.parse({title:"x",photos:[image]});expect(data).toMatchObject({draft:true,approved:false});expect(data.photos[0]).toMatchObject({draft:true,approved:false});});
it.each([{width:0},{height:1.5},{alt:" "},{id:"BAD"},{src:"/assets/photos/../private.png"},{src:"https://example.com/a.jpg"},{src:"/assets/photos/%2e%2e/a.png"},{src:"/assets/photos/a.png?tracking=x"},{variants:[{src:"/assets/photos/b.webp",width:200,height:300}]}])("rejects unsafe or invalid image %j",change=>expect(()=>photoAlbumSchema.parse({title:"x",photos:[{...image,...change}]})).toThrow());
it("rejects duplicate photo ids",()=>expect(()=>photoAlbumSchema.parse({title:"x",photos:[image,image]})).toThrow());
it("accepts same ratio variants and author order",()=>expect(photoAlbumSchema.parse({title:"x",photos:[{...image,variants:[{src:"/assets/photos/a-small.webp",width:600,height:400}]}]}).photos[0].variants).toHaveLength(1));

it.each([{x:0,y:0},{x:100,y:100},{x:22.5,y:68.75}])("accepts finite cover positioning percentages %j",coverPosition=>{
 const data=photoAlbumSchema.parse({title:"x",coverPosition,photos:[image]});
 expect(data.coverPosition).toEqual(coverPosition);
 expect(data).toMatchObject({draft:true,approved:false});
 expect(data.photos[0]).toMatchObject({draft:true,approved:false,width:1200,height:800});
});

it("leaves an omitted cover position absent for the list renderer's centered fallback",()=>{
 const data=photoAlbumSchema.parse({title:"x",photos:[image]});
 expect(data).not.toHaveProperty("coverPosition");
});

it.each([
 ["negative",-0.01], ["greater than 100",100.01], ["NaN",NaN],
 ["positive infinity",Infinity], ["negative infinity",-Infinity], ["numeric string","50"], ["null",null],
])("rejects %s on either cover position axis",(_label,value)=>{
 for(const axis of ["x","y"]){
  expect(()=>photoAlbumSchema.parse({title:"x",coverPosition:{x:50,y:50,[axis]:value},photos:[image]})).toThrow();
 }
});

it.each([{x:50},{y:50},{},null,[50,50]])("requires both axes when cover position is present: %j",coverPosition=>{
 expect(()=>photoAlbumSchema.parse({title:"x",coverPosition,photos:[image]})).toThrow();
});

it("keeps cover positioning out of image and inner-photo schemas",()=>{
 const coverPosition={x:30,y:70};
 expect(photoImageSchema.parse({...image,coverPosition})).not.toHaveProperty("coverPosition");
 expect(photoRecordSchema.parse({...image,coverPosition})).not.toHaveProperty("coverPosition");
 const data=photoAlbumSchema.parse({title:"x",coverPosition,coverImage:{...image,coverPosition},photos:[{...image,coverPosition}]});
 expect(data.coverImage).not.toHaveProperty("coverPosition");
 expect(data.photos[0]).not.toHaveProperty("coverPosition");
 expect(data.coverImage).toMatchObject({draft:true,approved:false});
});
