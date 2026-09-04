# baozi.space 启动页 Oil Motion 项目管理计划

> 版本：1.0  
> 状态：执行中，当前阶段 CP3/CP5（CP1 已于 D-122 批准；CP2 于 D-128 改为 image2 静态姿态帧路线并以确认素材包图集作为首轮基线）
> 项目负责人 / 最终批准：包子  
> 项目规划、Prompt 与视觉门禁：Codex  
> 工程实施与自动化：Harness  
> 计划启动：2026-08-24  
> 目标候选版本：2026-09-11  
> 含缓冲的目标发布日期：2026-09-15

## 1. 项目目标

用 oil-motion 的生产方法重做 baozi.space 启动页：先冻结关键帧和角色身份，再由 Seedance 2.5 生成连续的角色动作，经过逐帧清理、插帧、透明化和预算检查，最终将滚动进度映射为可正向、反向播放的确定性动画。

本轮只解决启动页及其进入 Home v2 的交接，不重新设计已经批准的 Home v2，也不重做进入首页后的嘉乐环绕交互。

### 成功标准

- 最新草地、点阵纸和暖白大纸只由网页静态层提供，不再由 Seedance 生成。
- 黄色球、嘉乐和人物统一从左侧进入、从右侧退出。
- 嘉乐先完全冲出右侧；人物随后被拉倒并向右摔滑出屏幕。
- 人物不朝镜头跌落，不出现自动推镜、缩放或透视突变。
- 滚动、停止和反向滚动时动作连续，不再出现原 8 帧 Sprite 的明显顿挫。
- 动画结束后通过暖白纸张遮罩进入已经批准的 Home v2，无白闪和布局跳变。
- 首次访问、跳过、已完成会话、减弱动态、资源失败和 JavaScript 禁用均有明确降级。

## 2. 已锁定的方案

| 决策项 | 当前结论 |
| --- | --- |
| 站点技术 | Astro 5、TypeScript、原生 CSS、GSAP/ScrollTrigger、Bun |
| 生产方法 | oil-motion：关键帧 → AI 连续动作 → 帧级 QA → 压缩 → 输入映射 |
| 背景归属 | `page`；点阵、暖白纸和最新草地属于网页 |
| 交互驱动 | `scroll`，一维线性进度，可逆 |
| 角色生成 | image2 静态姿态帧 + 已确认素材包（D-128）；不再使用 Seedance 视频 |
| 几何运动 | 球与角色的横向位移、尺度、时间和退出边界由程序控制 |
| 牵引绳 | 独立 SVG Bézier Path，使用逐帧手部和项圈锚点 |
| 首选交付 | 人物、嘉乐分别使用紧裁切 Alpha Atlas；DOM/CSS Sprite 渲染 |
| WebGL 边界 | 本轮不启用；若预算必须选择 `chroma-video`，停止并建立新决策，不静默引入 |
| Home v2 | 保留 CP0 已批准的桌面 1440×900 和移动 390×844 静态首屏 |
| 上游版本 | oil-motion 固定到提交 `a5a384c804183d69529a85d2dcf84a7cfc99f7e4` |

### D-121 继承与替代

**D-121 继承（继续有效，不重做）：**

- Home v2 桌面 1440×900 与移动 390×844 静态首屏（CP0 已批准）；
- 人物与嘉乐身份参考（person-reference / jiale-reference，2400px 生产设定源表）；
- 静态点阵、暖白大纸与 C2 水彩草地（由网页静态层提供）；
- handoff 坐标（点阵原点、人物脚底、嘉乐中心 / 脚底、下一分区顶部）；
- 锚点模型（人物 hand / ground，嘉乐 collar / ground）；
- skip、reduced-motion、素材失败、no-JS 与 D-105 回滚原则。

**D-121 替代（不再作为生产路线）：**

- 整屏 Seedance 预渲染视频正常向前播放；
- 旧 0–6 秒六区间生产合同（`docs/animation/intro-shot-list.md`，降级为历史）；
- 六张 4×2、每张八帧作为新路线的生产合同（降级为 A1 历史作用域）；
- 人物摔向镜头或向观众靠近的尾版（新尾版为嘉乐先、人物后从右侧退出）。

### 不在本轮范围内

