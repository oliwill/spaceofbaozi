## D-159 · 桌面嘉乐先跑到落点，再原地坐下（2026-10-05）

用户在桌面原录屏中指出嘉乐“从右侧平移至左侧”，并明确所指是约18–21秒“坐着滑过来”的开场返回段。原v21的工程检查通过记录保留，但该段视觉未获用户认可，不能以41项旧通过替代此次修正。用户反馈为Sentinel_69ba12a3647c8191bb4624e9642a10a1，澄清为Sentinel_dea00426fbc8819195152dff0f6815f0。

根因已结合原始视频像素、采样与代码核实：94–97%横移期间提前播放朝右慢步/抬头/坐下图集，实际却向左移动。此次只修桌面生产开场：94–97%镜像复用原Intro奔跑8帧朝左行进，以增加的实际路程换步；97%抵达原锚点后固定位置，再播放原抬头站定坐下序列。返回与坐下使用相同尺寸及接地点，末帧与原节点持姿交接保留。手机及旧演示默认路径、Home鼠标/点击/键盘互动均不改；没有新图集、素材重绘或新的转身动画。

现有素材没有转身帧，因此97%从左向奔跑切回原右向坐下姿态是否自然，必须看新录屏确认；几何连续不等于轮廓连续。原.995准备事件现在发生于sit-down，完整sit-still从.99625出现，原Intro节点仍保留至进度1后交接。

云端验证：756/756单元（46文件）；源码check200文件、0错误、0警告、2既有hints；19页生产构建。完整归档默认check228文件仍有3个原D155错误（旧fixture的两个模块缺失和photo隐式any），exit1 NON-GREEN，未通过配置隐藏。新增测试先实际3失败/27通过，修正后30/30；首次实现仅浮点字符串精确比较失败，改为10位几何容差后通过，原日志均保留。独立代码审查无P0–P3，定向40/40，另30003个默认路径差分组合一致，不计入单元数。

精确改动：2个Intro产品文件、2个既有单元文件、新增intro-dog-return.spec.ts；其余256项代码/资产/测试不变，Home与全部原public素材保持。正式浏览器清单44项/6文件，尚未运行新Mac验收；旧41通过只属上版。需要实际真实滚轮记录跑到位、停步、原地坐下及完整进入首页，再交用户视觉复核。

下一Mac：从最新同身份精简QA候选核验清单，使用原2workers、0retry、30秒test/5秒expect；运行原41项加3项intro-dog-return。保持失败原件，不现场改源/阈值。桌面1440×900连续真实wheel录屏，增加.94/.945/.952/.96/.968/.969/.9705/.975/.98/.99/.997/1观察；重点.97附近透明轮廓、尺寸/接地点及帧方向。保持原手机模拟、资源失败、返回/跳过和首次互动覆盖；新视频不要用旧视频改名替代。

Safari、实体iPhone/触摸、实际BFCache、原生200%、健康Home旧900ms leave竞态、其他栏目历史失败仍未由本轮关闭。没有commit/push/合并/部署、内容或素材发布批准。下方历史原文保留当时结果，当前候选状态以上文为准。


## D-158 · 启动页与启动到首页专项实测完成（2026-10-04）

已完成用户优先要求的启动页与启动到首页实现，并在用户Mac独立Chromium按已批准的末帧保留方案完成本轮工程验收。当前仅补充实测原证据与说明，产品及测试与已测源码v20/精简QA v2逐字节相同。完整演示和关键截图已保存，用户最终视觉确认及是否上线仍另行，不将本专项通过扩大为全站发布批准。

正式首轮41/41（Intro16、Home3、交接6、持姿6、故障10），0失败/跳过/flaky、每项一次、2workers/0retry、原30秒/5秒预算，2026-10-04T16:39:46Z启动。752/752单元（46文件），生产19页，Mac精简check197文件/0错误/0警告/2既有hints；309输入文件执行前后不变。云端完整源码check199/0/0/2及完整归档默认check227/3原D155错误/0/3hints保留为不同口径，后者仍NON-GREEN；精简检查不能抹掉旧错误。41项含必要合成负例与直接focus，不能全部称为纯真实输入。另3个真实Tab/点击/断点观察不额外计PASS。

云端独立核对：证据ZIP125成员、123份SHA全部匹配，包内QA清单与保存候选逐字节相同，原41项JSON也与单独Library原件相同。实际查看两端完成图、尾段99%、首次鼠标/方向键及两端完整回退/回退失败截图，未见前版明显双轮廓、残缺或复制角色。已核记录显示：原person/dog节点转交前后x/y/width/height差全0、原Intro atlas与末帧保持，纸面淡入时角色opacity保持1；静止指针及额外滚轮保留末帧，同一次真实鼠标移动/点击或方向键再进入原互动。首次ArrowRight目标35°→50°恰一次。位置/opacity为DOM记录，不能冒充透明像素逐帧等价或绝无亚帧闪烁；完整视频不宣称已经逐帧人工审阅。

390px为Mac Chromium窄桌面模拟（isMobile=false、hasTouch=false），不是实体手机或真实触摸。跨390/767/768/1440保持同一对原节点且横溢0；滚动后767角色在视口外属于页面正常滚动，不声称角色始终在屏内。故障回退6张图为完整一人一坐狗，回退图也失败的2张保留干净HTML和导航；导航/焦点/返回是否可用由原正式行为断言证明，不由截图推断。

