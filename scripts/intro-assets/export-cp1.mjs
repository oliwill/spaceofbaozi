import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "design-assets/intro/cp1");
const FRAME_DIR = path.join(OUT, "frames");
const REF_DIR = path.join(OUT, "reference");
const REVIEW_DIR = path.join(OUT, "review-only");
const BASE_URL = process.env.BAOZI_CAPTURE_URL ?? "http://127.0.0.1:4322/lab/home-v2";

const COLORS = {
  grid: "#EEF0EA",
  dot: "rgba(63,78,82,0.14)",
  paper: "#FFFDF7",
  indigo: "#284D5B",
  mustard: "#D7AA3F",
};

const targets = [
  { id: "desktop", width: 1440, height: 900, grid: 24 },
  { id: "mobile", width: 390, height: 844, grid: 18 },
];

function svg(width, height, body) {
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);
}

function dottedPaper(width, height, spacing) {
  return svg(width, height, `
    <rect width="100%" height="100%" fill="${COLORS.grid}"/>
    <defs><pattern id="dots" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1" fill="${COLORS.dot}"/></pattern></defs>
    <rect width="100%" height="100%" fill="url(#dots)"/>
  `);
}

async function extractCell(file, cellWidth, cellHeight, column, row) {
  return sharp(file).extract({ left: column * cellWidth, top: row * cellHeight, width: cellWidth, height: cellHeight }).png().toBuffer();
}


async function createStyleReference() {
  const width = 2400;
  const height = 1400;
  const grassSource = path.join(ROOT, "public/assets/intro/production/environment/intro-grass.webp");
  const personCell = await extractCell(path.join(ROOT, "public/assets/orbit/runtime/person-look-12dir.webp"), 384, 342, 0, 0);
  const dogCell = await extractCell(path.join(ROOT, "public/assets/orbit/runtime/dog-orbit-run-8dir-4f.webp"), 256, 192, 0, 2);
  const grass = await sharp(grassSource).resize(2400, 600, { fit: "fill" }).png().toBuffer();
  const person = await sharp(personCell).resize(500, 445).png().toBuffer();
  const dog = await sharp(dogCell).resize(360, 270).png().toBuffer();
  const swatches = ["#EEF0EA", "#FFFDF7", "#839260", "#69784F", "#284D5B", "#D7AA3F"]
    .map((color, index) => `<rect x="${1040 + index * 190}" y="170" width="140" height="140" rx="8" fill="${color}" stroke="rgba(37,35,31,.15)"/>`)
    .join("");
  const overlay = svg(width, height, `
    <rect width="100%" height="100%" fill="${COLORS.grid}"/>
    <defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1" fill="${COLORS.dot}"/></pattern></defs>
    <rect width="100%" height="100%" fill="url(#dots)"/>
    <rect x="80" y="80" width="840" height="420" fill="${COLORS.paper}" filter="drop-shadow(0 8px 20px rgba(46,48,42,.08))"/>
    ${swatches}
  `);
  await sharp(overlay)
    .composite([
      { input: grass, left: 0, top: 800 },
      { input: person, left: 360, top: 280 },
      { input: dog, left: 680, top: 450 },
    ])
    .png()
    .toFile(path.join(REF_DIR, "style-reference.png"));
}

async function createFirstFrame(target) {
  const grassHeight = Math.round(target.height * (target.id === "desktop" ? 0.25 : 0.25));
  const grassWidth = grassHeight * 4;
  const resized = sharp(path.join(ROOT, "public/assets/intro/production/environment/intro-grass.webp")).resize(grassWidth, grassHeight, { fit: "fill" });
  const grass = grassWidth > target.width
    ? await resized.extract({ left: Math.round((grassWidth - target.width) / 2), top: 0, width: target.width, height: grassHeight }).png().toBuffer()
    : await resized.png().toBuffer();
  const left = grassWidth > target.width ? 0 : Math.round((target.width - grassWidth) / 2);
  await sharp(dottedPaper(target.width, target.height, target.grid))
    .composite([{ input: grass, left, top: target.height - grassHeight }])
    .png()
    .toFile(path.join(FRAME_DIR, `intro-first-${target.id}.png`));
}


function normalizePoint(point, width, height) {
  return {
    px: point.map((value) => Number(value.toFixed(3))),
    normalized: [Number((point[0] / width).toFixed(6)), Number((point[1] / height).toFixed(6))],
  };
}

