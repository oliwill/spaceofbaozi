## D-162 · 开场完整展示后，下一次有效下滚直接进入首页（2026-10-05）

用户06:50Z明确“触发机制是按往下滚动带来的…启动页展示完了以后下拉就应该直接进入首页”。此前压缩末段进度候选未被保存为权威源码；本轮从实际权威source24/report25及已接受三拍T出发，没有混入压缩映射。本轮视频已交用户，实际触控板手感与新视觉验收仍待用户；不重复要求确认已明确的设计。

采用Mac实际已测源码libfile_6a0fd392d9348191bf58183b3d193f02。315文件hash逐项匹配外层清单及最终验证记录。相对312项T只修改runtime和3份授权E2E，其余308项保持；新增desktopWheelGate、37项门控单元和9项E2E。整合后src/tests/public/scripts与最终Mac源码逐字节一致。原三拍helper、raw .972之前动作和位移、400vh轨道、布局、Home控制器、手机/lab、素材/Manifest、配置锁保持。runtime SHA6810b630e38c397015bc3cdd2c28d6d00d52aeb9efcff87b41cbfae1814b3be2；gate SHAf26956fe3b7c680f715f8d8eaf62d0e249e22a61f7ee1c10dc6d27e8edc79d5d。

桌面正式页由可信、无修饰、竖向主导的向下wheel到达.972，实际滚动位置pin到原完整末帧点，清理Lenis内部平滑余量，保留不透明点阵纸和人物/狗7/7。完整末帧绘制后再经下一RAF才armed。后续可取消的有效下滚与上一可信wheel观察间隔≥300ms时，同一事件内preventDefault/stopPropagation并执行原节点hold与enterHome；没有再走一段淡入滚距，经过时间本身不自动进入。Home仍在实际交接后保留原300ms控制就绪门禁。

连续wheel刷新间隔基准并保持等待；未修饰零delta保持等待。不可取消事件不能提交交接，观察到位移漂移后repin重画；不承诺其所有平台均无瞬时位移。向上wheel同次释放并回看；键盘滚动键、touchstart、pointerdown和非零横向/修饰wheel回到原T scrub。手机/lab仍走旧流程，所以不是所有输入设备都已采用新门控。resize/Home几何observer取消旧arm并重画后重arm；pinning guard防止同步onUpdate递归；skip/failure/abort原退出清理保留。

独立核验Mac原日志/JSON：815/815单元、48文件；最终53/53浏览器、7spec、2workers/0retry、0失败/跳过/flaky，原JSON开始07:17:43.894Z、耗时82.381617秒。Maccheck203/0错误/0警告/2旧hints、19页构建。首次53项的48通过/5失败因新测试误把奔跑atlas帧7当末帧，随后加强为正确atlas＋7/7；原1px和timeout未放宽，失败trace保留。首轮单元63通过/13RED、物理pin补测34/1、不可取消及零delta补测35/2均保留后转绿。原类型检查、预览端口、@编码404等过程失败未删除。

新云端相同源码815/815单元、源码check203文件/0错误/0警告/2hints、19页build均exit0。完整历史归档默认check233文件仍有3个D155旧错误，exit1 NON-GREEN，未改配置遮蔽。新门控与原保护79/79是其中定向口径，不与815叠加。未运行云浏览器或绕过预览限制。226份证据清单hash全部核验。

原事件记录显示：完整原纸7/7后6次连续4px事件（139.4–183.4ms间隔）及500ms暂停均保持等待；fresh可取消4px事件实际gap649.4ms，同eventId晚注册capture已见held和prevented，通知距输入0.7ms、首次Home观察2.3ms。首controls=true距输入301.6ms；首次8×2鼠标移动才释放held。人物/狗同节点、atlas、7/7帧保持，按Manifest锚点＋BCR的交接前后viewport ground差0。该数据是DOM/输入观察，不是屏幕呈现延迟、透明轮廓像素等价或额外测试PASS。

已实际查看原视频末帧、连续等待、进入Home及首次互动关键像素：完整站/坐姿与点阵纸保持，再出现Home，之后才响应首次互动。抽帧不等于逐帧视觉批准。录制为Mac已有独立Chromium及Playwright可信wheel，不是人手物理触控板；MP4保留1440×900/25fps及原PTS，无插帧/变速，兼容编码验证不等于真实手机播放验收。

300ms是保守启发式，不是物理手势ID：快速第二拨可能被合并，迟到惯性包可能被判为新拨。实体Mac触控板惯性、原生滚动条是否派发pointerdown、非整数像素/缩放pin量化仍未实测；没有这些问题的当前复现。交接事件后OS后续wheel仍沿原Home滚动，没有新增全局尾流锁。Safari、实体iPhone/触摸、实际BFCache persisted、原生200%、Home旧900ms leave/键盘竞态、其他栏目历史失败及3个归档check错误仍未关闭。没有commit/push/合并/部署、域名或原checkout改动，无真实内容/新素材发布授权。

本轮证据libfile_1e9dc0f9b97c8191a69446c75b507fbb，详细报告libfile_4a964a544f2881919a9bce569a60e2af，完整MP4 libfile_b812d31684248191b7b13c71b7d754a7，尾段libfile_032a5ef965e08191a84ef62af19f0918。原ZIP/清单/报告、新云验证及保护记录保存在_handoff/startup-next-scroll-final/；被替代的压缩候选证据另标superseded保留，仅作历史，不采用其产品代码。旧QA v4不替换为当前已测身份。保存版本只认Library回执；以下完整历史原文保留对应阶段事实。


## D-161 · 桌面三拍整体收尾：已测代码整合，视觉选择待用户（2026-10-05）

用户于03:41Z批准“人物起身整理＋嘉乐小步靠近；人物站稳＋嘉乐停步抬头；嘉乐坐下、共同停稳后进入首页”，04:57Z允许限额恢复后继续。此为实施授权，不是对最终视频的视觉验收。新完整视频与不变速高质量尾段已交用户，尚待看片意见。本节取代前文D-160右跑版本作为当前实现；历史验证与失败记录全部保留。

