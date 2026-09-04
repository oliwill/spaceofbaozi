import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE_ROOT = path.resolve("assets-master/deliverables/intro-materials-harness-ready-2026-08-31");
const OUTPUT_ROOT = path.resolve("public/assets/intro/oil-motion");
const QA_ROOT = path.resolve("design-assets/intro/oil-motion/qa");
const PAD = 48;
const MOBILE_SCALE = 0.5;

const personFrames = [
  { id: "neutral", file: "person/trimmed/person-neutral.png", hand: null },
  { id: "run", file: "person/trimmed/person-run.png", hand: [885, 535] },
  { id: "pulled-lean", file: "person/trimmed/person-pulled-lean.png", hand: [955, 640] },
  { id: "fall-slide-right", file: "person/trimmed/person-fall-slide-right.png", hand: [1415, 455] },
];

const jialeFrames = [
  { id: "contact", file: "dog/trimmed/dog-run-contact.png" },
  { id: "stretch", file: "dog/trimmed/dog-run-stretch.png" },
  { id: "gathered", file: "dog/trimmed/dog-run-gathered.png" },
  { id: "airborne", file: "dog/trimmed/dog-run-airborne.png" },
];

const publicUrl = (filePath) => `/${path.relative(path.resolve("public"), filePath).split(path.sep).join("/")}`;

async function analyzeImage(relativePath, { requireAlpha = true } = {}) {
  const absolutePath = path.join(SOURCE_ROOT, relativePath);
  const image = sharp(absolutePath);
  const metadata = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const hasAlpha = channels === 4;
  let edgeAlphaMax = null;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let opaquePixels = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * channels;
      const alpha = hasAlpha ? data[offset + 3] : 255;
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) {
        edgeAlphaMax = Math.max(edgeAlphaMax ?? alpha, alpha);
      }
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        opaquePixels += 1;
      }
    }
  }

  if (requireAlpha && (!hasAlpha || edgeAlphaMax !== 0)) {
    throw new Error(`${relativePath} must be RGBA with transparent canvas edges`);
  }

  return {
    absolutePath,
    relativePath,
    format: metadata.format,
    width: info.width,
    height: info.height,
    channels,
    hasAlpha,
    edgeAlphaMax,
    opaquePixels,
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}

async function detectBlueAnchor(analysis) {
  const { data, info } = await sharp(analysis.absolutePath).raw().toBuffer({ resolveWithObject: true });
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const a = data[offset + 3];
      if (a > 8 && b > 100 && g > 90 && r < 120 && b > r * 1.5 && g > r * 1.2) {
        sumX += x;
        sumY += y;
        count += 1;
      }
    }
  }
  if (count < 100) throw new Error(`${analysis.relativePath} blue collar anchor not found`);
  return { point: [sumX / count, sumY / count], bluePixels: count };
}

const normalize = ([x, y], width, height) => [
  Number((x / width).toFixed(4)),
  Number((y / height).toFixed(4)),
];

