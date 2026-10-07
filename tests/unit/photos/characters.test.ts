import {expect,it} from "vitest";
import {characterPose,approvedCharacterAssets} from "@/lib/photos/characters";
it("welcomes once then rests instead of changing pose on every page",()=>{expect(characterPose('invite',false)).toEqual({person:'person-invite',jiale:'jiale-lie'});expect(characterPose('opening',false)).toEqual({person:'person-open',jiale:'jiale-head-up'});expect(characterPose('reading',false)).toEqual({person:'person-watch',jiale:'jiale-rest'});});
it("reduced motion skips opening action",()=>expect(characterPose('opening',true)).toEqual({person:'person-watch',jiale:'jiale-rest'}));
it("never exposes unapproved generated candidates",()=>{expect(approvedCharacterAssets({approved:false,poses:{}})).toBeUndefined();expect(approvedCharacterAssets(undefined)).toBeUndefined();});
