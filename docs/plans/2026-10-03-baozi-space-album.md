# baozi space 相册栏目 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有网站中实现横向选影集、电脑双页／手机单页的照片阅读体验，保留作者顺序、完整比例、稳定地址和返回位置。

**Architecture:** 保留 Astro 静态路由与 ShellLayout，用构建期内容门禁生成公开相册数据、原生 TypeScript 增强阅读与历史状态、CSS 完成轻量纸面转场。相册列表、阅读模型、导航恢复、角色各自独立；角色和动画不控制内容是否可见。第一版不新增运行时库、服务端或 React island。

**Tech Stack:** 仓库锁定的 Bun、Astro 5.18.2、TypeScript、原生 CSS、Vitest、Playwright；复用已有 Astro ClientRouter 与 Lenis 封装。

**Spec:** 当前读取 `docs/design/baozi-space-album-design-v1.md` v1.3（D-155）。原始已审阅稿保存在 Library `libfile_297f8bad9c648191a0afe99d1cad4ed2`，用户于 2026-10-03 确认；该原稿保留为历史输入，不覆盖本轮更新。

状态：D-155目录与四组3:2取景已正式批准并完成功能及保护审计。旧D154/D153结果保留为历史，本轮159/80/55及55项审计单独记录。仅批准开发/取景，不等于上线；reader和内容门禁不变。

## 当前阶段 · D-155 3:2取景与影集目录（2026-10-03）

列表封面统一 3:2，`object-fit: cover`；默认中心取景，可选 `album.coverPosition: {x,y}` 使用百分比，仅作用于列表封面，不改变原图文件或 reader。封面继续无灰底、书脊、边框、硬阴影和书壳内衬。桌面 ≥768px 在内容纸内左侧放纵向影集名称，以短线标明当前项；纸内目录按视口宽度切换：>1050px为148px/间距28px，768–1050px为116px/间距20px。手机 ≤767px 以当前名称作为展开开关，展开完整名称列表，选择后关闭；键盘、焦点、Escape与resize均须可用。名称只横向定位图片，不打开影集或触发页面导航；手动横滚同步当前项。移除“挑一本”和图片下重复名称，保留控件及图片入口的可访问名称。

图片横轨桌面约1.6张/26px间距、总宽≤648.4px；封面宽≤384px，3:2推得高≤256px，不再沿用480px的4:5占位高。手机约1.4张/18px间距。轨道左右共8px留白保留，上限公式为`384 × 1.6 + 26 + 8 = 648.4px`；窄可用纸面先扣除栏目目录宽与间距，再同比缩小照片。全站左栏>1050px为300px、768–1050px为242px，维持原响应式。reader保持原照片比例、759/760px实际内容宽度单双页、顺序、hash、返回位置/焦点及已有轻淡入，不增加硬壳翻页。D-150手机文章隐藏全部阅读辅助的规则不变；这里的影集展开目录是Photos列表模块，不是文章阅读目录。

| 影集 | 已确认列表封面来源 | 列表取景位置 x/y |
| --- | --- | --- |
| upintheair | 同组云海 `AbPhjv4n5` | 50/100，居中靠底 |
| streetphotograph | 原封面 `EfSRCA4Bo` | 50/50，居中 |
| fukei | 同组摩天轮 `qO6lKLrnY` | 50/50，居中 |
| homestyle | 原封面 `zJhpksjx_` | 50/50，居中 |

该批准包含目录三张预览及四组具体3:2取景的开发集成，不等于线上发布。真实照片仍仅用于私有试排；私有选择记录由主执行者维护于 `design-assets/photos/d155-approved-cover-selections.json`，不迁移真实资产到public，不修改content批准字段或发布门禁；角色候选未批准、未接入，生产仍0公开相册/noindex。

本轮执行与验收（最终完成，无自动重试）：

- [x] 实现3:2列表取景与仅列表生效的可选`album.coverPosition:{x,y}`，默认中心；用私有配置记录四组已确认来源/取景，不迁移真实资产或改content批准。
- [x] 桌面纸内纵向名称/当前短线与手机当前名展开目录；选名仅横scroll、同步active，选择后关闭，键盘焦点/Escape/resize合理；删除“挑一本”及图下重复名，保留可访问名称。
- [x] 验证桌面1.6/26/648.4及384×256上限、手机1.4/18、宽148/28与窄116/20目录、全站左栏300/242不变；覆盖767/768边界、长名、无JS和减少动效。
- [x] 回归reader原比例、759/760单双页、hash、返回原位/可见性、滚动/焦点与原生200%；单独核对D-150手机文章辅助仍隐藏。
- [x] 完成本轮单元、检查、生产/夹具构建与浏览器，保留实际失败和最终日志；结果在`_handoff/d155-evidence/`，不借旧136/80/47。
- [x] 相对输入v9完成保护审计，已核对真实资源/public/content门禁、角色未接入、旧checkout及历史证据不变；归档版本与SHA256由同ID实施报告记录，不预填或自嵌。

D-155本轮已在用户Mac的独立Playwright Chromium完成：159/159单元（23文件）；Astro检查156文件、0错误0警告及2个既有hints；生产19页、零公开相册，最终全站80/80（第三轮，2.0分钟）；隔离相册55/55（保留原47项、新增8项，54浏览器+1HTTP，1.7分钟），夹具25页、私有预览20页。20项几何/无JS检查（九档宽度×两数据源及2项无JS）errors=[]、无整页横溢；原生200%缩放通过，含1440→720目录焦点/第四本保持及reader photo-b单双页、键盘回退。两副本199条源码哈希匹配，夹具另有150项src/测试一致性核对。三张已批准目录预览与最终截图逐字节一致，复用既有Library图片ID，不另造新预览。本轮静态与生产产物审计55/55通过：新生产67文件/19HTML无真实照片、私有资源或合成夹具泄露。public28、真实content25和其他模板1、角色17、锁文件/部署7、D-150保护61及历史handoff389（含D153证据68/D154证据57）均在规定保护范围内不变；两个原checkout799文件及Git状态一致，另326项旧正式源码/public、私有预览及归档/报告指纹不变。新证据在 `_handoff/d155-evidence/`；D154/D153旧结果仍作历史，本条通过数来自本轮最终运行。新独立源从Library源码v9/报告v11恢复，不重复应用D154补丁。当前规范为全站2.8/相册1.3。


