import { lstat, readFile, realpath, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { sha256 } from './audit-dist';
import inventory from './publication-files.json';

async function optionalStat(path: string) {
  try { return await lstat(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}
export async function cleanBuildMetadata(directory: string): Promise<string[]> {
  const root = resolve(directory), rootStat = await lstat(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory() || await realpath(root) !== root) throw new Error('unsafe-metadata-root');
  const approved: string[] = [];
  for (const [path, digest] of Object.entries(inventory.generatedFiles)) {
    const target = join(root, path);
    for (let ancestor = dirname(target); ancestor !== root; ancestor = dirname(ancestor)) {
      const stat = await optionalStat(ancestor);
      if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) throw new Error(`unsafe-metadata-ancestor: ${path}`);
    }
    const stat = await optionalStat(target);
    if (!stat) continue;
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error(`unsafe-metadata-file: ${path}`);
    if (sha256(await readFile(target)) !== digest) throw new Error(`changed-build-metadata: ${path}`);
    approved.push(path);
  }
  for (const path of approved) await unlink(join(root, path));
  return approved;
}
