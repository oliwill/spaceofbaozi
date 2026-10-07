批准状态：2026-10-04 00:58 UTC 用户明确“开始”，按逐项实施与独立评审执行；不提交或部署。

# Projects 项目栏目 Implementation Plan

> **执行提示：** 逐项完成下列任务，使用复选框记录进度；每项先验证失败用例，再实现、验证并评审。实施方式在文末选择。

**Goal:** 在既有 Astro 网站中实现文字优先的项目列表与详情，让访客直接理解项目问题及包子的个人贡献，并保留全部内容、素材和发布门禁。

**Architecture:** 保留 Markdown Content Collections、共享 ShellLayout 与现有页面切换。Projects 新增独立的内容校验、公开数据投影、条目呈现和本次导航恢复；首页、列表和详情共用同一公开数据选择函数。图片只作为解释材料，角色复用已批准静态呈现，不新建应用框架、数据库或滚动引擎。

**Tech Stack:** 现有 Astro 5、TypeScript、原生 CSS、Bun、Vitest、Playwright、Sharp；沿用 bun.lock，不新增依赖。源码交接记录的锁定环境为 Astro 5.18.2、Bun 1.4.2、Playwright 1.62.1，执行时用冻结锁文件核实，不以 package.json 的范围版本代替实际版本。

**Spec:** 《Projects项目栏目设计规格-v1.md》，Library：`libfile_3cf3d97b33a481918e111c426b14bfef`。用户于 2026-10-04 00:39 UTC 确认书面规格；原文中的“待审阅”属于交付时状态，不表示本次重新等待规格批准。实施时把该完整规格随计划放入 `docs/design/baozi-space-projects-design-v1.md`，保留原文并在文首附批准状态。源码内全站规范 v2.8、D-127、D-148 至 D-155 继续有效。

版本 1.0 · 2026-10-04 · 待审阅实施计划

本轮交付止于计划。下一步需要确认本计划与执行方式，才进入代码工作。设计批准不包含项目事实、截图、新角色姿态、内容迁移或发布批准。

## Global Constraints

以下为批准规格中的原要求，各任务均受其约束。

- “列表以项目名称、一句话简介和个人角色为主，图片为辅；工作与个人项目都可以收录。”
- “文案少而准确。不添加‘挑一个项目看看’等教访客操作的标题，也不把栏目做成大图作品墙。”
- “本版沿用真实记录日期倒序，不自动把‘进行中’当作精选，也不新设人工置顶机制。”
- “本版不做筛选、搜索或分页；条目增多后再按真实浏览需求决定，不先摆空筛选器。”
- “问题与个人贡献是公开案例的最低解释要求，其余章节按材料出现。”
- “只有 draft 为 false 且 approved 为 true 的内容进入列表、详情、首页引用及分享元数据；schema、模板和全部消费端必须一致。”
- “素材未通过时复用适合的现有已批准静态角色；没有合适资产则暂不显示对应装饰，不用生成占位角色填满空间。”
- “桌面沿用全站左栏：大于 1050px 为 300px，768–1050px 为 242px。”
- “小于等于 767px 时采用单列列表和正文，角色区域缩减，保留四项导航一行及每项可操作面积，不为角色推迟正文出现。”
- “零个公开项目时，只显示‘项目正在整理。’和正常全站导航，保留 /projects 并设置 noindex；不显示草稿数量、标题、图片或空卡片。”
- “保留现有项目 slug 和 /projects/<slug> 深链接；标题改动不自动改 URL。”
- “已有 /ai-works 重定向继续保留，不能因栏目重排而删除。”
- “不新增字体、视频或重型前端依赖。”

执行边界：继续保留相册、文章、导航、开场和既有内容；不修改三个真实项目草稿的正文及批准字段。先完成各栏目设计，之后另行统一安排真实内容迁移。本计划不包含 Resume 重设计、评论、统计、CMS、域名或部署调整，也不提交、推送、合并或部署。

## Review Focus

最容易漏掉的五类情况，已分配到对应任务的测试中。

1. 旧草稿没有 role/kind，或已批准标志与必填事实矛盾：旧草稿应可构建，公开条目缺字段必须报错，不能自动补写个人经历。任务 1。
2. 草稿截图被误放入 public，即使没有渲染页面也会被复制：公开资源白名单和最终产物扫描必须发现孤儿资源，不能只检查列表。任务 2、6。
3. 从外部直达、详情刷新、修改键打开新标签及连续导航：返回始终留在本站；只在来源可信时恢复原位置及链接焦点，取消的旧恢复不能影响新页。任务 4。
4. 长项目名、无空格长链接、长角色说明和宽屏截图同时出现：360px、767/768px 及原生 200% 缩放下仍完整可读，无整页横溢。任务 3、5。
5. 无 JavaScript、图片失败、角色失败或路由请求被取消：文字、普通锚点、正文与返回仍成立，不留下遮罩或空白内容。任务 3、4、5、6。

