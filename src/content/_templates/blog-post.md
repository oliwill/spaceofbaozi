---
title: 标题
description: 一句话摘要（列表卡片上显示）
date: 2026-07-24
tags: [标签1, 标签2]
draft: true
---

正文从这里开始。图片直接粘贴 PicGo 复制的 Markdown 链接（`![描述](https://图床URL)`），默认朴素居中显示。

要拍立得风时写原生 HTML：

<figure class="photo-frame">
  <img src="https://图床URL" alt="描述" />
  <figcaption>手写图注</figcaption>
</figure>

多图并排时写：

<div class="photo-grid">
  <img src="https://图床URL1" alt="描述1" />
  <img src="https://图床URL2" alt="描述2" />
</div>

写作约定：
- `draft: true` 写好再改 `false` 发布（草稿不进列表，详情页直接 404）。
- 文件名即 URL slug，用英文短横线命名，如 `my-first-post.md`。
- 写别的栏目：把文件放进对应目录（frontmatter 同 schema；可选 `cover: "https://图床URL"` 让列表卡片显示 16:9 封面）。
- 发布：仓库根目录跑 `npm run publish`（先字体子集化再 commit + push，Cloudflare Pages 自动构建上线）。
