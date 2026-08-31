# baozi.space 混合动画实施计划（历史）

> **本计划已废止（D-121，2026-08-24）。** 其描述的「整屏 Seedance 预渲染视频」路线已被 oil-motion 帧映射方案取代。当前实施计划见根目录 `2026-08-21-baozi-space-oil-motion-project-plan.md`。本文仅保留历史，不再作为执行入口。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 AI 预渲染视频替换当前开场 Sprite 动作，并将视频无缝交接到 Home v2 的实时互动人物与嘉乐。

**Architecture:** 开场由一段正常向前播放的桌面/移动端视频负责；Astro、GSAP 与 DOM 管理触发、跳过、会话和降级。Home v2 使用 Rive 状态机承载人物注视和嘉乐环绕，视频与实时场景通过共同最终定帧交接。

**Tech Stack:** Astro 5、TypeScript、GSAP 3、ScrollTrigger、Rive Web Runtime、Seedance 2.5、WebM/VP9、MP4/H.264、Vitest、Playwright、Sharp、Bun。

**Spec:** `docs/superpowers/specs/2026-08-18-baozi-space-hybrid-animation-design.md`

## Global Constraints

- 保留 Astro 静态生成、Markdown Content Collections、TypeScript、原生 CSS 与 Bun。
- 不引入 React、Three.js、游戏引擎或滚动平滑库。
- 开场视频正常播放，不把滚动位置直接映射到视频 `currentTime`。
- 文案、按钮和导航必须是 DOM，不烘焙进视频。
- 关键开场资源总负载不超过 6MB。
- 保留 `prefers-reduced-motion`、会话跳过、显式跳过、素材失败和 JavaScript 禁用降级。
- B-lite 的绿、白、蓝、水彩草地、点阵纸和角色设定不得在实施中重新设计。

---

## 执行规则

- 一次只执行一个 Checkpoint；通过出口条件后再进入下一阶段。
- 每个 Checkpoint 都要保留截图、录屏或测试输出，避免只以“感觉更顺”作为结论。
- AI 视频与 Rive 两条工作流可以在 Checkpoint 2 后并行，但必须使用同一个 `handoff-final` 基准图。
- 如果某阶段触发停止条件，回到该阶段重新制作，不要在网站代码里用补丁掩盖素材问题。

## 总进度

- [x] CP0：统一规格与首页落点
- [x] CP1：冻结开场分镜和共同定帧
- [ ] CP2：完成 Seedance 桌面样片
- [ ] CP3：完成视频后期、移动端与 Web 编码
- [ ] CP4：完成 Rive 首页互动样片
- [ ] CP5：集成视频开场与 Home v2
- [ ] CP6：完成自动化、性能和视觉验收
- [ ] CP7：灰度发布并替换生产首页

---

### Task 1 / CP0：统一规格与首页落点

**Owner:** 包子负责视觉确认；Harness 负责文档与路由盘点。

**Files:**
- Modify（按仓库权威映射）：`docs/design/baozi-space-design-spec.md`（计划中的已删除 `baozi-space-spec.md` 不恢复）
- Modify: `README.md`
- Inspect: `src/pages/index.astro`
- Inspect: `src/pages/lab/intro.astro`
- Create: `docs/legacy/d-105-home.md`

**Interfaces:**
- Consumes: 当前 D-105 首页、B-lite 开场实验、混合动画设计规格。
- Produces: 唯一生产落点 `Home v2`、旧版回滚说明、后续素材采用的视觉基线。

