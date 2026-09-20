# Editorial Pages 改造设计

状态：方案 A 已选定；Blog / Photos 已实现；D-142 卡片切换已在 `/lab/page-turn` 评审通过并由 D-143 接入生产（ShellLayout 文档页：ClientRouter + page-card VT，前进自上而下 / 返回自下而上 / 移动端羽化遮罩 / reduced-motion 直切）；Resume / Projects 待实现
依据：D-123 / D-124 / D-127 / D-132 / D-133，`docs/design/baozi-space-design-spec.md` v2.1，`baozi-space-prd.md`

## 1. 目标

把 `/blog`、`/photos`、`/resume`、`/projects` 从旧的「通用列表 + 简单纸张」改造为与场景式首页同源的传统文档页：共享点阵环境、暖白内容纸、导航显隐和排版 token，同时保留每个栏目的内容节奏。

本轮不做：

- 不切 Cloudflare；
- 不修改启动页路线和素材接口；
- 不虚构正式内容；
- 不放宽 `draft: false && approved: true` 生产门禁；
- 不恢复 Shelf 为一级导航；
- 不为每页单独发明一套视觉系统。
- 不以 Anthropic / Sue Park 替代 baozi.space 自身视觉系统，只吸收其方向性手法。

## 1.1 新参考（D-138）

- `https://www.anthropic.com/institute/econ-scenarios`：整体视觉与滚动叙事参考。可吸收纸面底色、编辑排版、手绘标记 / 高亮和滚动驱动解释型动效；不复制深色 hero、数据探索器、组件或素材。
- `https://suepark.xyz/`：页面切换参考。D-141/D-142 已用 CDP + 逐帧录屏逆向其真实实现：卡片内嵌于点阵背景（边缘可见）+ `paper-entrance` 0.45s easeOutQuint（40px/-32px/2°/blur10px 落定）+ 内容行 opacity/blur 错峰 reveal + 移动端 48px 羽化遮罩 360ms 横扫；reduced-motion / reload / back 原站不播入场，本站按包子要求给返回加了自下而上入场。已复刻进 `/lab/page-turn`，评审前不进入生产路由。

## 2. 共享 Editorial Shell

新增或收敛出共享结构：

- `EditorialShell` 保留现有 `ShellLayout` 的导航、navHide、prefetch、metadata；
- 页面主体使用统一 `.editorial-page`：

D-137 补充：桌面文档页使用左侧 sticky 导航栏，内容靠右；不使用手写字体，不使用大矩形卡片。`/#home` 是文档页返回 Home 场景的固定入口；Shell 角色装饰暂缓。
首页恢复 D-118 左文右角色构图，暖白内容纸右对齐；左侧透明导航栏不再进入 Home。移动端退化为单列，优先内容可读性。
  - 点阵环境背景；
  - 暖白大内容纸；
  - 12 列桌面网格 / 4 列移动网格；
  - 页首为栏目编号、标题、说明、MetaStrip；
  - 内容为空时只显示一个简洁空状态，不做卡片墙；
- 共享组件：
  - `EditorialHero`：栏目编号、标题、说明、更新时间；
  - `MetaStrip`：日期、标签、状态、类型；
  - `FeaturedStory`：主文章 / 主相册 / 进行中项目；
  - `TextList`：轻文字流；
  - `PhotoStack`：Photos 主相册；
  - `ProjectStatus`：idea / building / shipped / archived 中文解释；
- 页面仍由 Astro 构建期取数；React 只保留灯箱等既有交互。

## 3. Blog

### 总览 `/blog`



- 首位展示最新一篇已批准长文；
- 其余长文使用两列或不等宽列表；
- Thoughts / 短记合并为更轻、更密的文字流；
- 标签链接保留，但视觉降级为 MetaStrip；
- 无已批准内容时保留 URL + noindex + 空状态。

### 详情 `/blog/[slug]`

- 单列正文，最大宽度约 720px；
- 页首包含栏目、日期、标签、摘要；
- 有 cover 时作为页首相纸，不强制；
- 保留返回 Blog 与上/下篇；
- 图片、代码、引用、分隔符沿用统一文章样式。
- 评论使用 Waline，仅在 `PUBLIC_WALINE_SERVER_URL` 存在时渲染；未配置时不显示评论区，也不发起外部请求。

## 4. Photos

### 总览 `/photos`

- 最新已批准相册作为 FeaturedStory + 受控 PhotoStack；
- 其余相册为规则缩略图列表；
- 灯箱继续使用现有 `Lightbox`，不新建图片系统；
- 无有效相册时显示整理中空状态。

### 详情 `/photos/[slug]`

- 保持相册 / 系列语义；
- 图片节奏优先于文字；
- 灯箱打开、键盘关闭、返回路径保持可访问；
- 不改变相册内图片顺序。

## 5. Resume

- `/resume` 使用 `src/content/about/me.md` 作为唯一事实来源；
- 页面结构为：身份摘要 → 经历 → Now → 联系方式；
- 不做传统企业简历模板；
- 缺少正式字段时显示克制的待确认状态；
- `noindex` 规则保留，直到包子明确公开。

## 6. Projects

### 总览 `/projects`

- 首位展示一个 `building` 项目；没有 building 时使用最新已批准项目；
- 状态统一显示为：构想中 / 制作中 / 已完成 / 已归档；
- 卡片不进入首页场景 3，首页矩阵继续独立；
- 空状态与 noindex 逻辑保留。

### 详情 `/projects/[slug]`

- 按「问题—过程—结果—反思」组织；
- 外部链接只在确认存在时显示；
- 没有正文时使用 intro 与元信息，不生成占位段落。

## 7. 动效与可访问性

- 页面加载不做重入场动画；
- 仅保留文字链接、按钮和纸张的轻微状态反馈；
- 遵循 `prefers-reduced-motion`；
- 所有内容保持可选择文本和稳定 URL；
- 灯箱继续支持 Esc、方向键、关闭按钮；
- 键盘焦点顺序必须符合页面视觉顺序。

## 8. 验证

每页至少验证：

- 1440×900 与 390×844；
- 空状态与有内容状态；
- reduced-motion；
- 键盘导航；
- 无 JS 可读性；
- `bun run check`；
- `bun run test:unit`；
- `bun run build`；
- 相关 Playwright 用例。

页面截图只作为评审材料，不作为 AI 自行放行视觉的依据。

## 9. 实施顺序

1. Blog 总览 + Blog 详情；
2. Photos 总览 + Photos 详情；
3. Resume；
4. Projects 总览 + Projects 详情；
5. 四页交叉检查和文档同步；
6. 包子视觉评审；
7. 评审通过后再考虑 Cloudflare。
