# BaoziSpace 书影音 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 BaoziSpace 中增加可按年份、书影音类型和标记日期翻阅的静态个人档案，并建立“安全导入、私下核对、明确批准、公开快照”的维护流程。

**Architecture:** 延续 Astro 静态输出、Shell 与 Editorial 排版；页面只读取经过批准的白名单快照。导入工具在本机离线处理安全文件，来源适配、日期规范化、差异核对、公开决定相互分离；没有在线后台、数据库或访客端豆瓣请求。首版以合成夹具完成界面和规则，真实样本只影响来源适配与迁移验收。

**Tech Stack:** 现有 Astro 5、TypeScript、原生 CSS、Bun、Vitest、Playwright；沿用锁文件中的实际版本，不顺便升级。首版核心不加运行时前端框架，也不引入全站状态库。

**Spec:** 《BaoziSpace书影音设计稿.md》版本 1.0，2026-10-05，Library `libfile_f78169d0e8208191987754a647f6b334`。完整设计稿已读；用户于 2026-10-05 08:29:49 UTC 回复“确认。”。设计批准允许编写本计划；本计划仍待审阅和执行方式选择。

## 先看这一页

1. **先做可独立验收的首版。** 年份、筛选、热力图、分页、详情、手机五项单行导航和导入门禁都先用明确标注的合成记录实现。正式快照初始为空，页面显示“书影音正在整理。”并保持 noindex。
2. **有安全样本后接真实数据。** 少量只含书影音字段的 Excel 或脱敏标记 JSON 用来核对实际字段、评分、日期和可见性；完成私下预览后，再由你确认哪些真实记录可以公开。
3. **RSS 单独核验。** 拿到豆瓣主页后，先验证公开入口、字段和近期窗口；不可用不影响手动导入首版完成。
4. **真实公开与上线仍单独决定。** 本计划不授权发布真实记录、封面、部署或域名操作。开场与首页衔接保持已经认可的效果。

**推荐执行方式：逐任务实施、逐任务独立审查。** 在既有 Mac 工程任务的隔离副本中进行，使用该任务的独立测试浏览器；每个任务通过后再进入下一个。导入隐私规则与页面表现可以分别审查，较容易及时发现错误。开始实施时重新检查电脑在线状态、任务与路径；此计划不把历史连接状态当作当前可用证明。也可选择由同一个执行者连续实现，最后统一独立审查，但隐私门禁仍须先验收。

**本次只交计划。** 未修改产品源码、原实施报告或原源码归档，未安装依赖、提交、推送、合并或部署；下文的文件、命令与测试均为待实施要求，不是已完成结果。

## Global Constraints

- “顶部只写「书影音」”；类型控件使用“全部 / 书 / 影 / 音”。
- “默认每页 24 条”，普通“上一页 / 下一页”，不做无限滚动。
- 只公开“读过、看过、听过”；未评分显示“未评分”，内部未知值为 `null`，不画零星。
- 热力图说明为“按标记日期”；灰阶为“0、1、2、3、4 条及以上”，提示保留真实条数。
- 默认当前年；当前年空时显示“这一年还没有公开记录”，有历史时提供“查看最近有记录的年份”。没有获准内容时显示“书影音正在整理。”。
- 年份未知进入“日期待补”；未覆盖年份不能写成零，尚未核对的范围采用“已收录”口径。
- 档案时区使用设计稿建议的 `Asia/Shanghai`；年月日原样保存，明确偏移时间才换算，不推断当时所在地。
- 环境 `#F0EFEA`、纸面 `#FAF9F6`、正文 `#292825`、次级文字 `#686660`，复用现有字体与纸面，不套旧书壳。
- 桌面保留 `300 / 242px` 左栏及导航字级；主导航末尾新增“05 书影音”。手机页头内全宽单行，沿用当前字号，触控高度至少 `44px`。
- 已认可的导航末项到人物留白保留。新增导航后的实际画面仍交用户确认；不修改人物素材、动作或开场。
- 私下原件、待审修订、凭据和原始账号资料不进入公开仓库、`public`、客户端 JSON、源码映射或构建产物。
- 首次导入默认待审；已公开内容的新评分/评论也先审后发。本站隐藏持久生效，重导入不得复活。
- 无脚本时主要入口、年份、分页、详情与返回可用；网络或封面失败不移除正文。
- 不删除旧 `/books`、`/music`、`/movies` 及详情；`/drinks` 不参与本次整合。
- 按仓库规范使用 Bun、`@`别名和领域目录；新单文件不超过500行，不使用 `any`；新增模型变化同步消费端、测试和维护说明。
- 不安装账号备份扩展，不读取登录会话，不接收原始豆伴备份 ZIP、密码或 cookies；不承诺自动采集、自动公开或即时隐私同步。
- 任务使用小步 TDD。未经另行授权不执行 `git commit`、`git push`、`bun run publish`、`bun run deploy:cf`；每步以可审阅差异和验证记录代替提交检查点。

## Review Focus

1. **可信的新数据撤回旧公开记录：** 候选先排除，未解决的撤回项阻断发布；报告仍说明线上旧版本可能可访问。任务 2、8、12 测试。
2. **日期看似完整但含义或时区不明：** 不把创建/导入日期伪装为标记日；部分日期不进每日格，未来/无效日期隔离。任务 1、3、10 测试。
3. **从深分页和日筛选进入详情再刷新或返回：** 恢复可链接状态和记录锚点，不借陈旧 history 把用户送到错误页面；无脚本仍有有效普通链接和浏览器返回。任务 3、6 测试。
4. **来源成功但不完整，或旧导出回灌：** 不删除缺项、不覆盖新修订、不更新“最后完整成功”时间；单独显示部分成功。任务 2、8、11 测试。
5. **五项导航与可操作日历占满窄屏：** 360px、767/768px、真实 200% 下文字不缩小硬塞、触控不重叠、焦点不被转场吞掉。任务 5、7、9 测试。

---

## 0. 起点、文件边界与实施前检查

