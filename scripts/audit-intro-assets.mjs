import { access, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve('public/assets/intro');
const expected = [
  'ball/ball-bounce.webp',
  'dog/dog-run-right.webp',
  'dog/dog-circle-settle.webp',
  'person/summer-pulled-run-right.webp',
  'person/summer-trip-exit-right.webp',
  'person/summer-land-stand.webp',
];

const results = [];

for (const relativePath of expected) {
  const absolutePath = resolve(root, relativePath);
  const result = { path: relativePath, pass: false, errors: [] };
  try {
    await access(absolutePath);
    const image = sharp(absolutePath);
    const metadata = await image.metadata();
    const stats = await image.stats();
    result.width = metadata.width;
    result.height = metadata.height;
    result.size = (await stat(absolutePath)).size;
    if (!metadata.hasAlpha) result.errors.push('missing real alpha channel');
    if (!metadata.width || metadata.width % 4 !== 0) result.errors.push('width is not divisible by 4');
    if (!metadata.height || metadata.height % 2 !== 0) result.errors.push('height is not divisible by 2');
    const alpha = stats.channels.at(-1);
    if (metadata.hasAlpha && alpha && alpha.min > 8) result.errors.push('background is not transparent');
    result.pass = result.errors.length === 0;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }
  results.push(result);
}

const totalBytes = results.reduce((sum, item) => sum + (item.size ?? 0), 0);
if (totalBytes > 6 * 1024 * 1024) {
  results.push({ path: '__total__', pass: false, errors: [`payload ${totalBytes} exceeds 6 MB`] });
}

const report = { generatedAt: new Date().toISOString(), totalBytes, results };
await mkdir(dirname(resolve(root, 'audit-report.json')), { recursive: true });
await writeFile(resolve(root, 'audit-report.json'), JSON.stringify(report, null, 2));

if (results.some((item) => !item.pass)) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
