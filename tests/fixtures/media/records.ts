import { parseNormalizedRecord, type NormalizedRecord, type ImportBatch, type PrivateArchive } from '@/lib/media/schema';
import { normalizeMarkDate } from '@/lib/media/dates';
export const now = new Date('2026-10-05T00:00:00Z');
export function syntheticRecord(subjectId = '123', changes: Partial<NormalizedRecord> = {}): NormalizedRecord {
  return parseNormalizedRecord({ id:`douban-book-${subjectId}`, source:'douban', subjectId, type:'book', title:`合成示例 ${subjectId}`, sourceStatus:'read', status:'completed', sourceVisibility:'public', myRating:4, markDate:normalizeMarkDate('2026-02-01',{basis:'synthetic mark',meaningVerified:true,sourceTimezone:null,now}).value, commentRaw:'合成测试记录，不是真实阅读史。', tags:[], credits:[], ...changes });
}
export const emptyArchive = (): PrivateArchive => ({revisions:{},latest:{},batches:[],lastSuccessAt:null,lastCompleteSuccessAt:null,withdrawals:[],conflicts:[]});
export function syntheticBatch(records: NormalizedRecord[], changes: Partial<ImportBatch> = {}): ImportBatch {
  return {schemaVersion:1,contentHash:'synthetic-batch',importedAt:now.toISOString(),sourceAt:'2026-10-01T00:00:00Z',coverage:'complete',reliable:true,records,issues:[],...changes};
}
