import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { normalizeBase } from '../../src/lib/site/paths';

const directory = process.env.PAGES_DIST;
if (!directory) throw new Error('PAGES_DIST is required');
const root = await realpath(resolve(directory));
const base = normalizeBase(process.env.PAGES_BASE ?? '/');
const port = Number(process.env.PAGES_PORT ?? 4460);
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  try {
    if (!['GET', 'HEAD'].includes(request.method ?? '')) { response.writeHead(405).end(); return; }
    const rawPath = (request.url ?? '/').split(/[?#]/)[0];
    if (/%2f|%5c|%25|\\/i.test(rawPath)) { response.writeHead(400).end(); return; }
    const pathname = decodeURIComponent(rawPath);
    if (pathname.split('/').some(part => part === '.' || part === '..') || /[\u0000-\u001f]/.test(pathname)) { response.writeHead(400).end(); return; }
    if (base && pathname !== base && !pathname.startsWith(base + '/')) { response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Outside artifact mount'); return; }
    const logical = pathname.slice(base.length) || '/';
    let file = join(root, logical), status = 200;
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const actual = await realpath(file);
      if (!actual.startsWith(root + sep) || !(await stat(actual)).isFile()) throw new Error('Unsafe static entry');
      file = actual;
    } catch { file = join(root, '404.html'); status = 404; }
    const bytes = await readFile(file);
    response.writeHead(status, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Length': bytes.length });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(400).end('Invalid request'); }
}).listen(port, '127.0.0.1', () => console.log(`Serving ${root} at http://127.0.0.1:${port}${base}/`));
