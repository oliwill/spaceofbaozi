## 本地 Pages CMS 发布候选（2026-10-06，尚未启用）

本轮仅本地检查与工作流模板；所有 Actions job 为字面量 false，不能手动触发部署。先读 [发布决定与剩余门槛](docs/publishing/deployment-decision.md) 和 [CMS 日常维护](docs/publishing/pages-cms.md)。不要运行旧 `publish`／`deploy:cf` 脚本。

```sh
bun run publishing:check
bun run check
bun run test:unit
bun run build
bun run publishing:audit
```

项目路径可同时设置 `SITE_URL=https://example.test SITE_BASE=/spaceofbaozi` 构建和审计。`publishing:check` 是本地原始字段检查；真实部署比较需要最后成功 Pages 源码，不能以此命令替代。源码初始化尚未批准、运行时留空；本地审计不证明 CMS 上传隐私或线上部署成功。

## D-158 · 启动末帧连续交接与角色资源回退候选（2026-10-04）

用户于2026-10-04 16:11:29Z明确确认：开场最后站稳、坐好的姿态直接留在首页，桌面首次互动时再接原动作。此为本轮唯一新增的收尾决策；不重绘、不混配Home图集、不改正常首页排版或内容门禁。

当前候选已实现：.98–1只淡入纸面和导航，Intro角色保持全不透明，原Home角色图层暂时隐藏但保留布局/输入面。完整末帧渲染后，同两个Intro sprite原节点同步移入首页未缩放的独立交接层，继续使用原Intro atlas和Manifest末帧；轨道随后释放。移动端保留末帧，跨断点/动效偏好重建保留该层。只有资源就绪且健康后的真实鼠标移动、左键点击、有效横向触摸拖动或方向键才释放，并由原Home控制器处理同一次输入。静止指针、鼠标进入/离开、开场余下滚轮、纵向触摸、Tab/焦点、合成输入及未就绪输入不会切姿。直接hash、跳过、已完成会话仍走原稳定首页；不会为这些路径补播或新建交接层。

角色资源失败独立修复：任一Home atlas第一次失败立即触发原v2允许的整张intro-final-still回退，不再重复或丢一只角色；手机也监测。失败锁存跨断点，不等待另一资源结束，不继续输入/计时器/指针捕获。定帧也失败则保留可用HTML与导航。Intro加载中、尾段或已交接后发生故障均解除相应所有权；仅当隐藏的互动区域正持焦点时转到main，不抢其他焦点。导航离开清理监听/观察/节点；BFCache持久pagehide保留其有效交接状态，仍待真实浏览器确认。

静态最终候选：752/752单元（46文件），源码check199文件/0错误/0警告/2既有hints；19页生产构建通过。完整归档默认check227文件/3个原D155证据错误/0警告/3hints，仍exit1 NON-GREEN，未修改配置掩盖。相关Playwright为41项/5文件，仅加载，不记通过。原Intro16与正式Home3不改；原6项交接测试的叠化/失败断言已按批准的独立角色层加强，新增10故障与6保留姿态用例。需要新候选的实际Mac测试和完整桌面/模拟手机演示，不能以静态或前版绿色证明视觉完成。

前一候选v19/精简QA v1已在用户Mac完成真实25/25（2workers、0retry）、722/722单元、19页构建、精简check191/0/0/2hints；303/303输入哈希保持。真实桌面及390px窄桌面模拟均确认双轮廓，Home人物失败出现双狗、狗失败缺失；因此该版视觉验收失败。112份原证据及2清单ZIP全部哈希核验保留，视频以原Library媒体ID和SHA引用，不伪造为新候选演示。四张关键原图已实际查看。

本次相对v19只改5个既有产品文件、加2个所有权/故障helper，另2个既有测试与4个新增测试；public、原素材/Manifest、真实内容、scripts、配置/锁、其余247项产品/测试保持。独立代码复审的故障计时器/非rail提示/反向测试断言问题均已关闭；最终审查结论与精确哈希见本轮证据。原健康路径900ms leave/后续键盘问题、其他栏目旧失败、Safari/真实iOS/真200%等不由本轮关闭。没有commit/push/部署或公开新素材/真实内容。

继续先读_handoff/STARTUP_MAC_ACCEPTANCE.md。源码/报告保持原Library身份，下一保存版本以实际Library回执为准。以下历史段落仅记当时事实，不替代本候选状态。

## D-157 · 启动页和启动到首页：既有设计修复候选（2026-10-04）

用户已将启动页和启动到首页设为第一优先级，其他栏目及其专项验收暂停。本轮继续D-132/D-133/D-148与现规范§7，不引入新构图、动作、素材或发布决定。源码基线为Library v18；保存后身份/版本以实际Library回执为准。

已完成代码修复：生产开场直接消费Lenis/ScrollTrigger实际进度，不叠加第二层平滑；保留渲染后的.995交接事件与<.98重置，完整尾帧之后再移除舞台。真实首页保持同一个DOM，在原.98–1区间显现；开场期间首页inert，所有退出解除状态。末段对齐实际桌面互动/手机静态角色，各角色独立接地点；暂停时晚挂载/尺寸或资源状态改变可重新对齐。草地退出中resize不污染反向地面。两条跳过入口、Astro接管的#main点击与焦点恢复已覆盖；站稳300ms输入期限跟随当前Home而非可重建控制器。原smoothDamp数学过冲判断另已修正。

最终云端验证：722/722单元（44文件），源码check193文件/0错误/0警告/2旧hints，生产19页构建通过。完整归档默认check221文件/3个既有D155证据错误/0警告/3hints，exit1，仍NON-GREEN；未改tsconfig掩盖。独立代码复审PASS_CODE_AND_MODELED_TESTS_ONLY，两个P2已关闭，无新增P0–P3；独立定向23/23。新增6项真实输入/交接浏览器测试仅--list，原Intro16与Home3原件不变；合计25项待Mac实际运行，不能记通过。

已实际查看v17产品等价基线的桌面1440×900和模拟手机390×844截图；原Mac真实wheel录屏确认旧尾帧提前结束与突然换层，矩形差异不可冒充透明轮廓位移。Mac于14:57Z离线，修复后的完整录屏、真实浏览器验收和用户视觉确认尚未完成。云浏览器本地预览被阻断，没有改路由绕过限制。不能称启动两部分最终完成。

