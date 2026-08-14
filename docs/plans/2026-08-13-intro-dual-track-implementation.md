# `/lab/intro` 双轨实施计划

**状态：** Current · Tasks 1–5 可执行

**日期：** 2026-08-13

**范围：** A0-H 素材契约与占位轨道、A1 桌面实验页；A0-V 外部视觉交付到达后执行审计与发布

## 0. 权威输入

1. `docs/design/baozi-space-design-spec.md` v2.1
2. `docs/intro/asset-production-contract.md` v1.0
3. `docs/intro/asset-inventory.md`
4. `docs/intro/animation-contract.md` v1.2
5. `docs/plans/2026-08-13-v2.1-project-restructure.md`

全程使用 Bun。不得修改或提交 `package-lock.json`。不得生成、补画、inpaint 或重绘生产人物、小狗、球和手写资产。

## 1. 文件地图

```text
design-assets/intro/
  source/
  reference/
  incoming-production/
  qa/contact-sheets/
public/assets/intro/
  placeholders/{ball,dog,person}/
  placeholders/intro-manifest.json
  production/{ball,dog,person}/
  production/intro-manifest.json
  production/intro-final-still.webp
scripts/intro-assets/
  generate-placeholders.mjs
  audit-assets.mjs
  publish-production.mjs
src/components/intro/
  IntroSequence.astro
  intro.css
src/lib/intro/
  assetManifest.ts
  frameAtProgress.ts
  leashPath.ts
  loadIntroAssets.ts
  setFinalState.ts
  createTimeline.ts
src/pages/lab/intro.astro
tests/unit/intro/
tests/e2e/intro.spec.ts
playwright.config.ts
vitest.config.ts
```

责任边界：

- `assetManifest.ts`：未知 JSON 验证与 asset mode 解析。
- `frameAtProgress.ts`：确定性离散帧选择。
- `leashPath.ts`：SVG 三次贝塞尔绳索几何。
- `loadIntroAssets.ts`：Manifest 获取、图片预加载、错误上抛。
- `setFinalState.ts`：稳定 HTML 最终状态。
- `createTimeline.ts`：只拥有归一化叙事进度和视觉状态。
- `IntroSequence.astro`：语义 DOM 与启动装配，不保存动画数学。
- `scripts/intro-assets/`：占位生成、审计、contact sheet 和原子发布，不改变艺术内容。

## Task 1 · 仓库预检与实验页壳

**修改：** `package.json`

**新增：** `playwright.config.ts`、`src/pages/lab/intro.astro`、`src/components/intro/IntroSequence.astro`、`tests/e2e/intro.spec.ts`

### 实施

1. 记录 Node / Bun 版本、当前依赖和未提交变更；确认仍是 Astro，且新增文件不覆盖用户改动。
2. 只安装缺失依赖：运行时 `gsap`；开发依赖 `vitest`、`@playwright/test`。`sharp` 已存在时不重复安装。
3. 合并脚本：

```json
{
  "test:unit": "vitest run",
  "test:e2e": "playwright test",
  "assets:intro:placeholders": "node scripts/intro-assets/generate-placeholders.mjs",
  "assets:intro:audit:placeholder": "node scripts/intro-assets/audit-assets.mjs placeholder",
  "assets:intro:audit:incoming": "node scripts/intro-assets/audit-assets.mjs incoming-production",
  "assets:intro:audit:production": "node scripts/intro-assets/audit-assets.mjs production",
  "assets:intro:publish": "node scripts/intro-assets/publish-production.mjs"
}
```

4. 先写 E2E：`/lab/intro?assetMode=placeholder` 存在 `[data-intro-root]`、sticky `[data-intro-stage]` 和“跳过动画”按钮。
5. 新增最小 Astro 实验页。它不进入正式导航，默认静态 DOM 已是可读最终状态。

### 验证

```powershell
bun run test:e2e -- --grep "sticky stage"
bun run check
bun run build
```

## Task 2 · 锁定 Manifest 与模式安全

**新增：** `src/lib/intro/assetManifest.ts`、`tests/unit/intro/assetManifest.test.ts`、`vitest.config.ts`

### 接口

```ts
export type AssetMode = "production" | "placeholder";
export type Point = readonly [number, number];
export type FrameAnchor = {
  ground: Point;
  center: Point;
  hand?: Point;
  collar?: Point;
};
export type IntroAsset = {
  src: string;
  frames: 8;
  columns: 4;
  rows: 2;
  frameSize: { width: number; height: number };
  displayWidthVh: number;
  loop: boolean;
  outlineRatio: number;
  anchors: FrameAnchor[];
};
export type IntroManifest = {
  version: 1;
  mode: AssetMode;
  fps: number;
  assets: Record<string, IntroAsset>;
  fallback: string;
};

export function validateIntroManifest(value: unknown): IntroManifest;
export function resolveAssetMode(url: URL, isDev: boolean): AssetMode;
```

### 不变量

- 必须有 `ballBounce / dogRun / dogSettle / personRun / personTrip / personStand`。
- 每组严格 8 帧、4 列、2 行、8 个锚点；点坐标在 `0..1`。
- 人物每帧有 `hand`，小狗每帧有 `collar`。
- `fps` 在 8–10；白边比例在 0.025–0.04。
- production fallback 固定 `/assets/intro/production/intro-final-still.webp`。
- `?assetMode=placeholder` 只在开发环境生效；其他情况返回 production。