---

## 一 输入核对与现状

### 已核实输入

- 源码：`libfile_0d03c46fad088191b0c936924828105b` 当前 v10；归档名沿用 `baozi-space-D151-album-cloud-20261003T0602Z.tar.gz`，实际包含 D-155。
- 归档：70,590,433 bytes；SHA256 `b4edb1533e93c31cf2f371165f463aca0a134bdef8554f39b923424c8a818597`。
- 本轮只读恢复后，795 项 checksum 全部匹配；归档含 797 个文件。没有改动源码。
- 《实施与验证报告.md》：`libfile_f35bd25f1b28819182cc4e0e1bd20191` 当前 v12，完整读取。
- 当前归档没有 .git。执行采用新的独立源码快照；不虚称已经创建分支，不初始化或提交 Git 来代替验收记录。

输入报告的 159 项单元、80 项全站回归及 55 项相册检查是 D-155 历史结果。本轮仅编写计划，没有运行新的产品测试。实施时必须重新运行，并记录真实数量、失败和修复。

### 真实代码入口

| 现有文件 | 本轮核实的职责与缺口 |
| --- | --- |
| `src/content.config.ts:26–32,48–51` | Projects 只有 title、intro、date、link 及公共门禁/封面字段，尚无角色、类型、项目状态 |
| `src/lib/content/gates.ts:3–10` | 共享 isPublishable 已实现，不修改其语义 |
| `src/pages/projects/index.astro:8–33` | 日期在前、额外栏目说明和重复“查看项目”链接，需要改为规格顺序 |
| `src/pages/projects/[slug].astro:8–43` | 已有静态详情；缺首屏个人角色与顶部返回，尚无本次导航恢复 |
| `src/pages/index.astro:10–16` | 首页自己过滤和排序 Projects，需要接入同一选择函数 |
| `src/components/home/HomeContent.astro:5–8,33–40` | 首页消费完整 CollectionEntry；改收最小公开项目数据，不重设计首页布局 |
| `src/components/layout/ShellLayout.astro:7–23,52–60` | 共享 SEO、路由、滚动及相册生命周期；仅按任务 4 增加 Projects 生命周期入口 |
| `src/components/layout/SiteCharacters.astro:4–20` | 非首页/文章/相册默认已有静态人物和嘉乐，本版优先复用 |
| `src/components/editorial/editorial.css:269–395,446–451` | 720px 长文、图文排版、表格和代码容器可复用；Projects 特例放局部样式 |
| `src/lib/photos/albumLifecycle.ts`、`session.ts` | 可参考恢复模式，不复用其存储键、不修改相册行为 |
| `public/_redirects:10–11` | /ai-works 与旧实验项目 301 保持 |
| `scripts/photos/run-fixtures.ts` | 已有隔离合成夹具模式；Projects 新建自己的 runner |

`src/components/scene/SceneProjects.tsx` 属于旧场景实现，当前首页不使用它。本轮不恢复项目矩阵，不为未消费的旧分支扩大重构。

三个真实草稿 `baozi-space.md`、`first-experiment.md`、`kanadojo.md` 保持原样。正式构建仍应为 0 个公开项目；有内容的验版使用隔离、明显标记的合成案例。合成案例不代表包子的真实工作或业绩。

### 执行前入口

执行者先在自己的环境中，按最新 Library 技能物化三个稳定 ID 并核对版本。若源码已高于 v10，先对比 Projects、Shell、门禁和 D-155 保护范围，更新计划的路径/基线后再改代码，不覆盖后来的成果。大归档使用 Library 正式物化流程；不要使用临时下载链接或把其他环境的路径当作本机文件。

执行前先记录输入、保护文件与实际运行环境指纹，再读取 AGENTS、全站规范、PRD 与决策日志。旧 PRD 的五入口、手账字体、首页场景等与当前规范冲突的段落只作历史。仓库旧 Windows Obsidian 路径本次云端未访问；不声称已核实其内容，也不据此恢复旧设计。若执行环境可读取该资料，仅用于补充历史背景，最新正式规格优先。

## 二 文件与接口设计

### 计划新增

