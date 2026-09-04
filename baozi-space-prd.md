# baozi.space PRD

**产品名：** 中华一番包子铺

**版本：** V2.1 Current

**更新时间：** 2026-08-19

**文档状态：** 产品、信息架构、内容责任与发布门禁已按 D-106 / D-107 对齐；首页首屏已按 D-116 调整为 Home v2 左文右角色基线；启动页开场已按 D-121 改用 oil-motion 帧映射方案；个人正式内容仍需逐条批准

**生产基线：** Astro 静态站 `E:\baozi`；当前 D-105 页面保留运行，等待阶段 B / C 重建

**设计事实来源：** `docs/design/baozi-space-design-spec.md` v2.1

> 本 PRD 只定义产品目标、信息需求、内容责任、路由语义和发布门禁。视觉、构图、动效、响应式和角色素材以 v2.1 设计规范及 `docs/intro/` 契约为准；冲突时设计规范优先。

## 文档地图

- 全站设计规范：`docs/design/baozi-space-design-spec.md`
- 纸上拼贴与水彩角色决策：`docs/design/paper-collage-watercolor-design.md`
- 开场动画与素材契约：`docs/intro/`
- 当前实施路线：`docs/plans/2026-08-13-v2.1-project-restructure.md`
- 开场双轨实施计划：`docs/plans/2026-08-13-intro-dual-track-implementation.md`
- 用户内容输入：`docs/project/phase-1-content-input.md`（旧阶段名保留为历史文件名）
- 内容批准清单：`docs/project/content-approval-register.md`
- 已确认决策：`docs/project/decision-log.md`
- 实物素材管线：`baozi-space-assets.md`

## 标记约定

- **Confirmed：** 用户已经确认，后续工作必须遵守。
- **Requirement：** 为实现产品目标必须满足。
- **User Input：** 个人事实、正式文案或素材，必须由用户提供或明确批准。
- **Open：** 尚未决定；Open Questions 表标明最迟关闭阶段。
- **阶段：** 当前采用 A0-H / A0-V / A1 / B / C / D / E，定义见第 12 章。

---

# 0. 执行摘要

## 0.1 产品一句话

`baozi.space` 是包子的个人档案与个人工作空间：访客在低对比无限点阵环境和暖白大内容纸上，阅读文章、照片、书影音、项目与个人近况；一段可跳过的水彩剪纸开场负责介绍包子和小狗，但不阻塞内容。

## 0.2 用户应获得的结果

访客不需要理解动效即可：

1. 在十秒内理解网站主人、网站用途和主要内容；
2. 直接进入 Blog、Photos、Shelf、Projects 或 About；
3. 阅读首页精选与各分区近期内容；
4. 直接收藏、分享和返回任何正式 URL；
5. 在桌面、手机、键盘、无 JavaScript 和减少动态效果模式下完成核心任务。

## 0.3 当前项目阶段

| 项目 | 状态 |
|---|---|
| 技术骨架 | Astro 5 静态站可构建；`/` 已切换为场景式 IA（D-123/D-124）：三场景一屏滚动串联 + Lenis + React islands + motion |
| Home v2 | 作为场景 2 视觉基线（D-118 冻结构图复用），不再是独立首页 |
| 启动页开场 | 场景 1 仍为 D-121 oil-motion alpha-atlas scrub；CP2 Seedance Pilot 由包子执行 |
| A1 `/lab/intro` | D-115 滚动 Sprite 实验保留为动作参考，不再是新开场方向 |
| 目标 IA | 四入口（Blog / Photos / Resume / Projects）已确认并落地；thoughts→blog、ai-works→projects 迁移已执行（301 写入 `public/_redirects`）；书影音保留为归档路由 |
| 用户正式内容 | 尚未完整批准，不满足生产发布门禁 |
| Cloudflare Pages | 尚未接入 |

## 0.4 核心边界

- 开场动画是可跳过叙事，不是加载器，也不是内容前置门禁。
- 无限点阵只是环境，不是可拖拽或缩放的无限画布。
- 正式页面使用真实 HTML、语义链接和稳定 URL，不把关键信息烤进图片或视频。
- 用户个人事实、经历、介绍和正式内容不得由 AI 虚构。
- 当前只执行 oil-motion CP0.5 架构与文档同步；关键帧与 Identity Bible 确认前，不生成 Seedance 动作、不制作图集、不修改现有动画实现。

