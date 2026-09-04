// 生产发布门禁（D-127）：只有用户 Approve 的内容才进入生产列表与详情。
// draft 是技术开关，approved 是内容批准；两者独立，缺一不可。
export interface GateData {
  draft: boolean;
  approved: boolean;
}

export function isPublishable(data: GateData): boolean {
  return !data.draft && data.approved;
}
