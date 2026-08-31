# baozi.space

**中华一番包子铺** — 包子的个人网站、公开档案与个人工作空间。

> 当前 `/` 仍运行 D-105 数字手账回滚基线；当前唯一生产方向是 D-121 的 oil-motion 帧映射方案：低对比点阵纸、暖白大纸、水彩草地由网页静态层提供，Seedance 只生成角色语义动作，以及已批准的 Home v2 人物与嘉乐。当前执行 CP0.5 架构与文档同步，关键帧与 Identity Bible 确认前不生成 Seedance 动作、不制作图集。

## 技术栈

- Astro 5 静态站点 + Markdown Content Collections + TypeScript
- 原生 CSS；现有 A1 实验使用 GSAP / ScrollTrigger、DOM/CSS Sprite 和 SVG leash
- 启动页采用 oil-motion 帧映射：GSAP/ScrollTrigger 管理滚动进度与降级，Alpha 图集 + DOM/CSS Sprite 渲染；Home v2 首选原生 Rive Web Runtime，均须按 CP1–CP7 检查点单独放行
- Bun 包管理与脚本运行
- Vitest、Playwright 与 Sharp 负责行为、视觉和素材审计

## 产品与规范

- 产品与内容责任：[`baozi-space-prd.md`](./baozi-space-prd.md) v2.1
- 全站设计规范：[`docs/design/baozi-space-design-spec.md`](./docs/design/baozi-space-design-spec.md) v2.1
- 启动页 oil-motion 计划：[`2026-08-21-baozi-space-oil-motion-project-plan.md`](./2026-08-21-baozi-space-oil-motion-project-plan.md)（D-121）
- 旧混合动画设计（历史）：[`2026-08-18-baozi-space-hybrid-animation-design.md`](./2026-08-18-baozi-space-hybrid-animation-design.md)
- 旧 CP0–CP7 检查点（历史）：[`2026-08-18-baozi-space-hybrid-animation-checkpoints.md`](./2026-08-18-baozi-space-hybrid-animation-checkpoints.md)
- 现有 A1 动画与素材契约：[`docs/intro/`](./docs/intro/)（仅约束滚动 Sprite 基线与动作参考）
- 项目重构路线：[`docs/plans/2026-08-13-v2.1-project-restructure.md`](./docs/plans/2026-08-13-v2.1-project-restructure.md)
- 决策记录：[`docs/project/decision-log.md`](./docs/project/decision-log.md)（最新 D-121）
- D-105 回滚与历史方向：[`docs/legacy/d-105-home.md`](./docs/legacy/d-105-home.md)
- 废弃 V1 spec 不得恢复；历史细节从 Git、legacy 归档与 `decision-log.md` 查阅

## 本地开发

```powershell
cd E:\baozi
bun install
bun run dev
```

打开 `http://127.0.0.1:4321/`。

其它命令：

```powershell
bun run build                 # 静态构建
bun run check                 # Astro / TypeScript 检查
bun run fonts:subset          # 当前生产基线的字体子集化
```

## 目录结构

```text
docs/design/              # v2.1 全站设计事实来源
docs/intro/               # 动画、资产与 Manifest 契约
docs/plans/               # 当前路线与实施计划
design-assets/intro/      # 非公开源稿、参考、外部交付与 QA
src/                      # 当前可运行 Astro 站；阶段 B/C 分步迁移
public/assets/intro/      # A0-H 后区分 placeholders / production
tests/                    # A0-H / A1 接入 Vitest 与 Playwright
```

## 内容与路由状态

当前 `src/content/` 仍有八个旧 collection，用于保持现有构建。v2.1 目标结构为：

| 一级入口 | 目标内容 | 目标路由 |
|---|---|---|
| Blog | 长文章 + Thoughts | `/blog`、`/blog/thoughts`、`/blog/<slug>` |
| Photos | 相册 / 摄影系列 | `/photos`、`/photos/<slug>` |
| Shelf | Books / Movies / Music | `/shelf`、`/shelf/<type>/<slug>` |
| Projects | 项目、工具、AI Works | `/projects`、`/projects/<slug>` |
| About | 个人简介、Now、联系 | `/about` |

阶段 C 先建立逐条迁移表和永久跳转验证，再移动内容并删除旧路由。Drinks 降级为标签或主题，每条旧记录的去向仍需用户确认。

新内容必须使用 `draft: true`；阶段 C 增加 `approved: false` 后，只有 `draft: false && approved: true` 才能进入生产。

## 当前阶段

D-121 已把启动页开场从「整屏 Seedance 视频」改为 oil-motion 帧映射方案；CP1 关键帧与 Identity Bible 已批准（D-122），当前进入 CP2 Seedance 动作 Pilot。

- 点阵纸、暖白大纸与草地由网页静态层提供；Seedance 2.5 只在纯色键背景上生成角色语义动作；
- oil-motion 固定到提交 `a5a384c804183d69529a85d2dcf84a7cfc99f7e4`；首选 alpha-atlas + DOM/CSS Sprite，WebGL 为停止条件；
- CP1 关键帧 K0–K4、Identity Bible、Motion Brief 与 Seedance Prompt 已批准（D-122）；CP2 只生成纯色键背景上的角色动作候选，不制作图集、不改运行时；
- Home v2 CP0 已批准的桌面 1440×900 / 移动 390×844 静态首屏保持不变。

后续按《baozi.space 启动页 Oil Motion 项目管理计划》的 CP1–CP7 逐 Checkpoint 放行；不得提前生成素材、修改运行时或制作 Rive。