六个产品文件以外，public/原素材Manifest/真实内容/原Home排版/共享Shell/Photos/Projects/D-150阅读/配置锁均保持。原Home900ms鼠标离开与后续键盘目标竞争、旧v15 native首错、Projects/文章后续验收、原生200%、Safari/真实iOS/慢网络等不由本轮宣布解决。没有commit、push、合并、部署、内容或新角色公开批准。

继续时读`_handoff/STARTUP_MAC_ACCEPTANCE.md`，取最新同身份源码或精简QA候选，验证清单后按原预算运行25项并给出真实桌面/手机完整演示。先报告有用结果与任何失败，不自行修改测试/超时/阈值洗成通过。

以下历史章节保留当时的范围和结果；当前启动页优先级及待验状态以上文为准。

# baozi.space

中华一番包子铺 — 包子的个人网站、公开档案与个人工作空间。

全站与文章依据为D-148/D-149/D-150（2026-10-02）：共享柔白纸面、炭黑文字与左侧导航；手机四项导航单行。桌面文章纸面内保留嘉乐追球和主要章节短线，手机≤767px全部隐藏阅读辅助；正文标题不删。嘉乐随正文进度靠近右侧的球，左导航人物蹲着观看。

## 当前 Projects 实施与 QA 候选 · D-156（2026-10-04）

<!-- dispatch-timing-candidate:start -->
### 当前：v17文章首跑失败与最小调度候选冻结，Mac复验暂停（2026-10-04）

v17首次唯一文章用例实际为0通过/1失败/0跳过，0 retry，完整套件未启动。初始fragment见证及两次前进RAF gate已取得，gate时349.1ms；到773.9ms标题top=298.796875，原窗口规则判FAILED。真实wheel命令与事件均为0；1500ms、fresh final和下一章节未执行。两JSON、trace ZIP和实际注入collector/源身份已核验；原始FAILED不改判。

client trace的mouse.move为284.935ms，后续read为16.610ms；server trace对应267.894ms与4.872ms，属于不同测量层，不混算。read仅采到seq35/top306.796875，回到Node前窗口已失效。长move与358.7ms RAF间隙的根因未证实，不能据此宣称产品缺陷或新调度必然成功。

本次实现限定Node调度：在已接纳的原真实click见证到达后，只启动一次原正文mouse.move(1000,500)；原两次前进RAF gate和同一个move成功join之后，才单次真实wheel(0,-500)，移除关键链路中的陈旧post-move read。目录ol的data-lenis-prevent必须保留，不能省略正文move而在目录上滚轮。browser rules、collector及记录/发送频率、原createOneShotInput、旧单元/e2e、Home观察、产品/配置/锁、阈值与预算均保持；仅允许本次调度与必要新增wire单元。

用户于2026-10-04 14:19:55Z要求先完成启动页及启动页到首页衔接。本快照静态/代码候选完成，Mac文章/Projects复验暂停；后续由主任务完成启动页及开场→首页演示，恢复本栏目验收需主任务安排。现有Mac命令仅保留为恢复参考，不是立刻启动指令。 当前候选已冻结。独立代码审查PASS_CODE_AND_MODELED_WIRE_ONLY及保护增量PASS，无未关闭P0–P3。新增41项wire模型单元，加原154项共195/195；全单元702/702（42文件），严格TypeScript exit0。独立审查另195/195、TS0和28项额外探针，探针单列不加入Vitest数量；模型不执行浏览器collector，不是真实输入。源码check190文件/0错误/0警告/2旧hints；最终默认check218文件/3个历史错误/0警告/3hints，exit1，仍NON-GREEN。初跑217文件/5hints含两个新证据脚本未用项，清理后重跑，原日志保留。新生产19页/67文件逐字节等于v17，HTTP/产物5/5；新mixed24页、source/seed不变，5详情/5资产/2正文图和8个非法HTML负例通过，147项/9spec仅--list。源259项（含3草稿）、256非合成项哈希匹配。正式保护为780不变基线项、3原spec原件/替换件精确哈希及9测试pin；8项runtime负例与2缺pin/1缺review声明负例分层通过。新Mac仍未验；旧候选154/661与历史check/build不作本候选结果。

主任务安排恢复本栏目验收后，Mac仍先只跑原唯一文章用例：使用下方同一未加首尾锚点的精确中文grep，并以--list核为1；配置2 workers、0 retries、一次一个suite、原30秒test/5秒expect及专项预算不变。实际fragment见证、原gate、唯一真实wheel、完整1500ms、fresh final与下一章节全部通过后，才跑完整Projects315、生产85、一次性QA源Photos55及实际全单元702；优先用例不重复计入全套，失败则保留证据回报，不现场改源。

输入为实际Library源码/报告同为v17，下一回存以guard 17开始；新保存版本只认未来Library实际元数据和回执，不预称v18或已保存。

v16完整实测Projects307/0/8（315项）、生产84/1（85项）、Photos55/55、unit581/581仅属v16；v15原native首错仍UNRESOLVED，Home旧900ms leave与新键盘交错仍未验，原生UI 200%因Accessibility受阻仍未验。禁止改权限、借v13 partial或以API/缩viewport替代；Cloudflare实际301、Safari、真实iOS及真实慢网仍未验。

已认可v14视觉保持：桌面导航16/12px、手机12/9px、默认角色margin-top42px及实测46.146px留白；手机角色25px、reading桌面26px与原素材保持。三份真实草稿、0公开Projects、标题“项目”、空态“项目正在整理。”、noindex、D-155 Photos与D-150阅读规则不变。没有真实内容、新角色或部署批准，不提交、push、合并、部署或切域名。

