# baozi.space

**中华一番包子铺** — 包子的个人网站、公开档案与个人工作空间。

> 当前生产代码仍运行 D-105 数字手账版本；已确认的 v2.1 目标是低对比无限点阵环境、暖白大内容纸、五个一级入口，以及可跳过的水彩剪纸开场。旧实现是迁移基线，不再是设计依据。

## 技术栈

- Astro 5 静态站点 + Markdown Content Collections
- 原生 CSS；开场使用 GSAP + ScrollTrigger、DOM/CSS Sprite 和 SVG leash
- Bun 包管理与脚本运行
- Vitest / Playwright / Sharp 将在 A0-H 与 A1 接入

## 产品与规范

- 产品与内容责任：[`baozi-space-prd.md`](./baozi-space-prd.md) v2.1
- 全站设计规范：[`docs/design/baozi-space-design-spec.md`](./docs/design/baozi-space-design-spec.md) v2.1
- 开场动画与素材契约：[`docs/intro/`](./docs/intro/)
- 项目重构路线：[`docs/plans/2026-08-13-v2.1-project-restructure.md`](./docs/plans/2026-08-13-v2.1-project-restructure.md)
- A0-H / A1 双轨计划：[`docs/plans/2026-08-13-intro-dual-track-implementation.md`](./docs/plans/2026-08-13-intro-dual-track-implementation.md)
- 决策记录：[`docs/project/decision-log.md`](./docs/project/decision-log.md)（最新 D-108）
- 实物素材加工：[`baozi-space-assets.md`](./baozi-space-assets.md)
- 废弃原型、V1 spec 和中间 handoff 已删除；历史决策由 Git 与 `decision-log.md` 保留

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

A0-H、桌面 A1 实现与 A0-V v1.2 生产素材轨道已经完成：

- v2.1 设计规范、纸上拼贴决策、动画契约和资产生产契约已经归位；
- 六组 production Sprite、C2 透明水彩草地、最终静态图、Manifest、审计和原子发布已经落地，运行时图片负载 3,474,820 bytes；
- `/lab/intro` 已覆盖可逆八拍、placeholder / production 双轨、跳过、reduced motion、失败回退和三个桌面视口；
- D-112 已修复 1280×720 牵引绳坐标、人物动作局部计帧，并将小狗绕圈改为脚边原地停下；
- 当前验证结果：unit 9/9、Playwright 16/16、Astro check 0 error、静态构建 24 页。

当前门禁仍是 A1 人工视觉确认，阶段 B 首页整合尚未放行。下一步：

1. 复核修正版录屏中的牵引绳和人物尺度；
2. 关闭 82% 换场连续性、前段节奏和草地视觉权重问题；
3. 确认人物、小狗与草地的最终印刷／像素风格方向；
4. 后续单独确认人物与小狗头部随指针移动的素材结构；
5. A1 通过后进入阶段 B 首页重建。

当前不做完整首页重写、内容集合迁移、移动端开场、冬季素材或 Cloudflare 发布。