- 不继续修复三条旧的整屏 Seedance 成片。
- 不让 Seedance 生成草地、点阵纸、页面文字、导航或 Home v2。
- 不引入 React、Three.js、Rive、Lottie、Lenis、游戏引擎或骨骼动画。
- 不重做 Home v2 的信息架构、排版和内容。
- 不重做首页嘉乐环绕；只验证启动页交接不会破坏现有交互。

### 当前进度

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| CP0 Home v2 静态首屏 | 已通过 | 桌面 1440×900 与移动 390×844 已批准 |
| oil-motion 方案评估 | 已完成 | 确认采用其生产和输入映射方法 |
| 旧 Seedance 三版成片 | 已拒收 | 仅保留为草地污染、方向错误等失败样本 |
| D-121 文档同步 | 已通过 | CP0.5 出口评审 2026-08-31 通过：单一路线、历史标记、WebGL 停止条件 |
| CP1 关键帧与 Identity Bible | 已批准 | D-122（2026-08-31）：双角色 Bible、K0–K4 双视口、Motion Brief、Prompt v1 |
| 角色动作素材 | 首轮基线已入库 | D-128（2026-09-04）：弃用 Seedance 视频，改 image2 静态姿态帧；人物踉跄中间帧等缺口由包子按需补充 |
| CP3 图集预算与挂载 | 已通过 | 预算预检 + `/lab/intro-oil` 静态舞台（92f214f）；alpha-atlas 路线，无 chroma-video 停止条件触发 |
| CP5 运行时主时间线 | 待评审 | 2026-09-04 实现：ScrollTrigger targetProgress → smoothDamp → stateAtProgress 纯函数 → DOM；八进度点 + 反向 + 移动 + reduced-motion 实测通过；截图在 `design-assets/lab-review/intro-oil/`，视觉通过权归包子 |

**关键路径：** D-121 → Identity Bible / K0–K4 → 人物 Pilot → Alpha Atlas 预算 → 正式素材 → 运行时 → 五视口 QA → 发布。

## 3. 角色与职责

### 包子：Product Owner / Visual Approver

- 提供并确认人物、嘉乐、草地和 Home v2 基准素材。
- 在 Seedance 2.5 中按批准 Prompt 执行生成。
- 每个 Checkpoint 在一个工作日内给出通过、修改或拒绝决定。
- 最终确认角色身份、动作方向、摔倒逻辑和整体 B-lite 质感。

### Codex：Project Manager / Prompt & QA Lead

- 维护本计划、Concept Contract、Motion Brief 和 Prompt 版本。
- 检查 Seedance 候选视频及接触表，指出需求级错误和可修复问题。
- 判断阶段是否通过出口门禁，不以运行时补丁掩盖坏素材。
- 根据实际结果更新下一轮 Prompt 和风险状态。

### Harness：Engineering Owner

- 同步项目文档和 D-121 架构决策。
- 建立 `/lab/intro-oil`、Manifest、素材目录和构建脚本。
- 固定并接入 oil-motion 构建期脚本，运行预算、插帧、清理、图集和 QA。
- 实现滚动目标映射、单一 `smoothDamp`、CSS Sprite、横向几何和 SVG 牵引绳。
- 完成 Vitest、Playwright、Astro check、Build、性能和降级验证。
- 通过门禁后接入 `/`，保留 D-105 回滚。

### Seedance 2.5：Motion Source Generator

- 生成嘉乐原地向右奔跑动作。
- 生成人物被向右拉拽、失衡、向右摔倒的动作。
- 不负责屏幕内横向路径、背景、牵引绳、网页转场和最终 Home v2。

## 4. 基线排期

排期假设：包子在一个工作日内完成阶段反馈；每个角色最多两轮 Seedance 生成；没有新增视觉方向；Home v2 保持 CP0 批准稿。