本节证据相对`_handoff/projects-evidence/`：`mac-v17-runtime/controller-v17-first-run-verification.json`、`execution/v17-window-diagnostic.json`、`execution/v17-dispatch-fix-design.json`、`execution/v17-dispatch-design-review.json`、`fragment-observer-library-receipt.json`。实现与精确范围证据为`execution/v17-dispatch-implementation-report.json`、`execution/v17-dispatch-range-audit.json`；独立审查为`execution/dispatch-timing-code-review.json`与`execution/dispatch-timing-protection-addendum.json`；新产物为`execution/dispatch-candidate-code-output-identity.json`、`execution/dispatch-candidate-mixed-output-audit.json`，正式保护为`execution/task-6-protection-audit.json`。

本节覆盖下方历史段落中的“当前/本候选/下一Mac”称谓与旧执行顺序。下方原文逐字节保留，只代表各自当时的版本和验证范围，不追改历史FAILED，也不把历史通过数当作本候选结果。

<!-- dispatch-timing-candidate:end -->

### 当前：v16已完成实测，文章fragment观察修正候选待Mac复验（2026-10-04）

v16真实Mac全套已完成：Projects315项为307通过/0失败/8条件跳过，生产85项为84通过/1失败，Photos55/55、单元581/581；优先24项另为23通过/1失败，不与完整套件相加。两次文章用例均在wheel之前失败，原结果继续FAILED。196项原始结果SHA/大小/CRC已核，14次浏览器suite无重叠、配置2 workers/0 retries，原30秒测试/5秒expect预算保持。

本候选以Library v16为输入，仅改 `tests/support/real-input-observation.ts` 与 `tests/unit/realInputObservation.test.ts`；原e2e spec、另6个测试pin、产品/配置/锁/阈值/预算不变。限定初始fragment准备阶段，真实click关联的native pop及临时标题focus须有精确只读见证；准备结束后永久关闭例外，原平滑gate/wheel/1500ms/最终及下一章节断言保持。v16原记录没有新见证，原始RED与添加明确模拟见证的模型GREEN严格分开，不称实测修复。

独立代码审查Spec PASS/Quality APPROVED、保护增量PASS，均无未关闭P0–P3。本候选定向154/154、全单元661/661（41文件）、严格TypeScript通过；另16项实际Playwright转换后的collector/mock-DOM探针通过，独立计数且不代表浏览器。源码check189文件/0错误/0警告/2旧hints；主执行者最新默认check214文件/3个D-155历史错误/0警告/3旧hints、exit1，仍NON-GREEN。实现早期213文件日志保留，不能冒充最终214文件结果。 保护仍为780不变基线项+3原spec原件/替换件精确哈希+8个测试pin，本轮audit仅换2个pin并追加review JSON引用。

产品沿已认可v14保持：桌面导航16/12px、手机12/9px、角色margin-top42px及实测46.146px留白；用户“舒服多了”的认可不扩大为其他视觉、真实内容、新素材或上线批准。三真实草稿、0公开Projects、标题“项目”、空态“项目正在整理。”、noindex、D-155 Photos及D-150阅读规则不变。

下一Mac先只跑真实文章用例，取得新见证、一次真实wheel、完整1500ms、新鲜最终样本及下一章节；通过后才按冻结源完整跑Projects315/生产85/一次性QA源Photos55/单元661，一次一个suite、2 workers、0 retries、原预算。v15原native首错仍UNRESOLVED，v16的16契约通过不构成对旧失败的修复；首页900ms leave/新键盘交错仍未验，无leave用例通过不关闭它。原生UI 200%受Accessibility阻断仍未验证，不改权限、不借API/缩viewport或v13 partial；Cloudflare实际301、Safari、真实iOS及真实慢网仍未验。

本候选未宣称新Library保存版本；以实际Library元数据和回执为准。恢复与执行见 `_handoff/RESTORE.md`、`_handoff/PROJECTS_MAC_ACCEPTANCE.md`；下方旧状态仅属历史。

本候选新鲜产物已实际核验：生产19页/67文件，67文件逐字节等于v16云端构建；5/5 HTTP/文件检查通过，未启动浏览器（port4373）。新mixed24页、source/seed不变；5详情/5资产/2正文图与8项非法HTML负例审计通过，147项/9spec仅--list。源258代码哈希、夹具255非合成项匹配；精确合成差异见 `execution/fragment-candidate-code-output-identity.json`，离线产物见 `execution/fragment-candidate-mixed-output-audit.json`，两者均相对 `_handoff/projects-evidence/`。

证据相对 `_handoff/projects-evidence/`：`mac-v16-runtime/Projects-v16-Mac-QA-report.json`、`mac-v16-runtime/controller-v16-raw-results-verification.json`、`execution/v16-fragment-history-diagnostic.json`、`execution/fragment-observer-implementation-report.json`、`execution/fragment-observer-review.json`、`execution/fragment-observer-protection-addendum.json`。

### 历史：v16测试观察候选冻结、Mac全套运行前状态（2026-10-04）

本候选仅在已交付v15基础上修改或新增8个测试文件；产品src137、public28、scripts6及配置/锁文件与已认可v14逐字节相同。保持桌面导航16/12px、手机12/9px、默认角色margin-top42px；v14实测净距46.146px和用户06:20“舒服多了”的留白认可继续有效，不新增视觉调整。三份真实草稿、0公开Projects、标题“项目”、空态“项目正在整理。”和noindex，以及D-155 Photos、D-150阅读规则不变。

v15正式Mac结果保留：优先20项19通过/1失败（16契约15/1，原四reflow4/4）；完整Projects315项303通过/4失败/8跳过；生产81/85、Photos55/55、单元479/479。原完整套件8个失败和优先首个native失败都仍是FAILED。新增的一次原生补采为1 worker、0 retry、NOT REPRODUCED；它不解释原失败，native同步继续UNRESOLVED。未改focus helper、readiness或契约，不把补采成功追记为正式验收通过。

两组测试代码与保护增量审查均PASS、无未关闭P0–P3；当前581/581单元（41文件）、定向28与74、严格TypeScript通过。显式源码check189文件0错误/0警告/2旧hints；默认check213文件仍有D-155历史3错误/0警告/3hints，保持NON-GREEN。新生产构建19页/67文件及5/5 HTTP/文件审计、新mixed24页离线审计已完成；mixed147项/9spec只是加载，新增测试的真实浏览器验证仍PENDING。

