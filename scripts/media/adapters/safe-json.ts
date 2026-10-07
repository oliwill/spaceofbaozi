import {createHash} from 'node:crypto';
import {eligibleAt} from '../../../src/lib/media/model';
import {z} from 'astro/zod';
import {parseNormalizedRecord,type ImportBatch} from '../../../src/lib/media/schema';
const inputSchema=z.object({schemaVersion:z.literal(1),sourceAt:z.string().datetime().nullable(),coverage:z.enum(['complete','partial']),reliable:z.boolean(),records:z.array(z.unknown()).max(50000)}).strict();
/** This explicit normalized JSON contract is not a Douban Excel/RSS adapter. */
export function readSafeJson(bytes:Uint8Array):ImportBatch {
 if(bytes.byteLength>10*1024*1024)throw new Error('input-byte-limit: split into smaller batches');
 if(bytes[0]===0x50&&bytes[1]===0x4b)throw new Error('backup-zip-rejected');
 let raw:unknown;try{raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new Error('invalid-safe-json');}
 const stack:unknown[]=[raw];while(stack.length){const value=stack.pop();if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){
  if(/cookie|token|password|passwd|authorization|credential|session|account|secret/i.test(key))throw new Error('credential-or-account-field-rejected');stack.push(child);
 }}
 const parsed=inputSchema.safeParse(raw);if(!parsed.success)throw new Error('invalid-safe-json-or-row-limit');
 const records:ImportBatch['records']=[];const issues:ImportBatch['issues']=[];
 parsed.data.records.forEach((row,index)=>{try{const record=parseNormalizedRecord(row);if(!eligibleAt(record,new Date()))throw new Error();records.push(record);}catch{issues.push({row:index+1,reason:'invalid-work-or-mark-fields'});}});
 const now=new Date();if(parsed.data.sourceAt&&Date.parse(parsed.data.sourceAt)>now.getTime())throw new Error('future-source-time');
 return {schemaVersion:1,contentHash:createHash('sha256').update(bytes).digest('hex'),importedAt:now.toISOString(),sourceAt:parsed.data.sourceAt,coverage:parsed.data.coverage,reliable:parsed.data.reliable,records,issues};
}