交付媒体：桌面完整录屏libfile_41a045e0fd188191adb39ab60fe1fc1f，窄屏完整录屏libfile_bff46804e3e481918c115d8735bdab6c；桌面完成图libfile_4799986eafd4819186f79a14ec6d2b89，窄屏滚轮后图libfile_d56f74cd018881918046732d533f0bff。原证据包libfile_6e89c54b7ca08191931d0b4cd06e3f42，SHA256 37656db413a7aee38f2005885d29aa8c2265af8522957f737f9aa2c4bcdcff1d。媒体原件另存Library，包内以原ID/字节数/SHA索引，不重复生成或更改录制内容。

仍未验/未关闭：Safari、实体iPhone/触摸、真实BFCache persisted命中、原生200%、历史健康路径900ms mouseleave/键盘竞态、其他栏目历史失败及3个旧归档check错误。保留原真实内容和发布门禁；没有commit/push/部署、域名或系统权限变化。以下历史段落说明候选当时的实现和待验状态；当前实测结论以上文为准。

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

# Current Projects checkpoint

Read `PROJECTS_CHECKPOINT.md` first. This archive already contains the current source. Do not reapply old patches. Library metadata is the authoritative saved version.

# D-156 Projects 源码与完整代码/测试QA候选交接

<!-- dispatch-timing-candidate:start -->
### 当前：v17文章首跑失败与最小调度候选冻结，Mac复验暂停（2026-10-04）

输入为实际Library源码/报告同为v17，下一回存以guard 17开始；新保存版本只认未来Library实际元数据和回执，不预称v18或已保存。

输入源码稳定ID为`libfile_0d03c46fad088191b0c936924828105b`，文件名`baozi-space-D151-album-cloud-20261003T0602Z.tar.gz`；报告稳定ID为`libfile_f35bd25f1b28819182cc4e0e1bd20191`，文件名`实施与验证报告.md`。v17输入归档195713001字节、1553文件/1551清单，SHA256 fde419a7f996e18dfba1240f13bce89492209279b266156b71c675907b3fb94d；输入报告35978字节，SHA256 cd0ff41ec9f8d37f14c71131155325ae3989d3056e308e3c5a12527d2a6ce324。上述只代表输入；未来归档自身SHA/大小只写外部报告与实际回执。

从未来新归档解包到新的独立无.git源目录和QA根，逐项核manifest/checksums、实际Library版本及最终测试pin，不复用旧QA根或重套旧patch。保留v17失败、此前版本输入与Photos历史证据；Photos runner仅从一次性QA源副本运行。

v17首次唯一文章用例实际为0通过/1失败/0跳过，0 retry，完整套件未启动。初始fragment见证及两次前进RAF gate已取得，gate时349.1ms；到773.9ms标题top=298.796875，原窗口规则判FAILED。真实wheel命令与事件均为0；1500ms、fresh final和下一章节未执行。两JSON、trace ZIP和实际注入collector/源身份已核验；原始FAILED不改判。

client trace的mouse.move为284.935ms，后续read为16.610ms；server trace对应267.894ms与4.872ms，属于不同测量层，不混算。read仅采到seq35/top306.796875，回到Node前窗口已失效。长move与358.7ms RAF间隙的根因未证实，不能据此宣称产品缺陷或新调度必然成功。

本次实现限定Node调度：在已接纳的原真实click见证到达后，只启动一次原正文mouse.move(1000,500)；原两次前进RAF gate和同一个move成功join之后，才单次真实wheel(0,-500)，移除关键链路中的陈旧post-move read。目录ol的data-lenis-prevent必须保留，不能省略正文move而在目录上滚轮。browser rules、collector及记录/发送频率、原createOneShotInput、旧单元/e2e、Home观察、产品/配置/锁、阈值与预算均保持；仅允许本次调度与必要新增wire单元。

用户于2026-10-04 14:19:55Z要求先完成启动页及启动页到首页衔接。本快照静态/代码候选完成，Mac文章/Projects复验暂停；后续由主任务完成启动页及开场→首页演示，恢复本栏目验收需主任务安排。现有Mac命令仅保留为恢复参考，不是立刻启动指令。 当前候选已冻结。独立代码审查PASS_CODE_AND_MODELED_WIRE_ONLY及保护增量PASS，无未关闭P0–P3。新增41项wire模型单元，加原154项共195/195；全单元702/702（42文件），严格TypeScript exit0。独立审查另195/195、TS0和28项额外探针，探针单列不加入Vitest数量；模型不执行浏览器collector，不是真实输入。源码check190文件/0错误/0警告/2旧hints；最终默认check218文件/3个历史错误/0警告/3hints，exit1，仍NON-GREEN。初跑217文件/5hints含两个新证据脚本未用项，清理后重跑，原日志保留。新生产19页/67文件逐字节等于v17，HTTP/产物5/5；新mixed24页、source/seed不变，5详情/5资产/2正文图和8个非法HTML负例通过，147项/9spec仅--list。源259项（含3草稿）、256非合成项哈希匹配。正式保护为780不变基线项、3原spec原件/替换件精确哈希及9测试pin；8项runtime负例与2缺pin/1缺review声明负例分层通过。新Mac仍未验；旧候选154/661与历史check/build不作本候选结果。

主任务安排恢复本栏目验收后，Mac仍先只跑原唯一文章用例：使用下方同一未加首尾锚点的精确中文grep，并以--list核为1；配置2 workers、0 retries、一次一个suite、原30秒test/5秒expect及专项预算不变。实际fragment见证、原gate、唯一真实wheel、完整1500ms、fresh final与下一章节全部通过后，才跑完整Projects315、生产85、一次性QA源Photos55及实际全单元702；优先用例不重复计入全套，失败则保留证据回报，不现场改源。