保护口径为780项基线文件不变，加3个原测试的原件/替换件精确哈希，全部8个候选测试另有哈希固定；不能写成783项全不变。下一Mac验收按一次一个suite、2 workers、0 retries、原30秒及原断言预算执行，先原native契约/四reflow和四个修正观察用例，再完整Projects315、生产85、一次性QA源Photos55及单元581，实际数量以新--list为准。首页旧900ms leave计时器与新键盘输入交错仍单独未解决；原生200%仍blocked/not verified，不能借用v13 partial。

本候选基于Library v15输入；新保存版本以Library元数据和交接回执为准。恢复及下一验收见 `_handoff/RESTORE.md` 与 `_handoff/PROJECTS_MAC_ACCEPTANCE.md`。下方旧阶段中的“当前/最新”和通过数均保留其当时语境，不能替代本节。

证据相对 `_handoff/projects-evidence/`：`execution/event-observation-review.json`、`execution/input-timing-code-review.json` 及各自 protection addendum；原Mac报告与失败包在 `mac-v15-runtime/`，单次native补采的独立核验为 `execution/native-v15-observation-review.json`。

### 历史：v14实测留白与v15焦点同步候选形成阶段（2026-10-04）

同ID源码/报告Library v14已实际回存，见test-repairs-spacing-library-receipt.json：源码132,789,175bytes、SHA256 eba3b7f788447613ce874c0bc6a8f6bd39843f68b20f111dfac1dc5997f9a452、1309清单/1311文件。v14正式Mac五case仍为299项：287 passed /4 failed /8 skipped，retries0；四个非空case均在767↔768详情顶部返回的focus.unobscured=false处失败，后续未执行步骤不计pass。全站85/85（80浏览器+5HTTP）、Photos55/55（54浏览器+1HTTP）、unit451/451和source182/0/0/2来自v14原报告。本轮原生200%为blocked/not-run，不借v13 partial；输入1311/1311保持，结果包221 SHA由主执行者核验，原件在mac-v14-runtime。

v14优先组27/27已真实执行；768/1024/1440px人物非零alpha与末项导航净距均实测46.146px，四张桌面/手机截图由主执行者查看。用户于06:20:46Z在Sentinel_a9a8d9aa7d18819192c52f86d732cc03回复桌面留白截图“舒服多了”。此为留白认可，应保留当前视觉，不再主动改排版；不扩展为真实内容、新资产或部署批准。桌面导航16/12、手机12/9及默认角色margin-top42保持，CSS继续只含基线两字号+一margin三处授权变化。

一次mixed只读补采的同一目标/同点/同几何在1567.9ms仍native running、hitHTML且header opacity0/blur6；ViewTransition.finished于1840.1ms兑现，1844ms hitA但header仍opacity0.994276/blur0.727124；2045.6ms有限动画结束才opacity1/filter none。三promise均兑现、无resize取消、无sleep/skip。这是该补采流程的同步证据，不把原四FAIL改判。补采measure/trace SHA已另核，见task-6-v14-runtime-read-audit.json。

新候选仅改/加四个测试文件：project-test-helpers.ts、project-focus-readiness.ts、focusReadiness.test.ts、project-focus-contract.spec.ts。等待实际Astro导航进行标志及关联动画完成，忽略持久data-nav-direction/Lenis；不以hit/opacity轮询碰巧好帧判绿，完成后另取一次严格新样本。独立审查focus-readiness-review.md为Spec PASS/Quality APPROVED、无P0/P1/P2，独立28单元/tsc/自包含collector探针通过；16浏览器契约只加载，仍待真实Mac。

主执行者本波实际日志已读核而未重复fullsuite/build：479/479单元（39files）、显式源码check185/0errors/0warnings/2hints、原始check209/3历史errors/0warnings/3hints、生产19页与HTTP/产物5/5。新mixed24页、source/seed unchanged，离线5详情/5资产/2正文图/8HTML拒绝证明；完整--list147项/9spec仅加载。实测源指纹254项（src137/public28/tests75/scripts6/配置锁8），mixed251非合成项一致；精确列三草稿替换、八合成Markdown、五资产添加。相对v14 checkpoint恰四测试差异，产品/public/scripts/锁/配置及原responsive spec逐字节相同，最终四review SHA匹配，见task-6-focus-sync-code-identity.json。

新候选产品/测试已冻结；一般保护783项与共享CSS累计三处精确范围核对见本轮task-6-protection-audit.json。接下来优先16focus contracts和原四个各case reflow，再完整mixed147、其他四case四spec、全站85/Photos55及原生200%缺口；少量通过不能替代全套。下一归档/同ID回存由主执行者按实际回执完成，不预填版本成功。当前端到端未完成；真实内容/新角色/上线仍另批。v12五case1200比较、v13 partial及历次失败均保留为历史。

### 历史：v13真实结果与角色留白新范围（2026-10-04 05:32:04Z）

原ID源码与报告已回存Library v13；receipt为mac-fixes-library-receipt.json。源码归档100,164,323bytes、SHA256 d787663fd344346837c4f5fe318bbc9d60c4efb6656864c9d8f8584c69f80e07，1236清单/1238文件。该身份只代表v13已测快照，不代表下面的新测试/间距修复候选；下一候选产品/测试现已统一冻结并完成本轮静态验证，尚待主执行者归档回存与新Mac完整QA；全局最终审查另行收尾。

v13观察trace已核110次调用、5次dblclick、5次列表链接focus正断言、0错误；实际桌面/手机截图已查看，导航16/12px及手机12/9px可作为v13局部运行依据。正式Projects索引仍119 passed /151 failed /8 skipped（278项、retries0）：82 locator相对作用域、66旧height度量、3identity wrapper留白。原失败不改写为pass，首个失败之后的断言没有得到运行证明；66项height不能预判都误报，修正后的Range/实际clip祖先检查及完整正式Mac复测仍待。现已取得并阅读v13完整Mac报告及机器摘要，记载全站85/85、Photos55/55、unit388/389；其原始结果包校验由主执行者汇总核对，本任务未重跑这些套件。原生200%仅partial：API/CDP与8/8功能组及3张OS窗口截图有证据，Accessibility=false，菜单/快捷键操作和菜单可见200%数值未验，不能写完整缩放验收通过。