| 阶段 | 日期 | 工期 | 主负责人 | 主要交付 |
| --- | --- | ---: | --- | --- |
| M0 架构与文档同步 | 8/24 | 1 天 | Harness / Codex | D-121、Concept Contract、目录与状态更新 |
| M1 关键帧与 Identity Bible | 8/25–8/26 | 2 天 | 包子 / Codex | 人物与嘉乐身份基准、K0–K4、Motion Brief |
| M2 Seedance Pilot | 8/27–8/28 | 2 天 | 包子 / Codex | 人物 Pilot、嘉乐 Pilot、生成日志、审片结论 |
| M3 Pilot 处理与网页挂载 | 8/31–9/1 | 2 天 | Harness | 48fps 帧、Alpha Pilot、预算报告、`/lab/intro-oil` |
| M4 正式素材生产 | 9/2–9/4 | 3 天 | 包子 / Harness / Codex | 正式人物和嘉乐图集、Manifest、QA 报告 |
| M5 运行时与交接实现 | 9/7–9/9 | 3 天 | Harness | 滚动控制器、位移、牵引绳、Home v2 遮罩交接 |
| M6 全量 QA 与候选发布 | 9/10–9/11 | 2 天 | Harness / 包子 | 自动化、五视口录屏、Release Candidate |
| 缓冲与正式发布 | 9/14–9/15 | 2 天 | 全体 | 缺陷修复、生产替换、回滚演练 |

如果某一阶段发生 Seedance 重生成超过两轮，目标日期按每轮增加 1–2 个工作日顺延，不压缩 QA 时间。

## 5. Checkpoint 与工作分解

## CP0.5：同步架构决策

**时间：** 2026-08-24  
**Owner：** Harness  
**Approver：** Codex、包子

### 要做的事项

- 建立 D-121，明确启动页从“整屏正常播放视频”调整为 oil-motion 帧映射方案。
- 将旧方案中“Seedance 生成完整草地与背景”“人物摔向镜头”等内容标记为历史。
- 固定 oil-motion 上游 commit，不依赖浮动的 `main`。
- 确认 Home v2 CP0 静态首屏不变。

### 交付物

- `docs/project/decision-log.md` 中的 D-121。
- 更新后的设计规范、PRD、README 和动画检查清单。
- `docs/animation/oil-motion/concept-contract.yaml`。

### 出口门禁

- 当前文档只存在一条有效启动页技术路线。
- 旧整屏 Seedance 视频明确标记为参考或失败样本。
- WebGL 仍是停止条件，不是自动回退。

## CP1：关键帧、角色身份与 Motion Brief

**时间：** 2026-08-25 至 2026-08-26  
**Owner：** 包子、Codex  
**Support：** Harness

### 要做的事项

- 建立人物 Identity Bible：脸型、渔夫帽、眼镜、短袖图案、深蓝短裤、鞋、白描边和水彩色板。
- 建立嘉乐 Identity Bible：比熊脸型、耳朵、尾巴、体型、蓝色项圈、白毛层次和白描边。
- 形成 K0–K4：
  - K0：空场，球尚未进入。
  - K1：黄色球先进入，嘉乐从左追入。
  - K2：绳子拉紧，人物从左被带入。
  - K3：嘉乐已越过右边界，人物向右失衡摔倒。
  - K4：嘉乐与人物均从右侧完全退出，舞台为空。
- Motion Brief 锁定角色动作时长、帧率、纯色键、锚点和负面要求。

### 交付物

- `source/identity/person-bible.png`
- `source/identity/jiale-bible.png`
- `source/keyframes/K0.png` 至 `K4.png`
- `source/motion-brief.yaml`
- `source/prompts/seedance-person-v1.txt`
- `source/prompts/seedance-jiale-v1.txt`

### 出口门禁

- 单看关键帧即可理解“左进右出、狗先出、人物后摔出”。
- 人物 K3 没有朝镜头放大，肩线与脚部方向指向右侧。
- 草地和页面背景不出现在任何角色生成首尾帧中。

## CP2：动作姿态帧（D-128 重定义，原 Seedance Pilot 降为历史）

**时间：** 2026-08-27 至 2026-08-28  
**Owner：** 包子  
**Reviewer：** Codex

### 要做的事项

- 按姿态帧清单用 image2 生成静态帧，每姿态首轮最多 3 张候选，不生成视频。
- 嘉乐只需要「朝右奔跑」循环姿态，人物只需要「被拉拽—踉跄—失衡—向右摔倒」序列姿态。
- 记录工具版本、日期、参考图和淘汰原因。
- 先审人物姿态，因为人物动作是最大风险；人物通过后再补嘉乐缺口。

### 交付物