---

# 1. 产品定义

## 1.1 要解决的问题

当前个人内容分散在旧博客、社交平台、图片和本地记录中。传统博客能阅读但难以体现个人审美；自由拼贴能体现个性但容易让访客不知道从哪里开始。

V2 需要同时解决：

1. **身份不清：** 首次访问者不能快速理解包子是谁。
2. **用途不清：** 访客不知道网站包含什么、为何值得继续浏览。
3. **内容入口不稳定：** 视觉物件和栏目之间缺少统一规则。
4. **首页秩序不足：** 装饰、问候、栏目与更新争夺注意力。
5. **内容长期维护：** 新内容必须继续通过 Markdown、Git 和稳定 URL 生长。

## 1.2 产品目标

### G1 · 十秒理解

首页稳定状态无需播放开场动画，也能让访客理解：

- 这是包子的个人网站；
- 它是一份持续生长的个人档案与工作空间；
- 包子的简短身份与关注主题；
- 如何进入五个一级入口。

### G2 · 一分钟找到内容

访客进入主页后，可以在一分钟内：

- 打开 Blog 主文章；
- 找到 Photos、Shelf、Projects 与 About；
- 返回主页或上一级；
- 识别内容日期、类型和状态。

### G3 · 视觉与阅读属于同一个系统

首页、栏目总览和详情页必须共用：

- 固定原点的低对比点阵环境；
- 暖白大内容纸与 12 列编辑网格；
- 思源宋体标题、系统无衬线正文和极少量手写素材；
- 可预测的内容层级、语义链接与返回路径；
- 克制的材料层，角色和装饰不遮挡内容。

具体参数与禁用项由 `docs/design/baozi-space-design-spec.md` 定义。

### G4 · 用户声音可信

所有正式身份、介绍、栏目说明、内容正文和图片来源都可追溯到用户输入。Codex 可以整理和润色，但最终版本必须由用户确认。

### G5 · 可持续维护

新增内容仍以 Markdown / MDX 为主，不要求进入页面代码，不依赖不可迁移的 CMS。

## 1.3 非目标

V2 当前不做：

- 用户账号、评论、私信、点赞或社区关系；
- 自由拖拽、持久化或无限缩放的画布；
- 完整物理模拟的 3D 活页本或翻书引擎；
- 将开场做成不可跳过的加载器；
- 在访问路径中调用生成式 AI；
- React、Three.js、PixiJS、Rive、Lottie、Lenis 或游戏引擎；
- 电商、餐饮菜单或付费结算；
- 为少量内容预先建立复杂筛选系统；
- 用生成图片承载重要长文或唯一导航文字。

## 1.4 产品原则

1. **内容先于装饰。**
2. **动作讲故事，不制造进入障碍。**
3. **一个入口只承担一种主要意图。**
4. **所有视觉导航都有语义和文字等价物。**
5. **真实内容先进入设计，再生产素材。**
6. **桌面和手机共享信息层级，但分别排版。**
7. **动效可以消失，内容不能消失。**
8. **占位内容不等于用户内容。**

## 1.5 受众需求

本项目不以虚构人物画像作为决策依据，按真实访问意图划分：

| 访问意图 | 需要快速获得 |
|---|---|
| 第一次认识包子 | 身份、关注主题、网站用途、推荐起点 |
| 从外链进入某篇内容 | 清晰正文、来源/日期、所属栏目、返回路径 |
| 回访者 | 最近更新、栏目索引、稳定 URL |
| 未来合作或联系 | 可信个人介绍、公开边界、用户批准的联系方式 |
| 包子本人 | 可维护的 Markdown、草稿保护、图片与发布流程 |

---

# 2. 范围、责任与内容所有权

## 2.1 已锁定与可调整

| 已锁定 | 仍需用户输入 | 后续阶段实现 |
|---|---|---|
| 个人档案 / 个人工作空间定位 | About 长版、城市与联系方式公开边界 | 天气提供方与失败回退文案 |
| 点阵环境 + 暖白大纸 + 克制拼贴 + 水彩剪纸角色 | 五个一级入口的正式中文页面文案 | 首页与栏目真实内容编排 |
| Blog / Photos / Shelf / Projects / About | Shelf 三类首发内容；Drinks 逐条迁移去向 | 旧 URL 永久跳转与内容迁移 |
| Astro 静态架构与 Markdown 内容 | favicon、OG、署名与许可 | A0-H / A0-V / A1 / B / C / D / E 路线 |
| 正式内容由用户提供并批准 | 生产 Sprite 的外部视觉交付 | 性能、无障碍与发布 QA |