本轮QA修复与中间证据：首轮全站78/80、第二轮79/80及相册两轮53/55的日志/trace全部保留，最终无自动重试。导航trace确认旧v9已有普通native.ready取消未被观察；最小修复仅观察DOMException AbortError，其他异常仍暴露，不更改导航设计、时长或D-150文章规则。两个既有导航测试分别改为真实后发点击gate和预先MutationObserver记录，修正定时/观察时序，不放宽完整页面断言。相册修复只恢复因断点隐藏而丢失的目录焦点；主动Tab、外部/空白点击会清除恢复意图，新增负例证明不抢焦点。第二轮相册失败是负例点击了可聚焦main，改成真实不可聚焦纸外目标后保留严格body焦点断言。

## D-154 直接照片与验收（2026-10-03；历史，不代表 D-155）

用户确认“直接照片，比例用于空间，不画书壳”。去除封面灰底、边框、硬阴影、全部书脊及书壳内衬 padding；保留不可见 4:5 slot，原图完整 contain、center bottom，照片实际下缘对齐，名称在下。手机 ≤767px 的 1.4 个位置/18px 与桌面 ≥768px 的 1.6 个位置/26px 不变；桌面 slot 高≤480px、宽≤384px，rail≤648.4px，轨道左右共8px留白继续服务原几何。空间不足同比缩小 slot，不通过裁图维持节奏。

名称导航同步收窄，左栏 >1050px为300px、768–1050px为242px。已有轻淡入足够，不增加硬壳翻页；reader单双页、hash、翻页、返回及其既有动效均不在本轮修改范围。角色未批准、真实照片仅私有试排，生产0/noindex不变。

D-154 执行与验证（本轮功能及最终保护审计完成）：

- [x] 去除全部封面书壳视觉和内衬；验证普通、选中、hover、focus及伪元素不恢复壳体，保留必要键盘焦点指示。
- [x] 实测横/竖/超宽照片完整 contain、实际下缘对齐、名称在下；4:5只占位，不以照片像素宽度误判1.4/1.6节奏。
- [x] 回归九档宽度、767/768边界、480px桌面占位高上限、648.4px轨道上限、名称定位、无JS、末项、返回原位/裁边、resize/reduced motion及原生200%缩放。
- [x] 从最终源码重新运行检查、生产与隔离相册回归，确认reader行为未变：136/136 单元（23 个文件）；Astro 检查 150 个文件，0 错误、0 警告、2 个既有 hints；生产 19 页构建、80/80 回归（1.3 分钟）；隔离夹具 25 页构建、47/47 检查（46 项浏览器 + 1 项 HTTP，19.9 秒）。
- [x] 20项几何/无JS errors=[]、原生200%（含1440→720）、68条副本关键文件哈希全部通过。四张先行私有真实照预览与最终CSS截图byte-identical，已有Library预览即最终视觉；见`preview-final-match.json`。
- [x] 本轮最终 `protection-final.json` 为42/42通过：public28、content27、私有角色17、门禁5、锁文件/部署7及D-150保护61项均与v8一致；D-153历史证据68项内外均未改，原两个checkout共799文件（181+618）及Git HEAD/分支/状态一致。新生产67文件/19 HTML通过扫描，无真实照片、私有试排、候选角色或合成夹具泄露；`previous-source-unchanged.json`另核对318项旧正式src/public、旧私有预览及旧归档/报告指纹，全部不变。

归档版本与SHA256由主执行者按实际输出写入同ID实施报告，逐文件清单见包内manifest/checksums；不预填版本，不把归档自身hash写入自身。

本轮新日志与JSON在 `_handoff/d154-evidence/`；D-153证据目录不覆写。当前输入为源码 Library v8 / 报告 v10，恢复清单623项；新阶段仅在 d154 独立快照操作。归档逐文件清单见包内 manifest/checksums，输出版本与SHA256以同ID《实施与验证报告》为准。

## D-153 响应式封面与验收（2026-10-03；历史，不代表 D-154）

本阶段覆盖历史 D-152 全端1.2本与D-151的1.8本，其他相册交互与内容门禁不变。

- 手机视口≤767px：约1.4本、18px间距，轨道左右共8px内边距。
- 桌面视口≥768px：约1.6本、26px间距、4:5封面框，高度上限480px，宽度上限384px。轨道总宽上限 `480 × 0.8 × 1.6 + 26 + 8 = 648.4px`。
- 设轨道总宽W（含8px内边距），封面宽度=`(W−8−gap)/可见本数`，高度=宽度/0.8。桌面W不超过648.4px及纸面实际可用宽度；窄空间下宽高同比缩小，不单压高度、不变形或裁切照片。
- Photos封面rail、名称导航和列表控制范围同步收窄，保留全站左栏原响应式空间：>1050px为300px，768–1050px为242px。此768px分界仅用于封面样式，内页单双页仍取实际reader内容759/760px边界。
- 角色候选仍未批准；真实照片仅获准私有试排，没有授权生产迁移。生产相册继续为0，noindex空态和资源白名单门禁不变。

执行与验证清单（2026-10-03 更新）：