- [x] 在 `docs/design/baozi-space-design-spec.md` 顶部写明当前生产方向为“B-lite 点阵纸 + 水彩草地 + 人物与嘉乐”。
- [x] 把“日式料亭木门开场”等历史方案移入 `docs/legacy/d-105-home.md`，不再与当前需求并列。
- [x] 在 `README.md` 更新真实技术栈：Astro 5、Content Collections、TypeScript、GSAP、Bun、Vitest、Playwright。
- [x] 标记 `src/pages/index.astro` 当前属于 D-105，保留回滚能力但不作为新开场落点。
- [x] 人工确认 Home v2 的桌面静态首屏：1440×900、暖白点阵纸、左侧中文信息、右侧人物与嘉乐。
- [x] 人工确认 Home v2 的移动静态首屏：390×844，信息与人物不得互相遮挡。
- [x] 确认 `/lab/intro` 与 `/` 后续共用 Home v2 组件，不再复制一套占位首页。
- [x] 提供 `/lab/home-v2` 双视口静态 Demo 与 1440×900、390×844 原尺寸评审截图；临时角色帧不计为 `handoff-final` 批准。
- [x] 冻结角色区域位置、尺寸与两角色关系；CP1 只调整具体动作姿态。

**Checkpoint 0 出口条件：**

- [x] 桌面和移动 Home v2 静态构图已经人工确认。
- [x] 文案、中文纸质索引导航、占位清理与最终居住地“上海”已经确认。
- [x] 角色区域位置、尺寸、地面线与两角色关系已经冻结；CP1 只调整具体动作姿态。
- [x] 无需播放动画，也能从设计规范 §6.2 明确看到视频最后将落在哪个页面状态。

**CP0 状态：** Passed（2026-08-19）。CP1 已放行，仅限冻结开场分镜与共同 `handoff-final`；仍不得提前生成 Seedance 视频或制作 Rive 动画。

---

### Task 2 / CP1：冻结分镜与共同定帧

**Owner:** 包子负责素材与视觉确认；视频制作工具负责样片。

**Files（按 D-120 Harness 修订）：**
- Create: `design-assets/intro/cp1/frames/intro-first-desktop.png`
- Create: `design-assets/intro/cp1/frames/intro-first-mobile.png`
- Create: `design-assets/intro/cp1/frames/handoff-final-desktop.png`
- Create: `design-assets/intro/cp1/frames/handoff-final-mobile.png`
- Create: `design-assets/intro/cp1/reference/person-reference.png`
- Create: `design-assets/intro/cp1/reference/jiale-reference.png`
- Create: `design-assets/intro/cp1/reference/style-reference.png`
- Create: `design-assets/intro/cp1/review-only/home-v2-composite-{desktop,mobile}.png`
- Create: `design-assets/intro/cp1/handoff-coordinates.json`
- Create: `design-assets/intro/cp1/harness-cp1-audit.json`
- Create: `docs/animation/intro-shot-list.md`

**Interfaces:**
- Consumes: CP0 批准的 Home v2 静态首屏、生产人物 / 嘉乐模型表、生产 Sprite 和现有动画录屏。
- Produces: Seedance、视频后期、Rive 与网站交接共同使用的定帧资产。

- [x] 从当前实验导出精确 6.000 秒纯动作参考，不保留浏览器工具栏和调试控件。
- [x] 从人物生产设定源表导出 2400px 参考，包含正面、左右侧、背面、服装、渔夫帽、眼镜和跑姿。
- [x] 从嘉乐生产设定源表导出 2400px 参考，包含正面、左右侧、背面、青色项圈、体型与毛发细节。
- [x] 制作无文字风格板，只包含点阵纸、B-lite 草地、白描边和绿 / 暖白 / 深蓝 / 黄色色板。
- [x] 制作桌面 `1440×900` 与移动 `390×844` 第一帧；第 0 帧无人、无狗、无球。
- [x] 从真实 Home v2 capture mode 导出桌面与移动 `handoff-final`；保留人物、嘉乐、阴影、大纸和靛蓝下一分区，不从 AI 视频或手工合成中获取。
- [x] 在 `intro-shot-list.md` 按外部 Seedance 执行包冻结 0.0–6.0 秒六区间动作表，镜头完全静止。
- [x] 明确视频无文字、无 UI、无声音、无镜头推拉、无背景漂移，最后 3 帧静止。
- [x] 记录人物脚底、嘉乐中心 / 脚底、点阵原点和下一分区顶部的 px / 归一化坐标。
- [x] 以成品 metadata、Alpha、SHA-256、完整页面 / capture mode 稳定几何和像素差完成 Harness 输入预检；生成视频核验留在 CP2。

