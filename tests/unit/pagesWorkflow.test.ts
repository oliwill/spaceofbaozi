import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { assertBaselineUnchanged } from '../../scripts/publishing/check-run-current';
import { sitePublishing } from '../../scripts/publishing/site-publishing';
import { mkdtemp, mkdir, writeFile, access, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

describe('disabled workflow contract', () => {
  it('only declares inert manual jobs, minimal permissions, frozen versions and serialized scope', async () => {
    const source = await readFile('.github/workflows/pages.yml', 'utf8');
    const workflow = parse(source);
    expect(workflow.env).toEqual({ SITE_URL: 'https://oliwill.github.io', SITE_BASE: '/spaceofbaozi' });
    expect(workflow.on).toEqual({ workflow_dispatch: null }); expect(workflow.permissions).toEqual({});
    expect(workflow.concurrency).toEqual({ group: '${{ github.repository }}-github-pages', 'cancel-in-progress': false });
    expect(Object.keys(workflow.jobs)).toEqual(['build', 'deploy', 'verify']);
    for (const [name, unknownJob] of Object.entries(workflow.jobs)) {
      const job = unknownJob as Record<string, unknown>;
      expect(job.if).toBe('${{ false }}'); expect(job.concurrency).toBeUndefined();
      if (name !== 'deploy') { expect(job.environment).toBeUndefined(); expect(JSON.stringify(job.permissions)).not.toContain('write'); }
      for (const step of job.steps as Record<string, unknown>[]) {
        if (step.uses) expect(step.uses).toMatch(/^(actions\/(checkout|upload-pages-artifact|deploy-pages)|oven-sh\/setup-bun)@[a-f0-9]{40}$/);
        if (String(step.uses).startsWith('oven-sh/setup-bun')) expect(step.with).toEqual({ 'bun-version': '1.4.2' });
        if (String(step.uses).startsWith('actions/checkout')) expect(step.with).toMatchObject({ ref: '${{ github.sha }}', 'persist-credentials': false });
      }
    }
    expect(workflow.jobs.deploy.needs).toEqual(['build']); expect(workflow.jobs.verify.needs).toEqual(['build', 'deploy']);
    expect(workflow.jobs.deploy.permissions).toEqual({ contents: 'read', deployments: 'read', pages: 'write', 'id-token': 'write' });
    expect(workflow.jobs.verify.permissions).toEqual({ contents: 'read', deployments: 'read', pages: 'read' });
    expect(workflow.jobs.deploy.environment.name).toBe('github-pages');
    const steps = workflow.jobs.build.steps as Record<string, unknown>[];
    const runs = steps.filter(s => s.run).map(s => s.run);
    expect(runs).toEqual(['bun install --frozen-lockfile', 'bun run publishing:start', 'bun run check && bun run test:unit', 'bun run publishing:prepare', 'bun run build', 'bun run publishing:audit']);
    expect(steps.find(s => String(s.uses).startsWith('actions/upload-pages-artifact'))?.with).toEqual({ path: 'dist' });
    expect(source).not.toMatch(/configure-pages|deployment_id|enable_jekyll|ALLOW_|secrets\.[A-Z_]*PAT/);
    const deploySteps = workflow.jobs.deploy.steps as Record<string, unknown>[];
    const deployIndex = deploySteps.findIndex(s => String(s.uses).startsWith('actions/deploy-pages'));
    expect(deploySteps[deployIndex - 1].run).toBe('bun run publishing:guard');
    expect(deploySteps[deployIndex].if).toBe("steps.guard.outputs.current == 'true'");
  });
  it('blocks an out-of-band deployment changing the build baseline', () => {
    expect(() => assertBaselineUnchanged('deployment:1:2:a', 'deployment:2:3:b')).toThrow('baseline-changed-during-build');
    expect(() => assertBaselineUnchanged('deployment:1:2:a', 'deployment:1:2:a')).not.toThrow();
  });
  it('omits only stale generated _redirects while preserving source and _headers', async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), 'publishing-hook-')));
    try {
      for (const route of ['blog', 'projects']) { await mkdir(join(dir, route)); await writeFile(join(dir, route, 'index.html'), 'public'); }
      await writeFile(join(dir, '_redirects'), 'old mappings'); await writeFile(join(dir, '_headers'), 'existing headers');
      const hook = sitePublishing().hooks['astro:build:done'];
      await (hook as (options: unknown) => Promise<void>)({ dir: pathToFileURL(dir + '/'), logger: { info() {} } });
      await expect(access(join(dir, '_redirects'))).rejects.toThrow(); expect(await readFile(join(dir, '_headers'), 'utf8')).toBe('existing headers');
      expect(await readFile('public/_redirects', 'utf8')).toContain('/thoughts');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
