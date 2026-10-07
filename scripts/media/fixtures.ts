import {buildPublicCandidate} from './publication';
import {revisionHash} from './reconcile';
import type { PrivateArchive,PublicationLedger,NormalizedRecord,PublicMedia,PublicSnapshot } from '../../src/lib/media/schema';
import { normalizeMarkDate } from '../../src/lib/media/dates';
export function createFixtureSnapshot(name:string,now:Date):PublicSnapshot {
const year=Number(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric'}).format(now));
const entries:PublicMedia[]=[];
const add=(id:number,raw:string|null,type:PublicMedia['type']='book')=>{
 const date=normalizeMarkDate(raw,{basis:'synthetic only',meaningVerified:true,sourceTimezone:null,now});if(date.issues.length)throw new Error('Invalid synthetic date');
 const {raw:_raw,basis:_basis,...markDate}=date.value;
 entries.push({id:`douban-${type}-${id}`,type,title:`合成示例 ${id} · ${type==='book'?'书':type==='movie'?'影':'音'}`,myRating:id%3?4:null,markDate,comment:id%4?'合成测试短评。只用于界面与规则验证，不代表包子的真实阅读史。\n'.repeat(id%5+1):'',tags:[],credits:[]});
};
if(name!=='empty'){
 for(let i=1;i<=30;i++)add(i,`${year}-01-01`);
 add(1,`${year}-01-01`,'movie');add(1,`${year}-01-01`,'music');add(33,`${year}-01`);add(34,null);add(35,String(year));
 if(name==='twenty-years')for(let i=1;i<=20;i++)add(100+i,`${year-i}-02-01`,i%2?'movie':'music');
}
if(entries.length){entries[0]={...entries[0],comment:entries[0].comment+'<script>window.mediaInjected=true</script><img src=x onerror="alert(1)"><iframe src="https://invalid.example"></iframe>',tags:['合成标签'],credits:[{label:'作者',value:'合成作者'}],cover:{src:'/assets/media/synthetic-cover.png',width:60,height:90,alt:'合成封面色块'},doubanUrl:'https://book.douban.com/subject/1/'};}
const snapshot:PublicSnapshot={schemaVersion:1,generatedAt:now.toISOString(),archiveTimezone:'Asia/Shanghai',coverage:{description:name==='empty'?'已收录；范围尚未核对。':'合成测试记录：仅用于私下验证。',verifiedEmptyYears:[]},entries};
if(name==='withdrawal'){
 const archive:PrivateArchive={revisions:{},latest:{},batches:[],lastSuccessAt:null,lastCompleteSuccessAt:null,withdrawals:[],conflicts:[]};const ledger:PublicationLedger={decisions:{},unresolvedWithdrawals:[]};
 for(const entry of entries){const raw=entry.markDate.calendarDate??(entry.markDate.year?String(entry.markDate.year):null);const record:NormalizedRecord={id:entry.id,type:entry.type,source:'douban',subjectId:entry.id.split('-').at(-1)!,title:entry.title,status:'completed',sourceStatus:'synthetic',sourceVisibility:entry.id==='douban-book-3'?'private':'public',myRating:entry.myRating,markDate:{...entry.markDate,raw,basis:'synthetic'},commentRaw:entry.comment,tags:entry.tags,credits:entry.credits};const hash=revisionHash(record);archive.revisions[entry.id]=[{hash,record,sourceAt:now.toISOString(),importedAt:now.toISOString(),reliable:true}];archive.latest[entry.id]=hash;ledger.decisions[entry.id]={approvedRevision:entry.id==='douban-book-2'?null:hash,hidden:entry.id==='douban-book-1'};}
 return buildPublicCandidate(archive,ledger,{now,coverage:snapshot.coverage,publicBlogPaths:[]}).snapshot;
}
return snapshot;
}