### 验证

```powershell
bun run test:unit -- tests/unit/intro/assetManifest.test.ts
```

## Task 3 · 生成调试 Sprite 与审计门禁

**新增：** `scripts/intro-assets/generate-placeholders.mjs`、`scripts/intro-assets/audit-assets.mjs`、`public/assets/intro/placeholders/**`

### 实施

1. 用 Sharp 合成六张透明 4×2 WebP；每帧用 SVG 绘制几何块、动作 ID、帧号、地面线和锚点。
2. 人物用靛蓝、狗用青色、球用芥末黄；不能模仿水彩角色。
3. 生成 mode=`placeholder` 的完整 Manifest。
4. 审计 selected mode、文件存在、真实 Alpha、Sheet 尺寸、8 个锚点和总负载。
5. production 目录出现 mode=`placeholder` 时构建或 CI 失败。

固定帧尺寸：球 160×160；狗 320×240；人物 384×384。

### 验证

```powershell
bun run assets:intro:placeholders
bun run assets:intro:audit:placeholder
```

预期：六张 Sheet 通过，负载低于 6MB。

## Task 4 · 帧、绳索、加载与最终状态原语

**新增：** `frameAtProgress.ts`、`leashPath.ts`、`loadIntroAssets.ts`、`setFinalState.ts` 及对应单元测试。

### 契约

```ts
export function frameAtProgress(
  progress: number,
  frameCount: number,
  loop: boolean,
): number;

export type PixelPoint = { x: number; y: number };
export function leashPath(
  hand: PixelPoint,
  collar: PixelPoint,
  slack: number,
): string;
```

- `frameAtProgress` 夹紧 `0..1`；非循环进度 1 返回最后帧；循环进度 1 回到 0；非法 frameCount 抛错。
- `leashPath` 精确连接手端与项圈端，slack 只改变控制点。
- `loadIntroAssets` 根据 mode 加载并验证 Manifest，再并行预加载全部图片；失败必须上抛给统一回退。
- `setFinalState` 激活暖白首页纸和 HTML 身份内容，隐藏运动 Sprite 与绳索；fallback 图片可用则显示，失败则只隐藏图片。

### 验证

```powershell
bun run test:unit
```

## Task 5 · 纸张舞台与可逆八拍叙事

**修改：** `IntroSequence.astro`、`tests/e2e/intro.spec.ts`

**新增：** `src/components/intro/intro.css`、`src/lib/intro/createTimeline.ts`

### 舞台

- 外层约 300vh；sticky 舞台 100svh。
- 固定原点的 `#EEF0EA` 点阵；草地占底部 22%–26%；首页出现 `#FFFDF7` 大纸。
- 角色 wrapper 负责位移与轻微旋转，内层 Sprite 只负责 `background-position`。
- SVG leash 的端点来自当前帧 Manifest 锚点。

### 时间线

| 进度 | 主事件 |
|---:|---|
| 0–0.08 | 只有球从左滚入并轻弹 |
| 0.08–0.25 | 狗进入追球 |
| 0.25–0.45 | 绳索绷紧，人物被拉入 |
| 0.45–0.65 | 人与狗共同向右奔跑 |
| 0.65–0.78 | 人物踉跄并前扑 |
| 0.78–0.82 | 角色从草地右侧离开并切场 |
| 0.82–0.94 | 人物从首页左侧摔入、撑起、站稳 |
| 0.94–1 | 小狗绕人物一圈停下，身份区稳定 |

### 回退

- reduced motion：不注册 ScrollTrigger，直接最终状态。
- 跳过：销毁 ScrollTrigger，写 `sessionStorage['baozi-intro-complete']='1'`，进入最终状态。
- 当前会话已完成：直接最终状态。
- Manifest / 图片失败：记录非阻塞错误，进入最终状态。
- 无 JavaScript：静态最终状态与普通首页链接。

### 验证

E2E 不使用任意 timeout；滚动到归一化节点后等待两次 `requestAnimationFrame`。

```powershell
bun run test:unit
bun run test:e2e
bun run check
bun run build
```

必须截图 0%、8%、25%、45%、65%、82%、94%、100%，再验证 100% → 0% 反向回滚、reduced motion 和 production 缺失回退。基准 1440×900，smoke test 1280×720 与 1920×1080。

## Task 6 · A0-V 接收、审计与发布

**阻塞条件：** 外部生产资产尚未交付。

1. 文件只进入 `design-assets/intro/incoming-production/`。
2. 自动审计文件名、真实 Alpha、尺寸、4×2、Manifest、锚点和 ≤6MB。
3. 生成 48 帧 contact sheet，人工核对角色一致性、朝向、白毛、衬衫、眼镜、手指、帽檐和项圈。
4. 任一关键轮廓损坏或跳变即退回外部视觉轨道，不在 harness 降低质量或修图。
5. 全部通过后原子替换 `public/assets/intro/production/`，再运行 Task 5 全套验证。

## Task 7 · 完成门禁

- A0-H 几何评审可以使用 placeholder。
- A1 正式视觉批准必须使用 production。
- 全套图片 ≤6MB；默认访问未出现 placeholder。
- 八节点、反向滚动、跳过、会话状态、reduced motion、无 JS 和素材失败全部通过。
- 不开始阶段 B 首页重写，直到用户确认 A1 且 A0-V 通过。