**Checkpoint 1 出口条件：**

- [x] 第一帧与最终帧均能作为独立网页静态图使用。
- [x] 人物和嘉乐的 2400px 模型表足以判断生成结果是否“还是同一个角色”。
- [x] `handoff-final` 中人物脚底、嘉乐中心 / 脚底、点阵原点和下一分区顶部都有可测量坐标。
- [x] 完整 Home v2 与 capture mode 稳定几何一致，差异像素仅位于隐藏的 DOM/UI 区域。

**CP1 状态：** Passed（2026-08-20，D-120）。D-119 的旧首帧球、1080×1920 中心裁切、旧角色方向板和旧 hash 已废弃。CP2 只放行首轮 3 条 Seedance 桌面 720p 候选；不得改变冻结首尾帧、坐标或角色构图，也不得把 CP1 预检误写成生成视频已通过。

---

### Task 3 / CP2：制作 Seedance 桌面样片

**Owner:** 包子执行生成并挑选；Harness 记录版本与验收结果。

**Files:**
- Create: `public/assets/intro/review/desktop-take-01.mp4`
- Create: `public/assets/intro/review/desktop-take-02.mp4`
- Create: `public/assets/intro/review/desktop-take-03.mp4`
- Create: `docs/animation/seedance-generation-log.md`

**Interfaces:**
- Consumes: CP1 的第一帧、最终帧、人物/嘉乐参考和动作参考。
- Produces: 一条可进入后期的桌面母版候选。

- [ ] 优先使用 Seedance 2.5 的首尾帧/参考生成；不可用时使用 Seedance 2.0。
- [ ] 同时提供人物设定图、嘉乐设定图、现有 motion reference、第一帧和最终帧。
- [ ] 第一轮只生成 3 条桌面样片，不制作移动端。
- [ ] 每次生成后记录模型版本、参考文件、提示词、时长、比例和 Seed/任务 ID。
- [ ] 逐帧检查人物帽子、衣服图案、手脚数量、嘉乐脸型、项圈和尾巴。
- [ ] 检查草地与点阵背景是否静止，不能出现呼吸、漂移和自动运镜。
- [ ] 检查人物靠近镜头时是否保持同一画风和正确透视。
- [ ] 将牵引绳单独标记为“可后期修复”或“不可修复”；绳子问题不能掩盖角色变形。
- [ ] 选择一条候选，写明淘汰另外两条的具体原因。

**Checkpoint 2 出口条件：**

- [ ] 至少一条样片的人物与嘉乐在整段中身份稳定，无多余肢体和明显变脸。
- [ ] 固定背景没有可见漂移。
- [ ] 最后一秒能够自然收敛到 `handoff-final` 构图。
- [ ] 除牵引绳和少量遮罩外，不需要逐帧重画人物或嘉乐。

**停止条件：** 连续两轮、最多 6 条样片仍无法稳定角色或固定背景时，停止追加生成；改用 Rive/人工关键帧制作开场，不继续消耗生成次数。

---

### Task 4 / CP3：视频后期、移动端与 Web 编码

**Owner:** 包子负责成片；Harness 负责编码、资产审计与网页规格验证。

**Files:**
- Create: `public/assets/intro/video/intro-desktop.webm`
- Create: `public/assets/intro/video/intro-desktop.mp4`
- Create: `public/assets/intro/video/intro-mobile.webm`
- Create: `public/assets/intro/video/intro-mobile.mp4`
- Create: `public/assets/intro/video/intro-desktop-poster.webp`
- Create: `public/assets/intro/video/intro-mobile-poster.webp`
- Create: `scripts/audit-intro-video.mjs`
- Test: `tests/assets/intro-video.test.ts`

**Interfaces:**
- Consumes: CP2 批准的桌面候选和 CP1 的最终定帧。
- Produces: 浏览器可直接使用的四个视频源与两个 Poster。