async function packAtlas({ role, frames, directory, display }) {
  const analyses = [];
  for (const frame of frames) {
    analyses.push({ ...frame, analysis: await analyzeImage(frame.file) });
  }

  const maxContentWidth = Math.max(...analyses.map(({ analysis }) => analysis.bounds.width));
  const maxContentHeight = Math.max(...analyses.map(({ analysis }) => analysis.bounds.height));
  const cellWidth = maxContentWidth + PAD * 2;
  const cellHeight = maxContentHeight + PAD * 2;
  const cellBuffers = [];
  const manifestFrames = [];

  for (const frame of analyses) {
    const { analysis } = frame;
    const cropped = await sharp(analysis.absolutePath)
      .extract({
        left: analysis.bounds.x,
        top: analysis.bounds.y,
        width: analysis.bounds.width,
        height: analysis.bounds.height,
      })
      .png()
      .toBuffer();
    const left = PAD + Math.round((maxContentWidth - analysis.bounds.width) / 2);
    const top = PAD + (maxContentHeight - analysis.bounds.height);
    const cell = await sharp({
      create: {
        width: cellWidth,
        height: cellHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: cropped, left, top }])
      .png()
      .toBuffer();
    cellBuffers.push(cell);

    let collar = null;
    if (role === "jiale") {
      const detected = await detectBlueAnchor(analysis);
      collar = {
        point: normalize([
          left + detected.point[0] - 40 - analysis.bounds.x,
          top + detected.point[1] - analysis.bounds.y,
        ], cellWidth, cellHeight),
        bluePixels: detected.bluePixels,
      };
    }

    const hand = frame.hand
      ? normalize([
          left + frame.hand[0] - analysis.bounds.x,
          top + frame.hand[1] - analysis.bounds.y,
        ], cellWidth, cellHeight)
      : null;

    manifestFrames.push({
      id: frame.id,
      source: frame.file,
      sourceSize: { width: analysis.width, height: analysis.height },
      contentBounds: analysis.bounds,
      cell: { x: (manifestFrames.length) * cellWidth, y: 0, width: cellWidth, height: cellHeight },
      anchors: {
        ground: normalize([cellWidth / 2, top + analysis.bounds.height], cellWidth, cellHeight),
        ...(hand ? { hand } : {}),
        ...(collar ? { collar: collar.point, collarBluePixels: collar.bluePixels } : {}),
      },
    });
  }

  const atlasWidth = cellWidth * frames.length;
  const atlasHeight = cellHeight;
  const composites = cellBuffers.map((input, index) => ({ input, left: index * cellWidth, top: 0 }));
  const desktopBuffer = await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ lossless: true })
    .toBuffer();

  const outputDirectory = path.join(OUTPUT_ROOT, directory);
  await mkdir(outputDirectory, { recursive: true });
  const desktopPath = path.join(outputDirectory, "desktop.webp");
  const mobilePath = path.join(outputDirectory, "mobile.webp");
  await writeFile(desktopPath, desktopBuffer);
  await sharp(desktopBuffer)
    .resize({ width: Math.round(atlasWidth * MOBILE_SCALE) })
    .webp({ lossless: true })
    .toFile(mobilePath);

  const desktopAudit = await analyzeOutput(desktopPath);
  const mobileAudit = await analyzeOutput(mobilePath);
  if (desktopAudit.edgeAlphaMax !== 0 || mobileAudit.edgeAlphaMax !== 0) {
    throw new Error(`${role} atlas edge is not transparent`);
  }

  const variants = {
    desktop: {
      src: publicUrl(desktopPath),
      dpr: display.desktopDpr,
      scale: 1,
      imageSize: { width: atlasWidth, height: atlasHeight },
      display: display.desktop,
      audit: desktopAudit,
    },
    mobile: {
      src: publicUrl(mobilePath),
      dpr: display.mobileDpr,
      scale: MOBILE_SCALE,
      imageSize: { width: Math.round(atlasWidth * MOBILE_SCALE), height: Math.round(atlasHeight * MOBILE_SCALE) },
      display: display.mobile,
      audit: mobileAudit,
    },
  };

  const roleManifest = {
    role,
    frameOrder: frames.map((frame) => frame.id),
    layout: "horizontal-strip",
    frameCount: frames.length,
    cellSize: { width: cellWidth, height: cellHeight },
    frames: manifestFrames,
    variants,
  };

  for (const [variantName, variant] of Object.entries(variants)) {
    const variantManifest = {
      ...roleManifest,
      variant: variantName,
      src: variant.src,
      dpr: variant.dpr,
      imageSize: variant.imageSize,
      display: variant.display,
    };
    await writeFile(
      path.join(outputDirectory, `${variantName}.motion.json`),
      `${JSON.stringify(variantManifest, null, 2)}\n`,
    );
  }

  return { roleManifest, inputAudits: analyses.map(({ analysis }) => auditSummary(analysis)) };
}

async function analyzeOutput(absolutePath) {
  const metadata = await sharp(absolutePath).metadata();
  const { data, info } = await sharp(absolutePath).raw().toBuffer({ resolveWithObject: true });
  const hasAlpha = info.channels === 4;
  let edgeAlphaMax = null;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (x !== 0 && y !== 0 && x !== info.width - 1 && y !== info.height - 1) continue;
      const alpha = hasAlpha ? data[(y * info.width + x) * info.channels + 3] : 255;
      edgeAlphaMax = Math.max(edgeAlphaMax ?? alpha, alpha);
    }
  }
  return {
    format: metadata.format,
    width: info.width,
    height: info.height,
    channels: info.channels,
    hasAlpha,
    edgeAlphaMax,
    bytes: metadata.size,
  };
}

const auditSummary = (analysis) => ({
  file: analysis.relativePath,
  format: analysis.format,
  width: analysis.width,
  height: analysis.height,
  channels: analysis.channels,
  hasAlpha: analysis.hasAlpha,
  edgeAlphaMax: analysis.edgeAlphaMax,
  contentBounds: analysis.bounds,
  opaquePixels: analysis.opaquePixels,
});