## 2.2 责任矩阵

| 工作 | 包子 | Codex |
|---|---|---|
| 个人事实、经历、身份 | 提供并批准 | 不虚构；整理结构 |
| 网站目的与语气 | 提供原始表达并批准 | 提供编辑建议 |
| 栏目收录边界 | 最终决定 | 提示重叠和缺口 |
| 正式文章、照片、作品 | 提供并确认可公开 | 检查字段、排版和 alt |
| 页面需要哪些信息 | 共同确认 | 起草产品结构 |
| 交互与设计方案 | 审批 | 产出与迭代 |
| 工程实现与 QA | 验收 | 实现、测试和记录 |
| 发布与域名 | 批准生产发布 | 准备配置和回滚方案 |

## 2.3 内容状态

| 状态 | 含义 | 可用于设计 | 可用于生产 |
|---|---|---:|---:|
| Placeholder | 系统占位或结构示例 | 只可测试结构 | 否 |
| Raw | 用户原始信息，尚未整理 | 是 | 否 |
| Draft | 已整理，等待用户确认 | 是 | 否 |
| Approved | 用户明确确认，并记录在内容批准清单 | 是 | 可以进入发布候选 |
| Published | Approved 内容已通过 schema、QA 并公开 | 是 | 是 |

这些是**编辑工作流状态**，不等同于当前代码 schema。阶段 C 实现内容迁移前，以 `docs/project/content-approval-register.md` 记录批准状态；任何未标为 Approved 的现有内容都不得因 `draft: false` 自动获得发布资格。

---

# 3. 信息架构

## 3.1 v2.1 目标路由树

```text
baozi.space
│
├── /                         首页精选与五个一级入口
├── /lab/intro                桌面开场实验页，不进入正式导航
├── /blog                     长文章与近期文章
│   ├── /blog/thoughts        短想法流
│   └── /blog/<slug>          文章详情
├── /photos                   相册总览
│   └── /photos/<slug>        相册详情
├── /shelf                    Books / Movies / Music 总览与类型筛选
│   └── /shelf/<type>/<slug>  书影音详情
├── /projects                 项目总览
│   └── /projects/<slug>      项目详情
├── /about                    About 与 Now
└── 404                       无效或未公开路径
```

旧 URL 迁移：

- `/thoughts/*` → 对应 `/blog/*` 或 `/blog/thoughts`；
- `/ai-works/*` → 对应 `/projects/*`；
- `/books/*`、`/music/*`、`/movies/*` → 对应 `/shelf/<type>/*`；
- `/about/me` → `/about`；
- `/drinks/*` 逐条确认进入 Blog 或带 Drinks 标签的合适内容类型，禁止整栏盲跳。

所有曾公开内容必须逐条建立永久跳转；迁移清单完成前保留当前路由模板。

## 3.2 页面层级

```text
Level 0  可选开场：球 → 狗 → 人 → 摔入首页；可跳过、可回滚、可降级
   ↓
Level 1  首页：身份 / Blog 主内容 / Photos 预告 / Shelf / Projects / About
   ↓
Level 2  栏目总览：栏目说明 / 精选或近期内容 / 类型筛选 / 空状态
   ↓
Level 3  内容详情：完整内容 / 元数据 / 关联内容 / 返回路径
```

## 3.3 导航契约

- 一级导航固定为 `Blog / Photos / Shelf / Projects / About`。
- Thoughts 是 Blog 的内容形态；Books、Movies、Music 是 Shelf 的类型；AI Works 是 Projects 类型；Drinks、Devices、Apps 是标签或主题，不进入一级导航。
- `/lab/intro` 是实验页，不进入正式导航和 SEO 主路径。
- 首页、栏目和详情使用真实链接；动画不得改变 URL 语义、刷新、后退、新标签和复制链接行为。
- 生产发布门禁：Blog、Photos、Projects 各至少 1 条真实已批准内容；Shelf 的 Books、Movies、Music 各至少 1 条；About 使用已批准完整内容。
- 零条有效内容只允许作为预览或迁移回退：保留 URL、显示“正在整理”、设置 `noindex`，并从精选和更新计算中排除。

