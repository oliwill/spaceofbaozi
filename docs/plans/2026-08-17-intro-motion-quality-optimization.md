# Intro 动画正确性与顺滑度优化计划

**日期：** 2026-08-17  
**范围：** `/lab/intro` 牵引绳、滚动动画与 Home Orbit 衔接；不进入阶段 B，不修改内容系统或正式首页。  
**当前技术栈：** Astro 5 + GSAP 3 / ScrollTrigger + DOM/CSS Sprite Sheet + SVG Bézier leash + 原生 CSS；Home Orbit 使用 TypeScript 弹簧积分器与 `requestAnimationFrame`；Sharp 负责资产审计，Vitest / Playwright 负责验证。

## 1. 已确认问题与证据

### 1.1 牵引绳脱手

根因是人物 wrapper 的旋转没有进入 hand anchor 的坐标投影：

- `src/lib/intro/createTimeline.ts` 在 65%–82% 把人物绕 `transform-origin: 50% 100%` 从 `0°` 旋转到 `18°`；
- leash 手端仍按未旋转的 `offsetTop + translate + spriteSize × anchor` 计算；
- 1440×900 运行时测量：45% 误差 `0.0002px`、65% `0.0004px`、72% `33.73px`、78% `23.16px`、81.9% `72.07px`；
- 现有 Playwright 只在 45%（rotation=0）断言 `<1px`，没有覆盖穿帮区间。

逐帧 manifest hand anchor 仍需在修正旋转投影后做视觉审计，但它是次级风险，不能先用运行时特例补偿。

### 1.2 启动动画 / 转向不顺

已确认四个叠加来源：

1. 1440×900 下 300vh 舞台只有 1800px 有效滚动，94%–100% 半圈只占 `108px`；人物 12 方位约每 `18px` 跳一帧，嘉乐 8 方位约每 `27px` 跳一帧。
2. Intro 的 ScrollTrigger 与 Home Orbit 的常驻 RAF 同时驱动画面；Orbit 未显示时仍约执行 `120` 次 `getBoundingClientRect` / 秒。
3. `handoff()` 每次滚动更新调用 `render(1)`，把 `1 秒` 假 dt 写入步态与人物注视；姿态节奏取决于滚动事件次数，不是实际时间。
4. 一次 121 帧程序化滚动产生 190 次 Layout、206 次 Recalculate Style；累计 layout 约 9.5ms、style recalculation 约 58.7ms、main-thread task 约 263.8ms。问题不是单次长任务，而是无效持续工作与方向离散跳变共同放大。

8–10fps 定格姿态本身是设计合同，不应被误判为性能故障。需要优化的是连续位移、方向切换和采样节奏。

## 2. 技术选型决策

### 2.1 继续使用当前栈

本轮保持 Astro + GSAP + DOM/CSS Sprite + SVG：

- 画面只有球、嘉乐、人物和一条绳，未达到 WebGL 批处理的收益区间；
- hand/collar anchor、跨 sheet 连续性和 8 / 12 方位离散帧属于数据与时间线问题，Three.js / PixiJS 不会自动修复；
- Three.js Sprite 只有对象级 `center`，逐帧 atlas、透明材质、世界坐标投影到 SVG、静态 HTML 回退和无障碍都要重新实现；
- 当前设计规范 `docs/design/baozi-space-design-spec.md` §12.1 明确规定首版仅在 DOM + GSAP 无法满足需求时才评估 Three.js / PixiJS。

允许使用现有 GSAP API：`gsap.quickSetter()`、`gsap.ticker.add/remove()`、`ScrollTrigger` 数值 `scrub`；允许使用 `DOMMatrix` / 纯函数投影与 `ResizeObserver` 缓存几何。

### 2.2 迁移门槛

完成本计划 Phase 1–3 后，满足任一条件才启动独立 PixiJS spike：

- scrub 期间持续出现单次 `>50ms` Long Task；
- 排除 9fps 定格切帧后，`>18ms` 帧占比仍超过 5%；
- 同屏需要超过 3 个持续逐帧透明角色，DOM paint / composite 已被 trace 证明是主瓶颈；
- 产品明确改为真实 3D 模型、相机透视或灯光，此时才评估 Three.js。

若只需要大量 2D Sprite，优先 PixiJS `AnimatedSprite` / `updateAnchor`，不是 Three.js。