补充原始文字/导航诊断现已到本地：测量限定v13六宽×五详情30页面、66节点（30h1/30职责/6长URL）。报告指出相关样本文字Range及祖先visible未见实际裁剪；这是官方失败之后的额外诊断，不把原66项height失败或未执行后续断言洗成通过。新候选仍须正式Range/clip负例与完整套件复测。

保护来源更正：task-6-protection-frozen-v12.json是v12产品代码不变、后来文档/证据增加后的重生成审核，不是v12原归档JSON的逐字节副本。精确原件已保存input-v12-original-protection-audit.json，SHA256 88d85db34c51c5ff534c043b73e69a6092a52698478d2ef9a3d0e482e3473cb5，来源见protection-audit-provenance.json。静态保护的旧handoff497项只指最初v10基线原件，不代表跨版本所有旧handoff不变；v12完整1167输入和原归档仍保存。

测试修正仅包括canonical realpath完整相等、candidate-relative has、Range+真实clip祖先判定，以及完整品牌点击框/副标题逐行Range取代identity wrapper空白。专用fixture6、geometry32、clearance9单元及14个新浏览器契约的加载记录只证明其各自层级；未运行的浏览器契约不计pass；三项测试修复最终独立审查全部Spec PASS/Quality APPROVED、无P0/P1/P2，八个最终SHA匹配，角色间距独立审查另为PASS/APPROVED并核三SHA。

用户Sentinel_4815171839f48191b89e92b61823e1b1在05:32:04Z反馈“装饰元素跟导航的距离太近了”，授权在保留字号的前提下拉开已有包子/嘉乐与导航留白。唯一新增产品变更为默认.site-characters margin-top18→42px（+24）；保留桌面16/12、手机12/9、手机margin-top25px、reading桌面26px、品牌/h1、角色原素材/x/尺寸/动画、栏宽与纸比例。最新shell.css保护预期是输入基线两字号加这一margin共三处唯一替换后的完整字节；不再用“只改两处字号”描述当前共享CSS。

间距专用20单元+既有12为32/32，新增7个间距e2e只加载。44–56px实际alpha留白阈值尚待新Mac测量及截图，不能把源+24px或旧v13图当新间距后值/视觉批准；720px响应式检查也不代替原生200%。冻结后一般保护783/783通过，完整shell.css字节精确为基线两字号+一margin累计三处；新候选实际可见间距仍未测。下一候选的完整浏览器、200%菜单/快捷键/数值、用户视觉、真实内容/新角色/上线批准仍未完成。当前冻结结果来自主执行者真实日志，本任务已读核而未重复suite/build：451/451单元（38files）、显式源码check182/0errors/0warnings/2hints、原始check206/3历史errors/0warnings/3hints、生产19页与HTTP/产物5/5。build之后只删单元未使用type，不影响dist。新mixed24页、source/seed unchanged；5详情/5资产/2正文图/8HTML拒绝证明，完整--list131项/8spec仅加载。源指纹实测251项（src137/public28/tests72/scripts6/配置锁8），mixed248项非合成范围一致，精确列三草稿替换、八合成Markdown、五资产添加；11项独立评审SHA全部匹配，见task-6-test-repairs-code-identity.json。优先spacing7/helper-contract14/nav6共27项可先跑，但之后仍须完整mixed131和其他四case四spec、全站85/Photos55，不能用小组通过代替全套。

以下先前阶段数字与范围保留为历史。

### 历史：v12与v13首波双击/字号代码冻结阶段

Projects 设计/代码实施范围已获授权；v12已有局部真实运行证据，晚到桌面导航字号和返回双击修复的后续v13候选产品/测试已统一冻结，两项独立审查PASS/APPROVED，尚待打包回存及Mac新包复测，端到端及用户视觉未完成。列表以项目名称、一句话简介和完整个人职责为主，图片为辅；项目名称一档，简介、职责、分类、可选时间/状态及列表图注统一继承正文另一档。页面 h1和详情字级不因列表反馈改变；此前全站导航字级保持的范围另被下方晚到桌面反馈覆盖；颜色、字重、间距仍可区分信息，不再靠新增小字号层级。无筛选、搜索、分页、人工置顶或空图槽。

记录日期倒序、同日稳定 id 排序；role/kind 为公开必填，status 不参与门禁或排序。仅 draft=false 且 approved=true 进入列表、首页、详情和分享元数据；当前三个真实草稿原样，正式生产 0 Projects、/projects 唯一“项目正在整理。”及 noindex，私有/未知 slug 共用通用 404。保留既有 slug、普通返回链接和原 /ai-works 迁移字节。

项目图只能使用本站 /assets/projects/ 的登记图片及同比例变体，公开 cover 必须匹配 images；正文图跟随解释段落，有准确 alt/尺寸，首屏外 lazy，不生成页首画廊。没有批准材料则省略，不补指标/结果/链接，不把合成测试或真实草稿迁入 public。人物沿用已批准静态素材；新角色、真实材料和上线分别另批。此次开发不提交、push、merge 或 deploy。

当前入口为全站规范 v2.9、Projects 设计、实施计划及 D-156。证据在 _handoff/projects-evidence/；361 单元/174 文件源码 check/19 页构建只代表此前v12 QA 候选产品/测试匹配的实际日志，原始 check 的历史错误另列，不能替代后续修复和桌面导航字号候选的新验收。Mac 命令及 Photos 一次性 QA 副本要求见 _handoff/PROJECTS_MAC_ACCEPTANCE.md；D-155 及更早通过数保留为历史，不能替代本轮回归。

当前后续修复代码的实际日志：389/389单元（35文件）、176文件显式源码check0errors/0warnings/2原hints、生产19页、正式5项HTTP/产物5/5；原始check200文件仍3历史errors/0warnings/3hints。初轮新单元4个PostCSS类型错误及修正后日志均保留，只用Node/instanceof正确收窄，未改产品逻辑。静态保护783项通过；shell.css完整字节等于原基线仅两处桌面字值替换，手机/品牌/h1/角色及其他字节保持。新mixed与当前源242项非合成代码/测试/scripts/config/锁一致；5详情/5资产/2正文图/8最终HTML负例拒绝，mixed --list110项/6文件仅加载。v12五case的1200项比较仍是历史，本轮未重做五case。以上均不代表新Mac GREEN，v13实际归档/Library身份由主执行者后续回执确定。