- `src/lib/projects/schema.ts`：字段与公开必填校验，导出 ProjectData、ProjectImage、ProjectKind、ProjectStatus。
- `src/lib/projects/projects.ts`：公开投影和记录日期倒序，导出 selectPublicProjects。
- `src/lib/projects/assetAudit.server.ts`：Projects 公开图片白名单、尺寸与路径检查。
- `src/lib/projects/history.ts`：带校验的历史命名空间，不存长期浏览记录。
- `src/lib/projects/projectLifecycle.ts`：列表位置/焦点保存和恢复，生命周期清理。
- `src/components/projects/ProjectList.astro`：标题、简介、角色、轻标签及可选小图。
- `src/components/projects/ProjectHeader.astro`：详情头部，不生成正文空章节。
- `src/components/projects/ProjectImage.astro`：有尺寸的辅助图与图注。
- `src/components/projects/projects.css`：仅 Projects 局部排版、响应式与降级。
- `src/content/_templates/project.md`：事实、图片、外链和批准检查填写模板。
- `tests/unit/projects/{schema,projects,assetAudit,history}.test.ts`。
- `tests/fixtures/projects/projects.ts`、`scripts/projects/run-fixtures.ts`、`playwright.projects.config.ts`。
- `tests/e2e-projects/{project-content,project-navigation,project-responsive,project-fallback}.spec.ts`。
- `tests/e2e/projects-production.spec.ts`：正式空态与隐私检查。
- `docs/design/baozi-space-projects-design-v1.md`、本计划及 `_handoff/projects-evidence/`：规格、任务记录和新证据。

### 计划修改

`src/content.config.ts`、两张 Projects 页面、`src/pages/index.astro`、`HomeContent.astro` 只接入新内容契约；`ShellLayout.astro` 只增加独立生命周期初始化。实施收尾同步 AGENTS、README、全站设计规范、决策日志与 RESTORE，明确实际完成状态，不预填通过结论。

保护：现有内容文件、public 资源、角色原件/候选/Manifest、D-150 阅读模块、Photos 模块、旧证据、锁文件、部署配置与重定向均不在默认修改范围。若实现发现必须修改保护文件，先提出具体最小变更及理由，取得对应授权，不顺手重构。

### 字段契约

`ProjectData` 保留原 title、intro、date、link、draft、approved、updated、cover、coverAlt、coverCredit。title/intro 使用非空文本；date 始终是记录日期。

新增字段：

| 字段 | 精确类型与规则 | 展示口径 |
| --- | --- | --- |
| role | 非空 string；草稿允许缺省；公开必填 | 用户提供完整“我负责……”句子，组件不自动添“主导”“独立”等结论 |
| kind | "work" 或 "personal"；草稿允许缺省；公开必填 | 显示“工作”或“个人”，不能仅靠颜色 |
| periodLabel | 可选非空 string | 原样显示经过确认的年份或时间范围，不从 date 推断任职/交付周期 |
| status | 可选 "ongoing" 或 "completed" | “进行中”或“已完成”；缺省不显示，完全不参与发布门禁或排序 |
| linkLabel | 可选 "访问项目" 或 "查看代码" | 有 link 时使用；缺省“访问项目”，没有 link 就不产生按钮 |
| images | 可选 ProjectImage[]，默认 [] | 仅登记已批准项目材料的确切路径、尺寸与说明；不自动生成画廊 |

`ProjectImage = { src: string; width: number; height: number; alt: string; credit?: string; variants?: {src:string;width:number;height:number}[] }`。

- src 限本站 `/assets/projects/` 下的 png/jpeg/jpg/webp/avif；不接受外部 URL、查询参数、编码穿越、父目录或符号链接。宽高为正整数；alt 必须是准确的非空说明；变体保留原比例。
- cover 仍是字符串字段；公开项目使用 cover 时，必须匹配 images 中同一 src。coverAlt/coverCredit 有值时覆盖该图片的相应展示值；不靠项目标题代替有意义截图的 alt。
- images 是资源清单，不是新公开批准开关。项目正文、每张截图、链接与说明仍须用户分别确认；实施阶段不把任何真实材料放入 public。
- link 只接受有效 http/https URL，不接受 javascript/data 等协议；linkLabel 不存在且有 link 时才使用既定回退。未经批准的目标留空，不自行查找替代网址。
- 未填可选字段就不渲染相应块。没有 cover 时不创建图槽；没有结果数据时不补指标，没有结果/反思正文时不补标题。
- 原门禁缺省值保持 `draft:false, approved:false`；模板显式 `draft:true, approved:false`。不能为了保留旧草稿而自动补 role/kind，也不能把 status 当批准。
- 项目至少说明“问题”和“我的贡献”是编辑批准要求，不用机械匹配两个标题冒充事实审核。模板提供该结构，允许真实内容使用更具体标题。

### 公开投影

`ProjectSource = { id:string; data:ProjectData }`。

`PublicProject = { id:string; href:string; title:string; intro:string; role:string; kind:ProjectKind; date:Date; periodLabel?:string; status?:ProjectStatus; link?:string; linkLabel?:string; cover?:ProjectImage; images:ProjectImage[] }`。

`selectPublicProjects<T extends ProjectSource>(entries:readonly T[]): Array<{entry:T; project:PublicProject}>`：

