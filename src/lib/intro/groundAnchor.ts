import type { FrameAnchor } from "@/lib/intro/assetManifest";

export function groundAnchorOffset(
  anchors: readonly Pick<FrameAnchor, "ground">[],
  frame: number,
  spriteSize: { width: number; height: number },
  rotationDeg = 0,
): number {
  const baseline = anchors[0]?.ground ?? [0.5, 1];
  const current = anchors[frame]?.ground ?? baseline;
  const originX = spriteSize.width * 0.5;
  const originY = spriteSize.height;
  const radians = rotationDeg * Math.PI / 180;
  const relativeX = spriteSize.width * current[0] - originX;
  const relativeY = spriteSize.height * current[1] - originY;
  const rotatedY = originY + relativeX * Math.sin(radians) + relativeY * Math.cos(radians);
  const baselineY = spriteSize.height * baseline[1];
  return baselineY - rotatedY;
}