- `master/person/<pose>.png`、`master/jiale/<pose>.png`（透明背景）
- `master/generation-log.md`
- 首轮基线：已由 2026-08-31 确认素材包构建的 person / jiale / ball 图集（见 `public/assets/intro/oil-motion/manifest.json`）

### 出口门禁

- 人物和嘉乐身份与 Identity Bible 一致，无多余肢体、变脸、衣服变化或尾巴复制。
- 背景透明或纯色键均匀，无草地、阴影地面、文字和相机运动。
- 人物姿态始终为侧向向右，没有扑向镜头的透视。
- 姿态序列足以表达 K0–K4 的关键节拍（球先出画、嘉乐先退出、人物后摔出）。

### 停止条件

两轮补图仍无法保持身份或正确摔倒方向时停止扩量，重新设计人物动作关键帧，不把错误素材交给 Harness 修补。

## CP3：Pilot 处理、预算与真实页面挂载

**时间：** 2026-08-31 至 2026-09-01  
**Owner：** Harness  
**Approver：** Codex、包子

### 要做的事项

- 将批准 Pilot 插帧到最终 48fps。
- 在构建期去除色键并输出透明帧，不在运行时抠色。
- 生成原始帧和处理帧接触表，检查重复、闪帧、轮廓撕裂和中心漂移。
- 以真实显示尺寸和 DPR 运行 `motion_budget.py --strict`。
- 目标：嘉乐约 96 帧，人物约 144 帧；单个图集不超过 4096×4096。
- 将 Pilot 挂载到 `/lab/intro-oil` 的真实静态草地上，验证边缘和比例。

### 交付物

- `build/pilot/motion-budget.json`
- `build/pilot/raw-contact.jpg`
- `build/pilot/final-contact.jpg`
- `build/pilot/person-pilot.webp` 与 Manifest
- `build/pilot/jiale-pilot.webp` 与 Manifest
- `/lab/intro-oil` Pilot 录屏和截图

### 出口门禁

- 预算结果为 `alpha-atlas` 且所有硬门通过。
- 洋红背景不进入最终网页；白、黑、深蓝和真实草地底色上无明显色边。
- 图集加载后帧切换没有首帧虚影和尺寸跳动。
- 如果预算选择 `chroma-video`，本阶段停止并从 D-123 起另立决策，不继续写 WebGL 运行时。

## CP4：正式素材生产

**时间：** 2026-09-02 至 2026-09-04  
**Owner：** 包子、Harness  
**Reviewer：** Codex

### 要做的事项

- 只使用已经通过 Pilot 的参考、Prompt 和参数生产正式素材。
- 每个角色保留母版、生成记录、原始帧、最终帧、接触表、图集与 Manifest。
- 为人物每帧标记手部锚点，为嘉乐每帧标记项圈锚点和脚底锚点。
- 输出桌面和移动各自的尺寸资源，避免移动端解码桌面大图集。
- 不把球、横向位移、草地和牵引绳烧进角色图集。

### 交付物

- `public/assets/intro/oil-motion/person/{desktop,mobile}.webp`
- `public/assets/intro/oil-motion/jiale/{desktop,mobile}.webp`
- 对应 `motion.json`
- `docs/animation/oil-motion/qa-assets.md`
- 完整生成与处理日志

### 出口门禁

- 桌面动作压缩资产目标不超过 4.5MB，移动端不超过 3.5MB；首屏关键资源总量不超过 6MB。
- 单张纹理不超过 4096×4096；解码内存目标桌面不超过 96MiB、移动不超过 64MiB。
- 角色在全部帧中仍是同一个人和同一只嘉乐。
- 锚点轨迹连续，无单帧突然跳动。

## CP5：运行时与主时间线

**时间：** 2026-09-07 至 2026-09-09  
**Owner：** Harness  
**Approver：** Codex

### 要做的事项

- ScrollTrigger 只计算 `targetProgress`，不使用 `scrub:true` 驱动多个 Tween。
- 使用一个带速度状态的 `smoothDamp` 更新 `currentProgress`；不得再叠加第二层 lerp。
- 角色 Sprite 帧、球旋转、角色横向位移、遮罩与 SVG 绳子全部读取同一个当前进度。
- 只有整数帧改变时更新 `background-position`。
- 输入稳定、舞台离屏或完成交接后停止 `requestAnimationFrame`。
- 实现反向滚动、窗口重排、移动触摸、跳过、会话完成和 reduced motion。