来源为本机独立候选libfile_76d48d8f31dc8191844697f4a84a87f3。312个源码文件逐项匹配外层清单及最终验证hash。以权威源码v23为基线，只同步runtime.ts、两份专属返程测试，并新增17行desktopEnding.ts。其余308项本机输入保持；整合后src/tests/public/scripts逐字节等于实际Mac测试源码。没有新的layout/CSS/锚点修改；Home首次互动、手机/lab、共享timeline、图集/Manifest、配置锁保持。旧QA v4仍是未在Mac下载成功的历史候选，不将其替换或记作当前已测包。

当前桌面production共同编排仍由滚动进度决定：.91–.932人物原跪起4；.932–.944扶帽5、嘉乐原settle小步0出现；.944–.95整理6＋小步1；.95–.956整理6＋刹车2；.956–.963人物站姿7＋狗抬头3；.963–.972狗坐下6；.972–.98双方末帧7共同停稳；.98–1沿原纸面显现、原节点持姿交接。嘉乐从落点左0.10狗宽向右靠近，.932–.938渐显，.956后位置固定。省略settle的4/5姿态，不再使用chase奔跑循环；不新增转身帧、计时器或固定倍速。

独立核验：Mac原全单元日志与exit0记录SHA一致，778/778、47文件；原始浏览器JSON 44/44，0失败/跳过/flaky，2workers、0retry、30秒test，05:05:40.681Z开始。原41项浏览器测试未改，新3项覆盖三拍与手机保护。Mac源码check200/0错误/0警告/2旧hints，19页/68产物。单元RED21失败/5保护通过及浏览器RED2失败/1手机保护通过原件保留。

云端对相同最终代码新跑778/778单元，源码check200文件/0错误/0警告/2hints、19页build均exit0。完整历史归档默认check230文件仍有3个D155旧错误，exit1 NON-GREEN，未改配置遮蔽。没有云浏览器运行或绕过预览限制。独立代码review未发现阻断，但这不等于动作自然度获批。

已实际查看最终matched原片抽帧：蹲姿旁嘉乐头部可辨，身体局部受腿遮挡；整理/靠近后共同站稳抬头，再后躯落座并保持末帧。所看帧未见明显逆向翻转、坐姿横移或双影；3→6仍是原图集离散轮廓切换，未新增过渡画帧。抽帧与约12Hz DOM记录不能冒充完整逐帧或固定秒数的视觉验收。最终自然度由用户判断。

主片是Mac已有Chromium独立headless会话的Playwright真实wheel/mouse输入，不是手动操作。首份有窗口视频混入计划外指针/额外滚轮，第二份隔离视频滚轮比例不同，均原样保留，仅最终matched片用于当前演示。主片仅校准录制wheel命令，产品代码未因录制改变。初次低质量尾段编码不采用，其原件保留；交付HQ版不变速、无插帧，属于高质量重编码而非无损。另两次工具参数/路径错误记录也保留，不混称产品失败。

本轮没有新增手机完整录屏。Safari、真实iPhone/触摸、实际BFCache persisted命中、原生200%、Home旧900ms leave/后续键盘竞态、其他栏目历史失败及3个归档check错误仍未关闭。没有commit/push/合并/部署、域名或原checkout改动，无新素材或真实内容发布授权。

原证据libfile_77ee8aebd33881919c886626ba2b38b2；本机详细报告libfile_a49503402fb48191adbb4d4285edc058；完整主片libfile_df6f05c20668819185dd94e5258ac64e；HQ尾段libfile_4c8b100ca4c48191abeffb12eea89291。原证据ZIP、源清单、报告、新云端验证及保护核验保存于_handoff/startup-three-beat-final/。保存版本仅认Library实际回执；以下完整历史原文保留各阶段事实。


## D-160 · 桌面嘉乐同向短跑归位：最终本机源码选择性整合（2026-10-05）

当前采用用户于2026-10-05 01:51Z明确回复“可以”的方案：嘉乐从原落点左侧短距离向右跑到位，再原地抬头坐下，始终同向。此为实施授权，不是对最终视频的视觉认可；02:22Z尾段视频已交用户，最终视觉意见尚待回复。此前D-159左向奔跑再切回右向坐姿的方案及未下载成功的云QA v4均属历史，不是本次实测代码。

实际采用本机独立实现，来自已验证candidate3分支，最终源码libfile_35f9da24cd008191852e32c3c2fd535d；311个源文件与外层LOCAL_SOURCE_MANIFEST及最终验证hash记录逐项一致，runtime SHA256为2358fa12cd6c75cd98518784c8bbec6670a5674a4a0faa8f864a7f167160aade。本大归档以v22为底，只选择性同步6个代码/测试文件：runtime.ts、恢复原timeline.ts及其runtime/timeline原单元、新desktopDogReturn.test.ts、intro-dog-return.spec.ts；未整包覆盖旧证据。产品src、全部tests、public、scripts与实际Mac最终源码逐字节一致，配置/锁未改。历史说明保留并由本节覆盖其当前状态含义。

桌面生产路径：.94–.955隐藏嘉乐，.955–.97从落点左侧0.10狗宽向右ease-out，.955–.958渐显；原奔跑8帧依行进比例0–7播放，不倒播、不循环回0、不镜像。.97后固定原尺寸/地面锚点播放原settle，再以原节点末帧进入held。精细采样可见路程14.007538px，地面X无倒退，最后跑帧至首settle地面差0.002190px；这些是DOM采样，不是逐帧像素等价。Home首次互动、手机/lab旧路径、版式、图集/Manifest均不改。

独立核验原始Mac JSON：最终769/769单元、47文件；正式44/44 Chromium用例，0失败/跳过/flaky、每项一次、2workers/0retry、30秒test预算，首轮始于02:08:27.579Z。原Intro/Home/交接/held/故障覆盖保留，新增3项返程测试包括390px默认路径。Mac源码check199文件/0错误/0警告/2既有hints，生产19页；测试期间311源文件不变。首次RED、实现中失败、原左返程失败与下载阻断不改判或删除。

