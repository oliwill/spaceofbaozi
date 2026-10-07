import { describe, expect, it } from 'vitest';
import { snapshotFromDocuments, readLocalSnapshot } from '../../scripts/publishing/content-snapshot';
import { checkContentChanges } from '../../scripts/publishing/check-content-changes';
const scope = { repository: 'owner/site', ref: 'refs/heads/main', environment: 'github-pages' as const };
const doc = (fields = '', body = 'Public sample') => `---\ntitle: Example\ndate: 2024-02-29\ndraft: false\napproved: true\n${fields}---\n${body}`;
const snap = (text = doc(), sha = 'a'.repeat(40), path = 'src/content/blog/example.md') => snapshotFromDocuments({ ...scope, sourceSha: sha }, { [path]: text });
describe('daily content identity', () => {
  it('allows title, body and image changes at the same first date and path', () => {
    expect(checkContentChanges(snap(), snap(doc('cover: /assets/blog/example.webp\n', 'Changed body').replace('Example', 'New title'), 'b'.repeat(40)))).toEqual([]);
  });
  it('A deployed → bad B date → body/image-only C still compares to A', () => {
    const a = snap(); const bad = doc().replace('2024-02-29', '2024-03-01');
    expect(checkContentChanges(a, snap(bad, 'b'.repeat(40)))).toContainEqual(expect.objectContaining({ code: 'first-date-changed' }));
    expect(checkContentChanges(a, snap(bad + '\n![image](/assets/blog/image.webp)', 'c'.repeat(40)))).toContainEqual(expect.objectContaining({ code: 'first-date-changed' }));
  });
  it('rejects deletion and rename', () => {
    expect(checkContentChanges(snap(), snapshotFromDocuments({ ...scope, sourceSha: 'b'.repeat(40) }, {}))[0].code).toBe('published-path-missing');
    expect(checkContentChanges(snap(), snap(doc(), 'b'.repeat(40), 'src/content/blog/renamed.md'))[0].code).toBe('published-path-missing');
  });
  it('rejects withdrawal and mismatched scopes', () => {
    expect(checkContentChanges(snap(), snap(doc().replace('approved: true', 'approved: false')))[0].code).toBe('published-withdrawal');
    expect(checkContentChanges(snap(), { ...snap(), repository: 'other/site' })[0].code).toBe('snapshot-scope-mismatch');
  });
  it.each([[false, false, false], [false, true, true], [true, false, false], [true, true, false]])('gate draft=%s approved=%s public=%s', (draft, approved, publicValue) => {
    const s = snap(doc().replace('draft: false', `draft: ${draft}`).replace('approved: true', `approved: ${approved}`));
    expect(Object.values(s.articles)[0].public).toBe(publicValue);
  });
  it.each([
    ['missing title', doc().replace('title: Example\n', '')], ['blank title', doc().replace('Example', '" "')],
    ['missing date', doc().replace('date: 2024-02-29\n', '')], ['null date', doc().replace('2024-02-29', 'null')],
    ['empty date', doc().replace('2024-02-29', '""')], ['impossible date', doc().replace('2024-02-29', '2023-02-29')],
    ['boolean string', doc().replace('draft: false', 'draft: "false"')], ['approved string', doc().replace('approved: true', 'approved: "true"')],
    ['null boolean', doc().replace('draft: false', 'draft: null')], ['raw slug', doc('slug: hidden\n')],
    ['empty updated', doc('updated: ""\n')], ['null updated', doc('updated: null\n')],
    ['impossible updated', doc('updated: 2024-04-31\n')], ['updated before date', doc('updated: 2024-02-28\n')],
    ['duplicate key', doc('title: Duplicate\n')], ['array frontmatter', '---\n- item\n---\nText'], ['no frontmatter', 'Text'],
  ])('rejects raw defect: %s', (_name, text) => expect(() => snap(text)).toThrow());
  it('uses UTC dates, keeps quoted historical date forms and omitted booleans', () => {
    expect(Object.values(snap(doc().replace('2024-02-29', '"2024-02-29"')).articles)[0].date).toBe('2024-02-29T00:00:00.000Z');
    expect(Object.values(snap(doc().replace('draft: false\napproved: true\n', '')).articles)[0].public).toBe(false);
  });
  it('rejects paths escaping the content scope', () => expect(() => snap(doc(), 'a'.repeat(40), 'src/content/blog/../secret.md')).toThrow());
  it('validates all actual articles without changing source', async () => {
    const s = await readLocalSnapshot(process.cwd(), { ...scope, sourceSha: 'a'.repeat(40) });
    expect(Object.keys(s.articles).length).toBeGreaterThan(0);
    expect(Object.values(s.articles).every(a => typeof a.draft === 'boolean' && typeof a.approved === 'boolean')).toBe(true);
  });
});