### 建议主时间线

| 归一化进度 | 事件 |
| ---: | --- |
| 0–8% | 静态场景 |
| 8–22% | 黄色球从左侧进入 |
| 16–52% | 嘉乐追球进入 |
| 30–78% | 人物被拉入并尝试保持平衡 |
| 72–86% | 嘉乐完全冲出右侧 |
| 80–95% | 人物向右摔滑并完全退出 |
| 95–100% | 暖白纸遮罩进入 Home v2 |

### 出口门禁

- 慢速、快速和连续反向滚动不粘滞、不闪帧、不越界。
- 人物和嘉乐的 CSS `scale` 不因 AI 画面产生尾段自动放大；程序尺度变化不超过批准范围。
- 嘉乐在人物之前完全退出右侧；任何进度都不会从右侧重新进入。
- 牵引绳端点在目标视口上的视觉误差不超过 2 CSS px。

## CP6：Home v2 交接与降级

**时间：** 2026-09-09  
**Owner：** Harness  
**Visual Approver：** 包子

### 要做的事项

- 人物完全离屏后启动暖白纸张遮罩。
- 遮罩覆盖舞台后再显示 Home v2 人物与嘉乐定帧，避免角色瞬间重新出现。
- 首页内容仍为 DOM，启动页不生成任何文字。
- 所有非正常路径进入同一个 Home v2 组件。

### 出口门禁

- 正常完成、跳过、刷新后会话完成、reduced motion 和资源失败均落到同一 Home v2。
- 交接无黑帧、白闪、布局跳动或重复角色。
- 无 JavaScript 时仍可读取静态首页主要内容。

## CP7：全量 QA、候选发布与生产替换

**时间：** 2026-09-10 至 2026-09-15  
**Owner：** Harness  
**Final Approver：** 包子

### 测试矩阵

- 桌面：1280×720、1440×900、1920×1080。
- 移动：390×844、430×932。
- 浏览器：Chromium、WebKit/Safari、Firefox；Windows 补测 Edge。
- 场景：冷缓存、慢网、加载失败、跳过、连续反向、后台恢复、横竖屏变化。

### 必跑命令

```bash
bunx astro check
bunx vitest run
bunx playwright test
bun run build
```

### 发布门禁

- 自动化退出码全部为 0。
- 目标设备滚动过程中无持续长任务；单次动画更新 p95 目标小于 8ms。
- 静止后无常驻 GSAP ticker 或 requestAnimationFrame。
- 五个视口录屏通过包子视觉确认。
- `/lab/intro-oil` 与 `/` 使用同一组件和同一 Manifest。
- D-105 回滚路径或 Git tag 已完成演练。

## 6. 素材目录与命名

```text
public/assets/intro/oil-motion/
  source/
    identity/
      person-bible.png
      jiale-bible.png
    keyframes/
      K0.png
      K1.png
      K2.png
      K3.png
      K4.png
    prompts/
      seedance-person-v1.txt
      seedance-jiale-v1.txt
    master/
      person-master.mp4
      jiale-master.mp4
  person/
    desktop.webp
    desktop.motion.json
    mobile.webp
    mobile.motion.json
  jiale/
    desktop.webp
    desktop.motion.json
    mobile.webp
    mobile.motion.json
  static/
    stage-desktop.webp
    stage-mobile.webp
    handoff-home-desktop.webp
    handoff-home-mobile.webp
  qa/
    person-raw-contact.jpg
    person-final-contact.jpg
    jiale-raw-contact.jpg
    jiale-final-contact.jpg
    motion-budget.json
    qa-report.md
```

生成母版、Prompt、任务 ID 和 QA 报告必须保留；可再生的中间 PNG 可在正式交付后清理。

## 7. 可复制 Prompt

## P-H0：交给 Harness 的架构同步 Prompt