v16完整实测Projects307/0/8（315项）、生产84/1（85项）、Photos55/55、unit581/581仅属v16；v15原native首错仍UNRESOLVED，Home旧900ms leave与新键盘交错仍未验，原生UI 200%因Accessibility受阻仍未验。禁止改权限、借v13 partial或以API/缩viewport替代；Cloudflare实际301、Safari、真实iOS及真实慢网仍未验。

已认可v14视觉保持：桌面导航16/12px、手机12/9px、默认角色margin-top42px及实测46.146px留白；手机角色25px、reading桌面26px与原素材保持。三份真实草稿、0公开Projects、标题“项目”、空态“项目正在整理。”、noindex、D-155 Photos与D-150阅读规则不变。没有真实内容、新角色或部署批准，不提交、push、合并、部署或切域名。

本节证据相对`_handoff/projects-evidence/`：`mac-v17-runtime/controller-v17-first-run-verification.json`、`execution/v17-window-diagnostic.json`、`execution/v17-dispatch-fix-design.json`、`execution/v17-dispatch-design-review.json`、`fragment-observer-library-receipt.json`。实现与精确范围证据为`execution/v17-dispatch-implementation-report.json`、`execution/v17-dispatch-range-audit.json`；独立审查为`execution/dispatch-timing-code-review.json`与`execution/dispatch-timing-protection-addendum.json`；新产物为`execution/dispatch-candidate-code-output-identity.json`、`execution/dispatch-candidate-mixed-output-audit.json`，正式保护为`execution/task-6-protection-audit.json`。

本节覆盖下方历史段落中的“当前/本候选/下一Mac”称谓与旧执行顺序。下方原文逐字节保留，只代表各自当时的版本和验证范围，不追改历史FAILED，也不把历史通过数当作本候选结果。

<!-- dispatch-timing-candidate:end -->

### 当前：v16已完成实测，文章fragment观察修正候选待Mac复验（2026-10-04）

本候选以已保存Library v16为输入；下一保存版本只认Library实际元数据与交接回执。源码稳定ID `libfile_0d03c46fad088191b0c936924828105b`、文件名 `baozi-space-D151-album-cloud-20261003T0602Z.tar.gz`；报告稳定ID `libfile_f35bd25f1b28819182cc4e0e1bd20191`、文件名 `实施与验证报告.md` 均保持。输入回执为 `projects-evidence/test-observation-library-receipt.json`：v16源码188596975字节，SHA256 3edf9fc9427180b42025d4bd873ac72c6fc8f0f905add234310a1631c7ef1ba1，1468归档文件/1466清单项。该身份只指输入，不是新候选归档身份；新归档自身SHA/大小只放最终外部报告与实际回执。

从新归档解包到新的独立无.git目录，先逐项核manifest/checksums与实际保存版本，不重用旧QA根、不重套历史patch。保留v16/v15/v14全部1468/1357/1311输入、原失败与196项SHA/大小/CRC已核原始结果；Photos历史63项保持。新Photos runner只在一次性QA源副本执行，不能覆盖正式源旧fixture-location。

相对v16只变两个测试文件：`tests/support/real-input-observation.ts` 为450行，SHA256 82ed5505bc9988c4986bf7de8975068a9de77003ec9e7499825b8196e384fcd0；`tests/unit/realInputObservation.test.ts` 为419行，SHA256 6aa286c513e99d0558355448330c815d9faee6260eb6db5c8c1f488f95ce2eda。产品/e2e spec/另外6个测试pin/配置/锁/预算均保持；780不变基线项+3原spec原件/替换件+8pin继续适用。v16原audit另存精确原件，当前重生成audit不称v16原件。

v16实测为优先23/24、Projects307/0/8（315项）、生产84/85、Photos55/55、unit581/581；两次文章失败均未执行wheel与后续完整断言，原判保持。候选独立代码与保护增量PASS，无未关闭P0–P3；本候选定向154/154、全单元661/661（41文件）、严格TypeScript通过；另16项实际Playwright转换后的collector/mock-DOM探针通过，独立计数且不代表浏览器。源码check189文件/0错误/0警告/2旧hints；主执行者最新默认check214文件/3个D-155历史错误/0警告/3旧hints、exit1，仍NON-GREEN。实现早期213文件日志保留，不能冒充最终214文件结果。 新候选真实Mac尚待运行，静态/模型结果不等于实测修复。

恢复后的首个浏览器步骤必须按 `PROJECTS_MAC_ACCEPTANCE.md` 顶部先只跑文章真实用例，取得新只读见证/一次wheel/1500ms/新鲜final/下一章节；成功后再完整Projects315/生产85/一次性QA源Photos55/unit661。一时一suite、2 workers/0 retries及原预算保持，原始日志/trace/附件与SHA完整保留。旧raw没有新见证，不得补填或用模型序列取代。

产品沿已认可v14保持：桌面导航16/12px、手机12/9px、角色margin-top42px及实测46.146px留白；用户“舒服多了”的认可不扩大为其他视觉、真实内容、新素材或上线批准。三真实草稿、0公开Projects、标题“项目”、空态“项目正在整理。”、noindex、D-155 Photos及D-150阅读规则不变。 v15原native首错仍UNRESOLVED，v16的16契约通过不构成对旧失败的修复；首页900ms leave/新键盘交错仍未验，无leave用例通过不关闭它。原生UI 200%受Accessibility阻断仍未验证，不改权限、不借API/缩viewport或v13 partial；Cloudflare实际301、Safari、真实iOS及真实慢网仍未验。 当前无新的真实内容、新角色或部署授权；下方历史恢复说明按当时阶段理解。