- [x] 将响应式参数接入封面几何与 CSS，无 JS 回退采用同一比例。
- [x] 更新几何单元与浏览器断言：360/390、767/768 边界、窄纸面和宽桌面；核对 1.4/1.6、18/26、4:5、480px 桌面高上限、648.4px 总宽上限和左栏占位。
- [x] 验证名称导航同步收窄、点击定位与手动同步、末册完整可达、返回横/纵位置与焦点、resize/reduced-motion；整页无横溢。返回原位与实际裁边露全两类回归均通过，只在真正裁边时作最小校正。
- [x] 从最终源码重新运行 check、单元、生产构建与回归、隔离相册检查；本轮结果为 136/136 单元（23 个文件）；Astro 检查 147 个文件，0 错误、0 警告、2 个既有 hints；生产 19 页构建、80/80 回归（1.3 分钟）；隔离夹具 25 页构建、47/47 检查（46 项浏览器 + 1 项 HTTP，19.4 秒）。
- [x] 20 项几何/无 JS 检查全部通过（errors=[]）；原生浏览器 200% 缩放通过，包含 1440→720 CSS px 跨断点。合成/私有试排副本各 34 条关键文件与最终源码哈希一致，共 68 条。
- [x] 最终 `protection-final.json` 的 36 项静态保护检查全部通过：public 28 项、content 27 项、私有角色 17 项及 D-150 保护集 61 项均与 v7 一致；原两个 checkout 共 799 个已记录文件（181+618）逐文件及 Git HEAD/分支/状态一致。新生产输出 67 个文件、19 个 HTML 已核验，无私有试排照片、真实照片或未批准角色泄入，零公开相册/noindex 保持。

文件清单与逐项校验见包内 `_handoff/manifest.json`、`_handoff/checksums.sha256`；输出归档版本、字节数及 SHA256 以同 ID Library《实施与验证报告》（`libfile_f35bd25f1b28819182cc4e0e1bd20191`）为准，不在归档内部嵌入归档自身哈希，也不预填新的 Library 版本。

本轮证据在 `_handoff/d153-evidence/`。`final-screenshot-checks.json` 包含九档宽度 360/390/767/768/1024/1280/1440/1920/2560px × 两数据源的 18 项几何记录/截图及两项无 JS 检查；横幅封面选中另有 2 张、原生缩放另有 3 张截图。`final-copy-source-match.json` 记录上述 68 条哈希核对。中间失败日志和 trace 保留，后续修复均由最终整轮重新验证，未将失败记录删除或当成通过。私有真实照片截图不构成网站公开批准，角色仍未批准或接入生产。Safari/真实 iOS 原生手势未验。


## 原实施计划职责与约束（历史清单；当前列表视觉以 D-155 为准）

以下保留相册初版任务记录，其中封面拟物、开册表演等提议不作为 D-155 实现要求；本轮不修改 reader。

## Global Constraints

- “每张照片对应一个逻辑内页，电脑将第 1、2 张配成一组，第 3、4 张配成下一组；手机依次呈现单张。”
- “内页照片始终按原比例完整展示，默认不裁切。”列表封面以D-155已确认的3:2取景为准，不反向影响reader。
- “交互触区至少 44 × 44 像素。”360、390px 手机与 200% 缩放可用；全站四项导航仍同排。
- “打开影集进入一条浏览历史；翻页更新当前阅读地址，不为每一页堆积新的历史记录。”
- “新会话或没有指定位置的直接访问，从第一张开始。不保存跨设备阅读记录。”
- “不自动播放、不循环翻到开头。”引言不计入照片数量；奇数末页留白。
- “批准必须明确针对‘网站公开使用’”；相册、照片、单独封面分别检查批准，未批准资源不能进入公开输出。
- 沿用 `draft: false && approved: true`。现有相册为零，生产继续真实空态与 noindex；不得改占位文件的批准状态。PRD 的家人照片不发布、其他可识别人像需确认同意的边界继续有效，同意材料不进公开仓库。
- 角色方向为人物站在左导航附近邀请访客、嘉乐在册边安静陪伴；候选素材尚未批准，批准前保持无角色降级，不据版式确认自动接入。
- 保持暖白 `#FAF9F6`、环境 `#F0EFEA`、炭黑 `#292825`；不改原素材、原 Manifest、文章 D150 行为与已有重定向。
- Bun 为唯一包管理器；别名 `@/*`；不用 Tailwind、Canvas、WebGL、翻书引擎、新字体、账号、追踪、评论、音乐、放大器或下载功能。
- 本计划不授权 commit、push、合并、部署或域名操作；不用 `bun run publish`／`deploy:cf`。每项通过后保存检查结果与差异，代替提交步骤。

## Review Focus

1. 未批准照片、封面或已撤下条目混入有效相册：公开数据和静态资源都不得泄露。由任务 1、7 的门禁与输出测试证明。
2. 快速重复打开、翻页后立刻后退／转去 Blog：旧动画和旧监听不能覆盖新页面，历史字段不能被清空。由任务 2、5、7 证明。
3. 单页第 2 张切双页再切单页：仍回第 2 张，不能因双页起点变成第 1 张。由任务 2、4 证明。
4. 横滑与纵滚、边缘返回、多指缩放竞争：只明确的内部横滑翻页，不吞原生操作。由任务 4、7 证明。
5. 存储被禁、图片慢／失败、脚本失效：标题、顺序、返回与重试可用；页面不因恢复或加载错误白屏。由任务 3、4、5、7 证明。

---

## 已核查的基线

