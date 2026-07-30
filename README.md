# baozi.space

**中华一番包子铺** — 包子的个人网站、公开档案与数字手账。

> 打开一本属于包子的手账，在纸张、照片、标签和手写记录之间认识他的文章、想法、摄影、酒、书、音乐和 AI 创作。

## 技术栈

- [Astro 5](https://astro.build) 静态站点
- Markdown Content Collections（八个栏目）
- 纯 CSS + 少量原生 JS（首页开本 / 拖动 / 栏目过渡）

## 产品与规范

- V2 产品需求：[`baozi-space-prd.md`](./baozi-space-prd.md)
- Phase 0 基线与 Phase 1 用户内容输入：[`docs/project/`](./docs/project/)
- 素材加工基线：[`baozi-space-assets.md`](./baozi-space-assets.md)
- [`baozi-space-spec.md`](./baozi-space-spec.md) 是 V1 历史设计规格，不再作为 V2 实施依据
- [`demo/`](./demo/) 是早期只读参考，不再作为生产入口

## 本地开发

```powershell
cd E:\baozi
bun install
bun run dev
```

打开 `http://127.0.0.1:4321/`。

其它命令：

```powershell
bun run build    # 输出到 dist/
bun run preview  # 预览生产构建
```

## 目录结构

```text
src/
  pages/           # 路由：首页 + 八栏目列表/详情
  components/      # 布局与列表组件
  content/         # Markdown 内容（生产数据源）
  styles/          # global + journal
  lib/sections.ts  # 栏目元数据
public/
  scripts/journal.js
  favicon.svg
demo/              # 已确认的静态 demo 归档
```

## 如何新增内容

在对应目录新建 `.md` 文件，例如 `src/content/blog/my-post.md`：

```md
---
title: 标题
description: 摘要
date: 2026-07-22
tags: [标签]
draft: false
---

正文……
```

栏目目录：

| 栏目 | 路径 | 路由 |
|------|------|------|
| Blog | `src/content/blog` | `/blog` |
| Thoughts | `src/content/thoughts` | `/thoughts` |
| Photos | `src/content/photos` | `/photos` |
| Drinks | `src/content/drinks` | `/drinks` |
| Books | `src/content/books` | `/books` |
| Music | `src/content/music` | `/music` |
| About | `src/content/about` | `/about` |
| AI Works | `src/content/ai-works` | `/ai-works` |

## 当前阶段

现有 Astro 生产骨架可运行，但 **V2 正式页面开发尚未开始**。当前执行 Phase 1 产品与内容定义，高保真设计确认前不迁移 V2 原型。

已完成：

- 生产骨架、八个内容集合、栏目列表与详情页
- `bun run check` 与 `bun run build`；当前生成 27 个静态页面
- Phase 0 仓库、页面、内容、素材和规范基线
- 选定 `binder-archive（透明活页档案 + 周记网格主页）` 为 V2 唯一视觉论题
- V2 PRD、决策记录、逐页内容输入表和现有内容批准清单

下一步：

- 用户完成 `docs/project/phase-1-content-input.md` 第一轮输入
- 逐条确认 `docs/project/content-approval-register.md`
- 关闭 Phase 1 后建立 Linear 项目骨架
- Phase 2 设计规范与图片 Style Recipes
- 交互原型、高保真确认、正式开发、QA
- Cloudflare Pages 预览、生产部署与域名绑定

## Demo 预览

静态 demo 可直接打开 `demo/index.html`，或：

```powershell
cd E:\baozi\demo
python -m http.server 4173
```