## 3.4 当前生产与目标结构的边界

当前 `src/` 仍包含八个旧 collection、D-105 首页与 `BookSpread`。这些是可运行基线，不是 v2.1 设计依据。A0-H / A1 期间不得为追求目录表面一致而提前移动内容；阶段 C 先建立迁移表和重定向验证，再完成干净切换。

---

# 4. 页面需求

## 4.1 首页 `/`

### 页面任务

1. 在稳定 HTML 状态中说明包子是谁、这里记录什么；
2. 以 Home v2 左侧中文信息与右侧人物 / 嘉乐定帧建立唯一首屏落点；
3. 提供五个一级入口；
4. 首屏后按 Blog → Photos → Shelf → Projects → About → Footer 组织内容；
5. 接住开场最终人物与小狗落点，但不依赖动画才能阅读。

### 功能要求

- **FR-HOME-01：** 桌面首屏左侧 4–5 列为中文信息，右侧 6–7 列为人物与嘉乐 `handoff-final` 定帧，底部只露出 Blog 下一分区 8%–12%。
- **FR-HOME-02：** 左上角显示粗粒度天气；失败时显示本地时间或简短问候，不阻塞内容。
- **FR-HOME-03：** 首页左上角不显示网站名称；网站名称保留在 title、metadata 和页尾。
- **FR-HOME-04：** 一级导航仅包含 Blog / Photos / Shelf / Projects / About。
- **FR-HOME-05：** 首页条目都能进入对应总览或详情，不复制完整正文。
- **FR-HOME-06：** 390×844 移动首屏按天气 / 导航、中文信息、人物与嘉乐、Blog 的顺序纵向排版；角色区不超过首屏约 40%，不得与信息互相遮挡，不等比缩小桌面构图。
- **FR-HOME-07：** 无 JavaScript、reduced motion、开场媒体失败、跳过或当前会话已完成时，都直接显示同一稳定 Home v2。

## 4.2 开场实验页 `/lab/intro`

### 页面任务

当前路由保留 D-115 的八拍滚动 Sprite 实验，作为可运行基线与动作参考；它不再定义新开场技术方向，也不承担完整首页开发。CP5 才允许让 `/lab/intro` 与 `/` 共用同一个 Home v2 组件。

### 当前实验要求

- **FR-INTRO-01：** 现有实验继续可在基准视口 1440×900 运行，保持约 300vh 外层滚动与 100svh sticky 舞台。
- **FR-INTRO-02：** 第一拍只有球；之后依次为狗、人物、共同奔跑、失衡、右侧离开、首页左侧进入、站起与小狗绕圈停下。
- **FR-INTRO-03：** 全段主方向从左向右，回滚只倒放时间线，不翻转 Sprite。
- **FR-INTRO-04：** 支持跳过、`prefers-reduced-motion`、会话完成和素材 / Manifest 失败回退。
- **FR-INTRO-05：** 默认运行时只加载 production；placeholder 只允许开发或测试显式启用。
- **FR-INTRO-06：** 禁用 JavaScript 时显示静态最终状态和普通首页链接。

现有 A1 的详细进度与模块接口见 `docs/intro/animation-contract.md`；生产开场的分镜、关键帧与共同定帧合同见 `docs/animation/oil-motion/` 与根目录《baozi.space 启动页 Oil Motion 项目管理计划》（D-121），后续继续按 CP1–CP7 逐阶段放行。

## 4.3 栏目总览页

### 共通要求

- 默认只显示 `draft: false && approved: true`；
- 标题和摘要不依赖封面；
- 使用稳定 URL 与清晰返回路径；
- 无有效内容时不显示空卡片墙；
- 视觉密度与页面类型相匹配，不套同一种卡墙。

### 页面差异