1. 使用现有 isPublishable 过滤；未公开条目不生成 PublicProject。
2. 对进入公开集合的 role/kind、cover 引用和链接进行校验，异常中止构建，不能悄悄遗漏或补事实。
3. date 降序，相同日期按 id 稳定排序；不改变输入数组。
4. href 由既有 id 得到 `/projects/<id>`，不从 title 生成 slug。
5. 只把 project 传给列表和首页；详情使用配对的 entry 交给 Astro render，不能把完整 entry 或 body JSON 输出到客户端。

## 三 实施任务

顺序：1 → 2 → 3 → 4 → 5 → 6。每项先建立会失败的测试，再最小实现、验证和独立评审。由于本阶段不提交 Git，每项以可审阅差异和测试日志作为检查点，不能执行 publish、git commit、git push 或 deploy。

### Task 1 建立项目内容契约与统一公开数据

**Files:** 新增 `src/lib/projects/schema.ts`、`src/lib/projects/projects.ts`、`tests/unit/projects/schema.test.ts`、`tests/unit/projects/projects.test.ts`、`src/content/_templates/project.md`；修改 `src/content.config.ts`、`src/pages/index.astro`、`src/components/home/HomeContent.astro`、`src/pages/projects/index.astro`、`src/pages/projects/[slug].astro`。将批准规格与本计划随源码保存。

**Interfaces:** 消费 isPublishable(GateData):boolean；产出上一节的 ProjectData、PublicProject 与 selectPublicProjects<T>()。首页取返回数组前 3 项的 project，保持原来的数量与首页布局。

- [x] **Step 1 写失败测试。** 用 Vitest 的 `describe("Projects schema and projection")` 覆盖：
  `expect(projectSchema.safeParse(legacyDraft).success).toBe(true)`；
  公开记录缺 role、kind 或空白 intro 时 success 为 false；
  四种 draft/approved 组合只保留 false/true；
  status 两种或缺省均不改变门禁；
  link 的 javascript/data 协议解析失败；
  同日稳定排序且输入顺序未被修改；
  标题改动后 href 不变；
  无 periodLabel 时公开投影不生成时间范围。
- [x] **Step 2 运行红测。** `bun run test:unit -- tests/unit/projects/schema.test.ts tests/unit/projects/projects.test.ts`；预期因缺模块/接口失败，保存日志。
- [x] **Step 3 实现内容契约。** 在 schema.ts 用现有 astro/zod 定义 projectSchema；沿用 Photos 领域 schema 的组织模式，保留 Projects 旧缺省值。content.config.ts 仅替换 Projects schema 导入；新增字段、模板及全部活跃消费端同步。
- [x] **Step 4 实现公开选择。** 实现 selectPublicProjects<T>()；首页与两张 Projects 页面都调用它。详情 getStaticPaths 从配对结果产生 props，未公开路径不生成。
- [x] **Step 5 填写模板。** 提供“问题、我的贡献、过程、结果、反思”的填写说明和可删除可选章节，说明指标需来源、范围、时间口径和归属；工作项目检查保密、客户信息、账号与同事隐私。模板不包含伪造业绩或可直接误发布的真实示例。
- [x] **Step 6 运行绿测和基线检查。** 重跑上述测试，再 `bun run check && bun run build`。预期旧三个草稿可构建、正式公开项目仍 0 个、首页无草稿标题。
- [x] **Step 7 记录检查点。** 保存任务 1 差异、命令、退出码和保护文件哈希；评审字段/消费者一致性后再进入下一项。

### Task 2 建立图片白名单与隔离测试站

**Files:** 新增 `src/lib/projects/assetAudit.server.ts`、`tests/unit/projects/assetAudit.test.ts`、`src/components/projects/ProjectImage.astro`、`tests/fixtures/projects/projects.ts`、`scripts/projects/run-fixtures.ts`、`playwright.projects.config.ts`；在 `src/pages/projects/index.astro` 构建时接入资源审计。

**Interfaces:** `auditPublicProjectAssets(projects:readonly PublicProject[], publicDir:string):Promise<void>`；`ProjectImage.astro Props = {image:ProjectImage; loading?:"eager"|"lazy"}`。夹具 runner 提供 `--case=empty|one|mixed|work-only|personal-only` 与 `--build-only`，输出独立副本绝对路径，保留失败现场。

