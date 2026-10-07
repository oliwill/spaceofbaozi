import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { GitHubReader, resolveBaseline, readSourceSnapshot, type Reader } from '../../scripts/publishing/deployment-baseline';
import { checkRunCurrent } from '../../scripts/publishing/check-run-current';
import { snapshotFromDocuments } from '../../scripts/publishing/content-snapshot';
const scope = { repository: 'owner/site', ref: 'refs/heads/main', environment: 'github-pages' as const };
const a = 'a'.repeat(40), b = 'b'.repeat(40);
const prefix = '/repos/owner/site';
const deployment = (id = 1, sha = a, extra = {}) => ({ id, sha, ref: 'main', environment: 'github-pages', ...extra });
const status = (state = 'success', id = 11, date = '2026-10-06T00:00:00Z') => ({ id, state, created_at: date });
function reader(records = [deployment()], statuses: Record<number, unknown[]> = { 1: [status()] }, pages = { status: 'succeed' }): Reader {
  return {
    async list(path) { if (path.includes('/statuses')) return statuses[Number(path.split('/').at(-2))] ?? []; return records; },
    async get(path) { if (path.includes('/pages/deployments/')) { expect(path).toBe(`${prefix}/pages/deployments/${a}`); return pages; } throw new Error('unreadable'); },
  };
}
describe('verified Pages baseline', () => {
  it('cross-checks generic success with Pages succeed by source SHA', async () => expect(await resolveBaseline(scope, reader())).toMatchObject({ sourceSha: a, deploymentId: 1, statusId: 11, kind: 'deployment' }));
  it('ignores newer failed and pending attempts; completion order wins over array order', async () => {
    expect(await resolveBaseline(scope, reader([deployment(2, b), deployment()], { 1: [status()], 2: [status('failure', 22, '2026-10-06T01:00:00Z')] }))).toMatchObject({ sourceSha: a });
    expect(await resolveBaseline(scope, reader([deployment(2, b), deployment()], { 1: [status()], 2: [status('queued')] }))).toMatchObject({ sourceSha: a });
  });
  it.each(['inactive', 'failure', 'error', 'pending', 'queued', 'in_progress'])('rejects older A when newer B succeeded before becoming %s', async state => {
    const api = reader([deployment(), deployment(2, b)], {
      1: [status('success', 11, '2026-10-01T00:00:00Z')],
      2: [status(state, 22, '2026-10-03T00:00:00Z'), status('success', 21, '2026-10-02T00:00:00Z')],
    });
    await expect(resolveBaseline(scope, api)).rejects.toThrow('successful-history-provenance-unresolved');
  });
  it.each(['inactive', 'failure'])('allows newer verified success when an older successful source later becomes %s', async state => {
    const api = reader([deployment(2, b), deployment()], {
      1: [status('success', 11, '2026-10-02T00:00:00Z')],
      2: [status(state, 22, '2026-10-03T00:00:00Z'), status('success', 21, '2026-10-01T00:00:00Z')],
    });
    expect(await resolveBaseline(scope, api)).toMatchObject({ sourceSha: a, deploymentId: 1 });
  });
  it('rejects tied successful history even when one record is now inactive', async () => {
    await expect(resolveBaseline(scope, reader([deployment(), deployment(2, b)], {
      1: [status()], 2: [status('inactive', 22, '2026-10-07T00:00:00Z'), status('success', 21)],
    }))).rejects.toThrow('successful-history-provenance-unresolved');
  });
  it.each(['success', 'failed', 'queued'])('rejects Pages status %s', async state => expect(resolveBaseline(scope, reader(undefined, undefined, { status: state }))).rejects.toThrow());
  it.each([{ ref: 'other' }, { ref: a }, { environment: 'preview' }, { sha: 'oops' }])('rejects wrong deployment provenance %j', async extra => expect(resolveBaseline(scope, reader([deployment(1, a, extra)]))).rejects.toThrow());
  it.each(['inactive', 'unknown'])('does not promote %s status', async state => expect(resolveBaseline(scope, reader(undefined, { 1: [status(state)] }))).rejects.toThrow());
  it('rejects repeated SHA attempts and tied competing successful records', async () => {
    await expect(resolveBaseline(scope, reader([deployment(), deployment(2)], { 1: [status()], 2: [status('failure')] }))).rejects.toThrow();
    await expect(resolveBaseline(scope, reader([deployment(), deployment(2, b)], { 1: [status()], 2: [status()] }))).rejects.toThrow();
  });
  it('takes latest status, never a stale historical success', async () => expect(resolveBaseline(scope, reader(undefined, { 1: [status(), status('inactive', 12, '2026-10-07T00:00:00Z')] }))).rejects.toThrow());
  it('requires explicit separately approved digest-bound initialization; verified success wins', async () => {
    const snapshot = snapshotFromDocuments({ ...scope, sourceSha: b }, {});
    const init = { snapshot, digest: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'), approval: 'review-123' };
    expect(await resolveBaseline(scope, reader([]), init)).toMatchObject({ kind: 'initialization', sourceSha: b });
    await expect(resolveBaseline(scope, reader([]))).rejects.toThrow('initialization-required');
    await expect(resolveBaseline(scope, reader([]), { ...init, digest: 'bad' })).rejects.toThrow();
    await expect(resolveBaseline(scope, reader([]), { ...init, approval: '' })).rejects.toThrow();
    await expect(resolveBaseline({ ...scope, repository: 'different/site' }, reader([]), init)).rejects.toThrow();
    expect(await resolveBaseline(scope, reader(), init)).toMatchObject({ kind: 'deployment', sourceSha: a });
    await expect(resolveBaseline(scope, { ...reader([]), list: async () => { throw new Error('api-failure'); } }, init)).rejects.toThrow('api-failure');
  });
});
describe('GET-only GitHub reader', () => {
  it('follows list pagination and later-page success/statuses', async () => {
    const calls: string[] = [];
    const api = new GitHubReader(scope, 'synthetic-token', async (url, options) => {
      calls.push(String(url)); expect(options?.method).toBe('GET'); expect(options?.redirect).toBe('error');
      const path = new URL(String(url)).pathname;
      if (path.endsWith('/deployments')) return new Response(JSON.stringify(String(url).includes('page=2') ? [deployment()] : []), { headers: String(url).includes('page=2') ? {} : { link: `<https://api.github.com${prefix}/deployments?environment=github-pages&per_page=100&page=2>; rel="next"` } });
      if (path.endsWith('/statuses')) return new Response(JSON.stringify(String(url).includes('page=2') ? [status()] : [status('pending', 10, '2026-10-05T00:00:00Z')]), { headers: String(url).includes('page=2') ? {} : { link: `<https://api.github.com${prefix}/deployments/1/statuses?per_page=100&page=2>; rel="next"` } });
      return new Response('{"status":"succeed"}');
    });
    expect(await resolveBaseline(scope, api)).toMatchObject({ sourceSha: a }); expect(calls).toHaveLength(5);
  });
  it.each([403, 404, 429, 500])('HTTP %s is failure, not absence', async code => {
    const api = new GitHubReader(scope, 'token', async () => new Response('', { status: code }));
    await expect(resolveBaseline(scope, api)).rejects.toThrow();
  });
  it.each(['https://attacker.test/x', `https://api.github.com/repos/other/site/deployments?page=2`, `https://api.github.com${prefix}/deployments?per_page=100`])('rejects unsafe/cyclic pagination %s', async link => {
    let count = 0;
    const api = new GitHubReader(scope, 'token', async () => { count++; return new Response('[]', { headers: { link: `<${link}>; rel="next"` } }); });
    await expect(api.list(`${prefix}/deployments?per_page=100`)).rejects.toThrow(); expect(count).toBe(1);
  });
  it('rejects an arbitrary URL before forwarding the token', async () => {
    let count = 0; const api = new GitHubReader(scope, 'token', async () => { count++; return new Response('{}'); });
    await expect(api.get('https://attacker.test/x')).rejects.toThrow(); expect(count).toBe(0);
  });
});
describe('immutable source and run guards', () => {
  it('reads only content blobs from the exact verified commit tree', async () => {
    const text = '---\ntitle: Sample\ndate: 2024-01-01\n---\nSample';
    const api: Reader = { list: async () => [], get: async path => {
      if (path.endsWith(`/git/commits/${a}`)) return { sha: a, tree: { sha: b } };
      if (path.includes('/git/trees/')) return { sha: b, truncated: false, tree: [{ path: 'src/content/blog/sample.md', type: 'blob', mode: '100644', sha: b }, { path: 'private.txt', type: 'blob', mode: '100644', sha: a }] };
      if (path.endsWith(`/git/blobs/${b}`)) return { sha: b, encoding: 'base64', content: Buffer.from(text).toString('base64') };
      throw new Error('unexpected-source-read');
    } };
    expect(Object.keys((await readSourceSnapshot(scope, a, api)).articles)).toEqual(['src/content/blog/sample.md']);
    await expect(readSourceSnapshot(scope, a, { ...api, get: async () => ({ truncated: true }) })).rejects.toThrow();
    await expect(readSourceSnapshot(scope, a, reader())).rejects.toThrow();
  });
  it('skips obsolete starts and branch advances after approval; blocks source restore mismatch', async () => {
    let head = a;
    const api: Reader = { list: async () => [], get: async () => ({ ref: scope.ref, object: { type: 'commit', sha: head } }) };
    const run = { workflowSha: a, checkoutSha: a, artifactSha: a };
    expect(await checkRunCurrent(scope, run, api)).toBe(true);
    head = b; expect(await checkRunCurrent(scope, run, api)).toBe(false);
    await expect(checkRunCurrent(scope, { ...run, artifactSha: b }, api)).rejects.toThrow('unsupported-recovery-source');
    await expect(checkRunCurrent(scope, run, reader())).rejects.toThrow();
  });
});
