# baozi.space

**中华一番包子铺** — 包子的个人网站、公开档案与数字手账。

> 打开一本属于包子的手账，在纸张、照片、标签和手写记录之间认识他的文章、想法、摄影、酒、书、音乐和 AI 创作。

## 技术栈

- [Astro 5](https://astro.build) 静态站点
- Markdown Content Collections（八个栏目）
- 纯 CSS + 少量原生 JS（首页开本 / 拖动 / 栏目过渡）

设计规格见 [`baozi-space-spec.md`](./baozi-space-spec.md)。  
已确认的桌面端交互 demo 保存在 [`demo/`](./demo/)（只读参考，不再作为生产入口）。

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

正式开发进行中。已完成：

- 生产骨架 + 八个内容集合 + 栏目列表/详情页
- 首页按 Layout Guideline v1（spec §3.5）重建为单页平铺网点纸：四入口（Blog、Thoughts、Photos、About）+ 装饰、真实封面开本、触屏两步进入、装饰拖动、移动端纵向重排
- 中文字体子集化流水线（`fonts:subset`，源字体在 gitignored 的 `fonts-src/`）

尚未完成：

- 首页四入口的真实物件素材（相机、便利贴、手账本、包子）与装饰素材投产
- 移动端独立手账叙事（当前为纵向重排过渡方案）
- 栏目内页模板深化（纸张/批注编辑语言）
- 域名部署与旧 Gridea 内容迁移

## Demo 预览

静态 demo 可直接打开 `demo/index.html`，或：

```powershell
cd E:\baozi\demo
python -m http.server 4173
```