云端对最终相同代码新跑769/769单元，源码check199/0错误/0警告/2hints，19页build通过。完整历史归档默认check229文件仍有3个D155旧错误，exit1 NON-GREEN：两个旧fixture导入缺失、一个photo隐式any；未改tsconfig遮蔽。云端首次telemetry目录缺失，以及依赖软链接造成Astro缓存路径失败、复制依赖后的.bin入口失败均保留；改用本地依赖的原Astro CLI构建成功。未在云端运行浏览器或绕过本地预览限制。

已实际查看最终视频抽帧的返场、奔跑、settle和held像素：所查看帧中狗保持向右，未见此前明显镜像反转/坐姿横滑/双狗；奔跑到抬头坐下有小幅原素材姿态变化。此抽帧审阅不等于完整视频逐帧批准。末段至首held原人物/狗节点、图集、帧、尺寸不变；残余wheel期间held相对Home目标保持，视口Y仍随页面移动12px，不应称全程固定视口坐标。一次真实pointermove才释放原Home互动。

本轮未新录移动端视频；390px是桌面Chromium窄屏模拟，不是实体iPhone/真实触摸。Safari、真实BFCache persisted命中、原生200%、历史健康Home900ms leave/键盘竞态、其他栏目失败及3个旧归档check错误仍未关闭。最终视觉确认尚待用户，未commit/push/合并/部署、域名变更或批准发布真实内容/新素材。

最终证据包libfile_b5241c6ce6288191acd37ed84c9bcce3；完整录屏libfile_1aefe2eb3acc8191ac4ab63f2efd1126；尾段libfile_3faea5d3edcc81918eb53e3d2014d902；跑步图libfile_9050701a938881919e442b43c868eb01；停步图libfile_f43426a0e09881919c5e8b5fdfd5a665。原证据ZIP和本机清单、云端新验证及选择性文件hash保存在_handoff/startup-right-return-final/。保存版本只以Library实际回执为准；下方完整历史原文只代表对应阶段。


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

# Repository Guidelines

## 当前 Projects 实施与 QA 候选 · D-156（2026-10-04）

<!-- dispatch-timing-candidate:start -->
### 当前：v17文章首跑失败与最小调度候选冻结，Mac复验暂停（2026-10-04）

本轮只继承D-156已授权测试修正，不新增产品/视觉决策。输入为实际Library源码/报告同为v17，下一回存以guard 17开始；新保存版本只认未来Library实际元数据和回执，不预称v18或已保存。

本次实现限定Node调度：在已接纳的原真实click见证到达后，只启动一次原正文mouse.move(1000,500)；原两次前进RAF gate和同一个move成功join之后，才单次真实wheel(0,-500)，移除关键链路中的陈旧post-move read。目录ol的data-lenis-prevent必须保留，不能省略正文move而在目录上滚轮。browser rules、collector及记录/发送频率、原createOneShotInput、旧单元/e2e、Home观察、产品/配置/锁、阈值与预算均保持；仅允许本次调度与必要新增wire单元。

调度实现必须保留click API最终成功要求，并在失败、navigation、close/crash、finish、deadline或取消后停止尚未发出的输入；陈旧或重复信号不得复活试验。新wire单元须覆盖move/gate两种顺序、原click成功/拒绝、错误source/frame/token/document、终止与挂起清理、无post-move read及实际wheel严格失败；原规则负例不改。

v17首次唯一文章用例实际为0通过/1失败/0跳过，0 retry，完整套件未启动。初始fragment见证及两次前进RAF gate已取得，gate时349.1ms；到773.9ms标题top=298.796875，原窗口规则判FAILED。真实wheel命令与事件均为0；1500ms、fresh final和下一章节未执行。两JSON、trace ZIP和实际注入collector/源身份已核验；原始FAILED不改判。

client trace的mouse.move为284.935ms，后续read为16.610ms；server trace对应267.894ms与4.872ms，属于不同测量层，不混算。read仅采到seq35/top306.796875，回到Node前窗口已失效。长move与358.7ms RAF间隙的根因未证实，不能据此宣称产品缺陷或新调度必然成功。

用户于2026-10-04 14:19:55Z要求先完成启动页及启动页到首页衔接。本快照静态/代码候选完成，Mac文章/Projects复验暂停；后续由主任务完成启动页及开场→首页演示，恢复本栏目验收需主任务安排。现有Mac命令仅保留为恢复参考，不是立刻启动指令。 当前候选已冻结。独立代码审查PASS_CODE_AND_MODELED_WIRE_ONLY及保护增量PASS，无未关闭P0–P3。新增41项wire模型单元，加原154项共195/195；全单元702/702（42文件），严格TypeScript exit0。独立审查另195/195、TS0和28项额外探针，探针单列不加入Vitest数量；模型不执行浏览器collector，不是真实输入。源码check190文件/0错误/0警告/2旧hints；最终默认check218文件/3个历史错误/0警告/3hints，exit1，仍NON-GREEN。初跑217文件/5hints含两个新证据脚本未用项，清理后重跑，原日志保留。新生产19页/67文件逐字节等于v17，HTTP/产物5/5；新mixed24页、source/seed不变，5详情/5资产/2正文图和8个非法HTML负例通过，147项/9spec仅--list。源259项（含3草稿）、256非合成项哈希匹配。正式保护为780不变基线项、3原spec原件/替换件精确哈希及9测试pin；8项runtime负例与2缺pin/1缺review声明负例分层通过。新Mac仍未验；旧候选154/661与历史check/build不作本候选结果。

主任务安排恢复本栏目验收后，Mac仍先只跑原唯一文章用例：使用下方同一未加首尾锚点的精确中文grep，并以--list核为1；配置2 workers、0 retries、一次一个suite、原30秒test/5秒expect及专项预算不变。实际fragment见证、原gate、唯一真实wheel、完整1500ms、fresh final与下一章节全部通过后，才跑完整Projects315、生产85、一次性QA源Photos55及实际全单元702；优先用例不重复计入全套，失败则保留证据回报，不现场改源。

v16完整实测Projects307/0/8（315项）、生产84/1（85项）、Photos55/55、unit581/581仅属v16；v15原native首错仍UNRESOLVED，Home旧900ms leave与新键盘交错仍未验，原生UI 200%因Accessibility受阻仍未验。禁止改权限、借v13 partial或以API/缩viewport替代；Cloudflare实际301、Safari、真实iOS及真实慢网仍未验。