### 已核实的依据

- 权威源码：Library `libfile_0d03c46fad088191b0c936924828105b`，当前元数据版本 **25**，文件名沿用 `baozi-space-D151-album-cloud-20261003T0602Z.tar.gz`；旧文件名不表示仍是 D151 实现。
- 权威报告：Library `libfile_f35bd25f1b28819182cc4e0e1bd20191`，本计划输入为 **26**。
- 本次只读检查了现有本地基线；其 `_handoff/manifest.json` 的 **1,867 项路径、大小和 SHA256 全部匹配**。这是本地清单一致性，不代替未来执行环境的下载、版本和整包校验。
- 现有 `ShellLayout.astro`、`EditorialHero.astro`、`editorial.css` 可复用；Projects 有独立的公开白名单模型、返回状态与隔离夹具模式。
- 当前 `/books`、`/music` 使用旧归档；`/movies` 是 noindex 占位页。当前没有统一书影音集合，也没有可直接当作真实豆瓣导入器的模块。
- v25 报告记载单元 815/815、源码范围 check 203 文件无错误、生产 19 页、Mac 专项浏览器 53/53。这些是**基线历史结果**，不是新栏目的测试结果。
- 默认全归档 check 仍有 **3 个 D155 历史错误**，必须继续标为 NON-GREEN。不得改根 tsconfig、删除历史证据或降低断言来消除统计上的失败。

### 开工前的停止条件

用户审阅本计划并选择执行方式后，才可创建或继续实施任务。执行者重新读取设计稿、计划、当前 `AGENTS.md` 和恢复说明，核实源码/报告版本是否已变化；若有新的产品差异，先说明如何影响本计划。若 Mac 不在线，先报告阻塞，不擅自转到另一台电脑实施。

当前已采用获批设计、现行纸面/字体/内容门禁，以及保留原始失败证据的原则；旧四项导航和旧 Shelf 主入口被本次已批准的五项导航与统一栏目覆盖。仓库提及的历史 Windows 项目笔记在本次环境不可读，未猜测其内容，也不因此阻塞这份基于完整获批设计的计划。未来执行者只在原环境可访问时核对相关笔记，不为此扩展访问范围。实施阶段在 `docs/project/decision-log.md` 追加本次已批准决定，并同步设计文档的导航变化；不覆盖旧决策原文。

在独立副本建立基线指纹：现有 `src`、`public`、`scripts`、`tests`、配置与锁文件，以及旧内容和历史交付证据。测试产物只写本次输出目录；相册的旧夹具运行器使用一次性 QA 副本，不能让它覆盖历史证据。

### 计划文件地图

所有相对路径以项目根目录为准；以下新文件在实施阶段创建。

| 边界 | 文件 | 职责 |
|---|---|---|
| 规范化契约 | `src/lib/media/schema.ts`、`dates.ts` | 类型、白名单校验、评分/日期语义；无文件系统、无网络 |
| 导入核对 | `scripts/media/adapters/safe-json.ts`、`reconcile.ts`、`publication.ts` | 来源转换、修订差异、私下批准/隐藏决策；不被浏览器导入 |
| 维护入口 | `scripts/media/import.ts`、`publish-candidate.ts`、`audit-output.ts` | 默认只预览；受校验批准文件约束生成候选；检查公开产物 |
| 页面模型 | `src/lib/media/publicSnapshot.server.ts`、`model.ts`、`routes.ts` | 读取白名单快照、年度/日期聚合、排序分页、静态路径 |
| 公共数据 | `src/data/media/public.json` | 唯一生产输入，初始空快照；不包含原件、维护账本和待审修订 |
| 栏目 UI | `src/components/media/MediaArchive.astro`、`MediaList.astro`、`MediaCalendar.astro`、`MediaDetail.astro`、`media.css` | 页面、列表、日历、详情；共用轻量样式 |
| 渐进增强 | `src/lib/media/calendar.ts`、`history.ts`、`lifecycle.ts` | 日历键盘与月份展开、返回状态；可销毁、幂等挂载 |
| 路由 | `src/pages/media/index.astro`、`[...state].astro`、`item/[id].astro` | 当前年入口、年度/类型/日期/分页静态页、规范详情 |
| 最小共享改动 | `src/components/layout/SiteRail.astro`、`shell.css`、`src/lib/transitions/pageTurn.ts` | 加第五项、手机单行布局、仅增加 media 转场 allowlist |
| 测试 | `tests/unit/media/*.test.ts`、`tests/fixtures/media/records.ts`、`tests/e2e-media/*.spec.ts`、`playwright.media.config.ts` | 纯函数、合成隐私数据、隔离浏览器验收 |
| 隔离夹具与说明 | `scripts/media/run-fixtures.ts`、`docs/media-maintenance.md` | 生成测试副本、私下维护操作和失败恢复 |

`src/lib/sections.ts` 的旧条目含历史归档编号，不直接把“05 书影音”塞进旧集合类型；主导航按 `SiteRail` 的现行实现增补。不为首版重构所有栏目，不将 Projects/Photos 的 history 或 lifecycle 泛化成新框架。未使用的 sitemap、搜索或结构化数据功能不为了本栏目新建；若执行时发现实际输出器，则必须接入同一个公开选择器并补输出测试。

### 核心接口与命名