本候选新鲜产物已实际核验：生产19页/67文件，67文件逐字节等于v16云端构建；5/5 HTTP/文件检查通过，未启动浏览器（port4373）。新mixed24页、source/seed不变；5详情/5资产/2正文图与8项非法HTML负例审计通过，147项/9spec仅--list。源258代码哈希、夹具255非合成项匹配；精确合成差异见 `execution/fragment-candidate-code-output-identity.json`，离线产物见 `execution/fragment-candidate-mixed-output-audit.json`，两者均相对 `_handoff/projects-evidence/`。

证据相对 `_handoff/projects-evidence/`：`mac-v16-runtime/Projects-v16-Mac-QA-report.json`、`mac-v16-runtime/controller-v16-raw-results-verification.json`、`execution/v16-fragment-history-diagnostic.json`、`execution/fragment-observer-implementation-report.json`、`execution/fragment-observer-review.json`、`execution/fragment-observer-protection-addendum.json`。

### 历史：v16测试观察候选冻结、Mac全套运行前状态（2026-10-04）

当前交接为v15之后的测试观察修正候选，真实浏览器验收PENDING，native同步UNRESOLVED。本候选基于Library v15输入；新保存版本以Library元数据和交接回执为准。v15输入身份见 `projects-evidence/focus-sync-library-receipt.json`：源码ID `libfile_0d03c46fad088191b0c936924828105b`，报告ID `libfile_f35bd25f1b28819182cc4e0e1bd20191`。原源码文件名 `baozi-space-D151-album-cloud-20261003T0602Z.tar.gz` 保持；文件名不代表当前实现阶段。新的归档大小、清单数与SHA仅由最终外部报告/实际回执记录，不预填新版本，不在归档内部嵌入自身SHA。

恢复到全新的独立、无.git目录，先逐项核manifest/checksums；不覆盖旧checkout、原v15归档、1357项输入、1012项历史handoff或首跑失败。v15 Mac正式优先19/20、Projects303/4/8（315项）、生产81/85与完整8错、native首错全部保留FAILED；Photos55/55、unit479/479是当时结果。所有原trace、8张失败PNG和失败ZIP继续保留。原生单次补采仅NOT REPRODUCED，不能改变这些结论。

当前产品src137/public28/scripts6与配置/锁逐字节等于已认可v14；8项测试修正已独立审查并全部固定SHA。六份说明另作版本记录。最新保护口径是780不变基线项+3原测试的原件/替换件精确哈希，不能说783全未改；范围来自最初v10基线，不扩大成所有历史文件跨版本不变。新源258代码哈希、mixed255非合成项相同；三原草稿替换、八合成Markdown和五资产的精确路径见 `projects-evidence/execution/combined-test-repairs-mixed-code-identity.json`。

已完成静态/产物：581/581单元（41文件），源码check189/0/0/2，严格TypeScript，生产19页/67文件及5/5 HTTP/文件检查；mixed24页和离线审计通过，147项/9spec仅加载。默认check213文件仍3个D-155历史错误/0警告/3hints，NON-GREEN；不修改旧文件或tsconfig隐藏。两组测试及保护补充审查均PASS，无未关闭P0–P3，不代表Mac验收通过。

实际补采三文件保持原名，现存 `projects-evidence/mac-v15-runtime/Projects-v15-native-contract-{observation.json,raw-observations.json,diagnostic-node-scripts.md}`，独立核验在 `projects-evidence/execution/native-v15-observation-review.json`。一次1 worker/0 retry的样本不能排除时序缺口；没有更改focus helper或契约。此前0测试加载失败与成功观察分开记录。

下一Mac按 `PROJECTS_MAC_ACCEPTANCE.md` 顶部本次程序执行：一次一个suite，2 workers/0 retries/原预算，先优先组，再完整Projects315/生产85/Photos55/unit581，以新--list核数。Photos runner必须从一次性QA源副本启动，先建立其 `_handoff/album-evidence`，结束后核正式源历史位置未改。旧900ms leave/键盘交错独立未解决；原生200%仍受Accessibility阻断且未验证，不改权限或借旧partial。真实材料、新角色与上线仍另批。下方旧阶段恢复路径、版本与“当前”均保留为历史，不直接复用。

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

## 历史：v12及v13首波回存前交接说明

2026-10-04 当前独立源为 Projects 实施快照，最新设计/执行入口是全站规范v2.9、Projects设计/计划、D-156、AGENTS与README。下方D-155及更早的“当前目录”、通过数和归档均保留为历史，不应作为本轮运行入口或结果。

输入为同ID源码Library libfile_0d03c46fad088191b0c936924828105b v10、实施报告 libfile_f35bd25f1b28819182cc4e0e1bd20191 v12；本轮已核795项输入清单。主执行者已回存完整代码/测试QA候选到同ID源码v12（source guard11），归档93,433,196bytes，SHA256 15b274058360e51b4cd77e3d0c8753b1612137674adb1109c5abf2962b66f80e，1165清单/1167归档文件。此v12是Mac精确被测的历史QA候选，现已取得局部运行测量/截图及返回双击失败trace；后续v13字号/双击修复候选的产品/测试已统一冻结，两项独立审查PASS/APPROVED；归档回存与新Mac复测仍待，不预填版本成功；文件名沿原Library身份保留，不因历史D151文件名误读为旧代码。最终交付版本/归档由实际回执记录，不预填。

Projects列表名称一档，其余简介/完整职责/分类/可选时间状态/列表图注统一正文另一档。页面h1、详情字号和D-150/D-155规则保持；桌面导航晚到反馈另授权13→16px/编号10→12px，手机12/9、品牌/h1/角色保持。原v12身份仅代表此前被冻结产品/测试；后续字号与返回修复已统一产品/测试freeze且两项独立代码审查通过；仍不做尚未打包回存的v13归档身份或最终浏览器通过声明。361单元、174文件显式源码check0/0/2、生产19页来自匹配冻结代码的实际日志。原始check仍有3个历史错误，不能宣称全check通过。正式生产0Projects/noindex；真实草稿、真实项目材料和新角色均未公开。用户视觉确认、真实材料迁移与上线另批，未commit/push/merge/deploy。