- [x] **Step 1 写失败测试。** 临时目录中验证缺图、尺寸不符、孤儿图片、重复 src 尺寸冲突、符号链接、非法路径均抛错；0 个公开项目且目录不存在通过；合法小图与同原比例变体通过。测试不得读取真实截图。
- [x] **Step 2 运行红测。** `bun run test:unit -- tests/unit/projects/assetAudit.test.ts`；预期缺函数失败。
- [x] **Step 3 实现资源审计。** 使用现有 Sharp 和文件系统 API；只接受公开投影 images/variants 的精确路径，遍历整个 public/assets/projects，未在名单中的任何文件报错，不能因未出现在 HTML 而放行。
- [x] **Step 4 实现图片组件。** 输出 width/height、srcset/sizes、准确 alt、可选署名；截图 contain、不裁关键文字，无固定大图槽、边框或阴影卡片。列表小图默认 lazy；图片错误仍保留尺寸及替代说明，不遮掉文本或标题入口。不引入图片交互脚本。
- [x] **Step 5 实现隔离 runner。** 复制源码到新的临时根，排除 .git、依赖、dist、缓存、私有 design-assets、旧证据及环境文件；冻结安装依赖后写合成项目和明显“SYNTHETIC”几何图。所有写入限制在新根；不修改正式 content/public，不把 node_modules 跨根软链接。证据输出到新的 projects-evidence，不覆盖相册证据。
- [x] **Step 6 建立夹具覆盖。** mixed 包含工作/个人、无图、横图、长名称/长角色/无空格长链接、宽表格与代码、进行中/已完成/无状态、外链/无外链、无结果/反思、相同日期，以及四种门禁组合的唯一 PRIVATE-PROJECT 哨兵。one/empty/纯类型单独构建；再提供非法公开字段及孤儿资源负例，要求构建失败。
- [x] **Step 7 运行绿测与隔离构建。** 重跑资源单元，执行 `bun scripts/projects/run-fixtures.ts --case=mixed --build-only` 与 empty；预期合法副本构建成功、负例非零退出、正式 content/public 哈希不变。
- [x] **Step 8 记录检查点。** 登记副本、正式源码与资源哈希；不能用隔离副本的 approved 测试值更新真实草稿。

正文图片继续在 Markdown 对应段落中维护；模板提供带准确 width/height/alt 的 figure/img 写法和图注，不自动把 images 数组堆到详情顶部。任务 6 从实际生成页面提取图片 src/srcset，逐项与登记清单及尺寸比对，拒绝未登记或外部截图。预览合成图片的批准标志只用于隔离测试，不能当真实素材批准。

### Task 3 实现文字优先列表与项目详情

**Files:** 新增 `src/components/projects/ProjectList.astro`、`src/components/projects/ProjectHeader.astro`、`src/components/projects/projects.css`、`tests/e2e-projects/project-content.spec.ts`；修改 `src/pages/projects/index.astro` 和 `src/pages/projects/[slug].astro`。共享 Editorial CSS 与角色模块保持原样。

**Interfaces:** `ProjectList.astro Props = {projects:readonly PublicProject[]}`；`ProjectHeader.astro Props = {project:PublicProject}`。列表根使用 data-project-list，标题锚点使用 data-project-id；详情 article 使用 data-project-detail 与 data-project-id，顶部/页尾锚点使用 data-project-return，href 固定 /projects。

- [x] **Step 1 写失败浏览器测试。** 在 mixed 副本确认首个条目 DOM 顺序为 title → intro → role → kind/可选时间状态；每项只有一个主要详情标题链接，且 `getByRole("link",{name:"查看项目 →",exact:true})` 数量为 0；姓名、职责不依赖 hover；无 cover 项 img/空槽为 0。empty 只显示“项目正在整理。”，无旧补充说明与草稿数据。
- [ ] **Step 2 运行红测。** 副本中 `bun x playwright test --config playwright.projects.config.ts tests/e2e-projects/project-content.spec.ts`；预期旧列表/缺失结构断言失败。
- [x] **Step 3 实现列表。** 页面只保留“项目”标题，不复用强制带 kicker/description 的 EditorialHero。条目纵向留白与细分隔线，名称、简介、role 直接可读，元信息轻排；date 只负责排序，只有确认的 periodLabel 才显示项目时间。桌面图片区域不超过条目可用宽度 1/3，手机文字在前图片随后。
- [x] **Step 4 实现详情。** 顶部“返回项目”后依次名称、intro、role、可选元信息；不强制首屏封面。正文使用现有 editorial-prose，宽度约 720px；只渲染真实 Markdown 章节。页尾只有必要外链与“返回项目”，外链取 linkLabel；不加入评论、推荐、完成庆祝、目录或阅读进度。
- [ ] **Step 5 保留静态角色。** 页面使用 ShellLayout 默认静态角色，不传 home、reading 或 photos；不挂 HomeOrbit、追球、气泡或 hover 表演。已有静态姿态是否符合“朝向内容、安静介绍”由实际预览确认；不合适时提出隐藏对应装饰的选择，不从候选相册素材借图，也不自行出新稿。
- [x] **Step 6 验证内容与 SEO。** 详情 title 为“已批准名称 · 项目 · baozi.space”，description/og:description 为批准 intro；无自动成就摘要/新 OG 图。断言角色说明位于正文之前、无阅读辅助、无空结果/反思模块、无图及无外链案例成立；工作/个人同级呈现。
- [ ] **Step 7 运行绿测与检查点。** 重建 mixed、one、empty 副本并重跑内容测试；正式站 check/build 与空态检查通过。记录 1440/390 列表及详情截图作为待人工审阅画面，不标记视觉已获批准。