## 3. Phase 0 — 建立可复现基线

### 工作

- 在 `?debugIntro=1` 补充手端、项圈端、旋转后真实锚点、误差 px、当前 action / frame / rotation。
- 把 65%、70%、72%、75%、78%、80%、81.9% 加入诊断采样，不改变正式八节点截图合同。
- 录制同一滚轮输入下的 0%–100%、94%–100% 和反向回滚 Performance trace；记录 RAF delta、Layout、Recalculate Style、Paint。
- 用户确认“不顺滑”主要指：A. 94%–100% 人物 / 嘉乐转向；B. 前段球旋转；C. 整体滚动。默认按 A 处理，同时保留 B 的独立诊断分支。

### 验证

- 当前代码在 trip 区间稳定复现 leash hand error `>20px`。
- 当前 94%–100% 确认为 108px 滚动映射。
- 空闲 Orbit 仍有约 120 次几何读取 / 秒。

### 禁止

- 不先调 manifest anchor 掩盖旋转数学错误。
- 不用肉眼录屏替代数值基线。

## 4. Phase 1 — 修复牵引绳坐标正确性

### 文件与实现

- 新建 `src/lib/intro/projectActorAnchor.ts`：输入 wrapper 本地原点、sprite 尺寸、归一化 anchor、translate 与 rotation，输出 stage CSS pixel 坐标。
- `createTimeline.ts` 的 hand / collar 都调用同一纯函数；旋转中心固定为 wrapper `50% 100%`，与 CSS 完全一致。
- actor 尺寸、offsetTop 与 SVG viewBox 只在初始化和 `ResizeObserver` 回调中读取；每帧只使用缓存数据。
- leash path 继续使用现有 `leashPath()`，不改变 Bézier 语义。
- 修正后人工复查 production `personTrip` f3→f4、f6→f7 的 hand anchor 是否落在手掌；只有像素证据仍失败时才修改 manifest。

### 测试

- 单元测试：0° / 7.4° / 13.8° / 18° 投影与 `DOMMatrix` 参考值一致。
- Playwright：65%–81.9% 全采样点 hand / collar endpoint error `<2px`，覆盖 1280×720、1440×900、1920×1080。
- 正反滚动均执行同一断言。

### 禁止

- 不添加逐帧 `if (frame===n)` 特例偏移。
- 不把 leash 嵌进人物图片或烘焙进 Sprite。
- 不继续混用写后读取 `offset*` 的坐标计算。

## 5. Phase 2 — 单一渲染时钟与零空闲工作

### 文件与实现

- `createHomeOrbit.ts` 缓存 root / person foot / radii；仅 ResizeObserver、handoff 或显式输入使缓存失效。
- Orbit inactive 或已 settled 时移除 ticker / RAF；收到 handoff、pointer、touch、keyboard 后按需启动，重新 settled 后停止。
- 使用一个时钟：推荐接入现有 `gsap.ticker`，Intro 94%–100% 与交互 Orbit 不再同时各自 render 同一 DOM。
- 删除 `handoff() -> render(1)`；handoff 首帧使用 `dt=0`，随后使用 ticker 的真实 delta。
- Intro scroll phase 为 Orbit 提供确定性 `angle + phaseProgress`；步态帧由明确的 scroll pose progress 或真实 delta 二选一，不能由事件次数推进。
- batch：先读取缓存 / 状态，再集中写 transform、sprite frame、SVG path；值未变化时不重复写 CSS variable / dataset / viewBox。
- 优先直接写 compositor transform；高频 setter 可使用 `gsap.quickSetter()`。

### 验证

- Orbit inactive / settled 5 秒：0 次持续 RAF/ticker callback、0 次 layout。
- 0%–100% trace：无写后同步 layout；Layout / Recalculate Style 次数较基线至少下降 70%。
- handoff 前后位置、尺寸和层级 delta `<1px`；反向滚动不丢 DOM 所有权。

### 禁止

- 不同时保留裸 RAF 与 GSAP ticker。
- 不在每帧调用 `getBoundingClientRect()`。
- 不用固定 `dt` 或 `render(1)` 模拟真实时间。

## 6. Phase 3 — 调整感知顺滑度

按顺序实施，每一步录制 before / after，上一项已解决则不继续加效果。