当前后续修复代码的实际日志：389/389单元（35文件）、176文件显式源码check0errors/0warnings/2原hints、生产19页、正式5项HTTP/产物5/5；原始check200文件仍3历史errors/0warnings/3hints。初轮新单元4个PostCSS类型错误及修正后日志均保留，只用Node/instanceof正确收窄，未改产品逻辑。静态保护783项通过；shell.css完整字节等于原基线仅两处桌面字值替换，手机/品牌/h1/角色及其他字节保持。新mixed与当前源242项非合成代码/测试/scripts/config/锁一致；5详情/5资产/2正文图/8最终HTML负例拒绝，mixed --list110项/6文件仅加载。v12五case的1200项比较仍是历史，本轮未重做五case。以上均不代表新Mac GREEN，v13实际归档/Library身份由主执行者后续回执确定。

恢复到新的独立、无.git目录，按当次包内manifest/checksums逐文件验证；不要重复应用旧patch，不覆盖原checkout或任何旧证据。包不应包含依赖、dist、缓存、环境文件或凭据。项目只使用Bun和冻结bun.lock，在独立QA根配置cache/临时目录；完整命令及Mac原生200%规范见PROJECTS_MAC_ACCEPTANCE.md。mixed运行完整Projects套件，其他四case只跑content/responsive/fallback/images，不误跑mixed导航。Photos runner必须从一次性QA源副本运行，先建_handoff/album-evidence，避免覆盖最终源旧fixture-location；主会话转述v12 Photos55/55与全站85/85，但完整原报告/日志未取得，不能写成已核对结果；后续候选仍须完整新Mac验收。

新证据在projects-evidence/，Task6报告明确区分正式产物、合成夹具、实际HTTP、浏览器及视觉pending。被测副本src/public/tests/scripts/config/锁须与冻结源逐项核对，合成内容/图片差异须精确列出；后续代码修复只能统一新freeze再重测，不能直接改Mac副本。Safari、真实iOS、真实慢网络未实测项保留。以下所有D-155及更早历史正文原样保留。

### 晚到范围变更与 v12 局部运行证据（2026-10-04 04:24:57Z）

用户在 Sentinel_c81caa2b437481918a4f5342201e170a 明确反馈“电脑端左侧的字体太小了看起来”。新增授权仅为桌面（≥768px）主导航文字13→16px、编号10→12px；手机（≤767px）文字12px/编号9px、品牌、页面h1及角色保持。此项专门覆盖此前“本次列表字级不改全站导航”的范围描述，不能再说当前导航字号完全原样。此为早期字号范围；05:32反馈增加默认角色margin，最新保护按两字号+一margin三处字节核对。

已取得并阅读v12实际测量JSON，查看桌面/手机列表截图：1440/390px列表名称32/22.4px，其余简介、职责、分类、状态和列表图注16px；手机figure与prose均314px，表格client314/scroll1298并到达最大984，证明该局部布局修正有真实运行依据。v12当时桌面导航仍13/10px，截图不是新16/12px后值，也不等于用户视觉批准。原返回双击失败trace已保留；返回修复独立审查Spec PASS/Quality APPROVED、无P0/P1/P2，定向42/42；新增16项回归及真实trace解码已核，真实Mac GREEN仍待。桌面字号独立审查同为PASS/APPROVED，最终四SHA已核，12/12专用单元与六项e2e加载通过，真实computed/像素仍待。

主会话转述v12原5+80全站85/85、Photos55/55；完整原报告和日志尚待取得，这里不把转述写成已核对的通过记录。另两类测试定位器/字体度量失败的原始记录未到，不能推断原因或写已修。Mac目前离线，后续v13候选产品/测试已统一冻结、两项修复独立代码审查通过；打包回存身份及真实浏览器复测仍待；不复用v12数值宣称新版全部通过。真实内容、新角色、用户视觉与上线仍分别另批。

# D-155 3:2取景与影集目录源码交接

当前执行目录 `/Users/al/Documents/Codex/2026-10-02/task/d155-cover-directory-20261003/source/spaceofbaozi` 是独立、无.git源码快照，从同ID源码Library `libfile_0d03c46fad088191b0c936924828105b` v9恢复。输入报告为同ID `libfile_f35bd25f1b28819182cc4e0e1bd20191` v11；输入归档53,008,629bytes，SHA256 `22a6a0d07e284407ffb2e1870526c9bc77884e537b6f5974352d6d3d8fb390f0`。输入清单 `input-v9-manifest.json` 记录685项；其内部input_library_version=8是D154构建该包时的输入历史，不应误读为本轮恢复版本。不要重复套旧补丁，不修改原checkout、D154及更早目录。

D155的目录三图和四组3:2取景已获正式确认，本轮功能验证与55项保护审计均已完成。当前入口：AGENTS、全站规范v2.8、相册设计v1.3、计划顶部D155、最新决策D155。新证据 `_handoff/d155-evidence/`；旧D154的136/80/47、42项审计与其他历史数字均不代表本轮结果。

## 当前参数与批准范围 · D-155

列表封面统一 3:2，`object-fit: cover`；默认中心取景，可选 `album.coverPosition: {x,y}` 使用百分比，仅作用于列表封面，不改变原图文件或 reader。封面继续无灰底、书脊、边框、硬阴影和书壳内衬。桌面 ≥768px 在内容纸内左侧放纵向影集名称，以短线标明当前项；纸内目录按视口宽度切换：>1050px为148px/间距28px，768–1050px为116px/间距20px。手机 ≤767px 以当前名称作为展开开关，展开完整名称列表，选择后关闭；键盘、焦点、Escape与resize均须可用。名称只横向定位图片，不打开影集或触发页面导航；手动横滚同步当前项。移除“挑一本”和图片下重复名称，保留控件及图片入口的可访问名称。

