# baozi.space 启动素材生产契约

> **Approved for A1 historical implementation only. Does not govern D-121 oil-motion production.**

状态：Approved  
版本：1.0  
日期：2026-08-13  
适用范围：A0-H 素材接口、A0-V 生产图片交付、A1 `/lab/intro` 消费方式

## 1. 核心原则

本地 harness 不生成、补画或重新设计人物、小狗、球、手写字和装饰图片。它只负责：

1. 建立固定文件名与 Manifest 类型；
2. 生成一眼可辨认的调试占位 Sprite；
3. 用占位素材实现和测试动画；
4. 审计外部交付的生产素材；
5. 在不改时间线代码的情况下切换到生产素材。

生产图片由 ChatGPT 图像流程或人工图像流程完成。若自动抠图伤害白色狗毛、暖白衬衫、眼镜、手指、帽檐或项圈，harness 必须停止素材处理并报告，不得用降低质量门槛的方式继续。

## 2. 目录与发布边界

```text
design-assets/intro/
  source/                     # 六张动作源稿，不进 public
  reference/                  # 模型表、真人、小狗与风格参考
  incoming-production/        # 外部交付暂存，审计通过前不发布
  qa/contact-sheets/          # 逐帧检查图，不进 public

public/assets/intro/
  placeholders/               # 只允许显式 debug / test 使用
  production/                 # 默认运行时目录
    ball/ball-bounce.webp
    dog/dog-run-right.webp
    dog/dog-circle-settle.webp
    person/summer-pulled-run-right.webp
    person/summer-trip-exit-right.webp
    person/summer-land-stand.webp
    intro-final-still.webp
    intro-manifest.json
```

`design-assets/intro/source/{person,dog,ball}/` 中的假透明棋盘格 PNG 永远不是运行时资产。不得将它们重命名后直接复制到 `public/`。

## 3. 六组动作与固定规格

| ID | 文件 | 帧 | 单帧画布 | Sheet | 循环 |
| --- | --- | ---: | --- | --- | --- |
| `ballBounce` | `ball/ball-bounce.webp` | 8 | 160×160 | 640×320 | 是 |
| `dogRun` | `dog/dog-run-right.webp` | 8 | 320×240 | 1280×480 | 是 |
| `dogSettle` | `dog/dog-circle-settle.webp` | 8 | 320×240 | 1280×480 | 否 |
| `personRun` | `person/summer-pulled-run-right.webp` | 8 | 384×384 | 1536×768 | 是 |
| `personTrip` | `person/summer-trip-exit-right.webp` | 8 | 384×384 | 1536×768 | 否 |
| `personStand` | `person/summer-land-stand.webp` | 8 | 384×384 | 1536×768 | 否 |

所有 Sheet 固定为四列两行，透明区域保留，角色朝右。不得通过 `scaleX(-1)` 修正方向。生产 WebP 可以是无损或高质量有损，但 Alpha 必须真实，六张 Sheet 与最终静态图合计不超过 6 MB。

## 4. Manifest 接口

`intro-manifest.json` 使用以下结构；所有坐标均以单帧左上角为原点，归一化为 `0..1`：

```json
{
  "version": 1,
  "mode": "production",
  "fps": 9,
  "assets": {
    "personRun": {
      "src": "/assets/intro/production/person/summer-pulled-run-right.webp",
      "frames": 8,
      "columns": 4,
      "rows": 2,
      "frameSize": { "width": 384, "height": 384 },
      "displayWidthVh": 36,
      "loop": true,
      "outlineRatio": 0.028,
      "anchors": [
        { "ground": [0.51, 0.92], "center": [0.50, 0.52], "hand": [0.82, 0.43] }
      ]
    }
  },
  "fallback": "/assets/intro/production/intro-final-still.webp"
}
```

每个动作的 `anchors` 必须恰好有八项。人物动作包含 `ground`、`center`、`hand`；小狗动作包含 `ground`、`center`、`collar`；小球包含 `ground` 与 `center`。运行时代码从 Manifest 读取路径、帧尺寸和锚点，不允许在组件中复制这些数值。

## 5. 调试占位规则

占位 Sprite 由代码生成，只表达接口，不模仿正式水彩画：

- 人物使用靛蓝轮廓块并标出帧号与 `hand`；
- 小狗使用青色轮廓块并标出帧号与 `collar`；
- 小球使用芥末黄圆形并标出帧号；
- 每帧绘制透明背景、地面线和锚点；
- 占位文件放在 `placeholders/`，Manifest 的 `mode` 必须为 `placeholder`；
- 只有 `?assetMode=placeholder`、Playwright 或开发环境显式开关可以加载；
- 默认访问不得自动显示占位图。

## 6. 生产素材视觉要求

- 细深灰墨线、低饱和透明水彩、少量水痕和纸张颗粒；
- 人物白边为最长边 2.5%–3%，小狗 3%–4%，小球 3%；颜色为 `#FFFDF7`；
- 白边轻微不规则但轮廓干净，不做粗大表情包描边；
- 人物眼镜、帽型、手表、印花衬衫和鞋不跳变；
- 小狗犬种比例、口鼻、耳朵、尾巴和青色项圈不跳变；
- 不丢失白毛、暖白衬衫、手指、帽檐和细线；
- 每帧角色比例、地面基线和面向一致；
- 不包含牵引绳、草地、阴影、点阵或页面纸张；这些由运行时绘制。

## 7. 审计与替换流程

1. 外部交付进入 `design-assets/intro/incoming-production/`。
2. 审计检查文件齐全、Alpha、尺寸、四乘二网格、Manifest、锚点数量和总体积。
3. 生成六张逐帧 contact sheet，人工检查 48 帧。
4. 任一关键轮廓损坏、动作方向错误或角色跳变即退回视觉轨道。
5. 全部通过后，原子替换 `public/assets/intro/production/`。
6. 运行单元测试、八节点 Playwright 截图、反向滚动、reduced motion 与素材失败测试。

## 8. 回退规则

- 生产素材缺失或预加载失败：跳过完整动画，显示暖白首页大纸和 HTML 身份内容；如果 `intro-final-still.webp` 可用则显示，否则不显示角色图。
- `prefers-reduced-motion: reduce`：直接显示最终站立状态，不播放奔跑与摔倒。
- 调试占位素材缺失：测试失败并报告，不回退到生产素材，以免掩盖契约错误。
- 生产环境检测到 `mode: placeholder`：构建失败。

## 9. 完成标准

- harness 能在没有生产图片时使用显式占位模式完成 A1 代码开发；
- 默认模式不会让访客看到占位素材；
- 六张生产 Sheet 和 Manifest 可无代码替换；
- 生产素材通过 48 帧人工检查与自动审计；
- 完整运行时图片负载不超过 6 MB；
- 素材失败不阻塞首页内容。