- [ ] 在合成工具中重新绘制或跟踪牵引绳，确保人物握持点与蓝色项圈稳定连接。
- [ ] 清理生成视频中的边缘闪烁、局部变形、背景漂移和最后一帧抖动。
- [ ] 最后 2–3 帧保持 `handoff-final` 静止，给浏览器交接留出稳定窗口。
- [ ] 依据同一动作表生成或重构 9:16 移动版，不直接裁掉桌面版关键角色。
- [ ] 移除音轨。
- [ ] 导出桌面和移动 WebM/VP9。
- [ ] 导出桌面和移动 MP4/H.264 回退源。
- [ ] Poster 使用对应第一帧，不从视频中选择不同构图。
- [ ] 编写资产审计，验证时长 5–7 秒、帧率一致、无音轨、尺寸正确、文件存在。
- [ ] 将桌面首选视频压到 4.5MB 以内，移动首选视频压到 3MB 以内。
- [ ] 运行资产测试：`bunx vitest run tests/assets/intro-video.test.ts`。

**Checkpoint 3 出口条件：**

- [ ] Chrome、Safari 和 Firefox 至少各自能播放一组兼容源。
- [ ] 浏览器只下载适合当前视口和格式的一份视频。
- [ ] 第一帧不黑屏，最后一帧无抖动，视频无音轨。
- [ ] 开场关键资源总量不超过 6MB。

**停止条件：** 为压缩体积导致人物白边破碎、点阵纸色带或草地大面积块状失真时，回到编码参数，不继续集成。

---

### Task 5 / CP4：制作 Rive 首页互动样片

**Owner:** 包子负责分层素材与观感；Harness 负责 Rive Runtime POC。

**Files:**
- Create: `public/assets/home/rive/baozi-home-v1.riv`
- Create: `public/assets/home/rive/home-fallback.webp`
- Create: `src/scripts/home/orbit-state.ts`
- Test: `src/scripts/home/orbit-state.test.ts`
- Create: `src/pages/lab/orbit-v3.astro`

**Interfaces:**
- Consumes: `handoff-final`、人物/嘉乐参考和 Home v2 轨道规则。
- Produces: `orbitAngle`、`speed`、`depth`、`lookX`、`lookY` 可控的互动样片。

- [ ] 人物至少拆分为身体、头部、前景手臂和阴影；身体不做 12 方位整图淡化。
- [ ] 嘉乐至少拆分为躯干、头、耳朵、前后腿、尾巴和阴影。
- [ ] 先制作一个象限的步态与人物注视样片，不先完成整圈。
- [ ] 在 Rive 中建立输入：`orbitAngle`、`speed`、`depth`、`lookX`、`lookY`。
- [ ] 建立前/后层级状态，不通过整个角色透明度闪烁实现遮挡。
- [ ] 在 `orbit-state.ts` 实现最短角度插值、角速度限制、角加速度限制和椭圆投影纯函数。
- [ ] 先写最短路径、±π 跨界、停止、深度层级和步态距离的失败测试。
- [ ] 运行：`bunx vitest run src/scripts/home/orbit-state.test.ts`，确认失败来自尚未实现的行为。
- [ ] 实现最小状态计算并重新运行同一测试至通过。
- [ ] 在 `/lab/orbit-v3` 接入原生 Rive Web JS Runtime，不引入 React。
- [ ] 用鼠标、触摸和键盘测试一个象限，确认人物只转头/轻微转身。
- [ ] 通过一个象限后再扩展完整环绕与全部方位。
- [ ] 静止后确认动画状态停止推进，不持续占用渲染循环。

**Checkpoint 4 出口条件：**

- [ ] 嘉乐连续移动时没有整图重影、脚底漂移和角度跳回。
- [ ] 人物身体重心稳定，头部注视方向自然。
- [ ] 水彩纹理、白色描边和斑驳感没有因骨骼变形而变成塑料矢量质感。
- [ ] 中等性能设备上的互动接近 60fps，输入停止后 CPU 占用明显回落。

**明确回退：** 若 Rive 无法保留水彩质感，则停止扩展 `.riv` 文件，改用 16 方位 × 4–6 步态帧、统一脚底枢轴的 WebP Sprite；仍复用 `orbit-state.ts` 的连续角度和步态距离逻辑。

