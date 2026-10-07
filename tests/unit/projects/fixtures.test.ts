import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fixtureProjects, gateFixtureProjects, projectsForCase } from "../../fixtures/projects/projects";
import { selectPublicProjects } from "@/lib/projects/projects";

const entries = (projects: ReturnType<typeof projectsForCase>) => projects.map(({ slug: id, body: _body, ...data }) => ({ id, data }));

describe("isolated synthetic project fixtures", () => {
  it.each(["empty", "one", "mixed", "work-only", "personal-only"] as const)("provides valid public metadata for %s", (name) => {
    const selected = selectPublicProjects(entries(projectsForCase(name)));
    if (name === "empty") expect(selected).toHaveLength(0);
    if (name === "one") expect(selected).toHaveLength(1);
    if (name === "mixed") expect(selected.length).toBeGreaterThanOrEqual(4);
    if (name === "work-only") expect(selected.every(({ project }) => project.kind === "work")).toBe(true);
    if (name === "personal-only") expect(selected.every(({ project }) => project.kind === "personal")).toBe(true);
    expect(selected.every(({ project }) => !JSON.stringify(project).includes("PRIVATE-PROJECT"))).toBe(true);
  });
  it("uses a PUBLIC control and unique PRIVATE markers for the other three gate combinations", () => {
    expect(gateFixtureProjects.map(({ draft, approved }) => [draft, approved])).toEqual([[false, true], [false, false], [true, false], [true, true]]);
    const [control, ...privateProjects] = gateFixtureProjects;
    expect(JSON.stringify(control)).toContain("PUBLIC-PROJECT");
    expect(JSON.stringify(control)).not.toContain("PRIVATE-PROJECT");
    expect(new Set(privateProjects.map(({ title }) => title)).size).toBe(3);
    for (const project of privateProjects) expect(JSON.stringify(project)).toContain("PRIVATE-PROJECT");
    expect(selectPublicProjects(entries(gateFixtureProjects))).toHaveLength(1);
  });
  it("covers optional blocks, both types, all statuses, long content, wide code and table, and same-date order", () => {
    expect(new Set(fixtureProjects.map(({ kind }) => kind))).toEqual(new Set(["work", "personal"]));
    expect(new Set(fixtureProjects.map(({ status }) => status))).toEqual(new Set(["ongoing", "completed", undefined]));
    expect(fixtureProjects.some(({ images }) => images.length === 0)).toBe(true);
    expect(fixtureProjects.some(({ images }) => images.some(({ variants }) => (variants?.length ?? 0) > 0))).toBe(true);
    expect(fixtureProjects.some(({ link }) => !link)).toBe(true);
    expect(fixtureProjects.some(({ title, role }) => title.length > 50 && (role?.length ?? 0) > 80)).toBe(true);
    expect(fixtureProjects.some(({ body }) => body.includes("| ----") && body.includes("```"))).toBe(true);
    expect(fixtureProjects.some(({ body }) => body.includes("## 结果"))).toBe(true);
    expect(fixtureProjects.some(({ body }) => !body.includes("## 结果") && !body.includes("## 反思"))).toBe(true);
    expect(new Set(fixtureProjects.map(({ date }) => date.getTime())).size).toBeLessThan(fixtureProjects.length);
  });
  it("provides the isolated runner and projects-only Playwright config", () => {
    expect(existsSync("scripts/projects/run-fixtures.ts")).toBe(true);
    expect(existsSync("playwright.projects.config.ts")).toBe(true);
  });
  it("provides a removable inline figure template with exact metadata placeholders", () => {
    const template = readFileSync("src/content/_templates/project.md", "utf8");
    expect(template).toMatch(/<figure>[\s\S]*<img[\s\S]*width="REPLACE_WITH_EXACT_WIDTH"[\s\S]*height="REPLACE_WITH_EXACT_HEIGHT"[\s\S]*alt=[\s\S]*<figcaption>[\s\S]*<\/figure>/);
    expect(template).toContain("REPLACE_WITH_APPROVED_IMAGE");
    expect(template).toContain("示例不代表素材批准");
  });
  it("wires the asset audit into the project index build", () => {
    const index = readFileSync("src/pages/projects/index.astro", "utf8");
    expect(index).toContain("await auditPublicProjectAssets(projects,");
  });
});