- 唯一代码输入：Library `libfile_0d03c46fad088191b0c936924828105b`，版本 5，`baozi-space-D150-mac-verified-20261003T021836Z.tar.gz`。
- 文件 9,495,822 bytes；SHA256 `799b72a0a343dd634bbdced84a34efd7fd55f13af263d27febdf658dd92f9c96`；本次核验全部 279 项清单成功。解压已含修复，不再应用包内 patch。
- v7《实施与验证报告.md》记录该代码 63/63 单元、80/80 生产浏览器、18 页构建与 Astro 检查通过。这是既有实测基线，本计划未重跑，不宣称新功能已通过。
- 现有入口为 `src/pages/photos/index.astro` 和 `[...slug].astro`；只展示相册封面，`Lightbox.tsx` 会循环，现有封面 CSS 会裁切，不能直接当新阅读器复用。
- `src/content/photos/placeholder-frame.md` 是未批准占位；`public/assets/photos/` 只有 .gitkeep。
- `ShellLayout.astro` 已使用 ClientRouter；`pageTurn.ts` 和 `documentScroll.ts` 已处理交换与 Lenis 生命周期。相册必须接入它们，不能另建全站路由器。
- 当时已阅读设计 v2.4、PRD、相关决策与素材边界；当前入口已更新为 v2.8 / D-155。新相册设计覆盖旧 Photos 灯箱／PhotoStack 表现；D150 的文章 767／768px 断点不改。相册单双页使用自身内容宽度。
- 仓库要求的 Windows Obsidian 路径不在本云环境，未读取、未写入，也不把历史笔记当现行产品事实。此次依据批准设计和实际 v5 源码完成计划。

## 文件职责与依赖

沿用：
- `src/components/photos/AlbumList.astro`、`photos.css`：改为横向影集列表及共享照片样式。
- `src/lib/photos/albums.ts`：公开相册投影；不继续把封面当相册全部照片。
- `src/content.config.ts`：Photos 独立 schema，其余 collection 不变。
- `src/pages/photos/{index,[...slug]}.astro`：保留地址，替换 Photos 页面内部。
- `src/components/layout/{ShellLayout,SiteRail,SiteCharacters}.astro`：可选 Photos 角色模式，其他模式不变。
- `src/lib/transitions/pageTurn.ts`、`src/components/layout/shell.css`：只做相册内部转场的精确协调。

新增：
- `src/lib/photos/{schema,readerModel,gestures,routes,session,albumList,albumReader,albumLifecycle,albumMotion,characters}.ts`：分别负责 schema、纯阅读状态、手势判定、URL、恢复、列表控制、阅读 DOM、Astro 生命周期、动效、角色状态。
- `src/lib/photos/assetAudit.server.ts`：构建期本地照片资源白名单审计；绝不进入客户端。
- `src/components/photos/{AlbumReader,AlbumPhoto,AlbumCharacters}.astro` 和 `album-reader.css`、`album-characters.css`。
- `src/pages/404.astro`：无效／撤下相册的无泄露静态兜底；同时保留其他栏目入口。
- `src/content/_templates/photo-album.md`、`docs/design/album-character-assets.md`。
- `tests/unit/photos/*.test.ts`、`tests/fixtures/photos/`、`tests/e2e-photos/`、`playwright.photos.config.ts`、`scripts/photos/run-fixtures.ts`。

旧 `PhotoStack.astro`、`Lightbox.tsx`、`lightbox.css` 不再挂载到 Photos 两条路由。不扩大为其他页面清理；确认没有消费者后才另列删除差异。原 80 项生产测试留在 `tests/e2e/`，夹具测试使用独立配置。

依赖：1 → 2 → 3／4 → 5 → 7；任务 6 的素材准备可与 1–5 并行，素材人工验收后才接入最终角色。每项按测试失败 → 最小实现 → 通过 → 检查差异的顺序执行。

## Task 1：建立相册／照片双层门禁

**Files:** 修改 `src/content.config.ts`、`src/lib/photos/albums.ts`、`src/lib/sections.ts`；为新数据类型同步 Photos 两页与现有 `PhotoStack.astro`／`AlbumList.astro` 的最小读取适配；新增 `schema.ts`、`assetAudit.server.ts`、模板与 `tests/unit/photos/{schema,albums,assetAudit}.test.ts`。

**Interfaces:**
- `photoAlbumSchema`：沿用 title、description、draft、approved、updated、tags；date 可选，新增 `periodLabel?: string`、`order: number = 0`、`coverPhotoId?: string`、`coverImage?: PhotoImage & GateData`、`photos: PhotoRecord[] = []`。照片 ID 使用 `[a-z0-9][a-z0-9-]*` 且同册唯一。
- `PhotoImage = { src: string; width: number; height: number; alt: string; variants?: {src:string; width:number; height:number}[]; credit?: string }`；宽高正整数、alt 非空、variants 比例一致。首版图片地址限本站 `/assets/photos/`，不接受路径穿越或外部追踪地址。
- `PhotoRecord = PhotoImage & GateData & { id: string; caption?: string }`；`PhotoAlbum = {id:string; data:PhotoAlbumData}`，`PhotoAlbumData` 为 schema 推导类型。保留兼容用的可选旧 cover 字段但不从它获取公开封面。新增条目与照片默认 draft:true、approved:false。只有作者确认的描述进入 alt／caption。
- `PublicPhoto = PhotoImage & { id: string; caption?: string }`；`PublicAlbum = { id:string; title:string; introduction:string; periodLabel?:string; order:number; date?:Date; updated?:Date; cover:PhotoImage; photos:PublicPhoto[] }`。
- `publishableAlbums(entries: PhotoAlbum[]): PublicAlbum[]`：先相册门禁、再照片门禁、去掉零图相册。按 order 升序，再 date 降序（缺失排后），最后 id；册内严格数组顺序。封面为指定的有效照片或单独批准的 coverImage，未指定则第一张有效照片。显式引用未批准封面必须报错，不悄悄换图。
- `auditPublicPhotoAssets(albums: readonly PublicAlbum[], publicDir: string): Promise<void>`：只能保留上述公开图及 variants 的实际文件与 .gitkeep，多余文件／缺失文件／尺寸不符使构建失败。私有原图、草稿资源必须放 public 和构建导入范围外。

