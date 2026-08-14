import { cp, mkdir, readFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const incoming = resolve("design-assets/intro/incoming-production");
const manifest = JSON.parse(await readFile(resolve(incoming, "intro-manifest.json"), "utf8"));
if (manifest.mode !== "production") throw new Error("incoming manifest must use production mode");

const visualQa = JSON.parse(await readFile(resolve("design-assets/intro/qa/visual-qa.json"), "utf8"));
const requiredAssets = ["ballBounce", "dogRun", "dogSettle", "personRun", "personTrip", "personStand"];
if (requiredAssets.some((id) => visualQa[id] !== true)) throw new Error("all six visual QA checks must pass before publication");

const grassQa = JSON.parse(await readFile(resolve("design-assets/intro/qa/environment/grass-selection-audit.json"), "utf8"));
if (grassQa.variants?.C2?.selected !== true || grassQa.variants.C2.pass !== true || grassQa.pass !== true) {
  throw new Error("C2 grass selection QA must pass before publication");
}
if (manifest.environment?.grass?.selectedVariant !== "C2") throw new Error("incoming manifest must select C2 grass");

const runtimeFiles = [
  "intro-manifest.json",
  "intro-final-still.webp",
  "ball/ball-bounce.webp",
  "dog/dog-run-right.webp",
  "environment/intro-grass.webp",
  "dog/dog-circle-settle.webp",
  "person/summer-pulled-run-right.webp",
  "person/summer-trip-exit-right.webp",
  "person/summer-land-stand.webp",
];
const production = resolve("public/assets/intro/production");
const staging = resolve("public/assets/intro/.production-next");
const previous = resolve("public/assets/intro/.production-previous");
await rm(staging, { recursive: true, force: true });
for (const relativePath of runtimeFiles) {
  const destination = resolve(staging, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(incoming, relativePath), destination);
}
await rm(previous, { recursive: true, force: true });
try {
  await rename(production, previous);
} catch (error) {
  if (error instanceof Error && "code" in error && error.code !== "ENOENT") throw error;
}
try {
  await rename(staging, production);
  await rm(previous, { recursive: true, force: true });
} catch (error) {
  await rename(previous, production).catch(() => undefined);
  throw error;
}
console.log("published audited production intro assets atomically");