执行说明：本步骤代码及静态输出已通过独立评审；浏览器RED/GREEN、截图、几何与人物实际页面视觉未在云环境执行，等待Mac独立QA。此处不把编译、SSR或构建当作浏览器通过。

### Task 4 实现本次导航的位置与焦点恢复

**Files:** 新增 `src/lib/projects/history.ts`、`src/lib/projects/projectLifecycle.ts`、`tests/unit/projects/history.test.ts`、`tests/e2e-projects/project-navigation.spec.ts`；`src/components/layout/ShellLayout.astro` 增加 import/initProjectLifecycle，不改 pageTurn、Lenis 或相册逻辑。

**Interfaces:**
- `ProjectListPosition = {key:string; projectId:string; scrollY:number}`。
- `ProjectHistory = {version:1; list?:ProjectListPosition; originIndex?:number; detailId?:string}`。
- `readProjectHistory(state:unknown):ProjectHistory`、`mergeProjectHistory(state:unknown,update:Partial<ProjectHistory>):Record<string,unknown>`。
- `canReturnToProjectList(meta:ProjectHistory,index:unknown,pathname:string):boolean`。
- `initProjectLifecycle():void`，幂等初始化；只读写 history.state.baoziProjects，并保留 Astro 及 baoziAlbum 的原字段。无 localStorage、cookie、服务端记录或新 sessionStorage 项。

- [x] **Step 1 写历史模型失败测试。** 畸形 state、负数/非有限 scrollY、无效 key/id、错误版本一律回退空状态；merge 不覆盖 Astro index 与 baoziAlbum；只有匹配当前详情且 index 为 originIndex+1、存在有效列表快照时 canReturn 为 true。来源未知、外部直达和错误详情一律 false。
- [x] **Step 2 运行红测。** `bun run test:unit -- tests/unit/projects/history.test.ts`；保存缺接口/错误行为日志。
- [x] **Step 3 实现状态模型。** key/projectId 限非空文本且长度 ≤1000，scrollY 为有限非负数；忽略额外未识别字段。只保存一个相关列表快照，随该浏览器历史导航存在，不收集访问列表。
- [x] **Step 4 实现保存与增强返回。** 普通左键/键盘打开项目前，把实际滚动值与项目 id 保存到当前列表历史条目；到达匹配详情才转交副本快照。Ctrl/Meta/Shift/Alt、右键与 target=_blank 不拦截。可靠相邻来源使用 history.back；无法证明相邻时维持普通 /projects 链接，存在可信本次快照可在本站新列表恢复，无来源则正常顶部。
- [x] **Step 5 实现恢复与清理。** 在 Astro page-load、BFCache pageshow 上按当前页面恢复；before-swap/pagehide 取消事件、待执行 rAF 和旧恢复。滚动调用现有 scrollDocumentTo(...,{immediate:true})，按当前页面高度限幅；原链接存在时 focus({preventScroll:true})，条目消失时回退列表 h1。新用户输入或新导航使旧任务失效，禁止延迟抢焦点。
- [ ] **Step 6 写并运行浏览器验证。** 测长列表→末项详情→顶部返回/页尾返回/浏览器后退，位置与焦点恢复；前进重新出现同详情；详情刷新后仍可安全返回；外部直达/新标签返回本站；取消请求后改去 Blog，保留一份 main、正确 h1/正文，遮罩归 idle；连续往返 5 次无重复监听。测试必须断言内容和焦点，不能只断言 URL。
- [ ] **Step 7 绿测与检查点。** 重跑 history 单元、project-navigation.spec.ts 及既有 navigation-lifecycle.spec.ts/page-turn-production.spec.ts；确认相册 namespace 与返回行为未变。若 Astro 历史 state 不可用，降级普通锚点，不接管全站路由。


执行说明：历史模型与受控生命周期已红绿验证，源码独立评审通过；浏览器导航与既有共享回归仅加载了测试，尚待Mac对最终冻结版本实际执行。

### Task 5 完成响应式 可访问性和失败降级

**Files:** 修改 `src/components/projects/projects.css`；新增 `tests/e2e-projects/project-responsive.spec.ts`、`tests/e2e-projects/project-fallback.spec.ts`。发现局部缺陷只修 Projects 组件，不直接改全站样式。