- [ ] 写失败测试：`publishableAlbums([draft, unapproved, empty, mixed]).map(a=>a.id)` 仅为 `["mixed"]`，mixed 只含批准照片且顺序不变；显式草稿封面抛错；重复 ID、零宽度、空 alt、非法资源路径均被拒绝。
- [ ] 运行 `bun run test:unit tests/unit/photos`，确认失败来自新契约而非环境。
- [ ] 实现 schema 与纯投影，Photos 不再放入 `EntrySchemaCollectionKey` 的共享 entry 假设；同步模板和全部 Photos 消费者的类型，先保留旧布局可构建；`splitAlbums`／`albumLightboxItems` 临时改读过滤后的 PublicAlbum，任务 3／4 完成后不再由页面调用。description 是作者引言，不从 Markdown 正文猜拍摄故事；没有日期就不显示时间。
- [ ] 写并运行资源测试：临时目录里增加 `private-sentinel.webp` 必须失败；只有有效图通过。两条 Photos 路由构建前使用同一审计，公开 HTML/JSON 不序列化原始 collection 对象。
- [ ] 全部 Photos 单元通过；检查原占位、其余 content、原图集／Manifest 与锁文件未改。批准登记只记录新 schema／流程，不把任何照片记为已批准。

## Task 2：锁定顺序、单双页与地址模型

**Files:** 新增 `readerModel.ts`、`routes.ts`、`tests/unit/photos/{readerModel,routes}.test.ts`。

**Interfaces:**
- `ReaderState = { photoId:string; mode:"single"|"spread" }`，photoId 是读者锚点，绝不由 spread 起点覆盖。
- `visiblePhotoIds(album: PublicAlbum, state: ReaderState): string[]`；`stepPhoto(album, state, delta: -1|1): ReaderState`；`progressLabel(album,state): string`。
- `albumHref(albumId:string, photoId?:string): string` → `/photos/{保留原slug}#photo-{id}`；按路径片段编码，保留嵌套 slug 语义。
- `resolvePhotoId(album:PublicAlbum, hash:string): string`：有效 id 优先，空／无效／畸形编码回第一张，不抛异常。不公开无效值。

- [ ] 写失败断言：3 图 [a,b,c]，spread+a 显示 [a,b]、下一步 c、再下一步仍 c；进度 `1–2 / 3`、`3 / 3`；single+b → spread → single 保持 b；一图两方向不动。
- [ ] 运行 `bun run test:unit tests/unit/photos/readerModel.test.ts tests/unit/photos/routes.test.ts`，确认失败。
- [ ] 实现纯函数。显式翻双页时取相邻组第一张；仅 resize 改 mode、不改 photoId；到头不环绕。构造 1／2／3／12 图和超长 ID 测试。
- [ ] 路由测试验证嵌套原 slug、直接有效 hash、未知 hash、非法编码、没有 hash、已撤下 photoId 的安全回退，全部通过。URL 规则写入模板使用说明。

## Task 3：横向封面与隔离夹具

**Files:** 修改 `AlbumList.astro`、`photos.css`、`src/pages/photos/index.astro`；新增 `albumList.ts`、`tests/fixtures/photos/`、`scripts/photos/run-fixtures.ts`、`playwright.photos.config.ts`、`tests/e2e-photos/album-list.spec.ts`。

**Interfaces:**
- `AlbumList.astro({albums:PublicAlbum[]})`：标题、作者时间文字、批准照片数、普通详情链接。
- `mountAlbumList(root:HTMLElement): () => void` 返回完整 cleanup；根节点 `data-album-list`，各封面链接 `data-album-id`。
- `bun scripts/photos/run-fixtures.ts [spec]`：创建明确的独立临时副本、注入几何测试图与 synthetic-* 影集、构建／启动自己的 localhost，再用独立 Playwright 配置验收；绝不修改原 content/public，不在生产 build 设后门开关。

- [ ] 写失败 E2E：6 本影集可横移且露下一本；一册左对齐，无重复；全部放下时无多余按钮；长标题换行；封面 contain，无裁切。
- [ ] 运行 `bun scripts/photos/run-fixtures.ts album-list.spec.ts`，确认新断言失败。夹具覆盖 0／1／2／3／12 图、横／竖／超宽图、长标题／长注释、混合批准、草稿与失败图；全部为显眼合成图，不冒充摄影。
- [ ] 实现横向 overflow + 原生 touch/trackpad；前后滚动按钮根据真实 scrollWidth/clientWidth 更新。鼠标主键拖动超过 6px 后抑制本次 click；pointercancel、离开和释放都清理。纵向 wheel 不转换，按键／Ctrl/Meta／中键链接行为保留。
- [ ] 测试拖动不误开、一次点击只导航一次、键盘 Enter、末端禁用、resize 重新判断按钮；所有触区 ≥44px。
- [ ] 运行现有 `tests/e2e/photos-editorial.spec.ts` 对生产空态的两项检查，保持“摄影正在整理。”与 noindex；原生产构建绝无 synthetic-* 路由／资源。

## Task 4：原比例纸页、输入与加载恢复

**Files:** 新增 `AlbumReader.astro`、`AlbumPhoto.astro`、`album-reader.css`、`albumReader.ts`、`gestures.ts`、`tests/unit/photos/gestures.test.ts`、`tests/e2e-photos/album-reader.spec.ts`；修改 `src/pages/photos/[...slug].astro`。

**Interfaces:**
- `AlbumReader.astro({album:PublicAlbum})`、`AlbumPhoto.astro({photo:PublicPhoto,index:number})`。
- `mountAlbumReader(root:HTMLElement, album:PublicAlbum, initialPhotoId:string, onChange:(state:ReaderState)=>void): {getState():ReaderState; restore(photoId:string):void; destroy():void}`。
- `swipeDirection({dx,dy,durationMs,pointers,startX,viewportWidth}): -1|0|1`：单指、位移 ≥48px、横向 ≥纵向 1.5 倍、≤800ms；起点在视口左右 24px 边缘内／多指／取消都返回 0。