| 页面 | 目标 |
|---|---|
| Blog | 1 篇主文章，其余为两列或不等宽列表；Thoughts 作为更轻密文字流 |
| Photos | 以相册为单位；主相册允许受控 PhotoStack，次级相册保持清楚缩略图 |
| Shelf | 共用 Books / Movies / Music 骨架和类型筛选，但保留各自字段与统计语义 |
| Projects | 首位展示一个进行中项目；状态为 idea / building / shipped / archived |
| About | 简介、Now、关注主题、联系方式与少量个人物件；Now 必须带更新时间 |

## 4.4 内容详情页

- Blog 正文单列，最大宽度约 720px；大图可适度跨列但图注仍有明确对齐。
- Photos 详情支持横竖图节奏与可访问灯箱，关闭后焦点回到原图。
- Shelf 根据 `type` 显示书、电影/剧集或音乐专用字段，不维护重复正文。
- Projects 按“问题—过程—结果—反思”组织，章节按真实内容需要出现。
- 所有详情保留所属栏目、日期、标签、来源和返回路径；无图片、无 JavaScript 时正文仍完整可读。

## 4.5 About

About 是用户身份信息的正式来源。首页只引用短版；未经确认，不显示推断的职业、城市、经历或联系方式。`/about` 直接作为完整页面，旧 `/about/me` 永久跳转至 `/about`。

## 4.6 404、SEO 与分享

- 404 不区分不存在、草稿或已移动，提供主页和有效一级入口；
- 全站 title、description、favicon 与默认 OG 图必须由用户批准；
- 内容页元数据来自条目，分享图不得暴露未公开信息；
- 零条有效内容的回退页设置 `noindex`；
- 动画跳过、灯箱关闭和图标按钮使用明确中文可访问名称。

---

# 5. v2.1 目标栏目产品定义

| 一级入口 | 路由 | 产品角色 | 内容来源 |
|---|---|---|---|
| Blog | `/blog` | 长文章、近期文章与 Thoughts 短想法；完整正文唯一来源 | `blog` + 经批准迁移的 `thoughts` |
| Photos | `/photos` | 包子原创摄影的相册与摄影系列 | `photos` |
| Shelf | `/shelf` | Books、Movies、Music 的统一入口与类型筛选 | 迁移并规范化 `books` / `movies` / `music` |
| Projects | `/projects` | 可公开的职业项目、个人项目、工具与 AI 实验 | 经批准迁移的 `ai-works` + 新项目 |
| About | `/about` | 个人简介、Now、关注主题与联系方式 | `about` |

Shelf 子类型继续保留已确认业务语义：

- **Books：** 书籍记录、`currentlyReading`、简短感受与人工推荐，不设评分。
- **Movies：** 电影与剧集统一主记录，`kind: movie | series`；作品级完成事件、重看历史、看过/在看和首次完成热力图规则继续有效。
- **Music：** 专辑、EP 与歌单；近期记录与人工推荐，不设评分。

Drinks 不再是一级栏目。既有记录必须逐条决定迁入 Blog 还是其他带 Drinks 标签的结构；决定前保留文件与旧 URL，不计入新发布门禁。

**全站写作称谓：** 包子署名的访客文案如需第二人称，统一使用「妳」；第三方引文保持原貌；系统文案优先避免不必要的第二人称。
---

# 6. 内容模型与编辑规则

## 6.1 当前与目标 schema

当前统一 schema：

```yaml
title: string
description: string
date: date
tags: string[]
cover: string?
draft: boolean
status: string?
link: url?
featured: boolean
```

阶段 C 必须新增的通用门禁字段：

```yaml
approved: boolean      # 默认 false；用户已批准进入生产候选
updated: date?         # 可选；内容发生实质更新的日期
coverAlt: string?      # 有 cover 时必填
coverCredit: string?   # 非本人封面或需要署名时必填
```

- 可生成详情并进入列表的唯一条件是 `draft: false && approved: true`。
- 新模板默认 `draft: true`、`approved: false`。
- `status` 只描述内容语义状态，不控制公开与否。
- `Edit`、`Draft`、`Retire`、`Pending` 均映射为 `approved: false`。
- 构建成功只证明技术可生成，不证明内容可以生产发布。

目标内容结构以栏目职责分开，不强迫所有内容共享一套专用字段：

- `blog`：文章与 Thoughts 类型；完整文章正文的唯一来源。
- `photos`：相册 / 摄影系列及其有序图片。
- `shelf`：以 `type: book | movie | music` 判别，再校验类型专用字段。
- `projects`：项目状态固定为 `idea | building | shipped | archived`，界面同时显示中文解释。
- `about`：个人简介、Now、公开边界与联系方式。

