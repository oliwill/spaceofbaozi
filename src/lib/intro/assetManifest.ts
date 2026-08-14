export type AssetMode = "production" | "placeholder";
export type Point = readonly [number, number];

export const INTRO_ASSET_IDS = [
  "ballBounce",
  "dogRun",
  "dogSettle",
  "personRun",
  "personTrip",
  "personStand",
] as const;

export type IntroAssetId = (typeof INTRO_ASSET_IDS)[number];

export type FrameAnchor = {
  ground: Point;
  center: Point;
  hand?: Point;
  collar?: Point;
};

export type IntroAsset = {
  src: string;
  frames: 8;
  columns: 4;
  rows: 2;
  frameSize: { width: number; height: number };
  displayWidthVh: number;
  loop: boolean;
  outlineRatio: number;
  anchors: FrameAnchor[];
};

export type IntroGrassAsset = {
  src: string;
  selectedVariant: "C2";
  intrinsicSize: { width: 2560; height: 640 };
  visibleBounds: { x: 0; y: 280; width: 2560; height: 360 };
  displayWidthVw: 100;
  align: "bottom";
  transitionOut: readonly [number, number];
};

export type IntroManifest = {
  version: 1;
  mode: AssetMode;
  fps: number;
  assets: Record<IntroAssetId, IntroAsset>;
  environment?: { grass: IntroGrassAsset };
  fallback: string;
};


function assertPoint(value: unknown, label: string): asserts value is Point {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    value.some((coordinate) => typeof coordinate !== "number" || coordinate < 0 || coordinate > 1)
  ) {
    throw new Error(`${label} must be a normalized [x,y] point`);
  }
}

export function validateIntroManifest(value: unknown): IntroManifest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("manifest must be an object");
  const manifest = value as { version?: unknown; mode?: unknown; fps?: unknown; fallback?: unknown; assets?: unknown; environment?: unknown };
  if (manifest.version !== 1) throw new Error("manifest version must be 1");
  if (manifest.mode !== "production" && manifest.mode !== "placeholder") throw new Error("invalid manifest mode");
  if (typeof manifest.fps !== "number" || manifest.fps < 8 || manifest.fps > 10) throw new Error("fps must be 8..10");
  if (typeof manifest.fallback !== "string") throw new Error("fallback must be a string");
  if (manifest.mode === "production" && manifest.fallback !== "/assets/intro/production/intro-final-still.webp") {
    throw new Error("production fallback path is invalid");
  }
  if (typeof manifest.assets !== "object" || manifest.assets === null || Array.isArray(manifest.assets)) throw new Error("assets must be an object");
  const assets = manifest.assets as Record<string, unknown>;

  for (const id of INTRO_ASSET_IDS) {
    const rawAsset = assets[id];
    if (typeof rawAsset !== "object" || rawAsset === null || Array.isArray(rawAsset)) throw new Error(`missing required asset ${id}`);
    const asset = rawAsset as Record<string, unknown>;
    if (asset.frames !== 8 || asset.columns !== 4 || asset.rows !== 2) {
      throw new Error(`${id} must be an 8-frame 4x2 sheet`);
    }
    if (typeof asset.src !== "string" || !asset.src.startsWith(`/assets/intro/${manifest.mode === "placeholder" ? "placeholders" : "production"}/`)) {
      throw new Error(`${id} src does not match manifest mode`);
    }
    if (typeof asset.frameSize !== "object" || asset.frameSize === null || Array.isArray(asset.frameSize)) throw new Error(`${id} frameSize is required`);
    const frameSize = asset.frameSize as { width?: unknown; height?: unknown };
    if (!Number.isInteger(frameSize.width) || !Number.isInteger(frameSize.height) || Number(frameSize.width) < 1 || Number(frameSize.height) < 1) {
      throw new Error(`${id} frameSize must use positive integers`);
    }
    if (typeof asset.displayWidthVh !== "number" || asset.displayWidthVh <= 0) throw new Error(`${id} displayWidthVh must be positive`);
    if (typeof asset.loop !== "boolean") throw new Error(`${id} loop must be boolean`);
    if (typeof asset.outlineRatio !== "number" || asset.outlineRatio < 0.025 || asset.outlineRatio > 0.04) {
      throw new Error(`${id} outlineRatio must be 0.025..0.04`);
    }
    if (!Array.isArray(asset.anchors) || asset.anchors.length !== 8) throw new Error(`${id} anchors must contain 8 entries`);
    asset.anchors.forEach((anchor, index) => {
      if (typeof anchor !== "object" || anchor === null || Array.isArray(anchor)) throw new Error(`${id} anchor ${index} must be an object`);
      const frameAnchor = anchor as { ground?: unknown; center?: unknown; hand?: unknown; collar?: unknown };
      assertPoint(frameAnchor.ground, `${id}.anchors[${index}].ground`);
      assertPoint(frameAnchor.center, `${id}.anchors[${index}].center`);
      if (id.startsWith("person")) assertPoint(frameAnchor.hand, `${id}.anchors[${index}].hand`);
      if (id.startsWith("dog")) assertPoint(frameAnchor.collar, `${id}.anchors[${index}].collar`);
    });
  }

  if (manifest.mode === "production" && assets.ballBounce && (assets.ballBounce as Record<string, unknown>).displayWidthVh !== 5) {
    throw new Error("production ballBounce displayWidthVh must be 5");
  }

  if (manifest.environment !== undefined) {
    if (typeof manifest.environment !== "object" || manifest.environment === null || Array.isArray(manifest.environment)) {
      throw new Error("environment must be an object");
    }
    const environment = manifest.environment as { grass?: unknown };
    if (typeof environment.grass !== "object" || environment.grass === null || Array.isArray(environment.grass)) {
      throw new Error("environment.grass is required");
    }
    const grass = environment.grass as Record<string, unknown>;
    const intrinsicSize = grass.intrinsicSize as Record<string, unknown> | undefined;
    const visibleBounds = grass.visibleBounds as Record<string, unknown> | undefined;
    if (grass.src !== "/assets/intro/production/environment/intro-grass.webp") throw new Error("environment.grass src is invalid");
    if (grass.selectedVariant !== "C2") throw new Error("environment.grass selectedVariant must be C2");
    if (intrinsicSize?.width !== 2560 || intrinsicSize?.height !== 640) throw new Error("environment.grass intrinsicSize must be 2560x640");
    if (visibleBounds?.x !== 0 || visibleBounds?.y !== 280 || visibleBounds?.width !== 2560 || visibleBounds?.height !== 360) {
      throw new Error("environment.grass visibleBounds are invalid");
    }
    if (grass.displayWidthVw !== 100 || grass.align !== "bottom") throw new Error("environment.grass display contract is invalid");
    if (!Array.isArray(grass.transitionOut) || grass.transitionOut.length !== 2 || grass.transitionOut[0] !== 0.78 || grass.transitionOut[1] !== 0.82) {
      throw new Error("environment.grass transitionOut must be [0.78,0.82]");
    }
  }

  return value as IntroManifest;
}

export function resolveAssetMode(url: URL, isDev: boolean): AssetMode {
  return isDev && url.searchParams.get("assetMode") === "placeholder" ? "placeholder" : "production";
}