---

### Task 6 / CP5：集成视频开场与 Home v2

**Owner:** Harness 实现；包子验收交接观感。

**Files:**
- Create: `src/components/intro/CinematicIntro.astro`
- Create: `src/components/home/HomeHero.astro`
- Create: `src/components/home/HomeOrbit.astro`
- Create: `src/scripts/intro/cinematic-controller.ts`
- Create: `src/data/intro/cinematic-manifest.ts`
- Modify: `src/pages/lab/intro.astro`
- Modify: `src/pages/index.astro`
- Test: `src/scripts/intro/cinematic-controller.test.ts`
- Test: `tests/e2e/intro-home-handoff.spec.ts`

**Interfaces:**
- Consumes: CP3 视频资产、CP4 互动资产、共同 `handoff-final`。
- Produces: 首次访问、跳过、会话、降级和正常首页使用的完整状态机。

- [ ] 定义状态：`poster`、`playing`、`handoff`、`home`、`skipped`、`failed`。
- [ ] 先为首次触发、重复输入、跳过、视频失败、会话完成和减弱动态写失败测试。
- [ ] 运行：`bunx vitest run src/scripts/intro/cinematic-controller.test.ts`。
- [ ] 实现 `cinematic-controller.ts`，确保每种路径最终只进入一次 `home`。
- [ ] 在 `CinematicIntro.astro` 使用 `<video muted playsinline preload="auto">` 和桌面/移动兼容源。
- [ ] 第一次明确输入只启动正常播放，不设置连续 `currentTime`。
- [ ] 播放期间固定舞台；保留始终可用的“跳过动画”按钮。
- [ ] 在视频播放期间初始化 Home v2 和互动资产。
- [ ] 视频结束时保持最后帧，确认 Home v2 已准备后切换。
- [ ] 交接后销毁视频事件、释放不再使用的引用并恢复页面滚动。
- [ ] `/lab/intro` 与 `/` 复用 `HomeHero` 和 `HomeOrbit`，删除实验页中的占位首页。
- [ ] `prefers-reduced-motion`、会话完成、跳过和媒体失败均直接进入同一个 Home v2。
- [ ] 编写 Playwright 用例，比较交接前后人物脚底、嘉乐中心和纸张原点。
- [ ] 运行：`bunx playwright test tests/e2e/intro-home-handoff.spec.ts`。

**Checkpoint 5 出口条件：**

- [ ] 正常播放、跳过、第二次访问、减弱动态和失败五条路径都落到同一个首页。
- [ ] 视频末帧切换到实时首页时肉眼看不到角色平移、缩放、换色或白闪。
- [ ] 首页滚动、文字选择、链接和键盘导航均正常。

**停止条件：** 如果需要用超过 200ms 的明显淡化掩盖交接跳变，说明两端定帧仍未对齐，应回到 CP1/CP3，而不是继续延长淡化。

---

### Task 7 / CP6：自动化、性能与视觉验收

**Owner:** Harness 执行自动化；包子完成最终视觉验收。

**Files:**
- Create: `tests/e2e/intro-video.spec.ts`
- Create: `tests/e2e/home-orbit.spec.ts`
- Create: `tests/e2e/motion-fallbacks.spec.ts`
- Modify: `scripts/audit-intro-video.mjs`
- Create: `docs/animation/qa-report.md`

**Interfaces:**
- Consumes: CP5 完整实现。
- Produces: 可发布证据与问题清单。

