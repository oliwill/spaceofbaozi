import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { auditDist, type DistPolicy } from '../publishing/audit-dist';
import { productionPolicy } from '../publishing/publication-policy';
import { siteConfig } from '../../src/lib/site/config';
import { inventory, identity } from './files';

const [dist, receipt, policyPath] = process.argv.slice(2);
if (!dist || !receipt) throw new Error('Usage: bun scripts/pages/audit.ts dist receipt.json [fixture-policy.json]');
const site = siteConfig(process.env);
const policy: DistPolicy = policyPath ? JSON.parse(await readFile(policyPath, 'utf8')) : await productionPolicy(process.cwd());
const issues = await auditDist(resolve(dist), site.site, site.base, policy), files = await inventory(resolve(dist));
await writeFile(receipt, JSON.stringify({ dist: resolve(dist), site: site.site, base: site.base, policy, issues, fileCount: Object.keys(files).length, htmlCount: Object.keys(files).filter(path => path.endsWith('.html')).length, identity: identity(files), files }, null, 2) + '\n');
console.log(JSON.stringify({ dist, issues, files: Object.keys(files).length }));
if (issues.length) process.exitCode = 1;
