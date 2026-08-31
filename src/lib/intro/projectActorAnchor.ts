import type { Point } from "@/lib/intro/assetManifest";

export type ActorAnchorProjection = {
  wrapperOrigin: { x: number; y: number };
  spriteSize: { width: number; height: number };
  anchor: Point;
  translate: { x: number; y: number };
  rotationDeg: number;
};

export type PixelPoint = { x: number; y: number };

/**
 * Projects a normalized sprite anchor with the same bottom-center origin used
 * by `.intro__actor`, keeping leash geometry in the stage coordinate system.
 */
export function projectActorAnchor(input: ActorAnchorProjection): PixelPoint {
  const localX = input.spriteSize.width * input.anchor[0];
  const localY = input.spriteSize.height * input.anchor[1];
  const originX = input.spriteSize.width * 0.5;
  const originY = input.spriteSize.height;
  const radians = input.rotationDeg * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const relativeX = localX - originX;
  const relativeY = localY - originY;

  return {
    x: input.wrapperOrigin.x + input.translate.x + originX + relativeX * cos - relativeY * sin,
    y: input.wrapperOrigin.y + input.translate.y + originY + relativeX * sin + relativeY * cos,
  };
}