## 6.2 发布要求

所有公开内容至少具备非空标题、摘要、有效日期、正文或说明、明确公开状态、必要图片 alt、非本人素材来源或许可，以及用户批准。

### Photos

- 相册主题、内部排版和图片顺序由包子确定，系统不得自动重排。
- 相册简介必填；逐图 caption 可选，但不能替代 alt。
- 家人照片不得发布；其他可识别人物必须确认已获同意，否则匿名化或不发布。
- 不在公开仓库保存含个人身份信息的同意材料。

### Projects

- 职业项目只使用已公开、可验证的信息，不公开内部数据、客户信息、内部截图或文件。
- 标题、类型、时间、状态、角色和一句话简介必填；其他章节按实际内容出现。
- `status` 使用设计规范固定枚举，不承担发布门禁。

### Shelf / Books

- 书名、作者、载体、公开状态、记录日期和简短感受必填。
- `currentlyReading` 是独立布尔字段，不能从自由文案推断。
- 不设数字或星级评分，不生成评分排行或算法推荐。

### Shelf / Music

- 名称、类型（专辑 / EP / 歌单）、艺人或创建者、记录日期和简短感受必填。
- 单曲、逐次播放、播放次数和自动历史不进入首发模型。
- 不设数字或星级评分，不生成算法推荐。

### Shelf / Movies

- 收录电影与剧集；综艺和网络视频排除。
- 统一主记录使用 `kind: movie | series`；剧集核心字段为 `seasonCount` / `episodeCount`，不建立逐季或逐集子记录。
- 每次完整看完写入作品级事件；重看新增事件。热力图只统计每个作品的首次完成。
- 当前公开状态“看过 / 在看”互斥；最近列表按最近活动排序，每个作品只出现一次。
- 不导入豆瓣评分、他人短评或平台排名。

### 旧 Drinks 内容

既有 Drinks 规则继续作为迁移输入：名称、类型、首次饮用日期、地点和简短感受必填，不设评分。它不再形成一级栏目或独立发布门禁；每条记录进入何种目标类型必须逐条确认。

## 6.3 发布门禁

- Blog、Photos、Projects 各至少有一条真实且已批准内容。
- Shelf 内 Books、Movies、Music 各至少有一条真实且已批准内容。
- About 使用用户批准的完整页面内容。
- 占位、布局样本、生成的假内容和未批准内容不计数。
- 任一目标门禁不满足时阻塞生产部署；预览环境保留稳定空状态和 `noindex`。

## 6.4 首页编辑规则

- `date` 是原始发布日期或记录日期；`updated` 是可选的实质更新日期。
- 首页 Blog 主视觉优先使用唯一有效的 `featured: true` Blog 内容；多个有效精选阻塞发布。
- 没有精选时回退到最新有效 Blog 内容；不得从 Shelf 或 About 猜测首屏主角。
- 首页其他分区各自从有效内容中选择近期或人工推荐条目，数量遵循设计规范 §2.3。
- 草稿、未批准和空栏目不参与首页内容计算。

## 6.5 占位内容

当前多个条目仍是可构建占位。阶段 C 迁移前必须设为 `draft: true`、Retire，或用用户真实内容完整替换并重新批准。不得仅通过 `status: draft-concept` 假设其不会公开，也不得生成假内容补足门禁。

跨栏目完整文章的规范 URL 始终位于 `/blog/<slug>`；其他栏目只保存结构化记录、摘要和关联链接，不复制正文。

---
# 7. 交互、响应式与降级要求

## 7.1 开场叙事

- 时间线由归一化滚动进度驱动，支持正向与反向播放。
- 姿态以 8–10 fps 离散切换，空间位移连续；外层位移与内层帧切换不得争用同一 transform。
- 提供“跳过动画”；完成后只写入当前会话状态。
- 默认访问只请求 production 资产；placeholder 必须由开发或测试显式启用。
- 生产素材或 Manifest 失败时直接进入稳定 HTML 首页，不显示调试素材。

## 7.2 常规交互

