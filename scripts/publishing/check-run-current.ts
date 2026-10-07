import { assertScope, assertSha, type Scope } from './content-snapshot';
import { record, type Reader } from './deployment-baseline';
export async function checkRunCurrent(scope: Scope, run: { workflowSha: string; checkoutSha: string; artifactSha: string }, reader: Reader): Promise<boolean> {
  assertScope(scope); Object.values(run).forEach(assertSha);
  if (run.workflowSha !== run.checkoutSha || run.workflowSha !== run.artifactSha) throw new Error('unsupported-recovery-source');
  const ref = record(await reader.get(`/repos/${scope.repository}/git/ref/${scope.ref.slice(5)}`));
  const object = record(ref.object);
  if (ref.ref !== scope.ref || object.type !== 'commit') throw new Error('branch-provenance-mismatch');
  const head = String(object.sha); assertSha(head);
  return head === run.workflowSha;
}
export function assertBaselineUnchanged(expected: string, actual: string): void {
  if (!expected || expected !== actual) throw new Error('baseline-changed-during-build');
}
