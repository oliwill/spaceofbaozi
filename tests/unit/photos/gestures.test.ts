import {expect,it} from "vitest";
import {swipeDirection,acceptReaderKey} from "@/lib/photos/gestures";
const swipe={dx:-80,dy:10,durationMs:300,pointers:1,startX:100,viewportWidth:390};
it("recognizes one deliberate internal horizontal swipe",()=>{expect(swipeDirection(swipe)).toBe(1);expect(swipeDirection({...swipe,dx:80})).toBe(-1);});
it.each([{dx:47},{dy:60},{durationMs:801},{pointers:2},{startX:23},{startX:367},{cancelled:true}])("does not hijack native gesture %j",change=>expect(swipeDirection({...swipe,...change})).toBe(0));
it("accepts only non-repeating unmodified scoped arrow keys",()=>{expect(acceptReaderKey({key:"ArrowRight"})).toBe(1);expect(acceptReaderKey({key:"ArrowLeft"})).toBe(-1);for(const change of [{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{editable:true},{key:"ArrowDown"}])expect(acceptReaderKey({key:"ArrowRight",...change})).toBe(0);});