async function rawDiff(fullPath, capturePath, allowedRects) {
  const full = await sharp(fullPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const capture = await sharp(capturePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (full.info.width !== capture.info.width || full.info.height !== capture.info.height) throw new Error("capture dimensions differ");
  let changed = 0;
  let outside = 0;
  for (let y = 0; y < full.info.height; y += 1) {
    for (let x = 0; x < full.info.width; x += 1) {
      const offset = (y * full.info.width + x) * 3;
      const differs = full.data[offset] !== capture.data[offset] || full.data[offset + 1] !== capture.data[offset + 1] || full.data[offset + 2] !== capture.data[offset + 2];
      if (!differs) continue;
      changed += 1;
      const allowed = allowedRects.some((rect) => x >= Math.floor(rect.x) - 1 && x < Math.ceil(rect.x + rect.width) + 1 && y >= Math.floor(rect.y) - 1 && y < Math.ceil(rect.y + rect.height) + 1);
      if (!allowed) outside += 1;
    }
  }
  return { changedPixels: changed, changedOutsideUiRegions: outside };
}

async function sha256(file) {
  const data = await sharp(file).toBuffer();
  return createHash("sha256").update(data).digest("hex");
}


await Promise.all([
  mkdir(FRAME_DIR, { recursive: true }),
  mkdir(REF_DIR, { recursive: true }),
  mkdir(REVIEW_DIR, { recursive: true }),
]);
await sharp(path.join(ROOT, "design-assets/intro/reference/model-sheets/person-summer-model-sheet.png"))
  .resize({ width: 2400, withoutEnlargement: false })
  .png()
  .toFile(path.join(REF_DIR, "person-reference.png"));
await sharp(path.join(ROOT, "design-assets/intro/reference/model-sheets/dog-model-sheet.png"))
  .resize({ width: 2400, withoutEnlargement: false })
  .png()
  .toFile(path.join(REF_DIR, "jiale-reference.png"));
await createStyleReference();
await Promise.all(targets.map(createFirstFrame));

const browser = await chromium.launch({ headless: true });
const captures = {};
for (const target of targets) {
  const context = await browser.newContext({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const fullPath = path.join(REVIEW_DIR, `home-v2-composite-${target.id}.png`);
  const capturePath = path.join(FRAME_DIR, `handoff-final-${target.id}.png`);
  await page.goto(`${BASE_URL}?capture=review`, { waitUntil: "networkidle" });
  await page.screenshot({ path: fullPath, type: "png", fullPage: false });
  const fullMetrics = await page.evaluate(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height };
    };
    return {
      paper: rect(".home-v2__paper"),
      portrait: rect(".home-v2__portrait"),
      person: rect(".home-v2__person"),
      jiale: rect(".home-v2__dog"),
      jialeShadow: rect(".home-v2__dog-shadow"),
      nextSection: rect(".home-v2__blog-peek"),
      uiRegions: [rect(".home-v2__header"), rect(".home-v2__identity"), rect(".home-v2__blog-peek")],
      dotGridOrigin: [0, 0],
      dotGridSpacing: Number.parseFloat(getComputedStyle(document.querySelector(".home-v2")).backgroundSize),
    };
  });
  await page.goto(`${BASE_URL}?capture=video-plate`, { waitUntil: "networkidle" });
  const captureMetrics = await page.evaluate(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height };
    };
    const hidden = [".home-v2__header", ".home-v2__identity", ".home-v2__blog-peek > *"].every((selector) => [...document.querySelectorAll(selector)].every((element) => getComputedStyle(element).visibility === "hidden"));
    return {
      hidden,
      paper: rect(".home-v2__paper"),
      portrait: rect(".home-v2__portrait"),
      person: rect(".home-v2__person"),
      jiale: rect(".home-v2__dog"),
      jialeShadow: rect(".home-v2__dog-shadow"),
      nextSection: rect(".home-v2__blog-peek"),
    };
  });
  await page.screenshot({ path: capturePath, type: "png", fullPage: false });
  const stableKeys = ["paper", "portrait", "person", "jiale", "jialeShadow", "nextSection"];
  const stableGeometry = stableKeys.every((key) => JSON.stringify(fullMetrics[key]) === JSON.stringify(captureMetrics[key]));
  const diff = await rawDiff(fullPath, capturePath, fullMetrics.uiRegions);
  const personFootPivot = [captureMetrics.person.x + captureMetrics.person.width / 2, captureMetrics.person.y + captureMetrics.person.height];
  const jialeCenter = [captureMetrics.jiale.x + captureMetrics.jiale.width / 2, captureMetrics.jiale.y + captureMetrics.jiale.height / 2];
  const jialeFootPivot = [captureMetrics.jiale.x + captureMetrics.jiale.width / 2, captureMetrics.jiale.y + captureMetrics.jiale.height];
  captures[target.id] = {
    viewport: { width: target.width, height: target.height },
    dotGridOrigin: normalizePoint(fullMetrics.dotGridOrigin, target.width, target.height),
    dotGridSpacing: { px: fullMetrics.dotGridSpacing, normalized: Number((fullMetrics.dotGridSpacing / target.width).toFixed(6)) },
    personFootPivot: normalizePoint(personFootPivot, target.width, target.height),
    jialeCenter: normalizePoint(jialeCenter, target.width, target.height),
    jialeFootPivot: normalizePoint(jialeFootPivot, target.width, target.height),
    nextSectionTop: { px: captureMetrics.nextSection.y, normalized: Number((captureMetrics.nextSection.y / target.height).toFixed(6)) },
    stableGeometry,
    uiHidden: captureMetrics.hidden,
    diff,
  };
  await context.close();
}
await browser.close();

const files = [
  ...targets.flatMap((target) => [path.join(FRAME_DIR, `intro-first-${target.id}.png`), path.join(FRAME_DIR, `handoff-final-${target.id}.png`)]),
  path.join(REF_DIR, "person-reference.png"),
  path.join(REF_DIR, "jiale-reference.png"),
  path.join(REF_DIR, "style-reference.png"),
];
const audit = {};
for (const file of files) {
  const metadata = await sharp(file).metadata();
  const stats = await sharp(file).stats();
  audit[path.relative(OUT, file).replaceAll("\\", "/")] = {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha,
    alphaMin: metadata.hasAlpha ? stats.channels[3].min : null,
    alphaMax: metadata.hasAlpha ? stats.channels[3].max : null,
    sha256: await sha256(file),
  };
}

const report = {
  version: 2,
  status: Object.values(captures).every((item) => item.stableGeometry && item.uiHidden && item.diff.changedOutsideUiRegions === 0) ? "passed" : "failed",
  captures,
  assets: audit,
};
if (report.status !== "passed") throw new Error(`Home v2 capture audit failed: ${JSON.stringify(captures)}`);
await writeFile(path.join(OUT, "handoff-coordinates.json"), `${JSON.stringify({ version: 2, status: "frozen", ...captures }, null, 2)}\n`);
await writeFile(path.join(OUT, "harness-cp1-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, outputs: files.map((file) => path.relative(ROOT, file)), captures }, null, 2));
