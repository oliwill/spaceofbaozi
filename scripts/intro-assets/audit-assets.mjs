import { access, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const ASSET_SPECS = {
  ballBounce: { path: "ball/ball-bounce.webp", width: 160, height: 160, displayWidth: { placeholder: 8, production: 5 }, loop: true, anchor: null },
  dogRun: { path: "dog/dog-run-right.webp", width: 320, height: 240, displayWidth: { placeholder: 23, production: 23 }, loop: true, anchor: "collar" },
  dogSettle: { path: "dog/dog-circle-settle.webp", width: 320, height: 240, displayWidth: { placeholder: 23, production: 23 }, loop: false, anchor: "collar" },
  personRun: { path: "person/summer-pulled-run-right.webp", width: 384, height: 384, displayWidth: { placeholder: 36, production: 36 }, loop: true, anchor: "hand" },
  personTrip: { path: "person/summer-trip-exit-right.webp", width: 384, height: 384, displayWidth: { placeholder: 36, production: 36 }, loop: false, anchor: "hand" },
  personStand: { path: "person/summer-land-stand.webp", width: 384, height: 384, displayWidth: { placeholder: 36, production: 36 }, loop: false, anchor: "hand" },
};

function isNormalizedPoint(point) {
  return Array.isArray(point) && point.length === 2 && point.every((coordinate) => typeof coordinate === "number" && coordinate >= 0 && coordinate <= 1);
}

async function alphaRange(path, region) {
  let pipeline = sharp(path);
  if (region) pipeline = pipeline.extract(region);
  const data = await pipeline.ensureAlpha().extractChannel("alpha").raw().toBuffer();
  let min = 255;
  let max = 0;
  for (const value of data) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

const selected = process.argv[2];
if (!new Set(["placeholder", "incoming-production", "production"]).has(selected)) {
  throw new Error("usage: audit-assets.mjs placeholder|incoming-production|production");
}
const root = selected === "placeholder"
  ? resolve("public/assets/intro/placeholders")
  : selected === "production"
    ? resolve("public/assets/intro/production")
    : resolve("design-assets/intro/incoming-production");
const manifest = JSON.parse(await readFile(resolve(root, "intro-manifest.json"), "utf8"));
const expectedMode = selected === "placeholder" ? "placeholder" : "production";
const errors = [];
let totalBytes = 0;

if (manifest.version !== 1 || manifest.mode !== expectedMode || typeof manifest.assets !== "object" || manifest.assets === null) {
  errors.push(`manifest must be version 1 in ${expectedMode} mode`);
}
const assetPrefix = `/assets/intro/${expectedMode === "placeholder" ? "placeholders" : "production"}/`;
for (const [id, spec] of Object.entries(ASSET_SPECS)) {
  const asset = manifest.assets?.[id];
  if (!asset || typeof asset !== "object") {
    errors.push(`${id}: required asset is missing`);
    continue;
  }
  if (asset.frames !== 8 || asset.columns !== 4 || asset.rows !== 2) errors.push(`${id}: expected 8 frames in 4x2`);
  if (asset.src !== `${assetPrefix}${spec.path}`) errors.push(`${id}: unexpected asset path`);
  if (asset.frameSize?.width !== spec.width || asset.frameSize?.height !== spec.height) errors.push(`${id}: unexpected frame dimensions`);
  if (asset.displayWidthVh !== spec.displayWidth[expectedMode]) errors.push(`${id}: unexpected display width`);
  if (asset.loop !== spec.loop) errors.push(`${id}: unexpected loop mode`);
  if (!Array.isArray(asset.anchors) || asset.anchors.length !== 8) {
    errors.push(`${id}: expected 8 anchors`);
  } else {
    asset.anchors.forEach((anchor, frame) => {
      if (!anchor || !isNormalizedPoint(anchor.ground) || !isNormalizedPoint(anchor.center) || (spec.anchor && !isNormalizedPoint(anchor[spec.anchor]))) {
        errors.push(`${id}: invalid frame ${frame + 1} anchors`);
      }
    });
  }
  const absolutePath = resolve(root, spec.path);
  try {
    await access(absolutePath);
    const image = sharp(absolutePath);
    const metadata = await image.metadata();
    if (metadata.width !== spec.width * 4 || metadata.height !== spec.height * 2) errors.push(`${id}: unexpected sheet dimensions`);
    if (!metadata.hasAlpha) {
      errors.push(`${id}: alpha channel is missing`);
    } else {
      for (let frame = 0; frame < 8; frame += 1) {
        const alpha = await alphaRange(absolutePath, {
          left: (frame % 4) * spec.width,
          top: Math.floor(frame / 4) * spec.height,
          width: spec.width,
          height: spec.height,
        });
        if (alpha.min > 8 || alpha.max < 247) errors.push(`${id}: frame ${frame + 1} lacks meaningful alpha separation`);
      }
    }
    totalBytes += (await stat(absolutePath)).size;
  } catch (error) {
    errors.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (selected !== "placeholder") {
  const grass = manifest.environment?.grass;
  const expectedGrassPath = "/assets/intro/production/environment/intro-grass.webp";
  if (!grass || grass.src !== expectedGrassPath || grass.selectedVariant !== "C2") errors.push("environment.grass: manifest selection is invalid");
  if (grass?.intrinsicSize?.width !== 2560 || grass?.intrinsicSize?.height !== 640) errors.push("environment.grass: intrinsic size is invalid");
  if (grass?.visibleBounds?.x !== 0 || grass?.visibleBounds?.y !== 280 || grass?.visibleBounds?.width !== 2560 || grass?.visibleBounds?.height !== 360) {
    errors.push("environment.grass: visible bounds are invalid");
  }
  if (grass?.displayWidthVw !== 100 || grass?.align !== "bottom") errors.push("environment.grass: display contract is invalid");
  if (grass?.transitionOut?.[0] !== 0.78 || grass?.transitionOut?.[1] !== 0.82) errors.push("environment.grass: transition is invalid");
  try {
    const grassPath = resolve(root, "environment/intro-grass.webp");
    const metadata = await sharp(grassPath).metadata();
    if (metadata.width !== 2560 || metadata.height !== 640) errors.push("environment.grass: expected 2560x640");
    if (!metadata.hasAlpha) {
      errors.push("environment.grass: alpha channel is missing");
    } else {
      const transparentArea = await alphaRange(grassPath, { left: 0, top: 0, width: 2560, height: 280 });
      if (transparentArea.max > 8) errors.push("environment.grass: upper safety area must be transparent");
      const visibleArea = await alphaRange(grassPath, { left: 0, top: 280, width: 2560, height: 360 });
      if (visibleArea.min > 8 || visibleArea.max < 247) errors.push("environment.grass: visible area lacks meaningful alpha separation");
    }
    totalBytes += (await stat(grassPath)).size;
  } catch (error) {
    errors.push(`environment.grass: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (selected !== "placeholder") {
  const expectedFallback = "/assets/intro/production/intro-final-still.webp";
  if (manifest.fallback !== expectedFallback) errors.push("fallback: manifest path is invalid");
  try {
    const fallback = resolve(root, "intro-final-still.webp");
    const metadata = await sharp(fallback).metadata();
    if (metadata.width !== 768 || metadata.height !== 768) errors.push("fallback: expected 768x768");
    if (!metadata.hasAlpha) {
      errors.push("fallback: missing alpha");
    } else {
      const alpha = await alphaRange(fallback);
      if (alpha.min > 8 || alpha.max < 247) errors.push("fallback: lacks meaningful alpha separation");
    }
    totalBytes += (await stat(fallback)).size;
  } catch (error) {
    errors.push(`fallback: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (totalBytes > 6 * 1024 * 1024) errors.push(`payload ${totalBytes} exceeds 6 MB`);
const report = { selected, totalBytes, errors, pass: errors.length === 0 };
console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exit(1);