- `MediaType = 'book' | 'movie' | 'music'`；`MediaFilter = 'all' | MediaType`。
- `NormalizedRecord`：`id`、`source: 'douban' | 'manual'`、`subjectId: string | null`、`type`、`title`、`sourceStatus`、`status: 'completed' | 'other' | 'unknown'`、`sourceVisibility: 'public' | 'private' | 'unknown'`、`myRating: 1|2|3|4|5|null`、`markDate`、`commentRaw`、可选基础资料和链接。私下另带来源版本、修订摘要和最近见到时间。
- `MarkDate`：`raw: string | null`、`precision: 'day'|'month'|'year'|'unknown'`、`year/month/day` 可空、`calendarDate: string | null`、`instant: string | null`、`basis`。`basis` 说明来源字段和已核实的含义；不把未知偏移字符串变成可信 `instant`。
- `ImportBatch`：输入格式版本、内容哈希、导入时间、源数据时间（可空）、覆盖范围、可靠程度、标准化记录与问题。输入顺序/文件修改时间不能冒充来源新旧证据。
- `PublicationLedger`：按稳定 ID 保存批准的修订哈希、独立站内覆盖、持久隐藏和待处理撤回；仅在仓库外私有维护目录存储。
- `PublicMedia`：只保留页面所需 `id/type/title/myRating/markDate/comment/tags/credits/doubanUrl/blogHref/cover`。封面含已批准本地路径、尺寸、替代文本与可公开署名；完整来源证明在私下账本。
- `PublicSnapshot`：`schemaVersion: 1`、`generatedAt`、`archiveTimezone: 'Asia/Shanghai'`、`coverage`、`entries: PublicMedia[]`。批准凭据、内部导入 ID、私人状态和 source raw 不输出。
- `ArchiveState`：`year: number | 'undated'`、`type: MediaFilter`、`day: string | null`、`page: number`。
- `ArchiveView`：状态、当页最多 24 条、总页数、当年所选类型的最多 366 天计数、可用年份、部分日期条数、当前年、覆盖说明。

这些类型由任务 1 定义，后续只引用它们。若真实输入要求改变公共接口，先补样本证据与计划修订，不在适配器里悄悄改变公开语义。

## 1. 静态 URL 与行为决策

### 明确的路径

- `/media/`：构建当年的“全部”第一页，直接输出 HTML；页面内有明确的当年链接。
- `/media/y/2026/`：该年全部第一页；`/media/y/2026/book/`、`movie/`、`music/` 为类型页。
- 在年度/类型路径后追加 `d/2026-10-05/` 得到当天页；追加 `p/2/` 得到第二页。第一页省略 `p/1/`。
- `/media/undated/` 及其类型、分页路径承载连年份也未知的记录；不生成日历日路径。
- `/media/item/{stable-id}/` 为站内详情。ID 例如 `douban-book-12345`，不随标题、评分或状态变化。

`getStaticPaths` 从同一公开快照枚举：当前年、已有批准记录的年份，以及覆盖证据明确的空年份。四种类型的年度第一页可为空；其余页只生成实际页码。日期页只为当前类型有公开记录、且不是未来的日子生成。未知/恶意/越界路径普通 404；不生成二十年×所有日期的空页面。

修改年份清除日条件，保留类型；修改类型仅在目标类型当天仍有记录时保留日条件；修改年份/类型/日期均回到第一页。选中日只过滤列表，年度热力图不跟着缩成单日。再次点选同一天或“查看全年”回到对应年度/类型第一页。

### 日期、排序与跨年

- 精确日期倒序；同日先排列有可信时间的条目并按时间倒序，再排列无可信时间的条目并按稳定 ID；同一时间也以 ID 打破并列。这一全序避免“有时比时间、有时比 ID”造成比较器不传递，不伪造时间。
- 已知年份但缺月/日的记录放在该年“日期待补”分组，组内按已知年月倒序后 ID；不计日历。未知年份只在全局“日期待补”。分页仍总计 24 条，并在跨页处重复必要分组标签。
- 对明确偏移时间按上海时区确定日；纯日期保持原值。无偏移时间若其日历日期与字段含义已核实，可保留该日但不给可信瞬时排序；未核实则留待审。
- 无效日期与未来标记进入异常区，不擅自改成今天。日历中的未来格是“未来日期”，无零记录含义、不可选择。
- 当前年份由构建时的上海日期决定。`docs/media-maintenance.md` 规定每年上海时间 1 月 1 日后的第一次维护执行受测重建，再按已授权的发布方式更新。首版不擅自创建定时任务或部署凭据；若要无人值守跨年更新，另行确认。未重建时仍显示已生成年份，不用客户端改年份伪装更新。

### 返回与无脚本

列表项具有稳定 `id="media-{id}"` 锚点。详情普通链接可附 `?from=`，值只能是已生成的本站书影音列表路径及该记录锚点；它只作为返回提示，不承担记录读取、筛选或权限。规范详情路径本身无查询参数也能完整阅读。

有脚本时复用既有 Astro history 合并原则，在独立 `baoziMedia` 命名空间保存来源状态、列表位置和焦点；有效同一导航链优先原生 `history.back()`，否则使用经白名单验证的来源普通链接及锚点。详情刷新/复制 `from` 链接也可返回该筛选；参数缺失、非法或不再有效时回条目所属年度，未知年份回“日期待补”。不覆盖 Astro 与其他栏目的 history 字段。

无脚本时列表、详情、年份、日期、分页都是真实静态链接；浏览器“返回”保留完整来源路径与原生滚动恢复，详情自身的默认返回链接指向所属年度/“日期待补”。无脚本不依赖客户端解析 `from`；这个默认返回与浏览器历史返回的区别必须在验收中分别记录，不能声称无脚本也保存了自定义像素坐标。

## Task 1：建立标准记录与日期契约

**Files:** 新建 `src/lib/media/schema.ts`、`dates.ts`；测试 `tests/unit/media/schema.test.ts`、`dates.test.ts`；合成输入 `tests/fixtures/media/records.ts`。

**Interfaces:** 输入未知数据和显式 `now`；`RatingFormat` 明确 `zeroMeansUnrated: boolean`，未知格式不给默认真值；输出 `parseNormalizedRecord(input: unknown): NormalizedRecord`、`normalizeMarkDate(raw: string | null, context: DateContext): DateResult`、`normalizeRating(value: unknown, format: RatingFormat): RatingResult`。`DateContext` 含来源含义、已知时区及构建时间；`DateResult/RatingResult` 均含规范值和问题，不用异常替换为 0 或今天。

