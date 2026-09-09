// v2 素材清单类型与加载（HARNESS-PROMPT：运行时只读 Manifest，不复制帧数/锚点数值）
export interface V2Anchors {
  ground: [number, number];
  center: [number, number];
  hand?: [number, number];
  collar?: [number, number];
}

export interface V2Frame {
  id: string;
  anchors: V2Anchors;
}

export interface V2Sequence {
  src: string;
  frameCount: number;
  columns: number;
  rows: number;
  frameSize: { width: number; height: number };
  loop: boolean;
  frameIds: string[];
  frames: V2Frame[];
  displayWidthVh: number;
  scope: string;
}

export interface V2Manifest {
  version: number;
  fps: number;
  sequences: Record<string, V2Sequence>;
  environment: {
    "intro-grass": {
      src: string;
      visibleBounds: { x: number; y: number; width: number; height: number };
      transitionOut: [number, number];
    };
  };
  fallback: { src: string };
  introTimeline: { progress: [number, number]; layers: string[] }[];
}

export const MANIFEST_V2_URL = "/manifest/asset-manifest.v2.json";

export async function loadManifestV2(): Promise<V2Manifest> {
  const res = await fetch(MANIFEST_V2_URL);
  if (!res.ok) throw new Error(`manifest v2 load failed: ${res.status}`);
  return (await res.json()) as V2Manifest;
}

/** 网格 sheet 取帧：行优先（integration.md §2） */
export function frameCell(seq: V2Sequence, frameIndex: number): { col: number; row: number } {
  const clamped = Math.min(seq.frameCount - 1, Math.max(0, frameIndex));
  return { col: clamped % seq.columns, row: Math.floor(clamped / seq.columns) };
}

/** 非循环序列：阶段局部进度 → 帧号（播完停在末帧）；循环序列：行进距离驱动 */
export function frameAtLocal(seq: V2Sequence, local: number): number {
  return Math.min(seq.frameCount - 1, Math.max(0, Math.floor(local * seq.frameCount)));
}

export function frameAtDistance(seq: V2Sequence, traveledVw: number, strideVw: number): number {
  return Math.floor(Math.max(0, traveledVw) / strideVw) % seq.frameCount;
}
