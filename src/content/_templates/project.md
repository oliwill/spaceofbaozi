---
title: 作者填写项目名称
intro: 作者填写项目解决的问题或完成的事，用一句话说明。
date: 待填写真实记录日期
role: 我负责……（作者填写具体责任范围，不能把团队成果写成个人完成）
kind: 待填写 work 或 personal
draft: true
approved: false
images: []
---

填写前先把 date 改成真实记录日期（YYYY-MM-DD）；它不代表任职或交付周期。kind 由作者确认后填写 work 或 personal，不预填项目类型。文件名就是现有项目 slug，标题修改不改 URL。

公开项目必须有非空 title、intro、role 和 kind。role 写完整的“我负责……”句子，不自动添“主导”或“独立”等结论。正文至少说明问题和我的贡献，章节名可按真实材料调整；编辑批准不能用标题匹配替代事实审核。未确认的项目继续保持 draft:true、approved:false，只有两者分别为 false、true 才能进入列表、详情、首页引用与分享摘要。

可选 frontmatter 字段：
- periodLabel：经过确认的年份或项目时间范围，不从 date 推断。
- status：ongoing 或 completed；没有依据就省略，状态不参与批准或排序。
- link：已经确认可公开的 http/https URL；没有批准目标就留空并删除该字段。
- linkLabel：访问项目或查看代码；有 link 且省略标签时显示“访问项目”，没有 link 不显示按钮。
- updated：修订记录日期。
- images：已经分别批准的项目材料清单，每项登记 src、width、height、alt，可选 credit、同比例 variants（src、width、height）。src 只能是本站 /assets/projects/ 下的 png、jpeg、jpg、webp 或 avif，禁止外部 URL、查询、编码穿越、父目录和符号链接。宽高必须是确切正整数，alt 必须准确说明图片信息。
- cover：可选字符串，公开时必须与 images 中一项 src 完全一致；没有合适图就省略，不补封面图槽。coverAlt、coverCredit 可覆盖封面的说明和署名，不以项目标题代替截图说明。

项目正文、每张截图、链接与说明分别需要作者确认。images 是资源清单，不是额外批准开关，也不会自动生成画廊。材料获准公开前放在 public 和构建导入范围之外，不因脱敏或版式批准就迁入公开资源。工作项目先检查保密约定、客户信息、内部界面、账号信息与同事隐私。

## 问题

说明需要解决什么、面向谁，以及关键约束。用可以公开且能核实的材料填写，删除这段说明。

## 我的贡献

说明本人具体负责、决定和交付了什么。写清责任边界与团队分工，不只罗列工具或技术栈，不推断客户身份或同事职责。填写后删除这段说明。

## 过程

可选章节；没有材料时连同标题删除。保留解释取舍与判断的关键步骤，图片跟随对应段落，不把截图堆在页首。

正文图片放在解释对应材料的段落之后。以下是可删除的写法示例，示例不代表素材批准。先替换已批准文件的确切路径，再把 width、height 的占位值替换为核对图片得到的正整数像素宽高；alt 准确说明实际截图信息，不用项目标题代替。图注与署名也要分别确认，并在 images 登记相同路径和尺寸。没有获准图片时删除整个示例。

```html
<figure>
  <img
    src="/assets/projects/REPLACE_WITH_APPROVED_IMAGE.png"
    width="REPLACE_WITH_EXACT_WIDTH"
    height="REPLACE_WITH_EXACT_HEIGHT"
    alt="作者填写截图中实际信息的准确说明"
    loading="lazy"
    decoding="async"
  />
  <figcaption>作者填写经过确认的图注及必要来源署名。</figcaption>
</figure>
```


## 结果

可选章节；没有材料时连同标题删除。只写实际交付和已经观察到的变化。指标必须注明来源、统计范围、时间口径和成果归属，且经过作者确认；没有数据就不补百分比、增长量或影响人数。进行中项目可说明目前完成的部分。

## 反思

可选章节；没有真实结论时连同标题删除。说明可以由材料支持的判断，不为凑完整结构编造经验。