- [ ] 写失败测试：760px 内容宽度为首版 spread 阈值，759 为 single；一图／奇数右页为空装饰，不多算照片；横竖与超宽图完整；长注释正常增高并纵滚。
- [ ] 运行 `bun run test:unit tests/unit/photos/gestures.test.ts` 与 `bun scripts/photos/run-fixtures.ts album-reader.spec.ts`，确认失败。
- [ ] 实现 ResizeObserver 测量 reader 实际内容宽度；CSS 使用同一 data-mode，避免两套断点。纸面不固定高度、不跨缝、不用 cover；width/height 与 aspect-ratio 先占位，文字在图下。
- [ ] 增强前 HTML 保留每张照片的顺序、alt/注释、可访问的查看图片链接及返回；noscript 提供带原生 lazy 的完整图片序列。增强仅在初始化成功后隐藏静态顺序导航，按当前 hash 给当前组设置 src/srcset。其他图用惰性数据／inert template，不提前请求全部图片；预取最多下一组两张，无下一组则不取。
- [ ] 运行时使用作者提供的 variants 和正确 sizes；移动端不请求全部大图。加载失败在原比例框保留 alt、提示和“重试”，重试同一资源，不无限重试、不改 URL、不阻止下一页；图片恢复不移动控件。
- [ ] 翻页按钮始终可发现、两端 disabled，最终提示“已到最后”；aria-live 只播当前范围一次。左右键仅在 reader 内且非 input／textarea／select／contenteditable、非组合键时响应。
- [ ] 以 Pointer Events 判意图；touch-action 保留 pan-y 与 pinch-zoom，不全局 preventDefault。单次 pointerup 最多一页；自动 repeat keydown 忽略；DOM 状态同步先提交，旧视觉取消。
- [ ] 测试 slow/failed/retry、竖滑、多指、边缘手势、scope 键盘、长注释、动态缩放与 single 第2张跨阈值往返；无 JS 与脚本请求失败仍可读标题、顺序和基本链接。

## Task 5：历史、返回位置与静态无效地址

**Files:** 新增 `session.ts`、`albumLifecycle.ts`、`src/pages/404.astro`、`tests/unit/photos/session.test.ts`、`tests/e2e-photos/album-navigation.spec.ts`；接入 Photos 页面脚本。

**Interfaces:**
- `ListPosition = {key:string; selectedAlbumId:string; scrollLeft:number; scrollY:number; focusAlbumId:string}`。
- `AlbumHistory = {version:1; listKey?:string; photoId?:string; albumId?:string; list?:ListPosition}`，合并到 `history.state.baoziAlbum`，保留 Astro 所有字段。
- `AlbumSession = {version:1; readings:Record<string,string>; lists:Record<string,ListPosition>}`；`readSession(storage:Storage|undefined): AlbumSession`、`writeSession(storage:Storage|undefined,session:AlbumSession):void`。readings 是本访问的相册 ID → photoId；只存列表快照和阅读位置，不含私人数据、不跨设备。
- `initAlbumLifecycle():void` 幂等注册；astro:page-load 挂载、before-swap 销毁、pageshow 恢复；每页只有一个 reader/list 控制器。

- [ ] 写失败测试：列表滚至后方影集并纵滚 → 打开 → 翻页 → 返回，横滚／纵滚／所选封面／焦点恢复；再次点击同册续看；刷新与前进恢复 hash 照片。
- [ ] 运行 `bun run test:unit tests/unit/photos/session.test.ts` 与 `bun scripts/photos/run-fixtures.ts album-navigation.spec.ts`，确认失败。
- [ ] 打开沿普通 Astro 导航新增一条历史；只有列表点击时可读取会话续读点并加入目标 hash。直接访问无 hash 始终第一张；显式 hash 优先于存储。
- [ ] 翻页用 replaceState 更新当前条目，不触发新的 Astro 导航／滚动；合并命名空间状态。浏览器后退／前进由 Astro 处理，page-load 后再恢复 DOM，不自换第二次文档。
- [ ] “返回影集”始终有 `href="/photos"`；仅能验证前一条是本次打开的列表时增强为 history.back，让 forward 保留影集；外部直达或不确定时正常导航本站列表，绝不盲用 back 离站。
- [ ] 恢复先横向、再用 `scrollDocumentTo(y,{immediate:true})` 处理现有 Lenis、最后 preventScroll 聚焦原封面；册已消失则聚焦列表标题，滚动值限制在当前范围。存储禁用、损坏和旧版本均安全忽略。
- [ ] `getStaticPaths` 只生成有效 PublicAlbum；新增 generic 404 显示“内容暂不可用”、返回影集和主页，无草稿名／封面／路径明细，noindex。不为私有 slug 生成“占位详情”，不改 hosting/rewrite。
- [ ] 覆盖直接旧地址／未知地址、撤下照片 hash、存储异常、back-forward、读到末页再返回、连续进退、请求失败后转 Blog；断言唯一 main、正确 h1、焦点和 scroll，不只查 URL。

## Task 6：准备并验收主人与嘉乐素材

**Files:** 新增 `docs/design/album-character-assets.md`、`design-assets/photos/{reference,source,qa}/`；验收后新增 `public/assets/photos-characters/` 与 `public/manifest/album-characters.v1.json`，不改既有 `asset-manifest.v2.json`。

**Interfaces:** 六个语义姿态 `person-invite / person-open / person-watch / jiale-lie / jiale-head-up / jiale-rest`。独立 manifest 记录 src、width、height、visibleBounds、groundAnchor 与 approved；静止姿态可以共用经批准的文件，但不能以跑步／坐姿冒充卧姿。