- [ ] 测试桌面视口：1280×720、1440×900、1920×1080。
- [ ] 测试移动视口：390×844、430×932。
- [ ] 测试 Chrome、Safari/WebKit、Firefox；Windows 补测 Edge。
- [ ] 测试慢速网络下 Poster、视频启动和失败回退。
- [ ] 测试首次输入后只播放一次，不因滚轮连续事件重复启动。
- [ ] 测试跳过按钮在键盘和触摸下可用。
- [ ] 测试 `prefers-reduced-motion` 不下载非必要互动资源。
- [ ] 测试 sessionStorage 完成标记的写入、刷新和新会话行为。
- [ ] 测试嘉乐跨越 ±π 时选择最短路径，不倒转整圈。
- [ ] 测试人物前后层级切换没有快速闪烁。
- [ ] 使用视频帧回调或浏览器媒体指标记录 dropped frames；正常设备播放丢帧率目标低于 2%。
- [ ] 使用 Performance 面板确认首页互动无持续长任务，静止后没有常驻 GSAP ticker。
- [ ] 录制五个视口的完整开场与交接视频，写入 `qa-report.md`。
- [ ] 运行：`bunx astro check`。
- [ ] 运行：`bunx vitest run`。
- [ ] 运行：`bunx playwright test`。
- [ ] 运行：`bun run build`。
- [ ] 运行生产素材体积、Alpha、尺寸、音轨和 placeholder 泄漏审计。

**Checkpoint 6 出口条件：**

- [ ] 所有自动化检查退出码为 0。
- [ ] 五个视口都无黑帧、白闪、内容溢出和明显交接跳变。
- [ ] 视频播放丢帧率达到目标，Home Orbit 视觉上连续。
- [ ] 包子在录屏上确认人物、嘉乐、牵引绳和首页风格一致。

---

### Task 8 / CP7：灰度发布与生产替换

**Owner:** Harness 发布；包子最终确认。

**Files:**
- Modify: `src/pages/index.astro`
- Preserve: D-105 回滚入口或 Git tag
- Update: `README.md`
- Update: `docs/design/baozi-space-design-spec.md`
- Update: `docs/animation/qa-report.md`

**Interfaces:**
- Consumes: CP6 已验证构建。
- Produces: 正式 Home v2 与可回滚发布记录。

- [ ] 先部署到 `/lab/intro-v3`，使用生产 CDN、缓存和压缩配置验证真实下载体积。
- [ ] 在真实域名环境检查 Range Request、缓存命中和首屏加载。
- [ ] 清除测试会话后完成一次真实首次访问录屏。
- [ ] 完成一次跳过、一次减弱动态和一次视频加载失败演练。
- [ ] 标记可回滚的 D-105 commit/tag。
- [ ] 将 Home v2 接入 `/`，保留实验路由一轮发布周期。
- [ ] 发布后检查错误日志、媒体加载失败和 Core Web Vitals。
- [ ] 确认稳定后，在 README 与规格中将混合动画标记为生产基线。

**Checkpoint 7 出口条件：**

- [ ] 生产首页与 `/lab/intro-v3` 表现一致。
- [ ] 有明确、经过演练的 D-105 回滚方法。
- [ ] 发布后未出现集中视频加载失败、交接白屏或交互不可用。

---

## 每次提交给 Harness 的建议粒度

不要一次发送整份计划要求全部实现。建议按以下顺序逐条下发：

1. “只执行 CP0，更新规格并输出 Home v2 静态首屏差异，不改动画。”
2. “只执行 CP1，建立素材目录、分镜和 handoff 坐标说明，不接入模型。”
3. “只审计 CP2 的候选视频，不改网站代码。”
4. “只执行 CP3 的后期资产接收、编码和审计。”
5. “只执行 CP4 的一个象限 Rive POC，通过后再做整圈。”
6. “只执行 CP5 的状态机与交接，使用已批准资产。”
7. “只执行 CP6，发现问题先回报根因，不直接重构。”
8. “CP6 全绿后再执行 CP7 发布。”

## 最终交付物清单

- [ ] 当前版产品规格与旧版归档
- [ ] 桌面/移动第一帧和 `handoff-final`
- [ ] 人物与嘉乐参考图
- [ ] 动作参考与 6 秒分镜表
- [ ] 桌面/移动 WebM、MP4 与 Poster
- [ ] 生成记录和视频资产审计
- [ ] Rive 文件或经过门禁批准的 16 方位 Sprite 回退
- [ ] Home v2 共用组件与统一状态机
- [ ] Vitest、Playwright、Astro check 与构建输出
- [ ] 五个视口录屏与 QA 报告
- [ ] 生产发布和 D-105 回滚记录