```text
只执行 baozi.space Oil Motion 计划的 CP0.5，不实现动画。

目标：把启动页当前有效方案改为“页面拥有静态背景；Seedance 只生成角色动作；
oil-motion 负责帧级生产与进度映射；程序负责横向几何与牵引绳”。

要求：
1. 新增 D-121，并把旧的整屏 Seedance 正常播放视频方案标记为历史。
2. 保留 CP0 已批准的 Home v2 桌面 1440×900 与移动 390×844，不调整排版。
3. background_owner=page，driver=scroll，parameter_space=linear。
4. 首选 alpha-atlas + DOM/CSS Sprite。本任务禁止引入 Canvas/WebGL。
5. oil-motion 固定到 commit a5a384c804183d69529a85d2dcf84a7cfc99f7e4。
6. 创建 Concept Contract、Motion Brief 模板和素材目录说明。
7. 更新 README、设计规范、PRD、决策日志和 Checkpoint 文档。

完成后只汇报：修改文件、关键决策、仍存在的冲突、CP0.5 门禁结果。
不要修改 src 下的运行时代码，不要生成占位动画。
```

## P-H1：交给 Harness 的 Pilot 基础设施 Prompt

```text
只执行 CP3 的 Pilot 基础设施，不进入正式首页。

输入：已批准的人物和嘉乐 Pilot 母版、Identity Bible、Motion Brief、K0–K4。
目标：建立 /lab/intro-oil，并验证 oil-motion 的 alpha-atlas 路线。

要求：
1. 将生成素材插帧到 48fps，并在构建期离线抠成 Alpha。
2. 输出原始/最终接触表和分析报告，不自动忽略警告。
3. 使用真实 CSS 显示尺寸、DPR、最终帧数运行 motion_budget.py --strict。
4. 只有 delivery.selected=alpha-atlas 且单张图集 <=4096x4096 时才继续打包。
5. 如果预算选择 chroma-video，立即停止并报告，不实现 WebGL fallback。
6. /lab/intro-oil 必须使用生产版静态草地和点阵背景，不使用 AI 背景。
7. 每个角色只使用一个 Sprite 层，不做相邻帧 opacity crossfade。
8. 添加资源失败和 reduced-motion 静态降级。

输出：预算报告、接触表、Pilot 图集、Manifest、真实页面截图和录屏、测试结果。
```

## P-S1：Seedance 嘉乐动作 Prompt

```text
Create a short character-motion source clip for later frame extraction and transparent compositing.

Use the supplied Jiale identity reference exactly. Jiale is one small white Bichon Frise with a compact body, round recognizable face, floppy ears, fluffy curled tail and one blue collar. Preserve the same watercolor-and-light-print texture, thin dark contour and clean white sticker outline in every frame.

Action: a natural energetic run cycle facing screen-right, as if chasing a small ball. The dog runs in place near the center of the frame. Legs cycle continuously, ears and tail move naturally, and the body has restrained vertical bounce. Keep the body scale and center stable. The website will add all horizontal travel later.

Camera and layout: fixed side-view camera, fixed focal length, no camera movement, no zoom, no perspective change. One dog only. Keep the complete dog inside the safe crop in every frame.

Background: perfectly uniform solid magenta key background, flat and shadowless, with no grass, ground, paper, dots, texture, horizon, scenery, text or interface. Do not cast a colored reflection onto the white fur.

Duration: approximately 2 seconds. Motion must be continuous from the first active pose to the last active pose and suitable for interpolation to 48fps.

Negative constraints: no duplicated dog, no extra legs, no missing paws, no changing collar, no changing face, no changing fur color, no deformed tail, no object entering the frame, no ball, no leash, no translation across the frame, no motion toward the camera, no camera shake, no cuts, no slow-motion pause, no end-card.
```

## P-S2：Seedance 人物动作 Prompt

