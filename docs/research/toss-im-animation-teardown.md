# toss.im/en-us 技术与动效拆解报告

> 探测方式：Playwright + Chrome DevTools Protocol，6 轮运行时探测 + 全资源落盘离线分析
> 探测时间：2026-08-31 · 视口 1440×900 · 环境 headless Chromium
> 原始数据：`E:\baozi\.workbuddy\tmp-toss\`（probe.json ~ probe6.json + assets/）

---

## 0. 一句话结论

Toss 的动效系统 = **12 个 CSS Sticky 舞台**（滚动行程骨架）+ **三种驱动机制**（滚动连续映射 / whileInView 离散入场 / Canvas 序列帧）+ **一套手工调过的缓动曲线族**。

架构本身克制且可复用，但**资源投入极重**：3.89 MB 序列帧 + 6 个视频 + 单页 50993px（56 屏）+ 峰值 271 个并发动画。这是"用资源堆出来的效果"，不是"优化出来的效果"。

---

## 1. 技术栈全景

| 层 | 技术 | 探测证据 |
|---|---|---|
| 框架 | **Next.js App Router** | chunk 命名 `main-app-*`、`layout-*`、`page-*`、`global-error-*`；webpack runtime `webpack-7e01637b627edbd6.js` |
| UI | **React** | react-dom 指纹命中 |
| 样式 | **Emotion**（CSS-in-JS） | 双轨哈希类名 `css-xxxxxx` / `_1qfyx5k0`；17→24 个按路由拆分的 .css 文件 |
| 动效 | **Framer Motion** | `MotionValue` / `transformTemplate` / `whileInView` / `staggerChildren` / `reducedMotion`；**`linear(0, 0.0093, ...)` 弹簧烘焙缓动**（决定性证据） |
| 平滑滚动 | **Lenis** | smooth-scroll 指纹 |
| 矢量动画 | **lottie-web 5.7.5** | 2 个运行时实例；`static.toss.im/lotties/*.json` 6 个请求 |
| 轮播 | **Swiper** | 指纹命中 |
| 序列帧 | **自研 Canvas 2D 引擎** | 138 帧 AVIF → `fetch` → `createImageBitmap` → `drawImage` |
| 监控 | **Sentry** | `o467065.ingest.us.sentry.io/api/4509173471903744/envelope/` |
| 字体 | **Toss Product Sans OTF** | 单一字族 5 字重（400/500/600/700/800），全部 loaded |
| CDN | `static.toss.im` | 静态资源全量外链 |

**未使用**（已验证）：GSAP、Three.js / WebGL、PixiJS、Rive、View Transition API（`document.startViewTransition` 可用但未调用）、Tailwind。

> 值得记一笔：**7 个 Canvas 全部是 2D 上下文，零 WebGL**。序列帧这种通常会上 WebGL 的场景，他们选择老老实实用 2D。

---

## 2. 资源预算

| 类别 | 首屏 | 滚完全页 | 备注 |
|---|---|---|---|
| 请求总数 | 233 | 396 | |
| JS chunk | 36 | 44 | Next.js 分包 |
| CSS | 17 | 24 | Emotion 按路由产出 |
| 图片 | 36 | 55 | |
| fetch/XHR | 249 | — | 其中 **138 个是序列帧** |
| 视频 | 1 | 6 | |
| Canvas | 2 | 7 | 全 2D |
| DOM 节点 | 1884 | 2987 | 渐进挂载 |

**序列帧专项**：
- 138 帧 `hero-frame-3-en/frame_00001~00138.avif`，**总计 3.89 MB，平均 28.5 KB/帧**（13 KB ~ 933 KB）
- 按 locale 分目录：`hero-frame-3-en/`（英文）/ `hero-frame-3/`（韩文）
- 首帧先落 `frame_00001.webp`（45.6 KB）做快速首显，再切 AVIF

**视频**：`intro-main.mp4`（4.05s，muted+loop+autoplay，hero 背景）、`payout.mp4`、`miniapp-video-1~4.mp4`（5~10s 按需播放）

**文档高度 50993px ≈ 56 屏**。

---

## 3. 动画架构：Sticky 舞台模式（核心）

### 3.1 结构

全站 12 个舞台共用同一套 DOM + CSS 骨架：

```html
<!-- 超高容器：提供滚动行程，高度 = 视口高 × 钉住屏数 -->
<div class="_1qfyx5k0" style="position: relative; height: 2701px;">
  <!-- 钉住的视口：高度写死为精确 px，不是 100vh -->
  <div class="_1qfyx5k1" style="position: sticky; top: 0px;
                              height: 900.364px; overflow: hidden;">
    ...舞台内容（由 JS 按滚动进度驱动）
  </div>
</div>
```

两个关键细节：

1. **`height: 900.364px` 是 JS 计算后写入的精确像素**，不是 `100vh`。规避移动端浏览器地址栏收起/展开导致的 `100vh` 抖动 —— 这是最能看出工程成熟度的细节之一。
2. 容器 `overflow: visible`，舞台 `overflow: hidden`（部分舞台舞台不加 hidden，允许内容溢出舞台做穿插）。

### 3.2 12 个舞台的行程表

| 起点 y | 容器高 | 钉住屏数 | 说明 |
|---|---|---|---|
| 0 | 2701 | 3.0 | hero 内层 |
| 0 | 8553 | 9.5 | hero 外层（嵌套） |
| 1200 | 5852 | 6.5 | |
| 4800 | 4839 | 5.4 | |
| 12000 | 4502 | 5.0 | |
| 15600 | 4754 | 5.3 | |
| 20400 | 2250 | 2.5 | |
| 24000 | 2326 | 2.6 | |
| 27600 | 2582 | 2.9 | |
| 31200 | 2900 | 3.2 | |
| 32400 | 9299 | 10.3 | POS 大舞台 |
| 32400 | 9299 | 10.3 | 嵌套内层 |

> y=0 和 y=32400 各有两个同起点舞台 —— **嵌套舞台**：外层大舞台锁定总时长，内部再分段做子叙事。这是把"章节"概念映射到滚动行程的手法。

---

## 4. 三种驱动机制

### A. Scroll-linked（滚动进度 → 属性连续映射）

- Framer Motion `useScroll({ target: ref, offset: [...] })` + `useTransform`
- 用于 sticky 舞台内部，进度 0→1 连续驱动 transform / opacity / filter
- 观测到的连续映射样例（y=33466 长舞台）：外层 `scale(1)` 保持不变，内层文字 `translateY(40px) → 0`

### B. whileInView 入场（离散触发，带 stagger）

- 位移：`translateY(40px) → translateY(0)`
- 透明度：`opacity 0 → 1`
- **错峰证据**（同一时刻三个元素的 y 位移分别是 `1.34px` / `3.82px` / `6.97px`）—— 明显的 staggerChildren
- 全站 **62 个 IntersectionObserver** 实例

### C. Canvas 序列帧（Hero 主视觉）

```
滚动进度 p → 帧索引 i = floor(p × 138)
         → fetch(hero-frame-3-en/frame_${i}.avif)
         → createImageBitmap()
         → ctx.drawImage(bitmap, 0, 0)   // 1440×900 的 2D canvas
```

- Hero 舞台钉住区间：y ≈ 3000 → 7000（约 4000px 行程 / 138 帧 ≈ **每 29px 滚动推进一帧**）
- 探测中 `drawImage` 调用计数随滚动从 2 → 13 → 24 → 32 递增，越过舞台后停止 —— 严格的按需绘制
- 另有 `hero-phone-frame4.png` 手机序列帧

---

## 5. 动效参数库（165 次 WAAPI 调用统计）

### 5.1 Duration 阶梯

| 时长 | 次数 | 用途推断 |
|---|---|---|
| 2900 ms | 19 | 慢速大转场 / 长镜头 |
| 1000 ms | 24 | 主要叙事动效 |
| 870 ms | 36 | **出场主档** |
| 800 ms | 36 | **入场主档** |
| 700 / 500 / 400 / 320 / 200 / 160 ms | 47 | 微交互、hover、局部 |

注意 800/870 各 36 次 —— 成对出现，典型的「入场 800ms / 出场 870ms」不对称设计。

### 5.2 Easing 曲线族

| 曲线 | 次数 | 性格 |
|---|---|---|
| `linear` | 56 | 序列帧、进度驱动（天然线性） |
| `cubic-bezier(0.37, 0.31, 0, 1)` | 24 | **Toss 自定义招牌缓动**，慢起猛冲急停 |
| `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | 22 | easeOutQuad |
| `cubic-bezier(0.25, 0.1, 0.25, 1)` | 22 | 近 CSS 默认 ease |
| `cubic-bezier(0.16, 1, 0.3, 1)` | 12 | **expo-out**，快出慢收 |
| `cubic-bezier(0.333, 0, 0.666, 0)` | 7 | 对称缓入缓出 |
| `cubic-bezier(0.22, 1, 0.36, 1)` | 6 | **quint-out**，比 expo 更狠 |
| `cubic-bezier(0.5, 0, 0.88, 0.77)` | 6 | 强缓入 |
| `linear(...) 烘焙弹簧` | 6 | 见下 |

**没有任何一条使用 `ease` / `ease-in-out` 默认值**。全部手工调过，且主力是 **ease-out 家族**（快出慢收）—— 这是"物理感"与"高级感"的主要来源。

### 5.3 Framer Motion 弹簧烘焙曲线（可直接抄）

Framer Motion 11+ 会把 spring 预采样成 `linear()` 采样点喂给 WAAPI。抓到 3 条真实曲线：

```css
/* [1] 过冲弹簧（40 点，峰值 1.0151，弹性回弹）*/
--spring-overshoot: linear(0, 0.0235, 0.083, 0.1647, 0.2582, 0.3557, 0.4517,
  0.5423, 0.6252, 0.6991, 0.7636, 0.8186, 0.8647, 0.9025, 0.933, 0.9571,
  0.9756, 0.9895, 0.9996, 1.0065, 1.0111, 1.0137, 1.0149, 1.0151, 1.0146,
  1.0136, 1.0123, 1.0108, 1.0093, 1.0079, 1.0066, 1.0053, 1.0043, 1.0033,
  1.0025, 1.0019, 1.0013, 1.0009, 1.0006, 1);