- 栏目、条目、返回路径使用真实链接。
- 文字链接通过下划线和箭头位移反馈；纸片按钮只用于明确命令。
- hover 位移不超过 3px，不以 hover 作为关键信息唯一入口。
- 灯箱和模态正确锁定、恢复焦点；图标按钮点击区域至少 40×40px。

## 7.3 响应式

- wide（≥1100px）使用 12 列；medium（768–1099px）使用 8 列；compact（<768px）使用 4 列。
- 移动端重新排版，不缩小桌面拼贴；大纸两侧保留 12–20px 点阵环境。
- 五项索引导航优先单行横向滚动；通过拥挤测试后才评估折叠菜单。
- `/lab/intro` 第一阶段只验收桌面；移动端简化开场属于阶段 D，但稳定首页必须一直可读。

## 7.4 Reduced Motion 与无 JavaScript

- `prefers-reduced-motion: reduce` 直接显示最终站立状态，不注册 ScrollTrigger。
- 禁用 JavaScript 时，首页核心内容、五项导航和普通链接保持可用。
- 任何降级都不能造成内容缺失、重叠或永久遮挡。

---
# 8. 技术与维护约束

## 8.1 技术基线

- Astro 5 静态输出、Content Collections、Markdown / MDX、TypeScript、原生 CSS。
- 开场运行时使用 GSAP + ScrollTrigger、DOM/CSS Sprite 与 SVG leash。
- 测试使用 Vitest 与 Playwright；资产检查使用 Sharp。
- Bun 是唯一包管理器和脚本入口；不提交 `package-lock.json` 变化。
- 不引入 React、Canvas、Three.js、PixiJS、Rive、Lottie、Lenis 或游戏引擎，除非性能证据和用户批准同时成立。

## 8.2 目录与责任边界

- `docs/design/`：全站设计事实来源。
- `docs/intro/`：开场动画与资产契约。
- `design-assets/intro/`：源稿、参考、外部交付暂存和 QA；永不作为公开 URL。
- `public/assets/intro/placeholders/`：仅显式开发 / 测试模式。
- `public/assets/intro/production/`：默认运行时资产。
- `src/components/intro/`：语义 DOM 与启动装配。
- `src/lib/intro/`：Manifest、帧选择、绳索、加载、最终状态和时间线。

## 8.3 性能与发布完整性

- 首页关键首屏资源压缩后目标 ≤1.5MB；完整桌面开场图片负载 ≤6MB。
- 首屏之外图片默认懒加载；动画主要写 transform、opacity 和必要 CSS 变量。
- 生产目录检测到 placeholder Manifest 时构建失败。
- `draft: true` 或 `approved: false` 不进入生产列表和详情。
- Cloudflare Preview 通过 QA 后才绑定生产域名，并保留 Git 回滚点。

---
# 9. 无障碍与质量门槛

质量审查顺序：交互正确性 → 无障碍 → 布局稳定 → 视觉系统 → 动效 → 性能。

- 鼠标能完成的核心操作，键盘也能完成；焦点始终可见。
- 跳过动画是容易到达的语义按钮；栏目和内容入口是语义链接。
- 有意义图片有 alt；纯装饰使用空 alt 或 CSS 背景。
- 正文和交互文字满足 WCAG AA 对比度目标。
- 不使用 `transition: all`，不动画会触发布局抖动的核心尺寸。
- 200% 页面缩放下导航、正文和操作不重叠。
- 问题分为 Blocking、Should fix、Nits；Blocking 未关闭不得进入下一阶段。

---
# 10. 交付优先级

## P0 · 可验证开场

- A0-H Manifest、占位 Sprite、审计与安全回退完成；
- `/lab/intro` 八节点、回滚、跳过和 reduced motion 可验证；
- 默认访问不泄漏 placeholder；check / build / unit / E2E 通过。

## P1 · 首页与 IA

- A0-V 生产素材通过审计；
- 首页稳定状态接入真实身份、Blog 主视觉和 Photos 预告；
- 五项一级导航与目标路由可达；
- 旧 URL 迁移清单完整。

## P2 · 内容可信与全站页面

- Blog、Photos、Shelf、Projects、About 模板完成；
- schema、模板和消费页面按迁移计划统一切换；
- 占位内容不公开，真实内容、alt、来源和批准状态完整。

## P3 · 发布完整

- 移动端、SEO、OG、favicon、404、RSS 或匿名统计完成取舍；
- Cloudflare Preview、生产域名与回滚方案验证。

