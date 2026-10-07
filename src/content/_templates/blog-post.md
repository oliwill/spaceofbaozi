---
title: 标题
description: 一句话摘要
date: "填写首次发布日期（yyyy-MM-dd）"
tags: []
draft: true
approved: false
---

正文从这里开始。使用普通 Markdown 标题、段落、列表、链接和图片。

## 写作与图片

图片上传前确认整张图片可公开、来源和使用许可已确认。Pages CMS 的正文与封面使用 `blog_images` 媒体源；图片保存到 `public/assets/blog/`，正文引用逻辑路径：

```markdown
![说明图片内容](/assets/blog/approved-image.webp)
```

示例路径只是格式说明，不代表存在或已批准的图片。封面为单个字符串，例如 `cover: /assets/blog/approved-image.webp`；另填 `coverAlt` 与 `coverCredit`。可切到 Source 模式检查 Markdown。

## 创建与修订

- 模板位于 `_templates`，不会作为文章收录。复制后必须填写真实标题、摘要和首次发布日期；日期示例不是可发布值。
- 创建时手工确定稳定英文短横线文件名，如 `my-first-post.md`。不新增 `slug` 字段。改标题继续保存原文件，不改文件名、URL 或首次发布日期。
- 未修订时完全省略 `updated` 键；有修订才填 `updated: 2026-10-06`。CMS 空日期的实际保存结果尚未验证，接入前须确认留空能省略键；若产生空字符串或 null，停止接入并报告差异。
- `featured`、`status`、`link` 是显式支持的可选字段。编辑已有文章时核对其原值；不要复制未知属性或私密备注。

## 公开门禁

新稿使用真实布尔值 `draft: true`、`approved: false`，不能写成带引号的字符串。只有包子明确批准正文、图片和来源后，才在同一次保存中改为 `draft: false`、`approved: true`；两项同时满足才能进入生产列表与详情。

CMS 草稿会写入 GitHub 仓库，草稿门禁不提供私密存储。所有输入 CMS 的材料都必须已经可公开。当前只完成本地配置，不连接账号、不保存到托管 CMS、不提交、不推送、不部署。后续经授权并验证托管保存往返、构建及公开产物检查后，才按独立发布流程执行。表单只显示 Blog、禁用文章重命名与删除属于 UI 范围控制，不是 GitHub 权限沙箱，也不保证媒体删除已关闭。