- [ ] **1 写失败测试。** `identity_preserves_type_and_edition` 断言 book-123 与 movie-123 不同，同名不同 subject 不合并；`missing_identity_is_quarantined`。`rating_zero_is_format_specific` 断言已声明 0=未评分时得到 null、一星保持 1、8.7/无法解释零值进入异常，豆瓣总分不用作本人分。日期覆盖 2024-02-29、2025-02-29、仅年/月、无日期、无偏移、偏移跨日/跨年与未来。
- [ ] **2 跑 RED。** `bun run test:unit -- tests/unit/media/schema.test.ts tests/unit/media/dates.test.ts`；新函数未实现或预期不满足应失败，保存实际原因。核心断言：`expect(normalizeRating(0, { zeroMeansUnrated: true }).value).toBeNull()`；`expect(normalizeRating(1, { zeroMeansUnrated: true }).value).toBe(1)`。
- [ ] **3 实现最小纯函数。** 固定上述字段和枚举；禁止按标题生成自动合并；人工本地稳定 ID 必须是维护决策的产物。保留源文本，不渲染原始 HTML。
- [ ] **4 跑 GREEN。** 同命令全通过；断言纯日期 2026-01-01 不因运行机器时区改变；带偏移的边界按上海档案日期落格。
- [ ] **5 检查点。** 审查类型、合成标识和字段白名单；确认文件未含真实账号/私人评论，记录差异及结果，不提交。

## Task 2：实现修订核对与不可复活的公开门禁

**Files:** 新建 `scripts/media/reconcile.ts`、`publication.ts`；测试 `tests/unit/media/reconcile.test.ts`、`publication.test.ts`。

**Interfaces:** 消费任务 1 类型；输出 `reconcileBatch(previous: PrivateArchive, batch: ImportBatch): Reconciliation` 与 `buildPublicCandidate(archive: PrivateArchive, ledger: PublicationLedger, context: PublishContext): CandidateResult`。`Reconciliation` 的分类固定为新增、修改、重复、异常、待隐藏、无变化；`CandidateResult` 含快照、阻断项、变化摘要，不写磁盘。

- [ ] **1 写失败测试。** 同文件两次导入记录数/日历数/详情 ID 不变；状态变化不换 ID；旧来源不得覆盖新修订；未知新旧进入冲突；新评论待审时旧批准版保持；独立站内改写不被覆盖。`site_hidden_survives_reimport`、`private_and_unknown_never_auto_publish`、`incomplete_batch_does_not_delete` 必须覆盖。
- [ ] **2 跑 RED。** `bun run test:unit -- tests/unit/media/reconcile.test.ts tests/unit/media/publication.test.ts`；确认未实现的门禁失败，而非测试输入无效导致空跑。
- [ ] **3 实现核对。** 批准绑定 ID + 修订内容哈希，不是可继承到任意未来版本的 approved 布尔值。私密/未知可见性、缺身份、异常和非完成状态不得批量批准。可靠新来源的隐私/状态撤回生成高优先级项；候选先排除，未解决项让候选不可发布。缺项、窗口滑动、访问失败只标待核对。
- [ ] **4 跑 GREEN。** 再加 `private_change_is_publication_blocker`：候选无该记录且有阻断；报告指出线上状态尚未核验。`older_private_claim_requires_review`：无法确认来源新旧时不静默抹掉新事实，也不把冲突当成功。失败批次不能返回一个可自动覆盖当前快照的空集合。核心断言：`expect(candidate.snapshot.entries.some(e => e.id === hiddenId)).toBe(false)`，`expect(candidate.blockers).toContainEqual(expect.objectContaining({ kind: "withdrawal" }))`。`CandidateResult` 的公开字段名统一为 `snapshot` 和 `blockers`。
- [ ] **5 检查点。** 独立审查公开决策与站内覆盖优先级。私下账本不在 `src` 或 `public`；真实批准和隐藏操作仍需具体用户指令。

## Task 3：生成公开视图、静态路径与分页

**Files:** 新建 `src/lib/media/publicSnapshot.server.ts`、`model.ts`、`routes.ts`、`src/data/media/public.json`；测试 `tests/unit/media/model.test.ts`、`routes.test.ts`、`snapshot.test.ts`。

**Interfaces:** `readPublicSnapshot(): PublicSnapshot`；`buildArchiveView(snapshot: PublicSnapshot, state: ArchiveState, now: Date): ArchiveView`；`listHref(state: ArchiveState): string`；`enumerateArchiveStates(snapshot: PublicSnapshot, now: Date): ArchiveState[]`；`detailHref(id: string, from?: string): string`。只允许任务 2 产生的白名单公开字段进入生产。

- [ ] **1 写失败测试。** 24/25/48/49 条分页无重漏；同日排序可重复；二十年跨度的合成夹具可达；当前年无记录不跳旧年；未知年份与部分日期分离。点日后热力图仍是全年当前类型；换年清日、换类型在有效时保日，否则清日；均回第一页。
- [ ] **2 跑 RED。** `bun run test:unit -- tests/unit/media/model.test.ts tests/unit/media/routes.test.ts tests/unit/media/snapshot.test.ts`。
- [ ] **3 实现路径与模型。** 使用上一节唯一 URL 规则；只枚举有结果的日期/非首页分页；404 不暴露待审 ID。快照 loader 显式选字段，拒绝含原始输入/维护私有字段的文件。初始 `public.json` 为真实空快照，不将合成示例写进生产。
- [ ] **4 跑 GREEN。** 固定 `now` 测试上海 12 月 31 日与 1 月 1 日，构建默认年不同；原构建的 HTML 不自行谎称新年。测试 `from=//evil`、编码路径穿越、任意外链、不存在的日期路径均不能成为返回目的地；恶意 `from` 值不影响正文或造成外部导航。
- [ ] **5 检查点。** 路径总数由公开数据计算并输出统计；不生成空日历详情笛卡尔积、不下发全部档案 JSON。核心断言：`expect(view.entries.length).toBeLessThanOrEqual(24)`，`expect(view.calendar.length).toBeLessThanOrEqual(366)`；`ArchiveView` 的这两个属性固定为 `entries`、`calendar`。