### 晚到范围变更与 v12 局部运行证据（2026-10-04 04:24:57Z）

用户在 Sentinel_c81caa2b437481918a4f5342201e170a 明确反馈“电脑端左侧的字体太小了看起来”。新增授权仅为桌面（≥768px）主导航文字13→16px、编号10→12px；手机（≤767px）文字12px/编号9px、品牌、页面h1及角色保持。此项专门覆盖此前“本次列表字级不改全站导航”的范围描述，不能再说当前导航字号完全原样。该字号阶段只允许两处桌面字值变化；顶部05:32:04Z新反馈另增加默认角色margin这一处，当前需三处完整字节保护。

已取得并阅读v12实际测量JSON，查看桌面/手机列表截图：1440/390px列表名称32/22.4px，其余简介、职责、分类、状态和列表图注16px；手机figure与prose均314px，表格client314/scroll1298并到达最大984，证明该局部布局修正有真实运行依据。v12当时桌面导航仍13/10px，截图不是新16/12px后值，也不等于用户视觉批准。原返回双击失败trace已保留；返回修复独立审查Spec PASS/Quality APPROVED、无P0/P1/P2，定向42/42；新增16项回归及真实trace解码已核，真实Mac GREEN仍待。桌面字号独立审查同为PASS/APPROVED，最终四SHA已核，12/12专用单元与六项e2e加载通过，真实computed/像素仍待。

主会话转述v12原5+80全站85/85、Photos55/55；完整原报告和日志尚待取得，这里不把转述写成已核对的通过记录。另两类测试定位器/字体度量失败的原始记录未到，不能推断原因或写已修。Mac目前离线，后续v13候选产品/测试已统一冻结、两项修复独立代码审查通过；打包回存身份及真实浏览器复测仍待；不复用v12数值宣称新版全部通过。真实内容、新角色、用户视觉与上线仍分别另批。

## 当前相册方向 · D-155（2026-10-03，历史验证仍保留）

列表封面统一 3:2，`object-fit: cover`；默认中心取景，可选 `album.coverPosition: {x,y}` 使用百分比，仅作用于列表封面，不改变原图文件或 reader。封面继续无灰底、书脊、边框、硬阴影和书壳内衬。手机当前名称可展开完整影集目录，选中后关闭；桌面≥768px改为纸内左侧纵向名称与当前项短线。名称只横向定位照片，手动横滚同步，不执行页面导航；移除“挑一本”和图片下重复名。键盘焦点、Escape及跨断点resize保留可用。

图片横轨桌面约1.6张/26px间距、总宽≤648.4px；封面宽≤384px，3:2推得高≤256px，不再沿用480px的4:5占位高。手机约1.4张/18px间距。轨道左右共8px留白保留，上限公式为`384 × 1.6 + 26 + 8 = 648.4px`；窄可用纸面先扣除栏目目录宽与间距，再同比缩小照片。全站左栏>1050px为300px、768–1050px为242px，维持原响应式。纸内目录按视口宽度切换：>1050px为148px/28px间距，768–1050px为116px/20px；不改变全站左导航。D-150手机隐藏文章阅读辅助仍有效，影集展开目录是另一模块。

| 影集 | 已确认列表封面来源 | 列表取景位置 x/y |
| --- | --- | --- |
| upintheair | 同组云海 `AbPhjv4n5` | 50/100，居中靠底 |
| streetphotograph | 原封面 `EfSRCA4Bo` | 50/50，居中 |
| fukei | 同组摩天轮 `qO6lKLrnY` | 50/50，居中 |
| homestyle | 原封面 `zJhpksjx_` | 50/50，居中 |

该批准包含目录三张预览及四组具体3:2取景的开发集成，不等于线上发布。真实照片仍仅用于私有试排；私有选择记录由主执行者维护于 `design-assets/photos/d155-approved-cover-selections.json`，不迁移真实资产到public，不修改content批准字段或发布门禁；角色候选未批准、未接入，生产仍0公开相册/noindex。reader保持原照片比例、759/760px实际内容宽度单双页、顺序、hash、返回位置/焦点及已有轻淡入，不增加硬壳翻页。D-150手机文章隐藏全部阅读辅助的规则不变；这里的影集展开目录是Photos列表模块，不是文章阅读目录。D-155本轮已在用户Mac的独立Playwright Chromium完成：159/159单元（23文件）；Astro检查156文件、0错误0警告及2个既有hints；生产19页、零公开相册，最终全站80/80（第三轮，2.0分钟）；隔离相册55/55（保留原47项、新增8项，54浏览器+1HTTP，1.7分钟），夹具25页、私有预览20页。20项几何/无JS检查（九档宽度×两数据源及2项无JS）errors=[]、无整页横溢；原生200%缩放通过，含1440→720目录焦点/第四本保持及reader photo-b单双页、键盘回退。两副本199条源码哈希匹配，夹具另有150项src/测试一致性核对。三张已批准目录预览与最终截图逐字节一致，复用既有Library图片ID，不另造新预览。本轮静态与生产产物审计55/55通过：新生产67文件/19HTML无真实照片、私有资源或合成夹具泄露。public28、真实content25和其他模板1、角色17、锁文件/部署7、D-150保护61及历史handoff389（含D153证据68/D154证据57）均在规定保护范围内不变；两个原checkout799文件及Git状态一致，另326项旧正式源码/public、私有预览及归档/报告指纹不变。新证据在 `_handoff/d155-evidence/`；D154/D153旧结果仍作历史，本条通过数来自本轮最终运行。

首轮全站78/80、第二轮79/80及相册两轮53/55的日志/trace全部保留，最终无自动重试。导航trace确认旧v9已有普通native.ready取消未被观察；最小修复仅观察DOMException AbortError，其他异常仍暴露，不更改导航设计、时长或D-150文章规则。两个既有导航测试分别改为真实后发点击gate和预先MutationObserver记录，修正定时/观察时序，不放宽完整页面断言。相册修复只恢复因断点隐藏而丢失的目录焦点；主动Tab、外部/空白点击会清除恢复意图，新增负例证明不抢焦点。第二轮相册失败是负例点击了可聚焦main，改成真实不可聚焦纸外目标后保留严格body焦点断言。 验证总览为`_handoff/d155-evidence/verification-summary.json`；详细日志及复用图片身份见RESTORE。

