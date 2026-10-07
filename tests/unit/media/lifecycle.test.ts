import {afterEach,it,expect,vi} from 'vitest';
vi.mock('@/lib/scroll/lenis',()=>({scrollDocumentTo:vi.fn()}));
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
it('initialization is idempotent and does not bind click on unrelated pages',async()=>{
 const document={querySelector:vi.fn(()=>null),addEventListener:vi.fn()};const window={addEventListener:vi.fn()};
 vi.stubGlobal('document',document);vi.stubGlobal('window',window);vi.stubGlobal('cancelAnimationFrame',vi.fn());
 const {initMediaLifecycle}=await import('@/lib/media/lifecycle');initMediaLifecycle();const count=document.addEventListener.mock.calls.length;initMediaLifecycle();expect(document.addEventListener).toHaveBeenCalledTimes(count);
 expect(document.addEventListener.mock.calls.filter(call=>call[0]==='astro:page-load')).toHaveLength(1);
});
