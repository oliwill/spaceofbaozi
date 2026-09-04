// 牵引绳 SVG 路径（D-121：独立 SVG Bézier，端点为手部与项圈锚点）
export interface Point {
  x: number;
  y: number;
}

/**
 * 端点精确落在 from/to；中部下垂量 sagPx 由调用方按绳紧绷程度给出
 * （绷紧 ≈ 角色间距的 2%，松弛 ≈ 12%）。
 */
export function leashPath(from: Point, to: Point, sagPx: number): string {
  const sag = Math.max(0, sagPx);
  const dx = to.x - from.x;
  const c1 = { x: from.x + dx / 3, y: from.y + sag };
  const c2 = { x: from.x + (2 * dx) / 3, y: to.y + sag };
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}

/** 绳紧绷程度 0（松）..1（紧）→ 下垂像素 */
export function leashSag(taut: number, distancePx: number): number {
  const t = Math.min(1, Math.max(0, taut));
  return distancePx * (0.12 - 0.1 * t);
}
