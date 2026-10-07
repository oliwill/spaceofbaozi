import type { ContentSnapshot } from './content-snapshot';
export interface Issue { code: string; path?: string }
export function checkContentChanges(before: ContentSnapshot, after: ContentSnapshot): Issue[] {
  if (before.repository !== after.repository || before.ref !== after.ref || before.environment !== after.environment) return [{ code: 'snapshot-scope-mismatch' }];
  const issues: Issue[] = [];
  for (const [path, previous] of Object.entries(before.articles)) {
    if (!previous.public) continue;
    const current = after.articles[path];
    if (!current) issues.push({ code: 'published-path-missing', path });
    else {
      if (current.date !== previous.date) issues.push({ code: 'first-date-changed', path });
      if (!current.public) issues.push({ code: 'published-withdrawal', path });
    }
  }
  return issues;
}
