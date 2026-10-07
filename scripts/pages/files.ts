import { lstat, readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { sha256 } from '../publishing/audit-dist';

const excluded = new Set(['node_modules', 'dist', '.git', '.astro', '.cache', '.vite', '.local-config', '.config', '.home', '.tmp', '.local', '.superpowers', '.codex', '.aws', '.agents', '.bun', '.wrangler', '.vscode', '.idea', '.od-skills', '.mimosa', '.video_agent', '.workbuddy', 'private', '.private', 'fonts-src', 'assets-master', 'jimeng', 'screenshot', 'output', 'test-results', 'playwright-report', 'coverage', '_handoff', 'design-assets', 'projects-evidence', '__pycache__', '.DS_Store']);
export function sourcePathAllowed(path: string): boolean {
  return !path.split(/[\\/]/).some(part => excluded.has(part) || part.startsWith('.env') || part.startsWith('.dev.vars') || part.startsWith('.tmp-') || part.startsWith('.chrome-') || part.endsWith('-posts'));
}
export async function inventory(root: string, source = false): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  async function walk(directory: string): Promise<void> {
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name), key = relative(root, path).split(sep).join('/');
      if (source && !sourcePathAllowed(key)) continue;
      const stat = await lstat(path);
      if (stat.isSymbolicLink() || !stat.isDirectory() && !stat.isFile()) throw new Error(`Unsafe source/output entry: ${key}`);
      if (stat.isDirectory()) await walk(path); else files[key] = sha256(await readFile(path));
    }
  }
  await walk(root); return files;
}
export const identity = (files: Record<string, string>): string => sha256(JSON.stringify(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))));
