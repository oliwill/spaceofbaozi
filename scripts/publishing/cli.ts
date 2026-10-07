import { appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { siteConfig } from '../../src/lib/site/config';
import { readLocalDocuments, parseArticle, readLocalSnapshot, assertScope, type Scope } from './content-snapshot';
import { checkContentChanges } from './check-content-changes';
import { GitHubReader, resolveBaseline, readSourceSnapshot } from './deployment-baseline';
import { checkRunCurrent, assertBaselineUnchanged } from './check-run-current';
import { auditDist } from './audit-dist';
import { productionPolicy } from './publication-policy';
async function output(key: string, value: string): Promise<void> {
  if (!process.env.GITHUB_OUTPUT || /[\r\n]/.test(value)) throw new Error('invalid-workflow-output');
  await appendFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}
async function main(): Promise<void> {
  const command = process.argv[2]; const root = process.cwd();
  if (command === 'check') {
    const docs = await readLocalDocuments(root); const articles = Object.values(docs).map(parseArticle);
    console.log(`Validated ${articles.length} local Blog documents; ${articles.filter(a => a.identity.public).length} publishable. This is not a deployment-baseline comparison.`); return;
  }
  if (command === 'audit') {
    const { site, base } = siteConfig(process.env); const policy = await productionPolicy(root);
    const issues = await auditDist(process.argv[3] ?? 'dist', site, base, policy);
    if (issues.length) throw new Error(JSON.stringify(issues));
    console.log(`Dist audit passed: ${policy.htmlRoutes.length + policy.legacyRoutes.length} HTML routes, ${Object.keys(policy.publicFiles).length} source assets/config files, ${Object.keys(policy.generatedFiles).length} exact generated metadata files; base=${base}.`); return;
  }
  if (!['start', 'prepare', 'guard', 'verify'].includes(command) || process.env.GITHUB_ACTIONS !== 'true') throw new Error('workflow-command-required');
  const scope: Scope = { repository: process.env.GITHUB_REPOSITORY ?? '', ref: 'refs/heads/main', environment: 'github-pages' };
  assertScope(scope);
  if (process.env.GITHUB_REF !== scope.ref) throw new Error('untrusted-publication-ref');
  const checkoutSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  execFileSync('git', ['diff', '--quiet', 'HEAD'], { stdio: 'pipe' });
  const workflowSha = process.env.GITHUB_SHA ?? '';
  const artifactSha = process.env.EXPECTED_SOURCE_SHA ?? workflowSha;
  const run = { workflowSha, checkoutSha, artifactSha };
  const reader = new GitHubReader(scope, process.env.GITHUB_TOKEN ?? '');
  if (command === 'verify') {
    if (workflowSha !== checkoutSha || workflowSha !== artifactSha) throw new Error('unsupported-recovery-source');
    const baseline = await resolveBaseline(scope, reader);
    if (baseline.kind !== 'deployment' || baseline.sourceSha !== artifactSha) throw new Error('deployed-source-unverified');
    console.log(`Verified successful Pages source ${baseline.sourceSha}; ${baseline.identity}`); return;
  }
  if (!(await checkRunCurrent(scope, run, reader))) { await output('current', 'false'); console.log('Obsolete publication run skipped.'); return; }
  if (command === 'start') { await output('current', 'true'); return; }
  // 初始化来源必须另行批准；本地模板故意不提供运行时初始化清单。
  const baseline = await resolveBaseline(scope, reader);
  if (command === 'guard') {
    assertBaselineUnchanged(process.env.EXPECTED_BASELINE ?? '', baseline.identity);
    await output('current', String(await checkRunCurrent(scope, run, reader))); return;
  }
  const before = await readSourceSnapshot(scope, baseline.sourceSha, reader);
  const after = await readLocalSnapshot(root, { ...scope, sourceSha: workflowSha });
  const issues = checkContentChanges(before, after);
  if (issues.length) throw new Error(JSON.stringify(issues));
  await output('baseline', baseline.identity); await output('source_sha', workflowSha); await output('current', 'true');
  console.log(`Content comparison passed against ${baseline.identity}.`);
}
main().catch(error => { console.error((error as Error).message); process.exitCode = 1; });