图片横轨桌面约1.6张/26px间距、总宽≤648.4px；封面宽≤384px，3:2推得高≤256px，不再沿用480px的4:5占位高。手机约1.4张/18px间距。轨道左右共8px留白保留，上限公式为`384 × 1.6 + 26 + 8 = 648.4px`；窄可用纸面先扣除栏目目录宽与间距，再同比缩小照片。全站左栏>1050px为300px、768–1050px为242px，维持原响应式。reader保持原照片比例、759/760px实际内容宽度单双页、顺序、hash、返回位置/焦点及已有轻淡入，不增加硬壳翻页。D-150手机文章隐藏全部阅读辅助的规则不变；这里的影集展开目录是Photos列表模块，不是文章阅读目录。

| 影集 | 已确认列表封面来源 | 列表取景位置 x/y |
| --- | --- | --- |
| upintheair | 同组云海 `AbPhjv4n5` | 50/100，居中靠底 |
| streetphotograph | 原封面 `EfSRCA4Bo` | 50/50，居中 |
| fukei | 同组摩天轮 `qO6lKLrnY` | 50/50，居中 |
| homestyle | 原封面 `zJhpksjx_` | 50/50，居中 |

该批准包含目录三张预览及四组具体3:2取景的开发集成，不等于线上发布。真实照片仍仅用于私有试排；私有选择记录由主执行者维护于 `design-assets/photos/d155-approved-cover-selections.json`，不迁移真实资产到public，不修改content批准字段或发布门禁；角色候选未批准、未接入，生产仍0公开相册/noindex。

本轮已完成结果及保护审计见文末，证据文件名按实际交付保留。文件清单及逐项校验见最终包内 `_handoff/manifest.json`、`_handoff/checksums.sha256`；输出版本/字节数/SHA256见同ID《实施与验证报告》（`libfile_f35bd25f1b28819182cc4e0e1bd20191`），不预填新版本，不把归档自身hash写进自身。

## D-154 输入与验收来源（历史，不代表 D-155）

D154当时在 `d154-direct-photos-20261003/source/spaceofbaozi` 执行，输入源码v8/报告v10、623项清单；其功能、42项保护审计和归档均属于D154，具体历史结果见下文。D155本轮从源码v9/报告v11恢复；不预填下一输出版本。

## D-153 输入与验收来源（历史）

D-153当时在 `d153-responsive-albums-20261003/source/spaceofbaozi` 执行，输入源码Library v7 / 报告v9，恢复清单549项。D-154使用上述v8/v10新输入，不将旧输入身份当作本轮身份。

## 历史来源（D-151 / D-152，不是 D-155 最终交付清单）

输入Library源码`libfile_0d03c46fad088191b0c936924828105b`版本6，报告`libfile_f35bd25f1b28819182cc4e0e1bd20191`版本8。输入源码`baozi-space-D151-album-cloud-20261003T0602Z.tar.gz`，27,193,257bytes，SHA256 `c9eea92dd8117cfe1f6404936d6ec093a2060ece9a098260b7db3aea4b6f97f4`；409文件、407项manifest核验成功。历史Git来源`cbc2fb6556dc97a9706f766f294be8ea1785e731`，当前是无.git的独立快照，本轮未查询远端。

历史D-151/D-152 Mac副本：`/Users/al/Documents/Codex/2026-10-02/task/d151-validation-20261003/source/spaceofbaozi`。这不是当前D-155执行目录；用户原checkout与旧副本均应保留。

## 运行

```sh
bun install --frozen-lockfile
bun run check
bun run test:unit
bun run build
PLAYWRIGHT_PREVIEW=1 PLAYWRIGHT_PORT=4371 bun run test:e2e --workers=2
bun scripts/photos/run-fixtures.ts
```

Bun1.4.2、Astro5.18.2、Playwright1.62.1、Mac独立Chromium151.0.7922.34。浏览器插件不可用，使用项目原Playwright。夹具runner在独立系统临时目录安装同一冻结依赖、生成明显合成图、构建和测试；不把node_modules跨root软链接，不污染原content/public。预览地址仅本机，不是线上。

## D-151 / D-152 历史实测结果（不可作为 D-155 验证）

- Astro139文件：0错误、0警告、2个既有hints；23文件128/128单元。
- 最终生产19页构建、80/80回归（1.3分钟）。
- 夹具25页构建，32/32检查（11.1秒；31浏览器+1HTTP，原30加2条取消拖动回归）。
- 360/390/768/1024/1280/1440/1920截图与测量；759/760实际reader阈值保留photo-b；无页面横向溢出。
- 原生浏览器200%缩放：extension tabs.getZoom=2、CDP page zoom=2、pinch scale=1，固定窗口下1920→960 CSS px、DPR1→2；双页转单页、photo-b保持、键盘翻页可用。
- 生产仍为0公开相册/noindex；public28文件原样，候选角色不在public。D150原保护集60项不变，唯一schema获批变化延续D151输入；相对本轮v6无保护文件变化。

首轮相册27/30、生产79/80的原日志和trace保留；修复两处实际产品问题：空白右页零高度，取消拖动吞下次控件点击。测试纠正点击准备自动滚动、媒体query事件送达、ResizeObserver时序和未批准角色缺省契约；无skip、无自动retry。最终结果均来自本次D151，不借旧D150通过数。

