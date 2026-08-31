# `/lab/intro` 动画契约

> **Approved for A1 historical implementation only. Does not govern D-121 oil-motion production.**

版本：1.3  
日期：2026-08-17  
适用范围：桌面端实验页与首页 Hero 人物—小狗环绕交互

## 1. 舞台与滚动

- 外层滚动长度：约 `300vh`。
- 舞台：`position: sticky; top: 0; height: 100svh`。
- 基准视口：1440×900。
- 第二验证：1280×720、1920×1080。
- 时间线只由归一化进度 `0..1` 驱动，必须支持反向滚动。
- 坐标使用舞台宽高比例和锚点，不硬编码单一分辨率的绝对路径。
- 启动与首页共享 `#EEF0EA` 低对比无限点阵环境和同一网格原点。
- 启动页下方 22%–26% 为灰调橄榄绿水彩草地；首页在环境上增加 `#FFFDF7` 暖白大纸。
- 角色姿态按 8–10 fps 离散切换；外层空间位移保持连续。

## 2. 八个叙事区间

| 进度 | 主事件 | 角色可见性 | 不变量 |
| ---: | --- | --- | --- |
| 0–0.08 | 黄色球单独从左滚入并轻弹 | 只有球 | 第一拍禁止出现狗或人 |
| 0.08–0.25 | 小狗从左进入追球 | 球、狗 | 小狗朝右，青色项圈 |
| 0.25–0.45 | 绳索绷紧，人物被拉入 | 球、狗、人、绳 | 人物夏季造型，受力向右 |
| 0.45–0.65 | 人与狗一起向右奔跑 | 狗、人、绳 | 侧视、逐步提速 |
| 0.65–0.78 | 人物踉跄并前扑 | 狗、人、绳 | 先失衡再倒地 |
| 0.78–0.82 | 人物从草地右侧离开并切场 | 人物逐渐不可见 | 不得同时出现两个人物副本 |
| 0.82–0.90 | 人物从首页左侧摔入、撑起、站稳 | 人、狗 | 保留同一运动方向，最终进入左侧身份区 |
| 0.90–1.00 | 小狗以连续透视完成半圈并停下 | 人、狗、身份区 | 人物扶帽或整理衣服；位置、尺寸、遮挡与注视连续 |

## 3. 最终状态

进度 `1` 时：

- 环境是低对比浅灰绿点阵，人物与内容位于其上的暖白大纸；
- 人物站在未来首页左侧身份区；
- 人物轻微朝右，视线指向 Blog 主区；
- 小狗完成自动半圈后停在脚边；只响应已批准的指针、触摸或键盘输入，不保留自主 idle loop；
- 牵引绳处于松弛或不可见状态；
- 首页身份文字稳定显示；
- 舞台可以解除固定并进入后续内容。
- 人物不保留呼吸、漂浮或眨眼 idle loop；人物 12 方位注视只跟随小狗实际渲染位置，不跟随指针目标。

### 3.1 首页环绕透视

- 轨道原点固定在人物双脚之间，`x = cos(angle) × radiusX`、`y = sin(angle) × radiusY`，`radiusY = radiusX × 0.45`。
- 深度只由当前渲染角度计算：`depth = sin(angle)`；小狗连续缩放为 `0.97 + depth × 0.11`，后 / 侧 / 前分别为 `0.86 / 0.97 / 1.08`。
- 小狗视觉层以脚底中心 `50% 100%` 缩放，脚底相对轨道锚点漂移不得超过 `1px`。
- B-lite 人物在 `270°` 会完全覆盖嘉乐；为满足后方仍可识别的视觉门禁，仅在 `depth < -0.65` 时沿实际切线方向平滑露边，最深处偏移不超过 `radiusX × 0.2`。该修正不改变缩放、层级、阴影或脚底锚定。
- `depth < -0.08` 时小狗和阴影位于人物后层，`depth > 0.08` 时位于前层；迟滞区保留上一层，切层不得重建 DOM 或重置步态。
- 小狗 8 方位来自椭圆切线和实际角速度；人物 12 方位注视来自小狗实际渲染坐标。停止时保留最后有效朝向并落在接触帧。
- 阴影透明度为 `0.075 + depth × 0.025`，只提供接地提示，不形成硬黑椭圆。
- Intro 在 0.90–1.00 使用同一透视映射完成自动半圈；人物站稳 `300ms` 后开放输入。反向滚动低于 0.90 时归还 Intro DOM 所有权。
- `prefers-reduced-motion` 不播放连续环绕或步态，只允许四个固定透视位置以 `180ms` 交叉淡化切换。