## Task 4：完成年度列表和静态空态

**Files:** 新建 `src/components/media/MediaArchive.astro`、`MediaList.astro`、`media.css`，`src/pages/media/index.astro`、`[...state].astro`；测试 `tests/unit/media/markup.test.ts`、`tests/e2e-media/archive.spec.ts`。同时建立本任务需要的 `scripts/media/run-fixtures.ts`、`playwright.media.config.ts`，固定2 workers、0 retries及原30秒测试/5秒expect预算。

**Interfaces:** `MediaArchive({ view: ArchiveView })`、`MediaList({ entries: PublicMedia[] })`；消费任务 3，不自行重新筛选。隔离 runner 接受 `--case empty|mixed|twenty-years|withdrawal --out <absolute-private-path>`，只在仓库外创建副本；返回副本路径及源指纹。

- [ ] **1 写失败测试。** 空生产只含“书影音正在整理。”且 noindex；当前年空态和历史入口正确；标题只有“书影音”；每页≤24条、短评最多两行、无短评不留空槽、未评分文字正确。封面/标题共同进入站内详情，原比例与唱片方形保持。
- [ ] **2 跑 RED。** 单元 `bun run test:unit -- tests/unit/media/markup.test.ts`；隔离副本准备后 `PLAYWRIGHT_PORT=4420 bun x playwright test --config playwright.media.config.ts archive.spec.ts --workers=2 --retries=0`。
- [ ] **3 实现最小页面。** 使用 `ShellLayout` 和 Editorial 排版。普通链接承载年份、类型、分页；缺封面没有大占位框。公开且批准的封面才引用本地小图，预留尺寸，首屏外 lazy；无可用封面直接文字布局。页面里不嵌入全量记录。
- [ ] **4 跑 GREEN。** 测试有 JS/无 JS 的直达、刷新、复制路径、前进后退；服务停止前已加载正文与过滤说明仍可阅读，离线导航失败保留当前页，不承诺离线访问未缓存的整库。
- [ ] **5 检查点。** 夹具页面明显标“合成测试记录”，仅在私下测试副本存在；截图验收前核对生产仍为空。不得用 noindex 充当私有预览权限。

## Task 5：完成年度灰阶日历与手机月份展开

**Files:** 新建 `src/components/media/MediaCalendar.astro`、`src/lib/media/calendar.ts`；增补 `media.css`；测试 `tests/unit/media/calendar.test.ts`、`tests/e2e-media/calendar.spec.ts`。

**Interfaces:** `MediaCalendar({ view: ArchiveView })`；`mountMediaCalendar(root: HTMLElement): () => void`；日计数只来自任务 3，点选路径只来自 `listHref`。

- [ ] **1 写失败测试。** 历史年365/366格；数量0/1/2/3/4/7映射0/1/2/3/4/4但读屏名称含实际7条；未来不是0且不能点击；缺精确日不入格。选中日期轮廓独立于灰度，全年分布不变。
- [ ] **2 跑 RED。** `bun run test:unit -- tests/unit/media/calendar.test.ts`；在 mixed 副本跑 `PLAYWRIGHT_PORT=4420 bun x playwright test --config playwright.media.config.ts calendar.spec.ts --workers=2 --retries=0`。
- [ ] **3 实现渐进增强。** 桌面紧凑年度格；手机十二个月概览，当前年默认当前月、历史年默认最近有记录月、全空默认一月。原生 `<details>/<summary>` 保留无脚本月份展开和日期链接；增强后日历采用 roving tabindex + 方向键/Home/End，Enter选择，Tab不遍历数百格。展开后的日期目标至少44px，月份概览不是唯一点选方式。
- [ ] **4 跑 GREEN。** 类型变化同时更新计数和列表；再次点日与“查看全年”清日；按标记日期及已收录范围说明存在。浏览器覆盖键盘、读屏名称、reduce-motion、月份跨断点焦点、无脚本日期链接与360px无横溢。
- [ ] **5 检查点。** 不增加打卡、成就、连续天数或完成量文案；检查月份概览只是聚合导航，具体日期仍可阅读和操作。

## Task 6：完成详情、来源返回和生命周期

**Files:** 新建 `src/components/media/MediaDetail.astro`、`src/pages/media/item/[id].astro`、`src/lib/media/history.ts`、`lifecycle.ts`；测试 `tests/unit/media/history.test.ts`、`lifecycle.test.ts`、`tests/e2e-media/detail-navigation.spec.ts`。

**Interfaces:** `MediaDetail({ entry: PublicMedia, defaultReturnHref: string })`；`readMediaHistory(state: unknown): MediaHistory`、`mergeMediaHistory(state: unknown, update: Partial<MediaHistory>): Record<string, unknown>`；`initMediaLifecycle(): void`。状态名为 `baoziMedia`，与 `baoziProjects` 分离。

- [ ] **1 写失败测试。** 详情本人评分、完整短评、可选标签/资料；无短评/无封面自然省略。恶意脚本/事件属性/iframe仅作为文字安全显示；不安全协议链接不生成。Blog入口只接已公开现存文章，不复制长评正文，豆瓣总分不出现。
- [ ] **2 跑 RED。** `bun run test:unit -- tests/unit/media/history.test.ts tests/unit/media/lifecycle.test.ts`；隔离副本运行 `detail-navigation.spec.ts`。
- [ ] **3 实现详情与独立生命周期。** 只为公开条目生成详情；私密、未批准、隐藏和不存在全部普通404。采用计划第1节返回规则。每次 Astro 挂载清理前次监听；不用全局捕获吞掉其他栏目的点击，不改现有 documentScroll 或 Projects 的恢复协议。增强滚动只调用现有 `scrollDocumentTo(target, { immediate: true })`；带 generation、取消信号、来源key和节点连接检查，夹紧scrollY，新输入取消陈旧恢复，不创建第二个 Lenis。页面组件中加载幂等 lifecycle，避免给全站每页增加档案数据。
- [ ] **4 跑 GREEN。** 从第2页+类型+选日到详情，刷新后返回来源和锚点；原生Back/Forward、详情直接访问、打开新标签、连续点击、取消导航、网络失败、767↔768、reduce-motion均不重复跳转/抢焦。存储不可用或history被外部改写时普通链接仍有效。无脚本分别测试默认返回链接与浏览器返回。
- [ ] **5 检查点。** 焦点在目标真正可见后恢复，不靠固定sleep或强行focus洗绿；监听次数和有效导航次数有断言。不会将另一个标签页或过期来源的scrollY套用到当前页。

