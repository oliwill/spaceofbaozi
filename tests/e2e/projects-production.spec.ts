import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { attribute, elements, parseHTML, textContent } from "../support/project-output-audit";

// Request/filesystem only: these five tests never request a page/browser fixture.
// The branding title is intentionally forbidden only inside project projections.
const drafts = readdirSync("src/content/projects").filter((name) => name.endsWith(".md")).map((name) => {
  const markdown = readFileSync(join("src/content/projects", name), "utf8");
  const title = markdown.match(/^title:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g, "");
  const intro = markdown.match(/^intro:\s*(.+)$/m)?.[1];
  const body = markdown.split(/^---\s*$/m).slice(2).join("---").trim();
  if (!title || !intro || !body) throw new Error(`Incomplete draft audit input: ${name}`);
  return { slug: name.slice(0, -3), title, intro, body };
});
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const escaped = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const allFiles = (directory: string): string[] => readdirSync(directory).sort().flatMap((name) => {
  const file = join(directory, name);
  return statSync(file).isDirectory() ? allFiles(file) : [file];
});
const mainContent = (html: string) => {
  const all = elements(parseHTML(html)), main = all.find((node) => attribute(node, "id") === "main")!;
  return { title: textContent(all.find((node) => node.tagName === "title")!), text: textContent(main).replace(/\s+/g, " ").trim(), robots: all.filter((node) => attribute(node, "name") === "robots").map((node) => attribute(node, "content")) };
};

test("[production HTTP] zero public projects has only the concise empty state and noindex", async ({ request }) => {
  const response = await request.get("/projects");
  expect(response.status()).toBe(200);
  const html = await response.text(), all = elements(parseHTML(html));
  const list = all.find((node) => attribute(node, "data-project-list") !== undefined)!;
  expect(textContent(list).replace(/\s+/g, " ").trim()).toBe("项目 项目正在整理。");
  expect(elements(list).filter((node) => ["ul", "li", "img", "a", "button", "input", "select"].includes(node.tagName))).toHaveLength(0);
  expect(all.filter((node) => attribute(node, "name") === "robots").map((node) => attribute(node, "content"))).toEqual(["noindex"]);
  const nav = all.find((node) => node.tagName === "nav" && attribute(node, "aria-label") === "主要栏目")!;
  expect(elements(nav).filter((node) => node.tagName === "a").map((node) => attribute(node, "href"))).toEqual(["/blog", "/photos", "/projects", "/media"]);
  for (const draft of drafts) expect(textContent(list)).not.toContain(draft.title);
});

test("[production HTTP] home project projection exposes no draft titles, links or JSON", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const html = await response.text();
  const section = elements(parseHTML(html)).find((node) => attribute(node, "aria-labelledby") === "home-projects-title")!;
  expect(section).toBeDefined();
  for (const draft of drafts) {
    expect(textContent(section)).not.toContain(draft.title);
    expect(html).not.toContain(`/projects/${draft.slug}`);
    expect(html).not.toContain(draft.intro);
  }
});

test("[production HTTP] all three draft slugs and unknown slug share the same generic 404", async ({ request }) => {
  expect(drafts.map(({ slug }) => slug).sort()).toEqual(["baozi-space", "first-experiment", "kanadojo"]);
  const generic = mainContent(readFileSync("dist/404.html", "utf8"));
  expect(generic.title).toBe("内容暂不可用 · baozi.space");
  expect(generic.robots).toEqual(["noindex"]);
  expect(generic.text).toContain("内容暂不可用");
  for (const slug of [...drafts.map(({ slug }) => slug), "unknown-project-not-published"]) {
    const response = await request.get(`/projects/${slug}`);
    expect(response.status(), slug).toBe(404);
    const html = await response.text();
    expect(mainContent(html), slug).toEqual(generic);
    expect(html).not.toContain("data-project-detail");
    for (const draft of drafts) { expect(html).not.toContain(draft.intro); expect(html).not.toContain(draft.body); }
  }
});

test("[production artifact] every output byte and resource path excludes private project data", async ({}, testInfo) => {
  const files = allFiles("dist");
  const markers = ["PRIVATE-PROJECT", "SYNTHETIC", "design-assets/", "_handoff/", "assets/projects/", "Kanadojo", "第一件 AI 实验", ...drafts.flatMap(({ slug, intro, body }) => [`/projects/${slug}`, intro, body])];
  const variants = [...new Set(markers.flatMap((marker) => [marker, escaped(marker), JSON.stringify(marker).slice(1, -1)]))];
  const leaks = files.flatMap((file) => {
    const bytes = readFileSync(file), path = relative("dist", file);
    return variants.filter((marker) => bytes.includes(Buffer.from(marker)) || path.includes(marker))
      .map((marker) => ({ path, marker }));
  });
  expect(leaks).toEqual([]);
  expect(files.filter((file) => file.startsWith(join("dist", "projects") + "/") && file.endsWith(".html")).map((file) => relative("dist", file))).toEqual(["projects/index.html"]);
  expect(files.filter((file) => file.endsWith(".html"))).toHaveLength(34);
  expect(existsSync("public/assets/projects")).toBe(false);
  await testInfo.attach("production-artifacts-audit.json", { body: Buffer.from(JSON.stringify({ fileCount: files.length, htmlCount: 34, leaks, files: files.map((file) => ({ path: relative("dist", file), sha256: sha(readFileSync(file)) })) }, null, 2)), contentType: "application/json" });
});

test("[production artifact] original redirect source stays intact while approved ai-works pages replace stale output rules", async () => {
  const redirects = readFileSync("public/_redirects");
  expect(existsSync("dist/_redirects")).toBe(false);
  expect(sha(redirects)).toBe("8b7b0dc40c74a81e999fced0b979f45e75dc7a27f11ed9132851513600d019ca");
  expect(redirects.toString()).toContain("/ai-works/first-experiment  /projects/first-experiment  301\n/ai-works  /projects  301\n");
  const section = elements(parseHTML(readFileSync("dist/ai-works/index.html", "utf8")));
  expect(section.filter((node) => node.tagName === "a").map((node) => [attribute(node, "href"), textContent(node)]))
    .toEqual([["/projects", "继续浏览项目"]]);
  expect(section.filter((node) => node.tagName === "script").map(textContent))
    .toEqual(['location.replace("/projects" + location.search + location.hash);']);
  expect(section.filter((node) => attribute(node, "name") === "robots").map((node) => attribute(node, "content"))).toEqual(["noindex"]);
  expect(readFileSync("dist/projects/index.html", "utf8")).toContain("data-project-list");
  const detail = elements(parseHTML(readFileSync("dist/ai-works/first-experiment/index.html", "utf8")));
  expect(detail.filter((node) => node.tagName === "p").map(textContent)).toEqual(["这一页暂时没有可展示的内容。"]);
  expect(detail.filter((node) => node.tagName === "a").map((node) => [attribute(node, "href"), textContent(node)]))
    .toEqual([["/#home", "回到首页"], ["/projects", "项目"]]);
  expect(detail.filter((node) => attribute(node, "name") === "robots").map((node) => attribute(node, "content"))).toEqual(["noindex"]);
  expect(detail.filter((node) => node.tagName === "script")).toHaveLength(0);
  expect(detail.some((node) => attribute(node, "data-project-detail") !== undefined)).toBe(false);
});