**Interfaces:** 沿用任务 3 DOM 与图片组件；行为测试消费任务 4 生命周期，不新增交互接口。

- [x] **Step 1 写失败几何测试。** 在 360、390、767、768、1024、1440px 检查整页 `scrollWidth-innerWidth <= 1`；手机四项导航同一行、全端每项操作区域 ≥44×44；项目标题/返回/外链有效高度 ≥44px；桌面辅助图宽 ≤条目宽/3，手机图在文字之后；长 title/role 无省略号或 line-clamp。
- [x] **Step 2 写失败降级测试。** no-JS 情况可从列表到详情及返回；阻断项目图片请求仍见 alt、role、详情链接且预留框不塌陷；阻断角色资源内容照常；reduced-motion 下没有 Projects 自增循环动画；纯工作、纯个人、1 条及无图列表均无空控件。
- [ ] **Step 3 运行红测。** mixed、one、work-only、personal-only 副本中运行两份测试，保存实际失败，不删断言或用 skip 把缺陷隐藏。
- [x] **Step 4 修复局部呈现。** 使用 minmax(0,1fr)、自然换行和局部 overflow；只给表格/代码内部滚动。使用可见 focus-visible 轮廓；标签有文字；装饰 aria-hidden、无 tabindex、pointer-events:none。普通文字对比度 ≥4.5:1、大字 ≥3:1，沿用既有暖白/炭黑 token。默认不新增 Projects 动效；共享 reduced-motion 规则保留。
- [ ] **Step 5 验证缩放与输入。** 独立浏览器原生 200% page zoom，记录实际 zoom 值、固定窗口 CSS 宽变化与截图；不得以 deviceScaleFactor、CSS zoom 或缩小 viewport 冒充。补验鼠标、Tab/Enter、触摸及 767↔768 重排；角色、焦点与正文无重叠。环境无法真实缩放时明确挂起这项，不宣称通过。
- [ ] **Step 6 运行绿测并提交人工预览。** 保存 1440、1024、768、767、390、360 的列表/详情及 200% 图；向用户展示少量代表图并标明合成内容。用户确认布局和现有静态角色适用后才能记为视觉通过；若要求新姿态，另开素材批准，不并入本任务默认范围。


执行说明：已根据Mac v11实际RED补表格/figure回归并完成局部修复；测试设计独立评审通过。五类HTTP/SSR检查不代表浏览器几何、降级、输入或200%验收，后者全部等待最终Mac冻结版本。

### Task 6 全站回归 产物审计与可恢复交付

**Files:** 新增 `tests/e2e/projects-production.spec.ts` 与 `_handoff/projects-evidence/` 证据；更新 `README.md`、`AGENTS.md`、`docs/design/baozi-space-design-spec.md`、`docs/project/decision-log.md`、`_handoff/RESTORE.md`、`_handoff/manifest.json`、`_handoff/checksums.sha256`。不修改批准清单中的个人内容决定。

**Interfaces:** 最终源码快照 + 新验证记录 + 当前 Library 版本；报告明确区分正式构建、合成测试、用户视觉批准及未验证项。

- [ ] **Step 1 建立正式产物断言。** /projects 为 0 条/noindex，空态只有“项目正在整理。”；三个未公开详情与未知 slug 都是同一通用 404/无私有名称。首页、HTML、JS、JSON、资源路径、SEO/OG 均不含 PRIVATE-PROJECT 或真实草稿唯一内容。/ai-works 两条重定向逐字保留。
- [ ] **Step 2 核对每张实际图片。** 从隔离站最终详情 DOM 提取 img/srcset 与尺寸，对照 PublicProject.images；必须本站允许路径、登记尺寸正确、alt 准确、首屏外 lazy。正文图跟随对应解释段落，所有图片不是页首画廊；检测外部/未登记 src 并报错。正式 public 仍无新增真实项目素材。
- [ ] **Step 3 运行全量最终验证。**
  - `bun run test:unit`
  - `bun run check`
  - `bun run build`
  - `PLAYWRIGHT_PREVIEW=1 PLAYWRIGHT_PORT=4411 bun run test:e2e --workers=2`
  - `bun scripts/projects/run-fixtures.ts --case=mixed`，再对 empty、one、work-only、personal-only 执行对应内容/响应式用例
  - 在一次性 Photos QA 副本执行 `bun scripts/photos/run-fixtures.ts --build-only`，进入其输出的隔离夹具根后执行 `PLAYWRIGHT_PORT=4413 bun x playwright test --config playwright.photos.config.ts`，重跑 D-155 全部既有相册用例
  既有 Photos runner 会写入其调用根的 `_handoff/album-evidence/fixture-location.txt`，因此不能直接从最终源码运行它。一次性 QA 副本先创建该证据目录，最终源码与历史证据保持不变；运行日志与输出路径另存本轮 projects-evidence。核对被测副本的 src、public、测试和冻结依赖与最终源一致。
  端口冲突时选择空闲本机端口并记录，不关闭不属于本任务的进程。新 Projects runner 默认读取 PLAYWRIGHT_PORT，默认 4412；测试 retries=0。