已认可v14视觉保持：桌面导航16/12px、手机12/9px、默认角色margin-top42px及实测46.146px留白；手机角色25px、reading桌面26px与原素材保持。三份真实草稿、0公开Projects、标题“项目”、空态“项目正在整理。”、noindex、D-155 Photos与D-150阅读规则不变。没有真实内容、新角色或部署批准，不提交、push、合并、部署或切域名。

本节证据相对`_handoff/projects-evidence/`：`mac-v17-runtime/controller-v17-first-run-verification.json`、`execution/v17-window-diagnostic.json`、`execution/v17-dispatch-fix-design.json`、`execution/v17-dispatch-design-review.json`、`fragment-observer-library-receipt.json`。实现与精确范围证据为`execution/v17-dispatch-implementation-report.json`、`execution/v17-dispatch-range-audit.json`；独立审查为`execution/dispatch-timing-code-review.json`与`execution/dispatch-timing-protection-addendum.json`；新产物为`execution/dispatch-candidate-code-output-identity.json`、`execution/dispatch-candidate-mixed-output-audit.json`，正式保护为`execution/task-6-protection-audit.json`。

本节覆盖下方历史段落中的“当前/本候选/下一Mac”称谓与旧执行顺序。下方原文逐字节保留，只代表各自当时的版本和验证范围，不追改历史FAILED，也不把历史通过数当作本候选结果。

<!-- dispatch-timing-candidate:end -->

### 当前：v16已完成实测，文章fragment观察修正候选待Mac复验（2026-10-04）

冻结范围从Library v16输入起算：只允许已审查的文章观察helper与其单元两个测试文件及说明/证据增量；产品、全部e2e spec、另6个测试pin、配置/锁、实际wheel、gate、1500ms、阈值/timeout/retry均保持。只读新见证来自真实 `event.state === null`、原可信click的live eventPhase/currentTarget/defaultPrevented、完整非fragment URL及节点identity；只在初始fragment准备阶段接受严格有序且唯一的native pop/可选native标题focus，恢复可在await后发生，不强求仍在同一dispatch。准备关闭后不得重新开启；未知、缺失、错误、陈旧、重复、异步history及真实平滑开始后/滚轮后标题focus继续拒绝。

v16正式Mac记录保留为：优先24项23/1/0，Projects315项307/0/8，生产85项84/1/0，Photos55/55、单元581/581；顺序为通过/失败/跳过。两次文章失败均未到wheel、1500ms、最终或下一章节，不改判。旧raw没有新见证，模型GREEN不能成为实测通过；attachment中的testStatus只是截取时刻，不能覆盖最终FAILED或误读旧stack为Home失败。

独立代码与保护增量审查PASS，无未关闭P0–P3；本候选定向154/154、全单元661/661（41文件）、严格TypeScript通过；另16项实际Playwright转换后的collector/mock-DOM探针通过，独立计数且不代表浏览器。源码check189文件/0错误/0警告/2旧hints；主执行者最新默认check214文件/3个D-155历史错误/0警告/3旧hints、exit1，仍NON-GREEN。实现早期213文件日志保留，不能冒充最终214文件结果。 保护口径仍为780不变基线项+3原spec原件/替换件精确哈希+8测试pin。原v16 audit JSON原件另存，当前重生成审计不是它的逐字节原件。

产品沿已认可v14保持：桌面导航16/12px、手机12/9px、角色margin-top42px及实测46.146px留白；用户“舒服多了”的认可不扩大为其他视觉、真实内容、新素材或上线批准。三真实草稿、0公开Projects、标题“项目”、空态“项目正在整理。”、noindex、D-155 Photos及D-150阅读规则不变。

下一Mac首先只运行原文章真实输入用例（可另做observer负例契约，无重试），实际见证/gate/单次wheel/1500ms/新鲜final/下一章节全部通过后，才完整Projects315、生产85、一次性QA源Photos55及单元661。一次一个suite，配置2 workers、0 retries、30秒/5秒原预算；禁止假时钟、synthetic wheel、force focus、skip或延长timeout。失败则留存并回报，不在Mac临时改源。Photos runner不得从最终源根运行。

v15原native首错仍UNRESOLVED，v16的16契约通过不构成对旧失败的修复；首页900ms leave/新键盘交错仍未验，无leave用例通过不关闭它。原生UI 200%受Accessibility阻断仍未验证，不改权限、不借API/缩viewport或v13 partial；Cloudflare实际301、Safari、真实iOS及真实慢网仍未验。 新Library版本只认实际元数据/回执；不提交、push、合并、部署或放宽发布门禁。下方此前“当前”正文原样留作历史。

本候选新鲜产物已实际核验：生产19页/67文件，67文件逐字节等于v16云端构建；5/5 HTTP/文件检查通过，未启动浏览器（port4373）。新mixed24页、source/seed不变；5详情/5资产/2正文图与8项非法HTML负例审计通过，147项/9spec仅--list。源258代码哈希、夹具255非合成项匹配；精确合成差异见 `execution/fragment-candidate-code-output-identity.json`，离线产物见 `execution/fragment-candidate-mixed-output-audit.json`，两者均相对 `_handoff/projects-evidence/`。

证据相对 `_handoff/projects-evidence/`：`mac-v16-runtime/Projects-v16-Mac-QA-report.json`、`mac-v16-runtime/controller-v16-raw-results-verification.json`、`execution/v16-fragment-history-diagnostic.json`、`execution/fragment-observer-implementation-report.json`、`execution/fragment-observer-review.json`、`execution/fragment-observer-protection-addendum.json`。

### 历史：v16测试观察候选冻结、Mac全套运行前状态（2026-10-04）

冻结边界：以Library v15为测试修正起点，只允许已审查的8个测试文件及本次说明/证据更新；不猜测修复native同步，不改产品计时器或视觉。src137、public28、scripts6及配置/锁与已认可v14相同。保留桌面16/12、手机12/9、角色margin-top42、46.146px已测留白和用户“舒服多了”的认可；三真实草稿、0公开Projects/noindex、D-155 Photos与D-150阅读契约保持。

