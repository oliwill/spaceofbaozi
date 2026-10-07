import type { ProjectData, ProjectImage } from "../../../src/lib/projects/schema";

export type ProjectFixture = ProjectData & { slug: string; body: string };
export type ProjectFixtureCase = "empty" | "one" | "mixed" | "work-only" | "personal-only";

const landscape: ProjectImage = {
  src: "/assets/projects/synthetic-work/overview.png", width: 960, height: 640,
  alt: "SYNTHETIC 工作项目几何图：浅色矩形内有深色圆与测试标记", credit: "SYNTHETIC 合成测试材料",
  variants: [{ src: "/assets/projects/synthetic-work/overview-small.png", width: 480, height: 320 }],
};
const wide: ProjectImage = {
  src: "/assets/projects/synthetic-personal/wide.png", width: 1200, height: 400,
  alt: "SYNTHETIC 个人项目横向几何图：三个区域与测试标记", credit: "SYNTHETIC 合成测试材料",
  variants: [{ src: "/assets/projects/synthetic-personal/wide-small.png", width: 600, height: 200 }],
};
const figure = (image: ProjectImage) => {
  const candidates = [...(image.variants ?? []), image].sort((a, b) => a.width - b.width);
  return `<figure>\n  <img src="${image.src}" width="${image.width}" height="${image.height}" alt="${image.alt}" loading="lazy" srcset="${candidates.map(({ src, width }) => `${src} ${width}w`).join(", ")}" sizes="(max-width: 767px) calc(100vw - 64px), 720px" />\n  <figcaption>${image.credit}</figcaption>\n</figure>`;
};
const base = (slug: string, changes: Partial<ProjectData>, body: string): ProjectFixture => ({
  slug, title: "SYNTHETIC 合成测试项目", intro: "仅供隔离布局验证的合成项目，不代表用户真实经历。",
  date: new Date("2026-09-20"), role: "我负责合成测试场景与资源登记。", kind: "personal",
  draft: false, approved: true, images: [], ...changes, body,
});
const longURL = `https://example.com/synthetic/${"unbroken-project-link-".repeat(18)}`;

export const fixtureProjects: ProjectFixture[] = [
  base("synthetic-work-landscape", {
    title: "SYNTHETIC 工作项目：记录与信息整理", kind: "work", status: "completed", periodLabel: "2025–2026 · 合成夹具",
    date: new Date("2026-09-25"), images: [landscape], cover: landscape.src, link: "https://example.com/synthetic-work",
  }, `## 问题\n\n合成记录分散，测试清楚的信息组织。\n\n## 我的贡献\n\n我负责合成结构与说明，团队结果不归为个人完成。\n\n## 过程\n\n下图用合成几何块说明信息分组，没有真实项目截图或成果数据。\n\n${figure(landscape)}\n\n## 结果\n\n合成验证页面已具备可核对的结构，没有真实结果指标。\n\n## 反思\n\n合成测试仅用于验证内容呈现。`),
  base("synthetic-personal-wide", {
    title: "SYNTHETIC 个人项目：横向材料与长链接", status: "ongoing", images: [wide], cover: wide.src,
    link: longURL, linkLabel: "查看代码",
  }, `## 问题\n\n验证宽材料与无空格网址的布局边界。\n\n## 我的贡献\n\n我负责构造表格、代码与合成几何图。\n\n## 过程\n\n下图用三个合成区域说明横向材料的组织，随后保留表格与代码的完整内容。\n\n${figure(wide)}\n\n| 合成字段一 | 合成字段二 | 合成字段三 | 合成字段四 | 合成字段五 | 合成字段六 | 合成字段七 | 合成字段八 |\n| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |\n| 宽表格的完整内容应当保留 | ${"SYNTHETIC-UNBROKEN-CELL".repeat(12)} | 完整 | 完整 | 完整 | 完整 | 完整 | 完整 |\n\n\`\`\`ts\nconst syntheticLongLine = "${"SYNTHETIC-NO-WRAP-".repeat(25)}";\n\`\`\`\n\n[${longURL}](${longURL})`),
  base("synthetic-work-text", { title: "SYNTHETIC 无图工作项目", kind: "work" }, "## 问题\n\n没有经过批准的截图。\n\n## 我的贡献\n\n我负责合成项目的信息说明，省略无材料的章节。"),
  base("synthetic-personal-long", {
    title: "SYNTHETIC 合成个人项目：很长的项目名称需要自然换行并完整呈现，不省略、不截断、不影响其他信息的阅读顺序".repeat(2),
    role: "我负责合成测试资料的结构、内容说明、资源尺寸核对与信息呈现；完整说明个人职责范围，并保留团队分工与事实依据。".repeat(3),
    intro: "SYNTHETIC 一句话说明应当保持准确，即使内容较长也自然换行。".repeat(3), date: new Date("2026-09-10"),
  }, "## 问题\n\n验证长名称与长角色在窄纸面上的完整阅读。\n\n## 我的贡献\n\n我负责合成文本与边界验证，不补没有材料的结果或反思。"),
];

export const gateFixtureProjects: ProjectFixture[] = [
  [false, true], [false, false], [true, false], [true, true],
].map(([draft, approved]) => {
  const marker = `${!draft && approved ? "PUBLIC" : "PRIVATE"}-PROJECT-GATE-${String(draft).toUpperCase()}-${String(approved).toUpperCase()}`;
  const image: ProjectImage = { src: `/assets/projects/${marker}.png`, width: 320, height: 200, alt: `${marker}-ALT` };
  return base(`synthetic-gate-${draft}-${approved}`, {
    title: `${marker}-TITLE`, intro: `${marker}-INTRO`, role: `我负责 ${marker}-ROLE。`, kind: "work", draft, approved,
    date: new Date("2026-09-01"), status: draft ? "ongoing" : "completed", link: `https://example.com/${marker}-URL`,
    images: [image], cover: image.src,
  }, `## 问题\n\n${marker}-BODY-PROBLEM\n\n## 我的贡献\n\n${marker}-BODY-CONTRIBUTION`);
});

export function projectsForCase(name: ProjectFixtureCase): ProjectFixture[] {
  const privateGates = gateFixtureProjects.filter(({ draft, approved }) => draft || !approved);
  if (name === "empty") return privateGates;
  if (name === "one") return [fixtureProjects[0], ...privateGates];
  if (name === "work-only") return [...fixtureProjects, gateFixtureProjects[0]].filter(({ kind }) => kind === "work").concat(privateGates);
  if (name === "personal-only") return fixtureProjects.filter(({ kind }) => kind === "personal").concat(privateGates);
  return [...fixtureProjects, ...gateFixtureProjects];
}