## Task 7：接入第五项导航并保护现有页面

**Files:** 只修改 `src/components/layout/SiteRail.astro`、`shell.css` 和 `src/lib/transitions/pageTurn.ts` 中对应位置；新增 `tests/unit/media/navigation.test.ts`、`tests/e2e-media/navigation-responsive.spec.ts`；按实际行为更新受第五项影响的旧导航断言。

**Interfaces:** 导航项 `05 书影音 → /media/`；media 在列表/详情均正确 current。`EDITORIAL_SECTIONS` 仅增 `media`，不改过渡时长、取消、滚动或焦点实现。

- [ ] **1 写失败测试。** 桌面5项顺序/地址、当前项唯一；手机5项全宽单行、文字字号等于修改前基线、每项高≥44px、命中区域互不遮挡。旧4项目标不变；旧books/music/movies路由仍能直达。
- [ ] **2 跑 RED。** `bun run test:unit -- tests/unit/media/navigation.test.ts`，再运行 `navigation-responsive.spec.ts`。旧“严格四项”测试应按新设计增加第五项，不删除其他布局/焦点断言。
- [ ] **3 实现局部改动。** 桌面300/242px栏宽和原导航字级不变；手机仅把原页头内导航分配到全宽单行，不缩现有12px文字/9px编号。保留44px触控高度、人物素材和已认可间距规则。首页、阅读页、Photos特殊布局分别验证，不大改共享外壳。
- [ ] **4 跑 GREEN。** 360/390/767/768/1024/1440px及窄平板无横溢；真实浏览器200%分别记录实际倍率与断点变化，不能拿viewport缩小代替。新增第五项后截图让用户看实际留白；若测出不可同时满足的布局约束，暂停提出最小调整，不自行改设计。
- [ ] **5 检查点。** 对开场与Home/人物/资源建立哈希保护；shared CSS改动逐条审查。保留测试的首次失败；发布前仍不把用户尚未看过的新导航画面标“已视觉认可”。

## Task 8：建立安全 JSON 导入命令与产物审计

**Files:** 新建 `scripts/media/adapters/safe-json.ts`、`import.ts`、`publish-candidate.ts`、`audit-output.ts`、`docs/media-maintenance.md`；测试 `tests/unit/media/import.test.ts`、`outputAudit.test.ts`、`tests/e2e-media/privacy-output.spec.ts`。需要脚本别名时才增改 `package.json`，不改变既有 publish/deploy 脚本。

**Interfaces:** `readSafeJson(bytes: Uint8Array): ImportBatch`；`runImport(inputPath: string, privateDir: string): ImportRunReport`；`writeCandidate(approvalPath: string, privateDir: string, expectedSnapshotHash: string): CandidateWriteResult`；`auditMediaOutput(distDir: string, expected: PublicSnapshot): AuditReport`。

- [ ] **1 写失败测试。** 原始备份ZIP、账号备份对象、cookies/token/password字段、超限文件、路径穿越、HTML脚本、错误subject URL、部分损坏批次都不能自动写公开快照。私下报告不回显疑似凭据。模拟中断后原快照哈希保持。
- [ ] **2 跑 RED。** `bun run test:unit -- tests/unit/media/import.test.ts tests/unit/media/outputAudit.test.ts`；在withdrawal副本运行 `privacy-output.spec.ts`。
- [ ] **3 实现离线命令。** 首版安全JSON只接受明确版本、列白名单和作品/标记字段；限制10MiB输入、50,000行、单评论100,000字符，超限说明如何拆分，不静默截断。命令默认预览，私有输入/账本/报告必须位于仓库及发布目录之外，realpath校验拒绝符号链接逃逸。日志只写统计、行号和原因，不写私密原文。无网络请求、无Excel公式或脚本执行。
- [ ] **4 验证写入门禁与GREEN。** 公开候选命令要求具体批准文件，包含已批准ID/修订hash、隐藏决策、预期旧快照hash；检查通过后原子写临时候选并校验，最终本地替换只有在已获对应批准时执行。损坏、并发旧hash、未解撤回/冲突都拒绝替换。审计遍历HTML/JS/JSON/maps/可用索引/站点地图/结构化数据及资源文件名，任何私有哨兵、隐藏ID或不批准封面残留都失败；fresh dist，不能累积旧详情。
- [ ] **5 检查点。** 说明最近成功、部分成功、失败及覆盖范围；失败不更新时间戳冒充成功。维护文档写清“候选已排除”与“线上已下架”不同。现有搜索/sitemap若不存在，报告标不适用，不能声称已测试不存在的输出。

示例命令仅在实施后可用，私有路径由当次执行环境验证：

```bash
bun scripts/media/import.ts --input "$PRIVATE_MEDIA_DIR/marks.json" --private-dir "$PRIVATE_MEDIA_DIR" --preview
bun scripts/media/publish-candidate.ts --private-dir "$PRIVATE_MEDIA_DIR" --approval "$PRIVATE_MEDIA_DIR/approval.json" --expected-snapshot-hash "$APPROVED_PREVIOUS_HASH" --out "$PRIVATE_MEDIA_DIR/candidate.json"
bun scripts/media/audit-output.ts --dist ./dist --snapshot ./src/data/media/public.json
```

原件不因导入成功被删除，不上传任何第三方服务。默认开发交付包也排除私有维护目录，不只靠 `.gitignore`。

## Task 9：完成首版综合验收与视觉审阅材料