## 历史证据与仍有效的公开边界

D-151/D-152历史证据在`album-mac-evidence/`（相对本说明），含新日志、截图、真实缩放脚本与结果、输入及保护核验、Library截图身份。`album-evidence/`与`mac-d150-evidence/`是历史云端/D150记录，均不能代替D-155新结果。v6原清单备份、当前manifest/checksums及Mac差异patch一并提供。

截图仅隔离合成几何图，不是用户真实照片；新人物/嘉乐六姿态仍待批准与正式导出，未接入运行时。Safari/真实iOS原生手势未验。已知Minor：latestAlbumDate按编辑排序首册取日期，未来置顶旧册可能偏旧；当前0公开相册不受影响，本轮未修。未发布真实内容、未修改域名或部署设置。归档排除.git、依赖、构建目录、环境文件和凭据。


## D-153 功能验证（2026-10-03；历史，不代表 D-154）

- 136/136 单元（23 个文件）；Astro 检查 147 个文件，0 错误、0 警告、2 个既有 hints；生产 19 页构建、80/80 回归（1.3 分钟）；隔离夹具 25 页构建、47/47 检查（46 项浏览器 + 1 项 HTTP，19.4 秒）。
- `final-screenshot-checks.json`：20 项几何/无 JS 检查通过，`errors: []`。360/390/767/768/1024/1280/1440/1920/2560px 九档宽度 × 合成/私有试排两数据源，共 18 张几何截图；另两项为无 JS 检查，不应称作 20 张截图。
- 手机 1.4 本/18px、桌面 1.6 本/26px、4:5、桌面 480px 高与 648.4px rail 上限、名称导航同步收窄和全站左栏 300/242px 响应式均有实际测量。另有 2 张横幅封面选中截图。
- `real-browser-zoom-result.json`：原生浏览器 200% 缩放通过（API zoom=2、CSS zoom=1、pinch scale=1），含 1440→720 CSS px 跨断点、当前相册/照片保持及键盘操作；另有 3 张缩放截图。
- 返回列表保留原横/纵位置与焦点；只在封面实际被裁边时做最小横向校正，使边缘完整可见。原位恢复与几像素裁边露全两类回归均通过，新增 3 条可视边界单元。
- `final-copy-source-match.json`：合成和私有试排副本各 34 条运行/关键文件与最终源码逐项哈希一致，合计 68 条。原 checkout/保护文件另由 `protection-final.json` 完成独立审计，结果见下节。

证据将在源码归档的 `d153-evidence/`（相对本说明）中保留，沿用本地 `evidence/` 文件名：`unit-final.log`、`check-final.log`、`build-final.log`、`production-final.log`、`album-final.log`、`fixture-build-final.log`，以及上述三个 JSON 与对应截图。`album-netwidth-failure.log`、`padding-before.log` 及对应 trace/截图保留，明确记录修复前的失败；`*-before-padding.*` 属于中间态，不作为最终通过依据。原 D-151/D-152 证据不覆盖。

## D-153 最终保护审计（历史，不代表 D-154）

最终 `protection-final.json` 的 36 项静态保护检查全部通过：public 28 项、content 27 项、私有角色 17 项及 D-150 保护集 61 项均与 v7 一致；原两个 checkout 共 799 个已记录文件（181+618）逐文件及 Git HEAD/分支/状态一致。新生产输出 67 个文件、19 个 HTML 已核验，无私有试排照片、真实照片或未批准角色泄入，零公开相册/noindex 保持。

原 checkout 审计范围为 `checkouts-before.json` 记录的全部已跟踪和未忽略的未跟踪文件；忽略的缓存不在该文件指纹范围内。生产扫描针对新构建输出，确认 67 文件/19 HTML 的路径、字节和内容标记；它与上述浏览器/单元结果分别记录，不冒称静态审计执行过构建或浏览器。证据为 `d153-evidence/protection-final.json`（相对本说明），其 36 项检查均为 pass。

文件清单与逐项校验见包内 `_handoff/manifest.json`、`_handoff/checksums.sha256`；输出归档版本、字节数及 SHA256 以同 ID Library《实施与验证报告》（`libfile_f35bd25f1b28819182cc4e0e1bd20191`）为准，不在归档内部嵌入归档自身哈希，也不预填新的 Library 版本。

生产仍受零公开相册/noindex 门禁约束；真实照片只授权私有试排，候选角色未批准或接入生产。Safari/真实 iOS 原生手势仍未验；私有试排截图不可复制到 public，也不能当作已公开相册成果。


## D-154 验收与交付记录（历史，不代表 D-155）

D-154 本轮在用户 Mac 的独立 Chromium 完成 136/136 单元（23 个文件）；Astro 检查 150 个文件，0 错误、0 警告、2 个既有 hints；生产 19 页构建、80/80 回归（1.3 分钟）；隔离夹具 25 页构建、47/47 检查（46 项浏览器 + 1 项 HTTP，19.9 秒）。20 项几何/无 JS 检查通过（errors=[]），原生浏览器 200% 缩放通过，含 1440→720 CSS px 跨断点；合成及私有试排副本共 68 条运行/关键文件与最终源码哈希一致（各 34 条）。四张先行真实照片私有预览与最终正式 CSS 截图逐字节相同，`preview-final-match.json` 已核实，因此已有 Library 预览图片就是本轮最终视觉效果；这不构成照片公开批准。