验收状态不得改写：v15优先19/20（native首错仍FAILED）、Projects303通过/4失败/8跳过（315项）、生产81/85、Photos55/55、unit479/479。单次native补采1 worker/0 retry仅NOT REPRODUCED；15条样本、6嵌入脚本及冻结导入已独立核对，观察可能改变时序，不能排除未采样间隙。native同步继续UNRESOLVED，原focus helper/readiness/contract无变化。首页900ms旧leave计时器是否覆盖新键盘目标另属未解决诊断/UX问题，新的无leave测试没有修复产品计时器。

当前静态证据：两组测试修正及保护补充审查PASS，无未关闭P0–P3；581/581单元（41文件），定向28/74及严格TypeScript通过；源码check189/0错误/0警告/2旧hints。默认check213/3历史错误/0警告/3hints仍非绿色，不改历史证据或根tsconfig掩盖。生产19页/67文件、5/5 HTTP/文件审计；mixed24页、147项/9spec仅加载。保护为780不变基线项+3个原测试原件/替换件哈希，8测试全部固定，12+25保护负例通过。

下一Mac运行一次只启动一个suite，2 workers、0 retries，维持30秒和全部原阈值；优先native契约、原四reflow与四修正观察用例，再跑完整矩阵。不得用定向成功抵消首错或代替全套。Photos runner只在一次性QA源副本运行，避免覆盖历史fixture-location。原生200%受Accessibility阻断仍未验，不改权限、不借旧partial；真实内容、新角色、上线另批。本候选基于Library v15输入；新保存版本以Library元数据和交接回执为准。旧节中的阶段状态仅供历史追溯。

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

## 当前相册执行覆盖（2026-10-03 / D-155）

用户已以“OK 可以的”正式确认目录与四组取景一起开发；当前依据为D-155、相册设计v1.3、全站规范v2.8和相册计划顶部D-155阶段，无需重复批准。列表封面统一 3:2，`object-fit: cover`；默认中心取景，可选 `album.coverPosition: {x,y}` 使用百分比，仅作用于列表封面，不改变原图文件或 reader。封面继续无灰底、书脊、边框、硬阴影和书壳内衬。本条覆盖D-154的4:5/contain占位、顶部横排名称与下方重复名，保留直接照片的简洁视觉。

桌面 ≥768px 在内容纸内左侧放纵向影集名称，以短线标明当前项；纸内目录按视口宽度切换：>1050px为148px/间距28px，768–1050px为116px/间距20px。手机 ≤767px 以当前名称作为展开开关，展开完整名称列表，选择后关闭；键盘、焦点、Escape与resize均须可用。名称只横向定位图片，不打开影集或触发页面导航；手动横滚同步当前项。移除“挑一本”和图片下重复名称，保留控件及图片入口的可访问名称。

图片横轨桌面约1.6张/26px间距、总宽≤648.4px；封面宽≤384px，3:2推得高≤256px，不再沿用480px的4:5占位高。手机约1.4张/18px间距。轨道左右共8px留白保留，上限公式为`384 × 1.6 + 26 + 8 = 648.4px`；窄可用纸面先扣除栏目目录宽与间距，再同比缩小照片。全站左栏>1050px为300px、768–1050px为242px，维持原响应式。

四组已确认：upintheair同组云海`AbPhjv4n5`，50/100靠底；streetphotograph原`EfSRCA4Bo`、fukei同组摩天轮`qO6lKLrnY`、homestyle原`zJhpksjx_`均50/50居中。该批准包含目录三张预览及四组具体3:2取景的开发集成，不等于线上发布。真实照片仍仅用于私有试排；私有选择记录由主执行者维护于 `design-assets/photos/d155-approved-cover-selections.json`，不迁移真实资产到public，不修改content批准字段或发布门禁；角色候选未批准、未接入，生产仍0公开相册/noindex。

reader保持原照片比例、759/760px实际内容宽度单双页、顺序、hash、返回位置/焦点及已有轻淡入，不增加硬壳翻页。D-150手机文章隐藏全部阅读辅助的规则不变；这里的影集展开目录是Photos列表模块，不是文章阅读目录。

D-155本轮已在用户Mac的独立Playwright Chromium完成：159/159单元（23文件）；Astro检查156文件、0错误0警告及2个既有hints；生产19页、零公开相册，最终全站80/80（第三轮，2.0分钟）；隔离相册55/55（保留原47项、新增8项，54浏览器+1HTTP，1.7分钟），夹具25页、私有预览20页。20项几何/无JS检查（九档宽度×两数据源及2项无JS）errors=[]、无整页横溢；原生200%缩放通过，含1440→720目录焦点/第四本保持及reader photo-b单双页、键盘回退。两副本199条源码哈希匹配，夹具另有150项src/测试一致性核对。三张已批准目录预览与最终截图逐字节一致，复用既有Library图片ID，不另造新预览。本轮静态与生产产物审计55/55通过：新生产67文件/19HTML无真实照片、私有资源或合成夹具泄露。public28、真实content25和其他模板1、角色17、锁文件/部署7、D-150保护61及历史handoff389（含D153证据68/D154证据57）均在规定保护范围内不变；两个原checkout799文件及Git状态一致，另326项旧正式源码/public、私有预览及归档/报告指纹不变。新证据在 `_handoff/d155-evidence/`；D154/D153旧结果仍作历史，本条通过数来自本轮最终运行。首轮全站78/80、第二轮79/80及相册两轮53/55的日志/trace全部保留，最终无自动重试。导航trace确认旧v9已有普通native.ready取消未被观察；最小修复仅观察DOMException AbortError，其他异常仍暴露，不更改导航设计、时长或D-150文章规则。两个既有导航测试分别改为真实后发点击gate和预先MutationObserver记录，修正定时/观察时序，不放宽完整页面断言。相册修复只恢复因断点隐藏而丢失的目录焦点；主动Tab、外部/空白点击会清除恢复意图，新增负例证明不抢焦点。第二轮相册失败是负例点击了可聚焦main，改成真实不可聚焦纸外目标后保留严格body焦点断言。只在新d155独立快照工作，不提交、push、合并、部署或修改旧checkout。