1. 将 ScrollTrigger 从 `scrub: true` 实验为数值 scrub `0.15–0.20s`；确认反向滚动、跳过和 checkpoint 最终值不变。
2. 保持 8 / 12 方位素材不变，在方向切换边界做 80–120ms 双层 crossfade；不得对单张 2D Sprite 连续旋转冒充中间视角。
3. 若 94%–100% 仍过密，提交设计决策后把自动半圈窗口扩为 92%–100% 或 90%–100%，同步动画合同和 checkpoint；不得私自改变叙事顺序。
4. 使用 `ground` anchor 钉住每帧脚底，消除姿态切帧时的上下漂移 / 滑冰感。
5. 若用户指的是球：确认 production `ballBounce` 是否已经包含旋转；只保留 Sprite 内旋转或 wrapper 540° 旋转之一，避免双重旋转混叠。
6. trace 仍显示 Sprite 换帧 paint 明显时，再评估把动态 `filter: drop-shadow()` 改为独立静态 shadow 层；不先重制素材。

### 验证

- 94%–100% 慢滚、触控板快扫、滚轮单格、反向滚动四种输入录屏。
- 方向边界前后截图无双影停留、无径向朝向、无人物提前看目标点。
- `prefers-reduced-motion` 仍只使用四个固定位置，不新增连续运动。
- 1440×900 基准之外复查 1280×720 与 1920×1080。

## 7. Phase 4 — 回归与迁移决策

### 自动验证

```powershell
bun run test:unit
bun run test:e2e
bun run check
bun run build
bun run assets:intro:audit:production
```

额外输出：

- trip 全区间 leash endpoint 最大误差；
- 空闲 layout / ticker 次数；
- `>18ms` 帧占比与 `>50ms` Long Task 数；
- 94%–100% 正反向录屏；
- 0° / 90° / 180° / 270° Orbit 截图；
- 三桌面视口与 reduced-motion 截图。

### 决策

- 指标达标：保留 DOM + GSAP，更新 D-114 与 Obsidian 稳定事实。
- 指标不达标且触发迁移门槛：只创建隔离 `/lab/intro-pixi` spike，对同一素材、同一滚动输入、同一测试数据做 A/B；通过前不替换生产实现。
- Three.js 仅在产品需求变为真实 3D 后另立设计决策，不作为本轮性能修复手段。

## 8. 2026-08-17 实施结果

- Phase 1：旋转感知 hand / collar 投影已完成；三桌面视口 trip 区间绳端最大误差约 `0.004px`。
- Phase 2：Home Orbit 已改为按需 `gsap.ticker`，缓存布局并移除 `render(1)` / 裸 RAF；settled 500ms 几何读取为 0。
- Phase 3：双层方向 Sprite 使用 `100ms` opacity crossfade，reduced motion 使用固定位置、接触帧和 `180ms` 淡化；ground anchor 同时校正逐帧与旋转，地面线误差 `<0.2px`。
- numeric scrub `0.18s` 实验因最大滚动长期停在 `0.983`、无法触发完成状态而回退；继续使用 `scrub: true` 直接映射。
- 最终门禁：unit `40/40`、Playwright `37/37`、Astro check `0 errors`、build `24 pages`、production audit 通过。保留当前 DOM + GSAP 架构，不启动 PixiJS / Three.js spike。

## 9. 2026-08-18 D-115 视觉门禁修正

- Intro 站起终点、Home Orbit 与静态失败回退共享 `--intro-identity-x: 28%`，人物与嘉乐进入未来首页左侧身份区；A1 占位文案移至右列并使用稳定语义断行。
- 大纸从 78% 开始轻移淡入，与草地 78%–82% 退出重叠；首帧增加无文案滚动提示，开始后隐藏；完成态隐藏跳过控件。
- 自动半圈从 `0.94–1.00` 扩为 `0.90–1.00`，继续使用 `scrub: true`、双层 `100ms` 方位淡化与可逆直接映射。
- 浏览器 1440×900 实测人物中心 `539.27px`、占位文案起点 `608.72px`；100% 无输入停留 2 秒前后角度均为 `0.6108652381980155`，82%→100% 回滚 / 恢复正确。
- 最终门禁：unit `40/40`、Playwright `38/38`、Astro check `0 errors`、build `24 pages`、production audit `pass`；图片负载仍为 `3,474,820 bytes`。阶段 B 继续等待用户复核。