```text
Create a short character-motion source clip for later frame extraction and transparent compositing.

Use the supplied Baozi character identity reference exactly. Preserve the same recognizable person, face, glasses, navy bucket hat, patterned short-sleeve shirt, navy shorts, shoes, watercolor-and-light-print texture, thin dark contour and clean white sticker outline in every frame.

Action: fixed side-view action facing screen-right. An unseen force from off-screen right pulls the person's right hand and upper body to the right. The person takes several quick recovery steps, the arm becomes extended, balance is lost, the torso tilts to the right, and the person falls and slides toward the right in profile. Keep the movement lateral. The website will add the full left-to-right screen travel later.

The fall must never come toward the viewer. Do not enlarge the character. Do not rotate into a frontal fall. Keep the full body readable inside the safe crop until the final falling pose. The final pose should clearly continue toward the right edge, allowing the webpage to translate the character completely off-screen.

Camera and layout: fixed side-view camera, fixed focal length, no camera movement, no zoom, no perspective change. One person only. Stable body scale and stable watercolor style.

Background: perfectly uniform solid magenta key background, flat and shadowless, with no grass, ground, paper, dots, scenery, horizon, text or interface.

Duration: approximately 3 seconds. Motion must be continuous and suitable for interpolation to 48fps.

Negative constraints: no second person, no duplicated body, no extra or missing limbs, no clothing change, no hat change, no face change, no forward fall toward camera, no sudden scale increase, no camera push-in, no rotation to face the viewer, no leash, no dog, no ball, no background, no cuts, no freeze before the end, no end-card.
```

## P-S3：人物方向错误时的修正 Prompt

```text
Regenerate from the approved identity and keyframes. The previous result failed because the person fell toward the camera or enlarged near the end.

This version is strictly two-dimensional lateral profile motion. Screen-right is the only travel direction. Keep the person's rendered scale constant. The shoulders, hips, knees and feet move parallel to the image plane. During the fall, the head and torso move toward the right edge, never toward the viewer. There is no camera movement, no zoom and no focal-length change.

The final falling pose must look like it will slide out through the right boundary, not collide with the screen or viewer. Preserve all clothing, facial, hat, glasses, outline and watercolor identity details exactly.

Retain the same uniform solid magenta background and all other negative constraints from the approved person prompt.
```

## P-H2：交给 Harness 的运行时实现 Prompt

```text
只执行 CP5 和 CP6，在 /lab/intro-oil 集成已经批准的正式图集，不修改素材本身。

实现原则：
1. ScrollTrigger 只写 targetProgress；由一个 smoothDamp 控制 currentProgress。
2. 禁止 scrub:true 的 GSAP Timeline 与第二层 lerp 同时存在。
3. 人物、嘉乐、球、牵引绳和纸张遮罩读取同一个 currentProgress。
4. AI 图集只承担局部姿态；横向位置、球旋转和退出边界必须程序化。
5. 帧渲染使用单层 CSS background-position，不做两帧 opacity crossfade。
6. SVG 绳端读取 Manifest 的 handAnchor、collarAnchor 和当前几何变换。
7. 72–86% 嘉乐完全退出右侧；80–95% 人物向右摔滑并完全退出；95–100% 才进入 Home v2 遮罩。
8. 人物不得朝镜头放大；任何程序 scale 必须来自 Manifest/时间线常量。
9. 稳定、离屏、完成和降级后停止 RAF/ticker。
10. 保留 skip、sessionStorage、reduced-motion、asset failure 和 no-JS fallback。

先写纯函数与状态测试，再实现。只修改 /lab/intro-oil；门禁通过前不要接入 /。
输出实现文件、测试文件、五个视口截图、反向滚动录屏和性能记录。
```

## P-H3：交给 Harness 的最终 QA 与发布 Prompt

```text
只执行 CP7。不要重构已通过的动画设计。

1. 跑完 Astro check、Vitest、Playwright 和生产 build。
2. 验证 1280x720、1440x900、1920x1080、390x844、430x932。
3. 覆盖正常慢滚、快速滚、连续反向、跳过、已完成会话、reduced-motion、素材失败和后台恢复。
4. 检查嘉乐先出右侧、人物后向右摔出；禁止任何人物扑向镜头或尾段放大。
5. 检查牵引绳端点视觉误差 <=2 CSS px。
6. 审计每张纹理、压缩体积、解码内存、placeholder 泄漏和无用旧素材请求。
7. 静止后确认无常驻 RAF 或 GSAP ticker；记录动画更新 p95。
8. 输出 qa-report.md、五视口完整录屏、失败项根因和门禁结论。
9. 全绿后部署实验路由；包子明确批准后再接入 /。
10. 发布前确认 D-105 tag/commit 可以回滚，并完成一次回滚演练。
```

## 8. 验收评分卡

