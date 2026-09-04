# baozi.space Seedance 执行包

状态：CP0 已通过；本包用于 CP1 素材冻结和 CP2 首轮桌面样片。

## 推荐生成方式

- 模型：Seedance 2.5；不可用时回退 Seedance 2.0。
- 第一轮只做桌面端，6 秒、16:10、24fps、无声。
- 样片先用 720p。动作与身份通过后再做最高可用分辨率和移动版。
- 使用“首帧 + 尾帧 + 人物参考 + 嘉乐参考 + 动作视频”的全模态参考方式。
- 网页文字、导航、按钮不进入生成素材，由 DOM 在交接阶段叠加。

Seedance 2.5 支持图片、视频和音频混合参考；官方文档给出的上限远高于本项目所需。本项目故意只用 5 个核心输入，降低参考相互冲突的概率。

## Seedance 上传顺序

| 引用 | 文件 | 用途 | 当前状态 |
| --- | --- | --- | --- |
| @图1 | `source/intro-first-desktop.png` | 强制首帧 | 已生成，进入 CP1 人工确认 |
| @图2 | `source/handoff-final-desktop.png` | 强制尾帧、无 UI 视频画面 | 已生成，进入 CP1 像素核验 |
| @图3 | `source/identity/person-reference-draft.png` | 人物身份、服装、画风 | 临时参考；首轮付费生成前应由 Harness 从生产原图导出高清设定表替换 |
| @图4 | `source/identity/jiale-reference-draft.png` | 嘉乐身份、项圈、体型、画风 | 临时参考；首轮付费生成前应补齐左右侧和背面高清参考 |
| @视频1 | `source/motion/motion-reference-desktop.webm` | 只参考动作顺序与节奏 | 已清除工具栏、控件、鼠标和音轨，约 6.2 秒、24fps |

以下文件只用于验收，不要上传 Seedance：

- `source/review-only/handoff-final-desktop-composite.png`
- `source/review-only/handoff-final-mobile-composite.png`

它们包含网页文字和导航；一旦上传，模型可能把中文和 Tab 烘焙进视频。

## 使用顺序

1. 先阅读 `01-input-manifest.md`，确认所有输入状态。
2. 让 Harness 执行 `05-harness-cp1-brief.md`，替换两张临时角色参考并填写锚点。
3. 包子确认桌面首帧、无 UI 尾帧和角色设定表。
4. 按 `02-seedance-prompts.md` 只生成 3 条桌面样片。
5. 使用 `06-take-review-scorecard.md` 逐条评分。
6. 仅当至少一条桌面样片通过 CP2，才生成移动版。

## 关键原则

- 角色一致性优先于牵引绳。牵引绳在后期重新绘制。
- 固定机位优先于“电影感”运镜。本项目的电影感来自动作节奏，不来自推拉摇移。
- 视频尾帧只负责背景和角色；网页 UI 由 DOM 叠加。
- 桌面与移动端分别生成，移动版不是桌面视频的竖向裁切。

## 官方能力依据

- Seedance 2.0 官方发布说明：https://seed.bytedance.com/en/blog/official-launch-of-seedance-2-0
- Seedance 2.5 模型入口：https://seed.bytedance.com/en/models
- Seedance 2.5 Prompt Guide：https://docs.byteplus.com/en/docs/ModelArk/2607689

