import { createHash } from 'node:crypto';
import { assertScope, assertSha, snapshotFromDocuments, type Scope, type ContentSnapshot } from './content-snapshot';
export interface Reader { get(path: string): Promise<unknown>; list(path: string): Promise<unknown[]> }
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-api-record');
  return value as Record<string, unknown>;
}
export class GitHubReader implements Reader {
  private prefix: string;
  constructor(scope: Scope, private token: string, private request: typeof fetch = fetch) {
    assertScope(scope); this.prefix = `/repos/${scope.repository}/`;
    if (!token) throw new Error('missing-read-token');
  }
  private url(path: string): URL {
    if (!path.startsWith(this.prefix) || /[\\\u0000-\u001f]/.test(path) || path.includes('%') || path.split(/[/?]/).some(p => p === '..' || p === '.')) throw new Error('unsafe-api-path');
    const url = new URL(path, 'https://api.github.com');
    if (url.origin !== 'https://api.github.com' || !url.pathname.startsWith(this.prefix) || url.hash) throw new Error('unsafe-api-url');
    return url;
  }
  private async response(path: string): Promise<Response> {
    const url = this.url(path);
    const response = await this.request(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000), headers: {
      Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
    } });
    if (!response.ok) throw new Error(`github-read-failed-${response.status}`);
    return response;
  }
  async get(path: string): Promise<unknown> { return (await this.response(path)).json(); }
  async list(path: string): Promise<unknown[]> {
    const initial = this.url(path); const visited = new Set<string>(); const result: unknown[] = [];
    let next: string | undefined = path;
    while (next) {
      const url = this.url(next);
      if (visited.has(url.href) || visited.size >= 100) throw new Error('incomplete-pagination');
      visited.add(url.href);
      const response = await this.response(next); const body: unknown = await response.json();
      if (!Array.isArray(body)) throw new Error('invalid-api-list');
      result.push(...body); next = undefined;
      const link = response.headers.get('link');
      if (link) {
        const entries = link.split(',').map(part => part.trim());
        for (const entry of entries) {
          const match = /^<([^>]+)>;\s*rel="([a-z]+)"$/.exec(entry);
          if (!match) throw new Error('invalid-pagination-link');
          if (match[2] !== 'next') continue;
          const target = new URL(match[1]);
          if (next || target.origin !== initial.origin || target.username || target.password || target.pathname !== initial.pathname || target.hash) throw new Error('unsafe-pagination');
          for (const [key, value] of initial.searchParams) if (key !== 'page' && target.searchParams.get(key) !== value) throw new Error('pagination-scope-changed');
          for (const key of target.searchParams.keys()) if (key !== 'page' && !initial.searchParams.has(key)) throw new Error('pagination-scope-changed');
          if (visited.has(target.href)) throw new Error('incomplete-pagination');
          next = target.pathname + target.search;
        }
      }
    }
    return result;
  }
}
export interface Initialization { snapshot: ContentSnapshot; digest: string; approval: string }
export interface Baseline extends Scope {
  kind: 'deployment' | 'initialization'; sourceSha: string; identity: string; deploymentId?: number; statusId?: number;
}
function numericId(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw new Error('invalid-record-id');
  return Number(value);
}
function statusTime(value: unknown): number {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error('invalid-status-time');
  return Date.parse(value);
}
export async function resolveBaseline(scope: Scope, reader: Reader, init?: Initialization): Promise<Baseline> {
  assertScope(scope); const prefix = `/repos/${scope.repository}`;
  const deployments = (await reader.list(`${prefix}/deployments?environment=github-pages&per_page=100`)).map(record);
  const successes: { id: number; statusId: number; sha: string; time: number }[] = [];
  const successfulHistory: { deploymentId: number; time: number }[] = [];
  const ids = new Set<number>(); let historicalSuccess = false;
  for (const deployment of deployments) {
    const id = numericId(deployment.id);
    if (ids.has(id)) throw new Error('duplicate-deployment-record'); ids.add(id);
    const ref = String(deployment.ref).startsWith('refs/heads/') ? deployment.ref : `refs/heads/${deployment.ref}`;
    if (deployment.environment !== scope.environment || ref !== scope.ref) throw new Error('deployment-scope-mismatch');
    const sha = String(deployment.sha); assertSha(sha);
    const statuses = (await reader.list(`${prefix}/deployments/${id}/statuses?per_page=100`)).map(record)
      .map(s => ({ id: numericId(s.id), state: String(s.state), time: statusTime(s.created_at) })).sort((x, y) => y.time - x.time || y.id - x.id);
    if (!statuses.length || new Set(statuses.map(s => s.id)).size !== statuses.length) throw new Error('missing-or-conflicting-status');
    for (const status of statuses.filter(s => s.state === 'success')) {
      historicalSuccess = true;
      successfulHistory.push({ deploymentId: id, time: status.time });
    }
    const latest = statuses[0];
    if (latest.state === 'success') successes.push({ id, statusId: latest.id, sha, time: latest.time });
    else if (!['error', 'failure', 'pending', 'queued', 'in_progress', 'inactive'].includes(latest.state)) throw new Error('unknown-deployment-status');
    else if (latest.state === 'inactive') historicalSuccess = true;
  }
  successes.sort((x, y) => y.time - x.time);
  if (!successes.length) {
    if (historicalSuccess) throw new Error('serving-provenance-unavailable');
    if (!init) throw new Error('initialization-required');
    assertScope(init.snapshot); assertSha(init.snapshot.sourceSha);
    if (!init.approval.trim() || init.snapshot.repository !== scope.repository || init.snapshot.ref !== scope.ref || init.snapshot.environment !== scope.environment ||
      createHash('sha256').update(JSON.stringify(init.snapshot)).digest('hex') !== init.digest) throw new Error('invalid-initialization');
    return { ...scope, kind: 'initialization', sourceSha: init.snapshot.sourceSha, identity: `initialization:${init.digest}:${init.approval}` };
  }
  const winner = successes[0];
  if (successfulHistory.some(status => status.deploymentId !== winner.id && status.time >= winner.time)) throw new Error('successful-history-provenance-unresolved');
  if (successes[1]?.time === winner.time || deployments.filter(d => d.sha === winner.sha).length !== 1) throw new Error('ambiguous-pages-provenance');
  const pages = record(await reader.get(`${prefix}/pages/deployments/${winner.sha}`));
  if (pages.status !== 'succeed' || ('sha' in pages && pages.sha !== winner.sha)) throw new Error('pages-success-unverified');
  return { ...scope, kind: 'deployment', sourceSha: winner.sha, deploymentId: winner.id, statusId: winner.statusId, identity: `deployment:${winner.id}:${winner.statusId}:${winner.sha}` };
}
export async function readSourceSnapshot(scope: Scope, sha: string, reader: Reader): Promise<ContentSnapshot> {
  assertScope(scope); assertSha(sha); const prefix = `/repos/${scope.repository}/git`;
  const commit = record(await reader.get(`${prefix}/commits/${sha}`));
  if (commit.sha !== sha) throw new Error('source-commit-mismatch');
  const treeSha = String(record(commit.tree).sha); assertSha(treeSha);
  const tree = record(await reader.get(`${prefix}/trees/${treeSha}?recursive=1`));
  if (tree.sha !== treeSha || tree.truncated !== false || !Array.isArray(tree.tree)) throw new Error('incomplete-source-tree');
  const documents: Record<string, string> = {};
  for (const raw of tree.tree) {
    const item = record(raw); const path = String(item.path);
    if (!path.startsWith('src/content/blog/')) continue;
    if (item.type === 'tree') continue;
    if (item.mode !== '100644' || item.type !== 'blob') throw new Error('unsupported-content-object');
    if (!/\.mdx?$/.test(path)) continue;
    if (path in documents) throw new Error('duplicate-content-path');
    const blobSha = String(item.sha); assertSha(blobSha);
    const blob = record(await reader.get(`${prefix}/blobs/${blobSha}`));
    if (blob.sha !== blobSha || blob.encoding !== 'base64' || typeof blob.content !== 'string' || blob.content.length > 4_000_000 || !/^[A-Za-z0-9+/=\r\n]*$/.test(blob.content)) throw new Error('invalid-content-blob');
    documents[path] = Buffer.from(blob.content, 'base64').toString('utf8');
  }
  return snapshotFromDocuments({ ...scope, sourceSha: sha }, documents);
}