## D-154 直接照片与验证记录（历史，由 D-155 覆盖列表取景和目录）

用户已正式确认“直接照片，比例用于空间，不画书壳”。当时依据为 D-154、相册设计 v1.2、全站规范 v2.7 与相册计划顶部 D-154 阶段，无需重复批准。列表直接展示完整比例照片：移除封面灰底、边框、硬阴影、所有书脊（含伪元素）和书壳内衬 padding；4:5 只作为不可见布局槽（slot），不画框、不把照片裁成 4:5。照片 `object-fit: contain`、`object-position: center bottom`，以照片实际下缘对齐，名称在下方。

沿用 D-153 的空间节奏：手机 ≤767px 约 1.4 个位置、18px 间距；桌面 ≥768px 约 1.6 个位置、26px 间距，slot 高≤480px、宽≤384px，rail 总宽≤648.4px（`480 × 0.8 × 1.6 + 26 + 8`）。轨道左右共 8px 是既有滚动留白，不是被移除的书壳内衬。窄纸面按比例缩小不可见 slot；名称导航随 rail 收窄，全站左栏仍 >1050px 为 300px、768–1050px 为 242px。照片实际长宽与露出面积随原图比例变化，不能为了凑 1.4/1.6 而裁图。

已有轻淡入足够，不增加硬壳翻页或翻书表演；reader 的单双页、翻页、hash、返回位置/焦点和现有动效不改。真实照片仅授权私有试排，角色候选尚未批准或接入生产；生产保持 0 公开相册/noindex。D-154 本轮在用户 Mac 的独立 Chromium 完成 136/136 单元（23 个文件）；Astro 检查 150 个文件，0 错误、0 警告、2 个既有 hints；生产 19 页构建、80/80 回归（1.3 分钟）；隔离夹具 25 页构建、47/47 检查（46 项浏览器 + 1 项 HTTP，19.9 秒）。20 项几何/无 JS 检查通过（errors=[]），原生浏览器 200% 缩放通过，含 1440→720 CSS px 跨断点；合成及私有试排副本共 68 条运行/关键文件与最终源码哈希一致（各 34 条）。四张先行真实照片私有预览与最终正式 CSS 截图逐字节相同，`preview-final-match.json` 已核实，因此已有 Library 预览图片就是本轮最终视觉效果；这不构成照片公开批准。 新证据在 `_handoff/d154-evidence/`；本轮最终 `protection-final.json` 为42/42通过：public28、content27、私有角色17、门禁5、锁文件/部署7及D-150保护61项均与v8一致；D-153历史证据68项内外均未改，原两个checkout共799文件（181+618）及Git HEAD/分支/状态一致。新生产67文件/19 HTML通过扫描，无真实照片、私有试排、候选角色或合成夹具泄露；`previous-source-unchanged.json`另核对318项旧正式src/public、旧私有预览及旧归档/报告指纹，全部不变。输出归档版本与SHA256沿包内清单/同ID实施报告记录，不将归档自身哈希写入自身。下方 D-153 的同名数字与保护审计仍只代表历史，本条结果来自本轮新运行。本轮只操作新的独立快照，不提交、push、合并、部署或修改旧 checkout。

## D-153 响应式与验证记录（历史，书壳视觉由 D-154 覆盖）

D-153 当时的 Photos 依据为 D-153、`docs/design/baozi-space-album-design-v1.md` v1.1 与 `docs/plans/2026-10-03-baozi-space-album.md` 的 D-153 阶段。用户已正式确认手机约 1.4 本、桌面约 1.6 本的封面比例，无需重复批准。≤767px 使用 1.4 本和 18px 间距；≥768px 使用 1.6 本、26px 间距及 4:5 封面，封面高度上限 480px、宽度上限 384px。桌面封面轨道总宽上限为 `480 × 0.8 × 1.6 + 26 + 8 = 648.4px`，8px 是轨道左右总内边距；名称导航与轨道同步收窄。可用纸面不足时，轨道与封面按同一比例规则缩小，不能只压高度改变封面形状。保留全站左栏原响应式：宽桌面（>1050px）300px，768–1050px为242px；不把收窄封面轨道当作改动全站左栏。

D-153 覆盖 D-152 全端 1.2 本与更早 D-151 1.8 本比例，其余名称定位、完整照片比例、单双页、稳定 hash、本次访问返回恢复和内容门禁继续有效。角色候选尚未批准；真实照片仅用于私有试排，没有授权迁入生产内容或 public。生产保持零已批准相册与 noindex 空态。

D-153 已在用户 Mac 的独立 Chromium 完成本轮验证：136/136 单元（23 个文件）；Astro 检查 147 个文件，0 错误、0 警告、2 个既有 hints；生产 19 页构建、80/80 回归（1.3 分钟）；隔离夹具 25 页构建、47/47 检查（46 项浏览器 + 1 项 HTTP，19.4 秒）。20 项几何/无 JS 检查通过（errors=[]），原生浏览器 200% 缩放通过，包含 1440→720 CSS px 跨断点；返回保留原位与实际裁边露全两类回归均通过。合成及私有试排副本与最终源码共 68 条关键文件哈希核对一致（各 34 条）。新证据在 `_handoff/d153-evidence/`；旧 `_handoff/album-mac-evidence/` 的 128/80/32 仅属 D-151/D-152 历史。最终 `protection-final.json` 的 36 项静态保护检查全部通过：public 28 项、content 27 项、私有角色 17 项及 D-150 保护集 61 项均与 v7 一致；原两个 checkout 共 799 个已记录文件（181+618）逐文件及 Git HEAD/分支/状态一致。新生产输出 67 个文件、19 个 HTML 已核验，无私有试排照片、真实照片或未批准角色泄入，零公开相册/noindex 保持。归档交付标识按 `_handoff/RESTORE.md` 指向包内清单及同 ID 实施报告。只在本次独立快照继续工作，不提交、push、合并、部署或切域名。

## 文章执行依据（2026-10-02 / D-150；相册以 D-155 为准）