每个 Seedance 候选按 0–2 分评分：0 为失败，1 为可修，2 为通过。任何硬失败项为 0 时直接淘汰，不计算总分。

| 维度 | 硬失败条件 | 通过标准 |
| --- | --- | --- |
| 人物身份 | 变脸、换衣、帽子或眼镜消失 | 全程与 Identity Bible 一致 |
| 嘉乐身份 | 多狗、多腿、项圈变化、尾巴复制 | 同一只嘉乐，结构稳定 |
| 动作方向 | 人物扑向镜头、从右侧重新进入 | 严格侧向向右 |
| 背景 | 出现草地、点阵、地平线或漂移 | 均匀纯色键 |
| 镜头 | 推拉、摇移、焦距或透视变化 | 完全固定 |
| 连续性 | 硬切、停顿、动作反向 | 中间姿态连续 |
| 边缘 | 白毛或白描边被色键污染 | 多底色合成干净 |
| 可编程性 | 横向位移烧入且漂移不可控 | 主体中心基本稳定 |

## 9. 风险、触发条件与处理

| 风险 | 触发条件 | 处理方式 | Owner |
| --- | --- | --- | --- |
| Seedance 仍生成旧草地 | 母版出现任何草地或纸张 | 拒收；只提供纯色键关键帧和新 Prompt | 包子 / Codex |
| 人物仍朝镜头摔 | 尾段尺度增大或转为正面 | 使用 P-S3 重生成；两轮失败后重做关键帧 | 包子 / Codex |
| 色键损伤白毛 | 多底色出现洋红边或主体被误删 | 拒收母版或改用离线 matte；不调大运行时阈值 | Harness |
| 图集超预算 | 超过 4096 或内存门禁 | 紧裁切、分离真实独立动作、重新预算；仍失败则从 D-123 起另立决策 | Harness / Codex |
| 滚动仍顿挫 | 多重缓动、帧未预载或重复写 DOM | 保留单一 smoothDamp、预解码、整数帧去重 | Harness |
| 绳子漂移 | 视觉端点误差超过 2px | 修正逐帧锚点或 Manifest，不用肉眼偏移常量补丁 | Harness |
| Home v2 角色突然重现 | 遮罩未覆盖即显示 Home | 延后 Home 可见性，不改 Home v2 构图 | Harness |
| 上游变更破坏流程 | oil-motion main 行为变化 | 固定 commit，升级必须单独验证 | Harness |
| 审批延迟 | 阶段结果超过 1 工作日未反馈 | 排期等量顺延，不压缩 QA | 包子 |

## 10. 状态汇报模板

Harness 每个 Checkpoint 结束后使用以下格式：

```text
Checkpoint：CPx
状态：PASS / BLOCKED / FAIL
完成日期：YYYY-MM-DD

完成内容：
- ...

交付物：
- 路径 / URL

自动化：
- 命令：结果

视觉证据：
- 桌面截图/录屏
- 移动截图/录屏

与计划差异：
- 无 / 具体差异

风险与阻塞：
- 根因
- 需要谁决定

下一步：
- 只列下一 Checkpoint，不提前实施
```

## 11. 最终完成定义

- D-121、Concept Contract、Motion Brief 和所有 Prompt 已归档。
- 人物、嘉乐正式母版、图集、Manifest、锚点和接触表齐全。
- 页面背景使用唯一的最新生产草地，不含 AI 生成背景。
- 启动页严格左进右出；嘉乐先退出，人物随后向右摔滑退出。
- 滚动正向、停止和反向表现连续，无明显 Sprite 顿挫。
- Home v2 遮罩交接、跳过和降级路径一致。
- 所有自动化和五视口视觉验收通过。
- 生产版本已发布，D-105 回滚已经演练。

## 12. 参考

- [oil-motion 仓库](https://github.com/oil-oil/oil-motion)
- [固定提交 a5a384c](https://github.com/oil-oil/oil-motion/commit/a5a384c804183d69529a85d2dcf84a7cfc99f7e4)
- [交付选择规则](https://github.com/oil-oil/oil-motion/blob/main/references/delivery-selection.md)
- [运行时规范](https://github.com/oil-oil/oil-motion/blob/main/references/runtime.md)
- [QA 规范](https://github.com/oil-oil/oil-motion/blob/main/references/qa.md)
