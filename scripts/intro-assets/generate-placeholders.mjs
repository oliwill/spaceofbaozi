import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const root = resolve("public/assets/intro/placeholders");
const specs = {
  ballBounce: { path: "ball/ball-bounce.webp", width: 160, height: 160, color: "#D7AA3F", role: "ball", loop: true, displayWidthVh: 8, outlineRatio: 0.03 },
  dogRun: { path: "dog/dog-run-right.webp", width: 320, height: 240, color: "#3E91A8", role: "dog", loop: true, displayWidthVh: 23, outlineRatio: 0.035 },
  dogSettle: { path: "dog/dog-circle-settle.webp", width: 320, height: 240, color: "#3E91A8", role: "dog", loop: false, displayWidthVh: 23, outlineRatio: 0.035 },
  personRun: { path: "person/summer-pulled-run-right.webp", width: 384, height: 384, color: "#284D5B", role: "person", loop: true, displayWidthVh: 36, outlineRatio: 0.028 },
  personTrip: { path: "person/summer-trip-exit-right.webp", width: 384, height: 384, color: "#284D5B", role: "person", loop: false, displayWidthVh: 36, outlineRatio: 0.028 },
  personStand: { path: "person/summer-land-stand.webp", width: 384, height: 384, color: "#284D5B", role: "person", loop: false, displayWidthVh: 36, outlineRatio: 0.028 },
};

for (const [id, spec] of Object.entries(specs)) {
  const composites = [];
  for (let frame = 0; frame < 8; frame += 1) {
    const left = (frame % 4) * spec.width;
    const top = Math.floor(frame / 4) * spec.height;
    const body = spec.role === "ball"
      ? `<circle cx="${spec.width * 0.5}" cy="${spec.height * (0.61 + (frame % 2) * 0.03)}" r="${spec.width * (0.16 + (frame % 2) * 0.02)}" fill="${spec.color}" stroke="#FFFDF7" stroke-width="5"/>`
      : `<path d="M ${spec.width * 0.18} ${spec.height * 0.74} Q ${spec.width * 0.5} ${spec.height * (0.2 + (frame % 3) * 0.035)} ${spec.width * 0.82} ${spec.height * 0.74} Z" fill="${spec.color}" stroke="#FFFDF7" stroke-width="8"/>`;
    const marker = spec.role === "person"
      ? `<circle cx="${spec.width * 0.82}" cy="${spec.height * 0.43}" r="6" fill="#B8513D"/><text x="${spec.width * 0.66}" y="${spec.height * 0.36}" font-size="15" fill="#B8513D">hand</text>`
      : spec.role === "dog"
        ? `<circle cx="${spec.width * 0.72}" cy="${spec.height * 0.44}" r="6" fill="#B8513D"/><text x="${spec.width * 0.57}" y="${spec.height * 0.36}" font-size="15" fill="#B8513D">collar</text>`
        : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}">
      <line x1="0" y1="${spec.height * 0.92}" x2="${spec.width}" y2="${spec.height * 0.92}" stroke="#B8513D" stroke-width="2" stroke-dasharray="7 7"/>
      ${body}${marker}
      <text x="14" y="26" font-family="sans-serif" font-size="16" fill="#25231F">${id} · ${frame + 1}</text>
    </svg>`;
    composites.push({ input: Buffer.from(svg), left, top });
  }
  const output = resolve(root, spec.path);
  await mkdir(dirname(output), { recursive: true });
  await sharp({
    create: {
      width: spec.width * 4,
      height: spec.height * 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composites).webp({ lossless: true }).toFile(output);
}

const anchors = {
  person: { ground: [0.5, 0.92], center: [0.5, 0.5], hand: [0.82, 0.43] },
  dog: { ground: [0.5, 0.84], center: [0.5, 0.56], collar: [0.72, 0.44] },
  ball: { ground: [0.5, 0.82], center: [0.5, 0.5] },
};
const assets = Object.fromEntries(Object.entries(specs).map(([id, spec]) => [id, {
  src: `/assets/intro/placeholders/${spec.path}`,
  frames: 8,
  columns: 4,
  rows: 2,
  frameSize: { width: spec.width, height: spec.height },
  displayWidthVh: spec.displayWidthVh,
  loop: spec.loop,
  outlineRatio: spec.outlineRatio,
  anchors: Array.from({ length: 8 }, () => anchors[spec.role]),
}]));
await writeFile(resolve(root, "intro-manifest.json"), `${JSON.stringify({ version: 1, mode: "placeholder", fps: 9, assets, fallback: "" }, null, 2)}\n`);
console.log(`generated ${Object.keys(specs).length} explicit debug sprite sheets`);