/* [2] 临界阻尼弹簧（70 点，无过冲，丝滑收敛）*/
--spring-smooth: linear(0, 0.0093, 0.0337, 0.0689, 0.1113, 0.1583, 0.2079,
  0.2585, 0.309, 0.3584, 0.4063, 0.4521, 0.4956, 0.5366, 0.5751, 0.611,
  0.6444, 0.6753, 0.7038, 0.7302, 0.7543, 0.7765, 0.7969, 0.8155, 0.8324,
  0.8479, 0.8621, 0.8749, 0.8866, 0.8973, 0.9069, 0.9157, 0.9237, 0.9309,
  0.9375, 0.9434, 0.9488, 0.9537, 0.9581, 0.9621, 0.9657, 0.969, 0.972,
  0.9747, 0.9771, 0.9793, 0.9813, 0.9831, 0.9847, 0.9862, 0.9875, 0.9887,
  0.9898, 0.9908, 0.9917, 0.9925, 0.9932, 0.9938, 0.9944, 0.995, 0.9955,
  0.9959, 0.9963, 0.9967, 0.997, 0.9973, 0.9975, 0.9978, 0.998, 1);

/* [3] 重缓入（16 点，慢启动后猛加速）*/
--ease-in-heavy: linear(0, 0.0003, 0.0024, 0.008, 0.019, 0.037, 0.064,
  0.1016, 0.1517, 0.216, 0.2963, 0.3944, 0.512, 0.651, 0.813, 1);
