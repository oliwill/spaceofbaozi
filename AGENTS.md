# Repository Guidelines

## Project Overview

**baozi.space（中华一番包子铺）** 是包子的个人网站、公开档案与个人工作空间。Astro 5 静态站，内容来自 Markdown Content Collections。

当前生产代码仍是 D-105 数字手账基线：sticky 封面、五页首页、BookSpread 详情和八个旧 collection。它必须保持可构建，但不再是新设计依据。v2.1 目标是固定原点的低对比点阵环境、暖白大内容纸、五个一级入口和可跳过的水彩剪纸开场。

## Authority

改动前按顺序读取：

1. `docs/design/baozi-space-design-spec.md` — v2.1 全站设计事实来源；
2. `baozi-space-prd.md` — 产品目标、信息需求、内容责任和发布门禁；
3. `docs/project/decision-log.md` — 已确认决策，最新 D-110；
4. `docs/plans/2026-08-13-v2.1-project-restructure.md` — 全项目阶段路线；
5. 当前阶段的具体计划和 `docs/intro/` 契约。

发生冲突时，设计/构图/动效以 design spec 为准，内容责任/发布门禁以 PRD 为准，后续 Decision 覆盖早期 Decision。废弃原型、V1 spec 和原始 handoff 已删除；历史只从 Git 与 `decision-log.md` 查阅，不得恢复为执行入口。

设计或结构变更必须查决策记录并新增 D-xxx 条目。

重要分析、设计评审和规划在形成结论前，还必须检索 `C:\Users\Lzw\Downloads\Documents\obsidian\Lzw\Lzw\Codex记忆\` 中的相关项目、决策、工作流和 open loops。仓库文档回答当前产品事实，优先级高于可能过时的笔记；Obsidian 提供用户长期偏好、历史教训和判断方法。必须说明采用了哪些笔记原则、排除了哪些过时记录，并在任务结束时将稳定事实和未闭环事项写回对应笔记。

## Current Scope

A0-H、桌面 A1 实现与 A0-V production 素材审计 / 发布已完成（D-109 / D-110）。当前门禁是用户查看 `/lab/intro` 的 production 正式视觉并确认是否进入阶段 B。

- Manifest、placeholder、六张 production Sprite、最终静态图、审计 / 发布与回退路径均已落地；
- 桌面 `/lab/intro` 已覆盖可逆八拍、小狗原地收尾、八节点 production 截图和三桌面视口；
- 未经用户确认不得开始阶段 B 完整首页整合；仍不得顺手迁移内容集合、删除旧路由、实现移动端开场、制作冬季素材或部署 Cloudflare。

## Architecture States

### Current production baseline

```text
src/content/<legacy-section>/*.md → src/content.config.ts
                                      ↓ getCollection()
src/pages/<section>/             → SectionLayout / EntryList / EntryDetail / BookSpread
src/pages/index.astro            → BaseLayout + home.css + cover-open.js
```

- 旧 collection：`blog / thoughts / photos / drinks / books / music / about / ai-works`。
- 当前首页与布局继续运行，不再增加 D-105 视觉能力。
- 旧 URL 在阶段 C 的逐条迁移表和重定向验证完成前不得删除。

### v2.1 target

```text
docs/design/                    # 全站设计规范
docs/intro/                     # 动画和资产契约
design-assets/intro/            # 非公开源稿、参考、外部交付、QA
public/assets/intro/
  placeholders/                # 仅开发 / 测试显式启用
  production/                  # 默认运行时
scripts/intro-assets/           # 生成占位、审计、原子发布
src/components/intro/           # 语义舞台
src/lib/intro/                  # Manifest、帧、绳索、加载、时间线
src/pages/lab/intro.astro
tests/{unit/intro,e2e}/
```

阶段 C 的目标内容与路由为 Blog / Photos / Shelf / Projects / About。Thoughts 并入 Blog；Books / Movies / Music 并入 Shelf；AI Works 并入 Projects；Drinks 逐条确认去向。

## Intro Hard Gates

- 本地 harness 不生成、补画、inpaint 或重绘生产人物、小狗、球和手写资产。
- `design-assets/intro/source/` 与 reference 永不复制到 `public/` 作为生产素材。
- 默认模式必须是 production；缺失或无效时显示稳定 HTML 首页，不自动显示 placeholder。
- placeholder 只允许开发环境 `?assetMode=placeholder` 或测试显式加载。
- 六张生产 Sheet 固定 4×2、每组 8 帧、真实 Alpha、角色朝右、总图片负载 ≤6MB。
- 第一拍只有芥末黄小球；随后才出现狗和人物。主运动从左向右，禁止 `scaleX(-1)`。
- 姿态 8–10fps，空间位移连续可逆；最终人物和小狗完全静止。
- 运行时只用 Astro、GSAP、DOM/CSS Sprite 和 SVG leash；不加 React、Canvas、Three.js、PixiJS、Rive、Lottie、Lenis 或游戏引擎。

## Code Conventions

- Bun 是唯一包管理器和脚本入口；`bun.lock` 为准，不提交 `package-lock.json` 变化。
- 路径别名 `@/*` → `src/*`；组件、样式和 lib 导入使用别名。
- Astro frontmatter 承担构建期数据，无运行时全局 store 或 DI。
- 客户端行为优先 TypeScript 模块；旧全站原生脚本仍在 `public/scripts/`，阶段迁移时干净删除。
- 原生 CSS，无 Tailwind。v2.1 新 token 来自 design spec；不得继续扩展 BaoziHand / IoskeleyMono 旧字体系统。
- 中文界面与注释；注释只写不明显的约束，并引用相关 D-xxx 或契约。
- 不引入 `any`；未知输入用 `unknown` 与验证函数。
- 新增/修改 frontmatter 字段必须同步 schema、模板、所有消费页面和发布门禁。

## Content Gates

- 当前 schema 只过滤 `draft`；这不是生产批准。
- 阶段 C 增加 `approved`、`updated`、`coverAlt`、`coverCredit`，并在 schema、模板、查询和发布门禁中同阶段切换。
- 生产内容必须满足 `draft: false && approved: true`。
- 占位、假内容、布局样本和未批准内容不计入发布门禁。
- 完整文章只在 Blog 维护；其他栏目保存结构化记录和关联链接，不复制正文。

## Development Commands

```powershell
bun install
bun run dev
bun run check
bun run build
```

A0-H / A1 接入后：

```powershell
bun run test:unit
bun run test:e2e
bun run assets:intro:placeholders
bun run assets:intro:audit:placeholder
bun run assets:intro:audit:production
```

## Verification

- 当前文档/结构调整：`bun run check` + `bun run build`，确保旧生产基线未破坏。
- `/lab/intro`：Vitest + Playwright；1440×900 截取 0%、8%、25%、45%、65%、82%、94%、100%，并验证反向滚动。
- 额外 smoke viewport：1280×720、1920×1080；reduced motion 单独截图。
- 生产素材：自动审计 + 48 帧 contact sheet 人工检查 + 总负载声明。
- UI 变更必须浏览器实测，不以构建通过代替视觉和交互验证。