## D-154 直接照片与验收（历史，不代表 D-155）

用户已确认直接展示照片：“比例用于空间，不画书壳”。封面不再有灰底、边框、硬阴影、书脊或书壳内衬 padding。4:5 只定义不可见布局位置，照片按原比例完整 `contain`，以照片实际下缘对齐，名称位于照片下方；横图、竖图不裁切，也不拉伸成统一形状。

沿用空间节奏：手机 ≤767px 约 1.4 个位置、18px 间距；桌面 ≥768px 约 1.6 个位置、26px 间距。桌面 slot 高≤480px、宽≤384px；rail 总宽≤648.4px（`480 × 0.8 × 1.6 + 26 + 8`），含轨道左右共 8px 留白，名称导航同步收窄。窄纸面同比缩小 slot，全站左栏仍 >1050px 为 300px、768–1050px 为 242px。比例衡量排布空间，不保证每张原图露出相同面积。

已有轻淡入足够，不增加硬壳翻页；相册 reader 与返回恢复规则不改。真实照片仅私有试排，角色候选未批准，生产仍 0 公开相册/noindex。D-154 本轮在用户 Mac 的独立 Chromium 完成 136/136 单元（23 个文件）；Astro 检查 150 个文件，0 错误、0 警告、2 个既有 hints；生产 19 页构建、80/80 回归（1.3 分钟）；隔离夹具 25 页构建、47/47 检查（46 项浏览器 + 1 项 HTTP，19.9 秒）。20 项几何/无 JS 检查通过（errors=[]），原生浏览器 200% 缩放通过，含 1440→720 CSS px 跨断点；合成及私有试排副本共 68 条运行/关键文件与最终源码哈希一致（各 34 条）。四张先行真实照片私有预览与最终正式 CSS 截图逐字节相同，`preview-final-match.json` 已核实，因此已有 Library 预览图片就是本轮最终视觉效果；这不构成照片公开批准。证据在 `_handoff/d154-evidence/` 的最终日志、`final-screenshot-checks.json`、`real-browser-zoom-result.json`、`final-copy-source-match.json` 与 `preview-final-match.json`。本轮最终 `protection-final.json` 为42/42通过：public28、content27、私有角色17、门禁5、锁文件/部署7及D-150保护61项均与v8一致；D-153历史证据68项内外均未改，原两个checkout共799文件（181+618）及Git HEAD/分支/状态一致。新生产67文件/19 HTML通过扫描，无真实照片、私有试排、候选角色或合成夹具泄露；`previous-source-unchanged.json`另核对318项旧正式src/public、旧私有预览及旧归档/报告指纹，全部不变。输出归档版本与SHA256沿包内清单/同ID实施报告记录，不将归档自身哈希写入自身。以下 D-153 结果仍是历史记录，不能替代本轮证据。

## D-153 验证 · 2026-10-03（历史，不代表 D-154）

在用户 Mac 的独立 Chromium 完成：136/136 单元（23 个文件）；Astro 检查 147 个文件，0 错误、0 警告、2 个既有 hints；生产 19 页构建、80/80 回归（1.3 分钟）；隔离夹具 25 页构建、47/47 检查（46 项浏览器 + 1 项 HTTP，19.4 秒）。

20 项几何与无 JS 检查通过（`errors: []`），覆盖 360/390/767/768/1024/1280/1440/1920/2560px：九档宽度 × 合成/私有试排两数据源共 18 张截图，另有两项无 JS 检查；横幅封面选中截图 2 张、原生缩放截图 3 张另列。原生浏览器 200% 缩放含 1440→720 CSS px 跨断点，并保留当前相册/照片；不以 CSS zoom 或捏合缩放代替。返回列表既保留原位，也能对实际被裁边的封面做最小校正，两个回归均通过。合成及私有试排副本共 68 条运行/关键文件哈希与最终源码一致（各 34 条）。

证据见 `_handoff/d153-evidence/` 的最终日志、`final-screenshot-checks.json`、`real-browser-zoom-result.json` 与 `final-copy-source-match.json`；中间失败日志与 trace 保留。真实照片仅用于私有试排，截图不构成公开批准，角色未接入生产。最终 `protection-final.json` 的 36 项静态保护检查全部通过：public 28 项、content 27 项、私有角色 17 项及 D-150 保护集 61 项均与 v7 一致；原两个 checkout 共 799 个已记录文件（181+618）逐文件及 Git HEAD/分支/状态一致。新生产输出 67 个文件、19 个 HTML 已核验，无私有试排照片、真实照片或未批准角色泄入，零公开相册/noindex 保持。交付清单与归档标识见 `_handoff/RESTORE.md` 指向的包内 manifest/checksums 和同 ID 实施报告。Safari、真实 iOS 原生手势仍未验证。未提交、push 或部署。

## 技术与内容

- Astro 5 静态站，TypeScript、原生 CSS、Markdown Content Collections。
- Bun 为唯一包管理和脚本入口；以 `bun.lock` 为准。
- Astro ClientRouter 管理页面交换和历史；Lenis / GSAP 管理已有滚动与开场。
- React islands 用于已有首页互动和照片灯箱；不新增 Canvas / WebGL。
- 生产条目必须满足 `draft: false && approved: true`。没有正式内容的栏目保留空态与 noindex，不补假内容。

## 当前入口

- [设计规范 v2.9](docs/design/baozi-space-design-spec.md)
- [产品与发布门禁](baozi-space-prd.md)
- [决策记录](docs/project/decision-log.md)
- [Projects 设计](docs/design/baozi-space-projects-design-v1.md)
- [Projects 实施计划](docs/plans/2026-10-04-baozi-space-projects.md)
- [相册设计 v1.3 · D-155](docs/design/baozi-space-album-design-v1.md)
- [相册当前实施计划](docs/plans/2026-10-03-baozi-space-album.md)
- [已确认 Demo 实施计划（历史）](docs/plans/2026-10-02-confirmed-demo-implementation.md)
- [内容批准清单](docs/project/content-approval-register.md)
- [Claude 阅读侧栏研究](docs/research/claude-dev-article-rail-teardown.md)