```

这三条是纯 CSS 值，**不依赖 Framer Motion 即可直接使用**。

---

## 6. 转场（Transition）机制

### 6.1 页面转场

**没用 View Transition API**。全站 SPA 软导航 + Framer Motion `AnimatePresence` 做进出场。chunk 中命中 `AnimatePresence` 指纹，route transition 走 React 树级别的 mount/unmount 动画。

### 6.2 头部方向感知转场（三段式）

| 滚动状态 | transform | 背景 | 背景模糊 |
|---|---|---|---|
| 顶部 | `translateY(0)` | `rgba(0,0,0,0)` | `none` |
| **向下滚** | `translateY(-64px)` | `rgba(0,0,0,0)` | `none` |
| **向上滚** | `translateY(0)` | `rgba(255,255,255,0.75)` | `blur(20px)` |

最经典的 hide-on-scroll-down / show-on-scroll-up + 毛玻璃。向下滚时彻底上移隐藏（-64px = 头部高度），向上滚时回位并叠加 `backdrop-filter: blur(20px)`。用 class 切换（`_1wyxn10` → `_1wyxn10 _1wyxn12`）而非内联样式，配合 CSS transition。

### 6.3 媒体转场

- Hero：`intro-main.mp4`（4.05s）muted + loop + autoplay，与 Canvas 序列帧并存（视频做氛围，序列帧做叙事）
- 4 个 `miniapp-video-*.mp4`（5~10s）滚动到视口才加载播放
- Lottie 2 个实例：一个 41 帧 @60fps，一个 32 帧 @30fps

---

## 7. 性能与工程手段

| 手段 | 证据 |
|---|---|
| **渐进挂载** | DOM 节点 1884 → 2049 → 2794 → 2972 → 2987；sticky 舞台 9 → 14 随滚动出现 |
| **content-visibility** | 4 处使用 |
| **按需绘制** | Canvas drawImage 仅在帧索引变化时触发，越过舞台即停 |
| **locale 资源分流** | `hero-frame-3-en/` vs `hero-frame-3/` |
| **现代图像格式** | AVIF 主用 + WebP 首帧兜底 |
| **reduced-motion** | Framer Motion `MotionConfig reducedMotion` 已配置 |
| **零 WebGL** | 7 个 Canvas 全 2D |

**风险点**：
- y=22800 处出现 **271 个并发动画**的爆发点，是性能悬崖
- 3.89 MB 序列帧 + 6 个视频，首屏负载重，移动端必须降级
- DOM 峰值近 3000 节点 + 文档 56 屏

---

## 8. 五维度架构评分

| 维度 | 得分 | 诊断 |
|---|---|---|
| 技术栈健康度 | **42 / 50** | Next.js App Router + React + Emotion 是韩国大厂主流稳定组合；但 44 个 JS chunk / 24 个 CSS 分包偏碎，Sentry 全量上报（11 个 ping） |
| 架构设计模式 | **40 / 50** | Sticky 舞台模式高度统一、可复用；但 y=0 与 y=32400 出现嵌套舞台，说明后期打补丁式迭代 |
| 工程化成熟度 | **44 / 50** | 按 locale 分流资源、AVIF/WebP 双格式、Sentry 监控、JS 写入精确视口高度（规避 100vh 抖动）—— 专业度高 |
| 性能与可维护性 | **34 / 50** ⚠️ | 3.89 MB 序列帧 + 6 视频 + 271 并发动画爆发点 + 56 屏文档。资源投入换效果，非优化导向 |
| **综合** | **40 / 50** → ⭐⭐⭐⭐ | 动效设计与工程细节一流，性能预算是明显短板 |

### 重构优先级

| 优先级 | 项目 | 预期收益 | 工时 |
|---|---|---|---|
| **P0** | 序列帧改 AVIF 序列 → 单张 sprite atlas，或改 AV1 视频 + `currentTime` seek | 3.89 MB + 138 请求 → <1 MB + 1 请求 | 高 |
| **P0** | y=22800 处 271 个并发动画做分片节流 | 消除掉帧悬崖 | 中 |
| **P1** | 视频全部改 `preload="none"` + IntersectionObserver 懒加载 | 首屏减重 | 低 |
| **P1** | 序列帧预加载策略：进入邻近视口时批量 fetch 前 20 帧 | 消除滚动卡顿 | 中 |
| **P2** | 44 个 JS chunk 做 route-level 合并 | 减少瀑布请求 | 低 |

---

## 9. 对 baozi.space 的可移植性评估

⚠️ **Toss 用到了你项目禁止清单上的 6/6 项**：React、Canvas、Lottie、Lenis、Framer Motion、序列帧引擎。

### ✅ 可以直接搬（纯 CSS / 原生，零依赖，不触碰任何禁令）

| 手法 | 移植方式 |
|---|---|
| **Sticky 舞台模式** | `position: sticky` + 超高容器，纯 CSS，与你的 oil-motion 帧映射思路完全兼容 |
| **JS 写入精确视口高度**（`900.364px` 而非 `100vh`） | 一行 JS 写入 CSS 变量，规避移动端抖动 |
| **缓动曲线族** | `cubic-bezier(0.16,1,0.3,1)`、`(0.22,1,0.36,1)`、`(0.37,0.31,0,1)` 三曲线 + 三条 `linear()` 弹簧 → 直接落成 design spec 的 CSS 变量 |
| **Duration 阶梯** | 320/400/500/800/870/1000/2900ms 七档，取代随手写的时长 |
| **入场 stagger** | `translateY(40px) → 0` + `opacity 0 → 1` + 递增延迟 |
| **头部三段式** | 纯 CSS class 切换 + scroll direction 检测 |
| **content-visibility** | 4 处用法可直接参考 |

### ❌ 不能搬（硬禁止）

- Canvas 序列帧 → 你的路线已经定了 alpha-atlas + sprite 位移（CP0.5–CP7），或考虑原生 `animation-timeline: scroll()` 滚动驱动
- Lenis → 静态站不需要劫持滚动
- Lottie → 用 SVG / CSS 动画替代
- Framer Motion → 原生 WAAPI + IntersectionObserver，你项目已有 165 次 WAAPI 的可参照范式

### 💡 最值得抄的一条

**`height: 900.364px` 而不是 `100vh`。** 这个小细节解决了 sticky 舞台在移动端最恶心的抖动问题，零成本，收益立竿见影。考虑到你的启动页要在 1440×900 / 1280×720 / 1920×1080 三个视口下都通过 checkpoint 评审，这一条应该直接写进 `docs/intro/` 契约。

---

## 附：探测方法

1. **probe.mjs** — 首屏加载：hook `Element.animate`（WAAPI）、`IntersectionObserver`、`requestAnimationFrame`；dump 技术栈指纹、CSS 规则、网络请求全量落盘
2. **probe2.mjs** — 全页 50993px 逐步滚动：定位被 pin 的 sticky 区块、滚动联动元素快照
3. **probe3.mjs** — sticky 实现细节、y=22800 动画爆发点、头部方向行为、滚动→transform 映射曲线
4. **probe4.mjs** — 连续滚动映射采样、DOM 节点增长曲线、Lottie 运行时实例、字体
5. **probe5.mjs** — hook `getContext` / `drawImage`，确认 Canvas 上下文类型与绘制行为
6. **probe6.mjs** — hook `drawImage` 计数 + 帧 URL 模式识别，确认序列帧加载策略与体积

---

*本报告基于 CDP 运行时探测与静态资源分析生成，仅供参考。视觉效果与构图的最终判断请以人工评审为准。*