**Files:** 增补 `tests/e2e-media/archive.spec.ts`、`calendar.spec.ts`、`detail-navigation.spec.ts`、`navigation-responsive.spec.ts`、`privacy-output.spec.ts`、`resilience.spec.ts`；新证据在本次独立交付目录，不覆盖历史报告原文。

**Interfaces:** 消费任务1–8的冻结候选及合成夹具；输出文件指纹、测试原始结果、截图、已通过/失败/阻塞/未运行清单。没有新的产品接口。

- [ ] **1 固定验收矩阵。** empty、mixed、twenty-years、withdrawal四种副本；包含单年、闰年、当前年空、纯年月/年、未知日期、25+条同日、低/高长评、无评分/无封面、跨类型同号、站内隐藏、待审修订和伪造隐私标记。合成二十年只证明跨度处理，不证明用户历史完整。
- [ ] **2 执行全单元与构建。** `bun run test:unit`、`bun run check`、`bun run build`；另外在不修改根配置的源码专用检查副本跑 `bun run check`。默认归档check的3个旧错误独立列出，任何新增错误阻断；不笼统写“全站check通过”。
- [ ] **3 执行浏览器与产物。** 各夹具在独立构建运行 `PLAYWRIGHT_PORT=4420 bun x playwright test --config playwright.media.config.ts --workers=2 --retries=0` 和产物审计。生产回归使用 `PLAYWRIGHT_PREVIEW=1 PLAYWRIGHT_PORT=4421 bun run test:e2e --workers=2 --retries=0`；Projects/Photos原专项按其恢复说明在隔离副本执行。不能把注册列表或旧结果当本次PASS。
- [ ] **4 复验异常与回归。** 连点/取消/Back/Forward、断网、图片404、监听清理、无JS、reduce-motion、键盘与焦点；首屏不请求豆瓣、不拉全量档案、不超过24张封面，日历≤366个计数。开场、首页、文章、照片、简历、项目、旧归档地址继续按原要求回归，旧900ms竞态等未解决事项保留原归属。
- [ ] **5 交视觉审阅。** 提供1440px桌面、390/360px手机、767/768边界与真实200%截图和简短操作演示；注明所用独立浏览器、真实设备/模拟区别。用户确认新增导航留白和日历可读性前，功能通过与视觉认可分开记录。Safari、实体iOS或原生200%若被环境阻塞，明确未验，不能用别项冒充。

**首版完成定义：** 合成记录的页面、规则和维护命令通过新验收；生产仍只含获准内容，初始可为空。还未获得样本时写“框架与规则完成，真实来源适配/迁移待样本”，不能写“二十年豆瓣已导入”。

## Task 10：拿到安全样本后完成真实来源适配与私下核对

**进入条件：** 用户提供少量只含书影音标记的Excel或脱敏JSON；未提供时本任务等待，任务1–9可完成。任何原始备份ZIP或疑似凭据文件停止处理并提示提供安全导出，不从中自行提取cookies等信息。

**Files:** 新增已核验格式对应的 `scripts/media/adapters/douban-export.ts`；若样本是 `.xlsx`，新增独立 `xlsx-reader.ts` 及 `tests/unit/media/xlsxReader.test.ts`；映射测试 `tests/unit/media/doubanExport.test.ts`；维护说明补实际列名与版本。真实文件、核对报告和覆盖表留在仓库外。

**Interfaces:** `readDoubanExport(input: SafeExportInput, mapping: VerifiedMapping): ImportBatch`，输出完全沿用任务1–2。`VerifiedMapping` 明确来源版本、列名、状态/评分/可见性含义、创建时间语义和覆盖范围；没有已核实映射就拒绝自动批准。

- [ ] **1 先核样本。** 实际逐列确认完成状态、本人评分、可见性、subject链接、创建时间到底代表什么；记录缺项。对Excel核实文件是真实xlsx还是其他格式，不能仅凭扩展名猜。豆瓣简介/总评分/他人内容不映射进公开模型，导出无封面不自动补图。
- [ ] **2 冻结适配小清单并写RED。** 用不含真实隐私的最小等价fixture覆盖实际字段、空值、未知状态、重复与损坏行；新映射测试必须先失败。若需要Excel依赖，先检查所选官方来源的当前维护/安全状态、Node兼容与宏/公式行为，写明唯一版本和锁文件变更，再实施适配；本计划不预装或假定某解析库安全；此小清单只落实已批准的适配边界，若需要扩大权限或产品范围，先暂停请求具体批准。
- [ ] **3 实现最小适配。** JSON复用任务8。Excel只读值，不执行公式/宏；拒绝xlsm/加密文档、外链、异常压缩/路径，公式单元格作为异常而非可信评分或日期。读取器须支持压缩前10MiB、解压后100MiB/10,000成员、50,000行等硬限制以及超时中止；不能施加硬限制的库不采用。适配不联网、不决定公开。
- [ ] **4 私下试导与复导。** `bun run test:unit -- tests/unit/media/doubanExport.test.ts`；如有xlsx再跑对应测试。真实文件导入两次核对新增/修改/重复/异常/待隐藏/无变化；按年份、类型、状态、本人评分和日期分层抽查。记录“导出中可见条数→接受→重复→隔离”的平衡关系，不能按预想二十年总数补齐。
- [ ] **5 交核对结论。** 向用户展示覆盖到哪些年份/类型、哪些字段缺失、异常与拟公开范围；未知起始年、完整率不虚构。缺少subject的条目逐项人工确认本地ID；站内旧长评与新标记的对应关系另列，不自动合并同名作品。

这是条件阶段，不把未知字段写成已知接口细节。若真实导出超出安全可支持格式，保留通用契约，先请求转换为安全JSON/标准xlsx；不扩展为通用账号备份阅读器。

## Task 11：可选的 RSS 近期补充

**进入条件：** 已取得用户实际豆瓣主页；只读核验确认公开RSS可用、内容范围和字段语义。没有实际主页就不猜用户ID，不宣布订阅成功。首版和真实手动导入不依赖此任务。