已找到并查看实际像素：
- 参考归档 `libfile_13efb8282d7081919cb88cdd311db589`，`baozi-space-D149-in-progress-20261002T135203Z.tar.gz`，版本 0。只取参考，绝不作为代码基线。
- 内部路径 `spaceofbaozi/design-assets/intro/reference/model-sheets/person-summer-model-sheet.png`；SHA256 `4a8d95e058454c22ed2a945e190ce7e37e0b433f5442597154c8781ed85a9dd7`。
- 同目录 `dog-model-sheet.png`；SHA256 `3c554bab7f01b34e73a8062e3c31d7d62c95391779136dfdde646c07a8cadf3f`。
- v5 现有 person-look-around 是垂手／插袋站姿；dog-look-up-settle 是行走到坐下。原蹲看人物也不符合邀请站姿。

- [ ] 执行器自行从 Library 恢复两张参考并查看像素；不能只凭本说明生成。保留夏季桶帽、圆眼镜、相机图案衬衫、短裤／鞋与嘉乐比例、毛色、耳口鼻和项圈。
- [ ] 制作独立透明姿态候选与六姿态对照图，源稿和生成记录留非公开目录。人物面对访客、手掌朝影集，不是坐中间看自己的照片；嘉乐仅开册抬头。
- [ ] 用现有 sharp 核验真实 Alpha、尺寸、可见边界与基线；人工看身份、手指、脚底、毛边、服装一致性、动作含义。绝不直接去掉设定表背景当新姿态。
- [ ] 将角色候选与桌面／手机静态排版交包子验收。未通过只继续功能与无角色降级测试，不把旧跑步帧当完成素材，不宣称视觉完成。
- [ ] 通过后才输出独立运行时文件与 manifest；记录批准和尺寸预算。本功能角色资源合计目标 ≤1MB，超出先优化并报告，不损坏白毛与衣服边缘；禁止循环动画。

## Task 7：克制动效、角色接入与全量验收

**Files:** 新增 `AlbumCharacters.astro`、`album-characters.css`、`albumMotion.ts`、`characters.ts`、`tests/unit/photos/characters.test.ts`、`tests/e2e-photos/album-motion.spec.ts`、`tests/e2e-photos/album-output.spec.ts`；修改 ShellLayout／SiteRail／SiteCharacters 的可选 Photos 模式、`pageTurn.ts` 的精确 Photos 内部协调、设计文档与决策记录。

**Interfaces:**
- `AlbumCharacterPhase = "invite"|"opening"|"reading"`；`characterPose(phase,reducedMotion): {person:string; jiale:string}`。只开册触发一次抬头，翻页不触发。
- `animateAlbumOpen(from:DOMRect|undefined,to:HTMLElement,signal:AbortSignal):void`、`animateAlbumPage(root:HTMLElement,signal:AbortSignal):void`；动画是可取消装饰，无论成功／失败都不影响状态。
- 初始时长开册 320ms、翻页 200ms；实际预览可在设计范围 250–400ms／180–250ms 内调整并记录。

- [ ] 写失败测试：角色不遮任一封面名称／图片／页码／返回／导航；逐页动作数不增加；reduced motion 无位移、无循环；切换系统偏好立即终止残留。
- [ ] 运行 `bun run test:unit tests/unit/photos/characters.test.ts` 与 `bun scripts/photos/run-fixtures.ts album-motion.spec.ts`，确认失败。
- [ ] 接入通过任务 6 的资源。桌面人物沿左导航区域；嘉乐有独立封面边／纸页外位置；手机标题旁小姿态，阅读时让位。角色 aria-hidden、无焦点、pointer-events:none，失败隐藏装饰但页面可用。
- [ ] 封面轻放大接纸页、翻页轻位移／淡入／浅影，不模拟卷页。只对列表 ↔ 同一相册内部开合绕开全站 page-card 动画，其他 Blog／Home 转场保持；Astro 仍只交换一次 DOM，不叠加 360ms 旧遮罩与新开册等待。
- [ ] 所有动画持有 AbortSignal／序号；新操作取消旧视觉。点击在 pending 时只接受同一次有效开册；离页、pagehide、resize 和 reduced-motion 都清理。照片立即呈现，不等角色／动画结束。
- [ ] 使用下述完整验收清单跑生产与隔离夹具，并做真实截图和测量；修复后从最终代码重跑受影响套件及完整生产回归。
- [ ] 更新新决策（执行时取下一个未占用 D-xxx）、设计规范 Photos 节、README、素材说明和验证报告；记录真实通过、失败、未运行，保留失败 trace。不改文章 D150 的通过口径。
- [ ] 输出最新源码、报告与实际截图到 Library；源码延续既有文件身份并使用预期版本保护。交付可审阅差异和恢复说明；不 commit／push／部署。

## 完整验收与停止条件

### 自动检查

1. 先在恢复后的 v5 运行 `bun install --frozen-lockfile`（仅执行批准后）及基线检查；不得把旧 D149 的 77 项当最新结果。
2. 最终运行 `bun run check`、`bun run test:unit`、`bun run build`。保留原 63 项意图；被新相册契约取代的旧 Photos 单元逐项说明，不能删断言降门槛。
3. 完整生产回归：`PLAYWRIGHT_PREVIEW=1 PLAYWRIGHT_PORT=4352 bun run test:e2e --workers=2`。原 80 项全部通过，再列新增项；不 skip、不用 retry 掩盖失败。
4. 隔离夹具：`bun scripts/photos/run-fixtures.ts`。与生产副本、端口、输出目录分离；检查 0、1、2、3、12 图及多册。
5. 生产输出扫描：没有 synthetic-*、草稿标题／alt／照片路径；照片目录仅白名单资产；不存在未批准详情；撤下地址不给出私密元数据。无照片时公开相册数仍为 0。
6. 原内容、原 intro/home/reading 资产、原 Manifest、bun.lock、部署配置和重定向清单 SHA256 不变；新增 schema／相册文件单列，不伪称全部原文件未变。