D-150为当前文章规则：桌面保留文章内嘉乐追球进度和主要章节短线；≤767px隐藏所有文章阅读辅助，包含首屏目录，保留实际正文标题与单行四项全站导航。设计规范v2.8；2026-10-03 已在用户 Mac 的独立 Playwright Chromium 完成最新 D-150 生产回归80/80、单元63/63、Astro检查与18页构建；历史证据保留在对应交接目录，不代表D-153新结果。此前Mac77/77仅为D-149历史证据。未提交或部署。

D-149进一步明确文章目录和嘉乐追球进度必须在文章纸面内；文章阅读页左导航仅保留蹲看人物。允许基于原人物设定生成独立透明蹲姿派生素材，保留原件与既有Manifest。D-149取代D-148中的左栏阅读辅助与细线进度；D-150进一步覆盖手机工具区与目录形式，当前以设计规范v2.8为准。

用户已确认柔白/炭黑点阵纸 Demo、主体左侧导航与人物动物、手机四項导航单行，并授权正式实现。以 `docs/design/baozi-space-design-spec.md` v2.9、D-148至D-156及相应栏目计划为当前入口；下文D-105/D-118/D-137旧布局、旧阶段编号仅供历史理解，不得阻止已确认方向。内容门禁、原素材契约、Bun与验证要求继续有效。本轮不push、合并、部署、切域名；保留原checkout未提交改动；本次在独立、无.git的源码快照中开发，不虚称已创建分支。

## Project Overview

**baozi.space（中华一番包子铺）** 是包子的个人网站、公开档案与个人工作空间。Astro 5 静态站，内容来自 Markdown Content Collections。

当前正式实现遵循D-148至D-156：共享点阵环境、暖白内容纸、左侧四入口与角色，以及可跳过开场；文章桌面正文内保留章节短线和嘉乐追球，手机隐藏阅读辅助；相册封面采用顶部D-155取景与目录规范。旧D-105/BookSpread归档不作为新页面依据；旧URL与内容门禁保留。

## Authority

改动前按顺序读取：

1. `docs/design/baozi-space-design-spec.md` — v2.9 全站设计事实来源；
2. `baozi-space-prd.md` — 产品目标、信息需求、内容责任和发布门禁；
3. `docs/project/decision-log.md` — 已确认设计/实施决策，最新 D-156（Projects浏览器/视觉仍待验）；
4. 根目录 `2026-08-21-baozi-space-oil-motion-project-plan.md` 与 `docs/animation/oil-motion/` 契约 — 启动页当前 CP0.5–CP7 路线；
5. 根目录 `2026-08-18-baozi-space-hybrid-animation-design.md` 与 `2026-08-18-baozi-space-hybrid-animation-checkpoints.md`（历史）、`docs/animation/intro-shot-list.md`、`docs/plans/2026-08-13-v2.1-project-restructure.md`、当前阶段计划和 `docs/intro/` 契约。

发生冲突时，设计/构图/动效以 design spec 为准，内容责任/发布门禁以 PRD 为准，后续 Decision 覆盖早期 Decision。废弃原型、V1 spec 和原始 handoff 已删除；历史只从 Git 与 `decision-log.md` 查阅，不得恢复为执行入口。

设计或结构变更必须查决策记录并新增 D-xxx 条目。