## 4. 模块接口

### 4.1 Sprite 帧函数

```ts
export function frameAtProgress(
  progress: number,
  frameCount: number,
  loop: boolean,
): number;
```

约束：

- 输入自动夹在 `0..1`；
- 非循环在 `progress === 1` 时返回最后一帧；
- 循环不会返回 `frameCount`；
- 同一输入始终返回同一帧，保证回滚确定性。

### 4.2 Sprite DOM 契约

```html
<div
  class="intro-sprite intro-sprite--dog"
  data-intro-sprite="dog"
  style="--sprite-cols:4; --sprite-rows:2; --sprite-frame:0"
></div>
```

CSS 通过 `--sprite-frame` 计算列、行和 `background-position`。位移只写外层 wrapper 的 transform，避免帧切换和角色移动互相覆盖。

### 4.3 牵引绳

```ts
export type Point = { x: number; y: number };

export function leashPath(
  hand: Point,
  collar: Point,
  slack: number,
): string;
```

输出 SVG 三次贝塞尔路径。`slack = 0` 表示接近绷紧，数值增加时控制点向下形成自然弧线。人物手端和小狗项圈端均由当前动作、当前帧的归一化锚点计算。

### 4.4 时间线

```ts
export type IntroTimelineOptions = {
  root: HTMLElement;
  onComplete: () => void;
  debug?: boolean;
};

export function createIntroTimeline(
  options: IntroTimelineOptions,
): gsap.core.Timeline;
```

时间线拥有连续位置、离散姿态、透明度、草地收回、大纸出现和当前动作；内容数据、天气和正式首页逻辑不进入该模块。

## 5. 回退与会话行为

- `prefers-reduced-motion: reduce`：直接渲染最终状态，不注册 ScrollTrigger。
- 点击“跳过动画”：销毁 ScrollTrigger，写入 `sessionStorage['baozi-intro-complete']='1'`，进入最终状态。
- 当前会话已完成：重新访问时直接显示最终状态。
- 图片加载失败：记录非阻塞错误，销毁动画并显示最终状态。
- 默认运行时只读取 `production/`；`?assetMode=placeholder` 仅在开发环境生效。
- 生产素材缺失或 Manifest 无效：显示暖白大纸和 HTML 身份内容；不得自动加载调试占位素材。
- 禁用 JavaScript：实验页仍显示静态最终状态与跳转首页的普通链接。

## 6. 调试模式

查询参数 `?debugIntro=1` 时可显示调试叠层；开发环境中的 `?assetMode=placeholder` 可显式使用几何占位 Sprite：

- 当前归一化进度；
- 当前阶段名；
- 人物手端、小狗项圈端、脚底和视觉中心锚点；
- 1440×900 安全区和未来首页身份区；
- 当前 Sprite 文件与帧号。

生产构建默认不显示调试 UI，但允许保留查询参数开关以便视觉回归定位。

## 7. 自动化截图点

Playwright 依次滚动到：

```ts
export const INTRO_CHECKPOINTS = [0, 0.08, 0.25, 0.45, 0.65, 0.82, 0.90, 1] as const;
```

每个点等待两次 `requestAnimationFrame` 后截图。动画应由滚动进度决定，不使用任意 `waitForTimeout` 猜测动作完成。
