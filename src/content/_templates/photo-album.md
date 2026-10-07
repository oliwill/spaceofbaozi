---
title: 作者填写影集名称
description: 作者确认的引言
draft: true
approved: false
order: 0
photos: []
---

相册、每张照片和独立封面均须明确批准网站公开使用。上传、整理、版式批准不等于内容批准。私人原图放在 public 与构建导入范围之外。照片示例字段：id、src（/assets/photos/ 下本地图）、width、height、alt、draft:true、approved:false；可选 caption、credit、variants（同比例 src/width/height）。照片数组就是作者顺序。date 未知则省略，可填写 periodLabel。coverPhotoId 只能引用批准的照片；单独 coverImage 也需独立门禁；不再使用旧 cover 字段发布封面。

列表封面统一为 3:2 取景。可在相册 frontmatter 中添加 `coverPosition: { x: 50, y: 50 }`，x、y 分别为水平、垂直百分比，均须是 0–100 的有限数字；可以填写小数。省略时由列表按 50% / 50% 居中取景。该字段只控制列表封面，不写入 `photos` 或 `coverImage`，也不修改原文件、内页照片比例和阅读器显示。3:2 版式及封面取景获批不等于相册、照片或独立封面获准公开。

有效地址 /photos/影集slug#photo-照片id；每个 slug 片段 URL 编码。无效或无照片定位回到第一张。直接访问不读取历史续看；只有同一次访问中从列表重新打开会续看。