本轮无壳照片、完整原比例、实际下缘和名称位置、不可见slot几何、无JS、键盘/返回/resize及reader行为均有新截图与测量。证据在 `d154-evidence/`（相对本说明），包括 `unit-final.log`、`check-final.log`、`build-final.log`、`production-final.log`、`album-final.log`、`fixture-build-final.log`、`final-screenshot-checks.json`、`real-browser-zoom-result.json`、`final-copy-source-match.json` 和 `preview-final-match.json`；不覆写历史目录。本轮最终 `protection-final.json` 为42/42通过：public28、content27、私有角色17、门禁5、锁文件/部署7及D-150保护61项均与v8一致；D-153历史证据68项内外均未改，原两个checkout共799文件（181+618）及Git HEAD/分支/状态一致。新生产67文件/19 HTML通过扫描，无真实照片、私有试排、候选角色或合成夹具泄露；`previous-source-unchanged.json`另核对318项旧正式src/public、旧私有预览及旧归档/报告指纹，全部不变。上述保护结果来自最终42项检查，不使用31项prebuild替代。证据为`d154-evidence/protection-final.json`与`d154-evidence/previous-source-unchanged.json`。原checkout指纹覆盖已跟踪和未忽略的未跟踪文件，不包含忽略缓存；静态审计和浏览器验证分别记录。

文件清单和逐项校验见最终包内 `_handoff/manifest.json`、`_handoff/checksums.sha256`；输出归档版本、字节数及SHA256以同ID Library《实施与验证报告》（`libfile_f35bd25f1b28819182cc4e0e1bd20191`）的实际输出记录为准，不预填新版本，不将归档自身哈希嵌入归档内部。照片公开批准、角色批准、Safari/真实iOS原生手势等未闭环事项继续保留；私有试排截图不进入public。


## D-155 当前验收与交付状态

D-155本轮已在用户Mac的独立Playwright Chromium完成：159/159单元（23文件）；Astro检查156文件、0错误0警告及2个既有hints；生产19页、零公开相册，最终全站80/80（第三轮，2.0分钟）；隔离相册55/55（保留原47项、新增8项，54浏览器+1HTTP，1.7分钟），夹具25页、私有预览20页。20项几何/无JS检查（九档宽度×两数据源及2项无JS）errors=[]、无整页横溢；原生200%缩放通过，含1440→720目录焦点/第四本保持及reader photo-b单双页、键盘回退。两副本199条源码哈希匹配，夹具另有150项src/测试一致性核对。三张已批准目录预览与最终截图逐字节一致，复用既有Library图片ID，不另造新预览。本轮静态与生产产物审计55/55通过：新生产67文件/19HTML无真实照片、私有资源或合成夹具泄露。public28、真实content25和其他模板1、角色17、锁文件/部署7、D-150保护61及历史handoff389（含D153证据68/D154证据57）均在规定保护范围内不变；两个原checkout799文件及Git状态一致，另326项旧正式源码/public、私有预览及归档/报告指纹不变。新证据在 `_handoff/d155-evidence/`；D154/D153旧结果仍作历史，本条通过数来自本轮最终运行。3:2取景、四组来源/coverPosition、纸内桌面目录/手机展开及键盘/Escape/resize、横轨几何、名称仅定位与reader原比例/单双页/hash/返回均已取得本轮证据。真实照片及私有取景配置未进入生产输出；归档身份按包内清单、外部报告与实际回执记录，不预填输出版本/自嵌归档哈希。

首轮全站78/80、第二轮79/80及相册两轮53/55的日志/trace全部保留，最终无自动重试。导航trace确认旧v9已有普通native.ready取消未被观察；最小修复仅观察DOMException AbortError，其他异常仍暴露，不更改导航设计、时长或D-150文章规则。两个既有导航测试分别改为真实后发点击gate和预先MutationObserver记录，修正定时/观察时序，不放宽完整页面断言。相册修复只恢复因断点隐藏而丢失的目录焦点；主动Tab、外部/空白点击会清除恢复意图，新增负例证明不抢焦点。第二轮相册失败是负例点击了可聚焦main，改成真实不可聚焦纸外目标后保留严格body焦点断言。

具体新证据（相对本说明均在`d155-evidence/`）：

- 总览 `verification-summary.json`；最终 `unit-final.log`、`check-final.log`、`build-final.log`、`production-final.log`、`album-final.log`、`fixture-build-final.log`、`private-preview-build.log`。
- 相册完整结果 `album-validation-summary.json`、`playwright-album-complete/.last-run.json`；原47项保留，新8项目录/焦点回归。
- 几何 `final-screenshot-checks.json`、原生缩放 `real-browser-zoom-result.json`；副本199项 `final-copy-source-match.json`、夹具150项 `fixture-runtime-parity.json`（隔离首页滚动spacer属于单独允许差异）。
- 已批准三图最终一致性 `approved-preview-final-match.json`，Library身份 `library-approved-previews.json`。继续复用 `directory-1440-closed.png`（`libfile_db578e6226a881919ec843c35a126972`）、`directory-390-closed.png`（`libfile_f58e3a6150788191a1e61bc611fe6acb`）、`directory-390-open.png`（`libfile_dd4babc237c48191a643670c51553473`）；都是私有评审图片，不构成公开照片批准。
- 最终保护 `protection-final.json`、旧来源核对 `previous-source-unchanged.json`；原checkout指纹覆盖已跟踪及未忽略的未跟踪文件，忽略缓存不在范围内。静态审计与浏览器/构建分别记录。
- 导航中间证据 `production-first.log`、`production-second.log`、`production-first-artifacts/`、`production-second-artifacts/`、`navigation-failure-diagnosis.json`、`navigation-ready-diagnostic/`、`production-second-diagnosis.json`。
- 相册中间证据 `album-first.log`、`album-second.log`、`album-before-body-target.log`、`playwright-album-first/`、`playwright-album-before-body-target/`；保留失败原因，不用最终通过覆盖历史。