`/#home` 直达首页，不重播开场。四个主入口为 `/blog`、`/photos`、`/resume`、`/projects`；书影音等旧归档路由继续保留。原始手账风与右侧人物构图不再作为新实现依据。

## 开发与验证

```sh
bun install --frozen-lockfile
bun run dev
bun run check
bun run test:unit
bun run build
bun run test:e2e
```

开发地址默认 `http://127.0.0.1:4321/`。Playwright 默认在独立 `4330` 端口启动服务，不复用其他项目服务器。需要并行验证时为各测试进程指定不同端口：

```sh
PLAYWRIGHT_PORT=4331 bun run test:e2e tests/e2e/navigation-lifecycle.spec.ts
PLAYWRIGHT_PREVIEW=1 PLAYWRIGHT_PORT=4330 bun run test:e2e
```

preview 模式运行前先 `bun run build`。页面验证检查真实 main、h1、正文和导航，不把 URL 变化当作导航成功。需要覆盖360/390px、桌面、反复往返、动画中切换、历史滚动、章节hash和reduced motion。

`home-orbit.spec.ts` 的确定性角度检查依赖仅开发环境开放的诊断事件，完整开发测试继续运行这20项；preview模式排除该文件，使用 `home-orbit-production.spec.ts` 验证真实鼠标、键盘、返回与手机降级，不在生产包开放调试接口。

## 结构

```text
src/components/layout/       # 共享Shell、导航、角色
src/components/home/         # 首页内容与既有角色互动
src/components/editorial/    # 栏目与文章、目录与阅读进度
src/components/intro-oil/    # 可跳过开场及降级
src/lib/transitions/        # 页面切换生命周期
src/lib/scroll/             # 唯一Lenis实例与滚动接口
src/lib/reading/            # 正文进度、章节与历史
src/content/                # 内容与批准字段
public/manifest/            # v2生产素材契约
public/assets/              # 已批准运行时素材
tests/                      # Vitest与Playwright
```

启动页继续使用D-132的v2生产素材和Manifest；不重绘角色，资源失败、无JS与reduced motion均可进入稳定首页。资产合同与历史分镜见 `docs/intro/`、`docs/animation/oil-motion/`，旧计划的构图冻结条款已由D-148覆盖。

Waline仅在 `PUBLIC_WALINE_SERVER_URL` 已配置时启用。当前任务不配置服务端、不push、不合并、不部署、不切域名。Cloudflare与内容发布门禁继续按现有批准流程处理。

## D-150 文章验证记录（历史）

2026-10-03 在用户 Mac 的独立 Playwright Chromium 151.0.7922.34 完成最新 D-150 验收：Astro检查99文件、0错误0警告及2个既有hints；单元63/63；18页构建；完整生产E2E最终80/80。修复被输入打断时的章节焦点交接与章节提示错位；普通/长目录、键盘、767/768px边界与移动隐藏均有新证据。

首轮79/80发现真实焦点缺陷；第二轮79/80有一次首次点击超时，同代码独立复验未重现，最终单独跑完整80项通过。详细日志、16张实际截图与测量在`_handoff/mac-d150-evidence/`。云端先前因环境限制未完成浏览器验收，旧D-149的77/77不能代替本轮结果。

Safari/真实iOS设备、真实200%缩放尚未验证；未push、合并、部署或切域名。可通过`PLAYWRIGHT_CHROMIUM_EXECUTABLE`选择系统Chromium，默认仍用Playwright管理的浏览器。


## D-151 相册云端阶段（历史）

设计与接口见 `docs/design/baozi-space-album-design-v1.md`、`docs/plans/2026-10-03-baozi-space-album.md`。相册、每张照片、独立封面均需明确批准网站公开使用；示例字段见 `src/content/_templates/photo-album.md`。生产当前保持零已批准相册及noindex空态。

新增相册测试使用独立临时副本：`bun scripts/photos/run-fixtures.ts`。仅构建合成夹具：`bun scripts/photos/run-fixtures.ts --build-only`。它安装同一冻结锁文件、注入显眼几何图，不修改生产content/public；端口4367、独立Playwright配置。原生产回归继续 `PLAYWRIGHT_PREVIEW=1 PLAYWRIGHT_PORT=4352 bun run test:e2e --workers=2`。可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指向受支持的已安装Chromium。

该云端阶段日志见 `_handoff/album-evidence`。当时浏览器启动受socket权限限制；其后 D-151/D-152 的 Mac 验收见下节，D-153 的独立新验证见本文顶部。六姿态生成源稿和候选在非公开design-assets/photos，尚未批准或接入；运行时缺少独立批准manifest就不显示相册装饰角色。真实照片公开与最终发布均为另行关卡。

## D-151 / D-152 Mac 验收（2026-10-03；历史基线）

以下记录 D-151/D-152 源码的历史验收，不代表 D-153：已在独立Chromium验证当时相册源码：原生产回归80/80、隔离相册32/32（31项浏览器、1项HTTP）、128/128单元；Astro139文件0错误0警告、2个既有hints；生产19页、夹具25页构建。

约1.2本封面与名称分段定位、单双页、759/760边界、键盘/触摸意图、返回与历史、减少动效、失败重试和内容门禁通过。360/390/768/1024/1280/1440/1920实测无页面横溢；真实浏览器200%缩放转单页并保留photo-b，键盘翻页可用。修复空白右页零高度、取消拖动吞掉下一次控件点击；测试时序与未批准角色契约已纠正，完整原用例意图保留。

照片示例只在临时隔离夹具，明确标注合成测试图片；生产仍为0公开相册和noindex空态。新角色仍未批准、未接public。Safari/真实iOS原生手势未验证，不把Chromium事件仿真冒充真机体验。源码无提交、push或部署；本轮日志、截图和恢复依据见`_handoff/album-mac-evidence/`及`_handoff/RESTORE.md`。