重要分析、设计评审和规划在形成结论前，还必须检索 `C:\Users\Lzw\Downloads\Documents\obsidian\Lzw\Lzw\Codex记忆\` 中的相关项目、决策、工作流和 open loops。仓库文档回答当前产品事实，优先级高于可能过时的笔记；Obsidian 提供用户长期偏好、历史教训和判断方法。必须说明采用了哪些笔记原则、排除了哪些过时记录，并在任务结束时将稳定事实和未闭环事项写回对应笔记。

CE 解决方案库位于 `docs/solutions/`：收录已解决问题的文档化解法（bug、最佳实践、工作流模式），按类别组织，YAML frontmatter 含 `module`/`tags`/`problem_type`；在已有记录的领域实现或调试时可检索。

After a solved, verified problem, offer once to invoke the `ce-compound` skill at the completion checkpoint only when the work produced durable project reasoning that is not readily recoverable from the final code, tests, types, comments, or existing documentation, and losing it would plausibly cause recurrence, material risk, or substantial rediscovery. Apply this counterfactual: if the learning document disappeared, would a future engineer reading the final implementation still be likely to repeat the mistake or redo substantial investigation? If not, do not offer. Completion, effort, and diff size alone are not enough. Offer at the checkpoint so a qualifying learning can ship in the PR that produced it, and only where the repository treats captured learnings as tracked, committed knowledge.

Write every report, summary, or handoff to the user through the `ce-noslop` skill. This applies when you are the top-level agent writing to the user, not when you are a subagent reporting to its caller. Do not apply it to code, config, verbatim quotes, or text the user asked to post as written.

## Historical Scope (D-123 / D-124)

以下记录旧阶段范围；当前构图、共享Shell与实施状态以顶部 D-156 Projects、D-155 相册入口及 D-150 文章规则为准。

场景式 IA 重构（D-123 / D-124）已确认并进入执行：站点改为「启动页 → 首页 → 项目矩阵」三场景下滑串联的场景式架构，首页主 tab 为 Blog / Photos / Resume / Projects；文章、相册（含灯箱）、简历、单项目页保持传统文档页。

- 当前 `/` 从 D-105 数字手账基线替换为场景壳（SceneRoot）：三场景在一屏滚动序列内串连，Lenis 平滑滚动驱动，场景动效用 React islands + motion（数据仍由 Astro 构建期注入）；
- 场景 1 为 v2 启动页：点阵纸由网页静态层提供，v2 草地 + 序列 sprite + ScrollTrigger scrub；球弹跳 → 嘉乐追逐 → 人物被拽跑 → 摔倒滑出 → 滑入起身站定 → 嘉乐返回坐下（D-132）；
- 素材接口 v2 已接入（D-132）：`public/assets/{intro,home}/runtime/` + `public/manifest/asset-manifest.v2.json` 为唯一生产来源，运行时从 Manifest 读几何与锚点；启动页结尾为「摔倒滑出→左侧滑入→起身站定 + 嘉乐返回坐下」，草地 0.78–0.82 退出；WebGL / Canvas 仍为停止条件，不得静默引入；
- 书影音（books/music/movies/drinks）集合保留，退出主导航，作为归档路由存在；thoughts 并入 blog、ai-works 并入 projects，逐条 301 迁移（P6）。

## Architecture States

### Historical production baseline (D-105)

```text
src/content/<legacy-section>/*.md → src/content.config.ts
                                      ↓ getCollection()
src/pages/<section>/             → SectionLayout / EntryList / EntryDetail / BookSpread
src/pages/index.astro            → BaseLayout + home.css + cover-open.js
```

- 旧 collection：`blog / thoughts / photos / drinks / books / music / about / ai-works`。
- 当前首页与布局继续运行，不再增加 D-105 视觉能力。
- 旧 URL 在阶段 C 的逐条迁移表和重定向验证完成前不得删除。

### Historical v2.1 target

```text
docs/design/                    # 全站设计规范
docs/intro/                     # 动画和资产契约
design-assets/intro/            # 非公开源稿、参考、外部交付、QA
public/assets/intro/
  placeholders/                # 仅开发 / 测试显式启用
  production/                  # 默认运行时
scripts/intro-assets/           # 生成占位、审计、原子发布
src/components/intro/           # 语义舞台
src/lib/intro/                  # Manifest、帧、绳索、加载、时间线
src/pages/lab/intro.astro
tests/{unit/intro,e2e}/
```

阶段 C 的目标内容与路由为 Blog / Photos / Resume / Projects（D-123 取代原五入口）。Thoughts 并入 Blog；AI Works 并入 Projects；Books / Movies / Music 保留为归档路由退出主导航；Drinks 逐条确认去向。

## Intro Hard Gates

- CP0 不生成、补画、inpaint 或重绘生产人物、小狗、球和手写资产，也不创建视频、Rive 或 `handoff-final` 二进制素材。
- `design-assets/intro/source/` 与 reference 永不复制到 `public/` 作为生产素材。
- 现有 A1 默认模式必须是 production；缺失或无效时显示稳定 HTML 首页，不自动显示 placeholder。
- placeholder 只允许开发环境 `?assetMode=placeholder` 或测试显式加载。
- D-115 的六张生产 Sheet、八帧、Alpha、朝向与负载合同继续约束现有 A1 实验，不自动成为未来视频 / Rive 合同。
- 未来混合方案仍保持第一拍只有球、主运动因果清楚、最终静止和关键资源 ≤6MB；具体素材合同从 CP1 起冻结。
- Canvas / WebGL 运行时与游戏引擎禁止（D-121）；React 仅允许用于场景壳与灯箱等交互动效 islands（D-124）；Lenis 用于全站平滑滚动（D-124）；启动页仍为 alpha-atlas CSS sprite（D-121）。Rive 仅可在 CP4 人工放行后以原生 Web Runtime 制作隔离样片；启动页 alpha-atlas 预算若选择 `chroma-video`，必须停止并建立新决策（D-123 起），不得静默引入 WebGL / Canvas 运行时。

## Code Conventions

- Bun 是唯一包管理器和脚本入口；`bun.lock` 为准，不提交 `package-lock.json` 变化。
- 路径别名 `@/*` → `src/*`；组件、样式和 lib 导入使用别名。
- Astro frontmatter 承担构建期数据，无运行时全局 store 或 DI。
- 客户端行为优先 TypeScript 模块；旧全站原生脚本仍在 `public/scripts/`，阶段迁移时干净删除。
- 原生 CSS，无 Tailwind。v2.1 新 token 来自 design spec；不得继续扩展 BaoziHand / IoskeleyMono 旧字体系统。
- React islands 仅用于需要交互动效的场景与灯箱；数据仍由 Astro 构建期注入，React 不承担数据获取（D-124）。
- 代码自解释：命名表意、函数保持短小，不写解释性注释。注释只用于代码无法表达的约束，一句话、不写段落，并引用相关 D-xxx 或契约。界面与必要注释用中文。
- 不引入 `any`；未知输入用 `unknown` 与验证函数。
- 单文件不超过 500 行。现有例外：`src/styles/global.css`（D-105 遗留，阶段 C 迁移时拆分）、`src/components/home-v2/home-v2-preview.css`（CP5 接入运行时拆分）。
- `src/` 按领域分目录组织：`components/<area>/`、`lib/<area>/`、`pages/<section>/`。新代码进入对应领域目录，不在层根平铺。
- 新增/修改 frontmatter 字段必须同步 schema、模板、所有消费页面和发布门禁。

## Content Gates

- 当前查询使用共享 `isPublishable` 门禁；schema 已包含 `approved`、`updated`、`coverAlt`、`coverCredit`，新增字段需同步模板与查询。
- 生产内容必须满足 `draft: false && approved: true`。
- 占位、假内容、布局样本和未批准内容不计入发布门禁。
- 完整文章只在 Blog 维护；其他栏目保存结构化记录和关联链接，不复制正文。

## Development Commands

```powershell
bun install
bun run dev
bun run check
bun run build
```

A0-H / A1 接入后：

```powershell
bun run test:unit
bun run test:e2e
bun run assets:intro:placeholders
bun run assets:intro:audit:placeholder
bun run assets:intro:audit:production
```

## Verification

- 当前文档/结构调整：`bun run check` + `bun run build`，确保旧生产基线未破坏。
- `/lab/intro`：Vitest + Playwright；1440×900 截取 0%、8%、25%、45%、65%、82%、94%、100%，并验证反向滚动。
- 额外 smoke viewport：1280×720、1920×1080；reduced motion 单独截图。
- 生产素材：自动审计 + 48 帧 contact sheet 人工检查 + 总负载声明。
- UI 变更必须浏览器实测，不以构建通过代替视觉和交互验证。
- 截图与录屏只作为评审材料；AI 不以自己的视觉判断放行视觉变更，视觉与构图的通过权在包子的 checkpoint 人工评审。
