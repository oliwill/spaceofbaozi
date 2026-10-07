import { cp, lstat, mkdir, readlink, readdir, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionPolicy } from '../publishing/publication-policy';
import { inventory, identity, sourcePathAllowed } from './files';
import { writeFixtures } from './fixture-data';

const root = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
const [target, timestamp] = process.argv.slice(2);
if (!target || !isAbsolute(target) || !timestamp) throw new Error('Usage: bun scripts/pages/prepare-fixtures.ts /absolute/fresh-output ISO-date');
const output = resolve(target), parent = await realpath(resolve(output, '..')), now = new Date(timestamp);
if (!Number.isFinite(+now) || output === root || output.startsWith(root + sep) || parent === root || parent.startsWith(root + sep)) throw new Error('Invalid fixture destination or time');
await mkdir(output);
const staging = join(output, 'source'), before = await inventory(root, true);
await writeFile(join(output, 'source-before.json'), JSON.stringify(before, null, 2));
const policy = await productionPolicy(root, now);
await cp(root, staging, { recursive: true, filter: path => sourcePathAllowed(relative(root, path)) });
const dependencies = join(root, 'node_modules');
if ((await lstat(dependencies)).isSymbolicLink()) throw new Error('Dependencies must be a real local directory');
async function checkLinks(directory: string): Promise<void> {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isSymbolicLink()) {
      const destination = await realpath(path), link = await readlink(path);
      if (isAbsolute(link) || !destination.startsWith(dependencies + sep)) throw new Error('Dependency link escapes local frozen tree');
    } else if (item.isDirectory()) await checkLinks(path);
  }
}
await checkLinks(dependencies);
await cp(dependencies, join(staging, 'node_modules'), { recursive: true, verbatimSymlinks: true });
const cloned = await inventory(staging, true);
if (identity(cloned) !== identity(before)) throw new Error('Staging source copy differs');
const fixtures = await writeFixtures(staging, now);
policy.htmlRoutes = [...new Set([...policy.htmlRoutes.filter(route => !route.startsWith('/media/')), ...fixtures.routes])];
Object.assign(policy.publicFiles, fixtures.publicFiles);
await writeFile(join(output, 'fixture-policy.json'), JSON.stringify(policy, null, 2) + '\n');
const after = await inventory(root, true), staged = await inventory(staging, true);
await writeFile(join(output, 'source-after.json'), JSON.stringify(after, null, 2));
await writeFile(join(output, 'staged-source.json'), JSON.stringify(staged, null, 2));
const sourceUnchanged = identity(before) === identity(after);
const manifest = { synthetic: true, root, staging, now: now.toISOString(), sourceIdentity: identity(before), stagedIdentity: identity(staged), sourceUnchanged, ...fixtures, policy: join(output, 'fixture-policy.json') };
await writeFile(join(output, 'fixture-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
if (!sourceUnchanged) throw new Error('Original source changed during preparation');
console.log(JSON.stringify({ output, sourceUnchanged, assets: Object.keys(fixtures.assets).length, year: fixtures.year, staging }));
