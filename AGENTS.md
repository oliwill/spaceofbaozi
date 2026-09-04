# Repository Guidelines

## Project Overview

**baozi.space（中华一番包子铺）** 是包子的个人网站、公开档案与个人工作空间。Astro 5 静态站，内容来自 Markdown Content Collections。

当前生产代码仍是 D-105 数字手账基线：sticky 封面、五页首页、BookSpread 详情和八个旧 collection。它必须保持可构建，但不再是新设计依据。v2.1 目标是固定原点的低对比点阵环境、暖白大内容纸、五个一级入口和可跳过的水彩剪纸开场。

## Authority

改动前按顺序读取：

1. `docs/design/baozi-space-design-spec.md` — v2.1 全站设计事实来源；
2. `baozi-space-prd.md` — 产品目标、信息需求、内容责任和发布门禁；
3. `docs/project/decision-log.md` — 已确认决策，最新 D-124；
4. 根目录 `2026-08-21-baozi-space-oil-motion-project-plan.md` 与 `docs/animation/oil-motion/` 契约 — 启动页当前 CP0.5–CP7 路线；
5. 根目录 `2026-08-18-baozi-space-hybrid-animation-design.md` 与 `2026-08-18-baozi-space-hybrid-animation-checkpoints.md`（历史）、`docs/animation/intro-shot-list.md`、`docs/plans/2026-08-13-v2.1-project-restructure.md`、当前阶段计划和 `docs/intro/` 契约。

发生冲突时，设计/构图/动效以 design spec 为准，内容责任/发布门禁以 PRD 为准，后续 Decision 覆盖早期 Decision。废弃原型、V1 spec 和原始 handoff 已删除；历史只从 Git 与 `decision-log.md` 查阅，不得恢复为执行入口。

设计或结构变更必须查决策记录并新增 D-xxx 条目。

重要分析、设计评审和规划在形成结论前，还必须检索 `C:\Users\Lzw\Downloads\Documents\obsidian\Lzw\Lzw\Codex记忆\` 中的相关项目、决策、工作流和 open loops。仓库文档回答当前产品事实，优先级高于可能过时的笔记；Obsidian 提供用户长期偏好、历史教训和判断方法。必须说明采用了哪些笔记原则、排除了哪些过时记录，并在任务结束时将稳定事实和未闭环事项写回对应笔记。

## Current Scope

场景式 IA 重构（D-123 / D-124）已确认并进入执行：站点改为「启动页 → 首页 → 项目矩阵」三场景下滑串联的场景式架构，首页主 tab 为 Blog / Photos / Resume / Projects；文章、相册（含灯箱）、简历、单项目页保持传统文档页。

- 当前 `/` 从 D-105 数字手账基线替换为场景壳（SceneRoot）：三场景在一屏滚动序列内串连，Lenis 平滑滚动驱动，场景动效用 React islands + motion（数据仍由 Astro 构建期注入）；
- 场景 1 仍是 oil-motion 启动页：点阵纸、暖白纸、草地由网页静态层提供，alpha-atlas CSS sprite + ScrollTrigger scrub，K0–K4 球→嘉乐→人左进右出→摔入首页；人物与嘉乐资产已冻结（D-118/D-119/D-120）；
- oil-motion CP2 Seedance Pilot 仍由包子按已批准 Motion Brief 执行；Harness 不提前制作图集或部署 Cloudflare；WebGL / Canvas 仍为停止条件，不得静默引入；
- 书影音（books/music/movies/drinks）集合保留，退出主导航，作为归档路由存在；thoughts 并入 blog、ai-works 并入 projects，逐条 301 迁移（P6）。

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

阶段 C 的目标内容与路由为 Blog / Photos / Resume / Projects（D-123 取代原五入口）。Thoughts 并入 Blog；AI Works 并入 Projects；Books / Movies / Music 保留为归档路由退出主导航；Drinks 逐条确认去向。

## Intro Hard Gates

- CP0 不生成、补画、inpaint 或重绘生产人物、小狗、球和手写资产，也不创建视频、Rive 或 `handoff-final` 二进制素材。
- `design-assets/intro/source/` 与 reference 永不复制到 `public/` 作为生产素材。
- 现有 A1 默认模式必须是 production；缺失或无效时显示稳定 HTML 首页，不自动显示 placeholder。
- placeholder 只允许开发环境 `?assetMode=placeholder` 或测试显式加载。
- D-115 的六张生产 Sheet、八帧、Alpha、朝向与负载合同继续约束现有 A1 实验，不自动成为未来视频 / Rive 合同。
- 未来混合方案仍保持第一拍只有球、主运动因果清楚、最终静止和关键资源 ≤6MB；具体素材合同从 CP1 起冻结。
- Canvas / WebGL 运行时与游戏引擎禁止（D-121）；React 仅允许用于场景壳与灯箱等交互动效 islands（D-124）；Lenis 用于全站平滑滚动（D-124）；启动页仍为 alpha-atlas CSS sprite（D-121）。Rive 仅可在 CP4 人工放行后以原生 Web Runtime 制作隔离样片；启动页 alpha-atlas 预算若选择 `chroma-video`，必须停止并建立新决策（D-123 起），不得静默引入 WebGL / Canvas 运行时。

## Code Conventions

- Bun 是唯一包管理器和脚本入口；`bun.lock` 为准，不提交 `package-lock.json` 变化。
- 路径别名 `@/*` → `src/*`；组件、样式和 lib 导入使用别名。
- Astro frontmatter 承担构建期数据，无运行时全局 store 或 DI。
- 客户端行为优先 TypeScript 模块；旧全站原生脚本仍在 `public/scripts/`，阶段迁移时干净删除。
- 原生 CSS，无 Tailwind。v2.1 新 token 来自 design spec；不得继续扩展 BaoziHand / IoskeleyMono 旧字体系统。
- React islands 仅用于需要交互动效的场景与灯箱；数据仍由 Astro 构建期注入，React 不承担数据获取（D-124）。
- 代码自解释：命名表意、函数保持短小，不写解释性注释。注释只用于代码无法表达的约束，一句话、不写段落，并引用相关 D-xxx 或契约。界面与必要注释用中文。
- 不引入 `any`；未知输入用 `unknown` 与验证函数。
- 单文件不超过 500 行。现有例外：`src/styles/global.css`（D-105 遗留，阶段 C 迁移时拆分）、`src/components/home-v2/home-v2-preview.css`（CP5 接入运行时拆分）。
- `src/` 按领域分目录组织：`components/<area>/`、`lib/<area>/`、`pages/<section>/`。新代码进入对应领域目录，不在层根平铺。
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
- 截图与录屏只作为评审材料；AI 不以自己的视觉判断放行视觉变更，视觉与构图的通过权在包子的 checkpoint 人工评审。