### 浏览器与人工画面

- 360×844、390×844、768px 窄窗口、1024px、1280×720、1440×900、1920×1080；另精确测 reader 内容 759／760px。页面横向溢出 ≤1px，仅封面条可横滚。
- 真实 200% 浏览器缩放；不能用 CSS zoom 或缩 viewport 冒充。触控仿真可测事件，Safari／真实 iOS 边缘返回与缩放有条件再测，缺环境明确列未验。
- 纯键盘完整开册／翻页／返回；焦点可见且恢复；读屏顺序为作者照片顺序，空右页和角色不播报。
- 同冊 reopen、直接 hash、刷新、无 hash 直访、Back／Forward、跳至其他栏目、快速重复点击、连续横滑、animation 中 resize／reduced motion 切换。
- 横／竖／超宽图、长名称、长注释、慢网、错误图重试、图片加载后布局稳定；仅当前组与下一组进入增强模式新图片请求（此前已读图片可在浏览器缓存中），失败不锁导航。
- 无 JS、脚本失败、存储拒绝、无效／撤下影集都可恢复；不存在第二个 main、残留遮罩、重复监听或未处理 console/pageerror。
- 真实截图至少：多册横向列表、桌面首组／奇数末组、手机单页、长注释、失败重试、角色邀请／阅读、reduced motion、返回恢复。合成夹具截图必须明确标注，不当作真实相册成果。

### 人工关卡

A. 设计与执行方式已确认；D-155属于已授权实现，不重新等待同一许可。
B. 角色：真实候选的身份、手势、站位及节奏仍待独立批准；D-155目录与取景参数已确认，功能测试不能代替角色关卡。
C. 内容：真实影集、逐张照片、封面、alt／注释与网站公开范围另外确认；不妨碍先完成空态和夹具验证。
D. 发布：当前任务止于可验收源码／截图／报告；Cloudflare Pages 与现有 Workers 命令仍需另行对齐，不能借此任务发布。

## 初稿建议执行方式（历史；当前授权见顶部 D-155）

建议原生云端执行：在新的隔离目录先只读核验 v5 清单，再由同一实施工作者按上述任务连续完成，最后用新的审阅者做整体验证。原因是阅读状态、Astro 历史与页面转场接口紧密，连续执行更易避免多方状态分歧；角色素材可独立准备。

另一选择是逐任务分工：每项由新的实施者完成，并在下一项前独立审阅，成本较高但关卡更密。两种方式都使用 TDD，先读对应执行技能，不擅自开始。

云端完成能运行的检查；若浏览器受实际环境阻碍，再在可用且已获准的 Mac 独立副本做 QA，不覆盖用户旧 checkout、不操作日常浏览器。新执行器必须自行从 Library 取同一版本文件并验可读，不能假设云路径在 Mac 存在。

本计划已逐节对照批准设计完成自检：内容、列表、双页／单页、比例、恢复、角色、输入、异常、性能与全部八条验收要求均有对应任务；所有新增视觉仍保留包子的人工验收权。


## 历史执行中用户补充 · 2026-10-03（D-152；由 D-153 覆盖）

任务3当时口径（D-152覆盖早前1.8，现已由顶部D-153替代）：按实际viewport计算约1.2本封面（width=(innerWidth-gap)/1.2），新增影集名称分段按钮；点击只在封面条内滚动，当前段与手动滚动同步、末端能高亮最后一本、长名称在独立名称栏内完整横滚。reduced motion即时定位，名称按钮≥44px，不造成文档纵向跳动。

新增 `src/lib/photos/listModel.ts` 和 `tests/unit/photos/listModel.test.ts`；360/390/1440的浏览器用例测实际几何比例、段落定位、手动同步与不跳页面。来源为最新用户消息Sentinel_15c98a234d74819197e970621dbdd682，属于明确实施指令；角色与真实照片的独立批准关卡不变。


## D-151 / D-152 Mac 验收状态 · 2026-10-03（历史）

| 范围 | 当时状态；不代表 D-153 |
|---|---|
| 任务1–5：门禁、模型、封面、阅读、历史 | 实现完成；128单元、80生产与32隔离相册检查通过 |
| 任务6：角色候选 | 私有候选已准备；人工批准、正式导出与接入未完成 |
| 任务7：动效/功能QA | 无角色降级已验；全屏宽、759/760、真实200%与异常恢复通过 |
| 任务7：角色运行画面 | 未运行；须先批准候选 |
| 正式照片与发布 | 未批准；生产空态，未push或部署 |

Mac修复仅为取消拖动后的点击状态和空白右页高度。修正旧测试对异步媒体/尺寸事件、点击准备滚动与角色缺省的错误假设；新增两条取消拖动失败回归后通过，未skip或用retry掩盖失败。详细日志与真实合成夹具截图见`_handoff/album-mac-evidence/`。Safari及真实iOS手势仍未验；已知Minor“最近更新”取编辑排序首册的行为保留，没有冒称修复。


## 历史执行覆盖 · D-152（2026-10-03 06:28 UTC；由 D-153 替代）

当时按D-152指令把1.8改为1.2本；书册容器表现12px书脊，下一本露少量封面，照片不裁切。几何单元先出现4条预期失败后修复；360/390/1440浏览器用例改验1.2、末册完整可达和页面无横溢，原名称同步/返回/resize检查保留。已以此最终源码重新完成128单元、80生产、32隔离相册；真实200%证据随最终交付更新；旧1.8测试与截图仅为历史。角色与照片批准边界不变。