- [ ] **Step 4 确认保护范围。** 实际内容、既有 public 资源、角色原件/候选/Manifest、D-150 阅读代码、Photos 代码、锁文件、部署设置、重定向、旧证据与输入快照逐文件哈希对比。共享 Shell 仅有经过评审的 Projects 初始化差异，其他共享文件的变更须逐项解释。
- [ ] **Step 5 核对回归重点。** Blog D-150 桌面进度/章节与手机全隐藏；Photos D-155 的 3:2、目录、单双页/hash/返回；开场跳过/返回首页不重播；全站快速导航失败后无残留遮罩。旧通过数不能替代本轮结果，失败须诊断修复再重跑。
- [ ] **Step 6 记录完成与未闭环。** 用户确认前写“视觉待确认”；缺真实项目材料、缺新角色批准、Safari/真实 iOS 未实测或真实慢网络未实测均如实保留。更新决策日志时使用执行时下一个空闲编号，不预占 D-156，也不把实施计划审阅当成内容/发布批准。
- [ ] **Step 7 制作可恢复包。** 保留独立快照、补丁供审阅、795 项输入核验记录、新日志/截图和恢复说明；不含 .git、依赖、dist、缓存、环境文件或凭据。清单逐项重读核验，归档自身 SHA 只写外部报告，RESTORE 明确不能重复应用旧 patch。
- [ ] **Step 8 按原身份回存。** 仅在代码执行获批且完成后，源码回存 `libfile_0d03c46fad088191b0c936924828105b`、报告回存 `libfile_f35bd25f1b28819182cc4e0e1bd20191`；使用当次输入版本保护，不预填下一版本。冲突时重读差异，不能去掉版本保护硬覆盖。本轮计划保存为独立文件，不更新两者。

## 四 需求对应与停止条件

| 批准规格 | 实施与验证位置 |
| --- | --- |
| 列表名称/简介/个人角色优先，工作个人轻分类，日期排序 | 任务 1、3、5 |
| 问题/贡献最低说明，过程/结果/反思按真实材料出现 | 任务 1 模板、任务 3 正文与人工内容批准 |
| 图片辅助、无图成立、不裁截图、失败降级 | 任务 2、3、5、6 |
| 人物静态介绍与嘉乐陪伴，未经批准不接新稿 | 任务 3、5、6 |
| 桌面左栏 300/242，767/768 断点，720px 正文 | 任务 3、5、6 |
| 公开字段/资源/首页/详情/元数据统一门禁 | 任务 1、2、6 |
| 稳定 slug、旧 301、无 JS、返回与焦点 | 任务 3、4、5、6 |
| 空态/noindex、通用 404、键盘/触摸/减少动态 | 任务 3、4、5、6 |
| D-150、D-155、开场、全站切换保护 | 任务 4、6 |
| 全站设计完成后整体迁移，内容/素材/发布分别批准 | 所有任务的范围边界及任务 6 |

发生以下情况时停止相关步骤，其他不依赖的工作可继续：

- 源码版本冲突、保护文件需要扩大修改、真实事实缺失：报告具体差异或需要的材料。
- 新姿态、摄影裁切、真实工作截图、保密材料尚未获准：不复制进公开路径。
- 环境不能运行真实浏览器/原生缩放：提供已完成检查和准确缺口，不用构建结果代替。
- 用户未确认实际视觉：保留待审阅状态，不宣布视觉验收完成。
- 需要迁移内容、发布、改变访问权限或部署：另行取得明确批准；本计划没有授权这些动作。

## 五 执行方式与下一步

建议采用逐任务实施与独立评审：内容门禁、图片资源、导航恢复和共享 Shell 有不同风险，逐项评审更容易在影响文章或相册前发现问题。

可选方式：

1. **逐任务实施与独立评审，推荐。** 每项由新的执行者完成，再由独立评审者检查；六项完成后做全站复审。核对更充分，执行和评审上下文更多。
2. **连续实施后统一评审。** 同一执行者按计划完成全部任务，最后由独立评审者检查整体差异。步骤更集中，中间缺陷到末尾才独立发现。

这两种选择都只批准本计划范围内的代码与验证，不包含真实内容迁移或上线。选定后，再确认可用执行环境并创建正式任务；本轮不启动 Mac 任务。

当前待用户决定：本计划是否准确，以及采用哪种执行方式。真实案例和素材资料可以后续分别补充，不需要为了开始结构开发而编造或提前公开项目。