**Files:** 条件新增 `scripts/media/adapters/rss.ts`、`scripts/media/probe-rss.ts`、`tests/unit/media/rss.test.ts`；不新增访客端请求或自动化配置。

**Interfaces:** `parseVerifiedRss(xml: string, context: VerifiedFeedContext): ImportBatch`；输出覆盖标记固定为近期窗口，走同一差异与批准门禁。

- [ ] **1 核验公开入口。** 验证返回状态、最终官方host、类型、日期/评分/评论/可见性字段和窗口长度。登录页、CAPTCHA、HTML错误页不是空RSS成功；不能通过登录态抓取绕过。无可验证可见性时保持未知，留待人工核对。
- [ ] **2 写RED。** 窗口滑动缺项不删除历史；更新先待审；超时/429/格式错误/部分结果保留获准快照；外部实体、DTD、恶意链接、过大响应和重定向到非允许主机拒绝。
- [ ] **3 实现最小近期适配。** 官方公开源白名单、限2MiB响应、限10秒、最多3次同源跳转；不加载外部实体或抓取条目页补正文。记录窗口观察和最近成功时间；数据进入私下候选，不自动公开。
- [ ] **4 跑GREEN并比对。** `bun run test:unit -- tests/unit/media/rss.test.ts`，少量真实RSS与安全导出同ID比较，说明哪些更新能看到、哪些隐私变化/历史更正看不到。失败时给出维护原因，不更新成功时间。
- [ ] **5 决定是否启用。** 仅在核验有用后再讨论频率和执行环境；本计划不建立定时采集、凭据、通知或自动发布。后续完整导出仍负责历史对账。

## Task 12：经批准后的真实快照迁移与发布验收

**进入条件：** 首版已验收；真实来源已核对；用户明确批准记录范围、修订和封面。是否部署另有具体授权。没有这些批准，仅交私下预览与候选，不执行公开迁移或上线。

**Files:** 只有获准后才替换 `src/data/media/public.json`、加入已批准本地封面及可选 `src/data/media/legacy-links.json`；旧路由修改限经核对的逐项映射。新增 `tests/unit/media/legacyLinks.test.ts` 和真实候选产物审计，不把真实私密样本写进测试库。

**Interfaces:** 批准文件绑定任务8的候选hash；`legacy-links.json` 每项为已核实 `oldPath → newPath` 与迁移处置，不用通配规则把所有旧页面赶到年度列表。

- [ ] **1 核准公开清单。** 列出真实条数、年份/类型范围、具体修订/站内覆盖、缺日期/评分、隐藏项与封面使用依据；无批准封面继续文字布局。独立长评优先留在已批准Blog唯一正文，详情只链接。
- [ ] **2 写并跑迁移RED。** 对候选检查所有公开输出的一致性；确认取消公开的旧详情、列表、计数、热力图和任何索引均不含内容，未批准/私密详情404。旧URL逐项断言保留或兼容到具体内容，长文不得笼统跳年度列表。
- [ ] **3 生成新快照并GREEN。** 在旧快照hash一致且批准有效时写候选，fresh build，执行所有隐私/路由/内容验收。输出可回滚版本但禁止回滚到已经撤回的私密内容；修复回滚也要保留隐藏否决。
- [ ] **4 如获部署授权才上线。** 沿确认的现有部署流程，不顺便改平台、DNS或凭据。远程验证新部署版本、主要路径、404及缓存后的实际响应；更新撤回项只有线上原URL确认不再暴露才可记“已下架”。若旧部署、CDN或旧可访问构建仍暴露，继续如实报告并请求必要的移除/清缓存操作授权。
- [ ] **5 交付及维护。** 清晰区分“实现验收”“真实资料核对”“公开批准”“上线核验”；记录最后成功导入、覆盖范围、仍待补字段和跨年重建责任。安全导出与最近批准快照可恢复，原账号备份与凭据不进入任何交付。

## 任务依赖与暂停点

```text
1 契约 → 2 修订/门禁 → 3 公开视图与URL
                         ├→ 4 列表 → 5 日历
                         ├→ 6 详情/返回
                         └→ 8 导入命令/审计
4/5/6 → 7 导航接入；1–8 → 9 首版验收
安全样本 → 10 真实适配；实际主页 → 11 可选RSS
9 + 10 + 具体公开批准 → 12 迁移；部署还需单独授权
```

界面组件可以在契约冻结后并行，共享 `SiteRail/shell.css/pageTurn` 只由一个执行者修改。隐私门禁先于真实数据接入；RSS不能成为首版的隐含阻塞。

## 覆盖自检

| 设计稿要求 | 本计划位置 |
|---|---|
| 当前年、往年、分页、分享URL、日期待补 | 第1节、任务1/3/4 |
| 年度热力图、类型联动、手机月份、无脚本 | 任务3/5/9 |
| 本人评分、全文短评、详情返回、长评归Blog | 任务1/6/12 |
| 现有外壳、五项单行导航、保留开场和人物 | 任务7/9 |
| 导入去重、旧数据回灌、待审修订、隐藏否决 | 任务2/8/10 |
| 撤回、产物白名单、普通404、线上旧版风险 | 任务2/8/12 |
| 字段核验、封面来源、安全输入、无凭据 | 任务1/8/10/12 |
| 来源失败、RSS有限窗口、跨年重建 | 第1节、任务8/11 |
| 旧URL、性能、可访问性、原回归不洗绿 | 任务3/7/9/12 |

## 审阅与执行选择

请审阅本计划是否准确表达已确认的设计，尤其是：手机第五项的局部布局、静态归档路径、数据先私下核对再公开，以及没有脚本时以浏览器返回保留来源状态的行为。

推荐在既有 Mac 工程任务中采用“逐任务实施、逐任务独立审查”。若选择“同一执行者连续实施、最后统一审查”，任务顺序和隐私验收不变。收到计划确认和执行方式选择前，到此停止，不创建产品脚手架或开始编码。