async function packSingle({ id, file, directory, cropToContent, display }) {
  const analysis = await analyzeImage(file);
  const outputDirectory = path.join(OUTPUT_ROOT, directory);
  await mkdir(outputDirectory, { recursive: true });
  const desktopPath = path.join(outputDirectory, "desktop.webp");
  const mobilePath = path.join(outputDirectory, "mobile.webp");
  let pipeline = sharp(analysis.absolutePath);
  if (cropToContent) {
    pipeline = pipeline.extract({
      left: analysis.bounds.x - PAD,
      top: analysis.bounds.y - PAD,
      width: analysis.bounds.width + PAD * 2,
      height: analysis.bounds.height + PAD * 2,
    });
  }
  await pipeline.webp({ lossless: true }).toFile(desktopPath);
  const desktopMetadata = await sharp(desktopPath).metadata();
  await sharp(desktopPath)
    .resize({ width: Math.round(desktopMetadata.width * MOBILE_SCALE) })
    .webp({ lossless: true })
    .toFile(mobilePath);

  return {
    id,
    source: file,
    inputAudit: auditSummary(analysis),
    variants: {
      desktop: { src: publicUrl(desktopPath), dpr: display.desktopDpr, display: display.desktop, audit: await analyzeOutput(desktopPath) },
      mobile: { src: publicUrl(mobilePath), dpr: display.mobileDpr, display: display.mobile, audit: await analyzeOutput(mobilePath) },
    },
  };
}

async function packBackground(file, name) {
  const analysis = await analyzeImage(file, { requireAlpha: false });
  const outputDirectory = path.join(OUTPUT_ROOT, "background");
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, `${name}.webp`);
  await sharp(analysis.absolutePath).webp({ quality: 92 }).toFile(outputPath);
  return {
    id: name,
    source: file,
    inputAudit: auditSummary(analysis),
    src: publicUrl(outputPath),
    audit: await analyzeOutput(outputPath),
  };
}

const person = await packAtlas({
  role: "person",
  frames: personFrames,
  directory: "person",
  display: {
    desktop: { heightVh: 58, groundOffsetVh: 8 },
    mobile: { heightVh: 48, groundOffsetVh: 7 },
    desktopDpr: 2,
    mobileDpr: 1,
  },
});

const jiale = await packAtlas({
  role: "jiale",
  frames: jialeFrames,
  directory: "jiale",
  display: {
    desktop: { heightVh: 26, groundOffsetVh: 8 },
    mobile: { heightVh: 22, groundOffsetVh: 7 },
    desktopDpr: 2,
    mobileDpr: 1,
  },
});

const ball = await packSingle({
  id: "yellow-ball",
  file: "props/yellow-ball-trimmed.png",
  directory: "props/yellow-ball",
  cropToContent: true,
  display: {
    desktop: { heightVh: 10 },
    mobile: { heightVh: 8.5 },
    desktopDpr: 2,
    mobileDpr: 1,
  },
});

const backgrounds = [
  await packBackground("background/grass-desktop-approved.png", "grass-desktop"),
  await packBackground("background/grass-mobile-approved.png", "grass-mobile"),
];

const manifest = {
  schemaVersion: 1,
  sourcePackage: "assets-master/intro-materials-harness-ready-2026-08-31.zip",
  identityReferences: {
    person: "reference/person-identity-reference-2026-08-14.png",
    jiale: "reference/dog-identity-reference-2026-08-14.png",
  },
  generatedAt: new Date().toISOString(),
  roles: {
    person: person.roleManifest,
    jiale: jiale.roleManifest,
    ball,
  },
  backgrounds,
  leash: {
    renderer: "svg",
    personAnchor: "hand",
    jialeAnchor: "collar",
    hiddenAfter: "fall-slide-right exit",
  },
  motionContract: {
    direction: "left-to-right-only",
    exitOrder: ["jiale", "person"],
    homeHandoffStartsAfter: "person fully exits right",
  },
};

await mkdir(QA_ROOT, { recursive: true });
await writeFile(path.join(OUTPUT_ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  path.join(QA_ROOT, "confirmed-materials-audit-2026-08-31.json"),
  `${JSON.stringify({
    sourceRoot: SOURCE_ROOT,
    generatedAt: manifest.generatedAt,
    inputs: [
      ...person.inputAudits,
      ...jiale.inputAudits,
      ball.inputAudit,
      ...backgrounds.map((background) => background.inputAudit),
    ],
    outputs: {
      person: person.roleManifest.variants,
      jiale: jiale.roleManifest.variants,
      ball: ball.variants,
      backgrounds,
    },
    identityCheck: {
      person: "manual-match: dark bucket hat, glasses, patterned short-sleeve shirt, dark blue shorts, dark shoes, white outline",
      jiale: "manual-match: white bichon, blue collar, white outline, right-facing run frames",
      orientation: "all dynamic poses face right",
    },
  }, null, 2)}\n`,
);

console.log(JSON.stringify({
  manifest: publicUrl(path.join(OUTPUT_ROOT, "manifest.json")),
  personDesktop: person.roleManifest.variants.desktop.src,
  personMobile: person.roleManifest.variants.mobile.src,
  jialeDesktop: jiale.roleManifest.variants.desktop.src,
  jialeMobile: jiale.roleManifest.variants.mobile.src,
  audit: "design-assets/intro/oil-motion/qa/confirmed-materials-audit-2026-08-31.json",
}, null, 2));
