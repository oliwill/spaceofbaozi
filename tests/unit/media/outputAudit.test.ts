import {it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {auditMediaOutput} from '../../../scripts/media/audit-output';
import {createFixtureSnapshot} from '../../../scripts/media/fixtures';
it('audits names, HTML, JS, JSON and maps against hidden sentinels',()=>{
 const dir=mkdtempSync(join(tmpdir(),'media-audit-'));try{
  const snapshot=createFixtureSnapshot('empty',new Date());writeFileSync(join(dir,'index.html'),'<h1>书影音正在整理</h1>');expect(auditMediaOutput(dir,snapshot,['HIDDEN_SENTINEL']).ok).toBe(true);
  writeFileSync(join(dir,'bundle.js.map'),JSON.stringify({sourcesContent:['HIDDEN_SENTINEL']}));expect(auditMediaOutput(dir,snapshot,['HIDDEN_SENTINEL']).ok).toBe(false);
  mkdirSync(join(dir,'media/item/douban-book-999'),{recursive:true});writeFileSync(join(dir,'media/item/douban-book-999/index.html'),'hidden');expect(auditMediaOutput(dir,snapshot).ok).toBe(false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
it('rejects bare and escaped unapproved stable ids in any output',()=>{
 const dir=mkdtempSync(join(tmpdir(),'media-audit-'));try{const snapshot=createFixtureSnapshot('empty',new Date());
 for(const content of ['{"id":"douban-book-999","comment":"private"}','{"id":"douban\\u002dbook\\u002d999"}','var x="douban%2Dbook%2D999"']){writeFileSync(join(dir,'search.json'),content);expect(auditMediaOutput(dir,snapshot).ok).toBe(false);}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