---
# 11. 验收剧本

## A · `/lab/intro` 桌面叙事

在 1440×900 依次验证 0%、8%、25%、45%、65%、82%、90%、100%：第一拍只有球；狗与人物依次进入；人物从草地右侧离开并从首页左侧进入左侧身份区；最终人物与小狗完全静止。反向滚动回到每个节点时状态确定一致。

## B · 回退

- 点击跳过立即进入最终状态并写入当前会话；
- reduced motion 不注册时间线；
- production 资产或 Manifest 失败仍显示暖白大纸与 HTML 身份内容；
- placeholder 缺失使测试失败，不静默切到 production；
- 无 JavaScript 有普通首页链接。

## C · 直接内容访问

直接打开任意正式详情 URL，不依赖先经过开场；正文、返回路径、刷新、后退和新标签正常。

## D · 响应式内容

1280×720、1920×1080 验证开场几何；1024×768 和 390×844 验证稳定首页与五项导航无溢出、遮挡和不可达内容。

## E · 内容安全

`draft: true`、`approved: false`、占位和未批准内容不生成生产详情或参与精选；目标发布门禁不足时部署失败。

## F · 构建与发布

`bun run check`、`bun run build`、相关 Vitest、Playwright 和资产审计全部通过；开场图片负载 ≤6MB；Cloudflare Preview 覆盖主要路由且有回滚点。

---
# 12. 阶段与放行标准

## A0-H · Harness 素材契约与占位轨道

锁定目录、固定文件名、Manifest 类型、六组调试 Sprite、自动审计和 placeholder 泄漏门禁。完成后才允许 A1 基于接口开发。

## A0-V · 外部生产视觉轨道

外部流程交付六组真实 Alpha 水彩剪纸 Sprite、一张最终静态图和生产 Manifest。它可与 A0-H 并行，但必须通过 48 帧人工 QA 与 ≤6MB 审计。

## A1 · 桌面 `/lab/intro`

只实现可逆八拍叙事、跳过、会话状态、reduced motion、素材失败回退和八节点截图。几何评审可使用 placeholder；正式视觉批准必须等待 A0-V。

## B · 首页整合

将通过评审的最终状态接入真实首页：天气 / 回退、白纸索引导航、身份区、一个 Blog 主视觉、Photos 预告与后续分区。此阶段替换 D-105 首页实现。

## C · 全站页面与内容迁移

按 Blog → Photos → Shelf → Projects → About 建立模板；增加 `approved` 等治理字段；迁移 Thoughts、AI Works、Books、Movies、Music 和逐条 Drinks；先验证重定向，再移除旧路由模板与 BookSpread 视觉路径。

## D · 移动端与扩展

完成完整响应式 QA 和约 200vh 的移动端简化开场。冬季角色整套 Sprite 是可选扩展，不阻塞夏季 MVP。

## E · 内容、发布与运维

完成真实内容批准、SEO、性能、无障碍、Cloudflare Preview、域名、回滚与维护文档。生产门禁全部满足后才能发布。

---
# 13. Open Questions

已关闭的历史答案保留在 `docs/project/phase-1-content-input.md` 与 D-001 至 D-107，不在本 PRD 重复展开。

| ID | 问题 | Owner | 最迟阶段 |
|---|---|---|---|
| OQ-10 | About 愿意公开哪些个人事实、城市粒度和联系方式？ | 包子 | B |
| OQ-11 | favicon / 品牌标志采用什么素材？ | 包子 | C |
| OQ-13 | 全站 title 与 meta description 是什么？ | 包子 | B |
| OQ-14 | OG 图、图片署名规则与匿名统计是否启用？ | 包子 | E |
| OQ-16 | 豆瓣个人数据采用本地审核导入还是只保留外链？ | 包子 + Codex | C |
| OQ-19 | 天气提供方、粗粒度城市推断和隐私边界如何确定？ | 包子 + Codex | B |
| OQ-20 | 每条旧 Drinks 内容迁入 Blog 还是其他标签结构？ | 包子 | C |

生产人物、小狗、球的 A0-V 交付不是 Open Question，而是外部依赖门禁；未交付时继续完成 A0-H 和 placeholder-safe A1 工作，不得降低质量标准。
