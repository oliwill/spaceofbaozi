# 启动动画素材清单

状态：已盘点  
更新时间：2026-08-13  
用途：告诉本地 harness 哪些文件有效、哪些只是视觉源稿、哪些必须重新加工

## 1. 结论

角色身份、服装、动作和最终分镜已经锁定，源文件完整；但当前没有任何可直接上线的生产 Sprite。v2.1 新增水彩剪纸材料要求，现有动作表只能作为姿态和造型参考，不能通过简单去背景直接上线。本地 harness 不负责生成或重绘正式图片，只负责契约、占位开发、审计和无代码替换。

审计发现：

- 10 张生成 PNG 的 `opaque` 均为 `true`，只有 RGB，没有 Alpha；
- 画面中看到的透明棋盘格是被烘焙进像素的预览背景；
- 7 张动作相关文件包含 8 个动作或 8 个镜头，但还未经过严格切帧、基线统一和锚点标注；
- `summer-pulled-run-right-source.png` 为 1672×941，不能被 4×2 整除，至少需要补齐 1px 高度后重新导出；
- 其余 1536×1024 动作源稿虽然可被 4×2 整除，也必须先去背景和逐帧检查；
- 所有源稿均早于 v2.1 暖白剪纸边要求；生产时需增加 `#FFFDF7` 不规则白边：人物 2.5%–3%、小狗 3%–4%、球 3%；
- 源稿本身不包含新的 22%–26% 水彩草地；草地作为独立场景资产或 CSS／SVG 水彩层生产，不烘焙进角色 Sprite；
- 角色设定表和分镜永远不进入运行时资源。

因此目录命名刻意使用 `source`，不能将其改名为生产资源后直接接入 CSS。正式资产必须经过独立 A0-V 视觉流程；A0-H 只使用单独目录中的几何调试占位 Sprite。

## 2. 当前有效生成源稿

### 2.1 角色设定

| 文件 | 尺寸 | 状态 | 用途 |
| --- | ---: | --- | --- |
| `design-assets/intro/reference/model-sheets/person-summer-model-sheet.png` | 1672×941 | 视觉基准 | 当前 MVP 人物唯一造型基准 |
| `design-assets/intro/reference/model-sheets/person-winter-model-sheet.png` | 1536×1024 | 视觉基准 | 后续季节版本，不制作动作 |
| `design-assets/intro/reference/model-sheets/dog-model-sheet.png` | 1672×941 | 视觉基准 | 小狗比例、口鼻、耳朵和项圈基准 |

### 2.2 动作源稿

| 文件 | 尺寸 | 帧意图 | 目标输出 |
| --- | ---: | ---: | --- |
| `design-assets/intro/source/person/summer-pulled-run-right-source.png` | 1672×941 | 8 | `person/summer-pulled-run-right.webp` |
| `design-assets/intro/source/person/summer-trip-exit-right-source.png` | 1536×1024 | 8 | `person/summer-trip-exit-right.webp` |
| `design-assets/intro/source/person/summer-land-stand-source.png` | 1536×1024 | 8 | `person/summer-land-stand.webp` |
| `design-assets/intro/source/dog/dog-run-right-source.png` | 1536×1024 | 8 | `dog/dog-run-right.webp` |
| `design-assets/intro/source/dog/dog-circle-settle-source.png` | 1536×1024 | 8 | `dog/dog-circle-settle.webp` |
| `design-assets/intro/source/ball/ball-bounce-source.png` | 1536×1024 | 8 | `ball/ball-bounce.webp` |

### 2.3 分镜

`design-assets/intro/reference/storyboard/intro-storyboard-ball-first.png` 是当前叙事顺序基准：

1. 球单独出现；
2. 狗追球；
3. 人物被牵入；
4. 人与狗一起向右跑；
5. 人物失衡；
6. 从草地右侧摔出；
7. 从首页左侧摔入；
8. 人物站起，小狗在脚边原地停下（D-112 已覆盖旧分镜中的绕圈动作）。

它不是页面背景，也不进入 public。

## 3. 真人与小狗参考

### 3.1 夏季人物

- `outfit-mirror-front.jpg`：渔夫帽、相机印花短袖、短裤与手表；服装优先级最高。
- `identity-face-closeup.jpg`：眼镜、发长与面部识别。
- `running-pose-front.jpg`、`running-pose-side.jpg`：跑步体态参考，不代表启动页固定服装。

### 3.2 冬季人物

- `outfit-mirror-front.jpg`：蓝色针织帽、红色卫衣、白色外套、黄色包与蓝裤。
- `outfit-reflection.jpg`、`outfit-full-body-with-dog.jpg`、`outfit-full-body-reflection.jpg`：层次、包的位置与全身比例。

冬季参考只用于设定一致性，当前阶段不得生成或实现冬季动作。

### 3.3 小狗

五张参考覆盖正面、侧面和坐姿。关键识别点：约 5kg、柔软白毛、自然垂耳、口鼻略长、黑鼻、体态轻巧。不要将其画成大头圆脸吉祥物。

## 4. 风格参考

- `watercolor-line-reference.png`：只参考轻墨线、水彩颗粒和克制配色，不复制人物或构图。
- `homepage-layout-reference-partial.png`：只参考点阵纸、编辑网格、纸张材质和主次层级。

第二张图不是当前首页定稿，以下内容不得照搬：

- 左上角网站名称；当前规则是天气或本地时间回退；
- 没有最终人物站位；
- 旧版首屏文字和 Blog 图像只是层级示例。

## 5. A0 生产门槛

每张生产 Sprite 必须全部满足：

- 真正 RGBA 或带 Alpha 的 WebP；
- 包含清楚、干净而略不规则的暖白剪纸边，且小狗白毛和人物暖白衬衫边缘完整；
- 四列、两行，宽度可被 4 整除，高度可被 2 整除；
- 棋盘格像素完全清除；
- 人物眼镜、帽子、手表和服装不跳变；
- 小狗耳朵、口鼻、尾巴、青色项圈不跳变；
- 白色毛发和暖白衬衫边缘没有明显被抠掉；
- 每帧无多余肢体、复制残影或跨单元格污染；
- 所有角色朝右；
- 逐帧姿态适合 8–10 fps 定格播放，允许受控的 1–2px 上下差异和不超过 ±0.5° 的轻微旋转；
- 运行时六张 Sprite 总体积不超过 6 MB；
- `introManifest.ts` 记录帧数、循环、阶段和锚点。

## 6. 禁止使用的旧素材

以下文件没有进入交接包：

- 黄色卫衣角色设定和三组旧动作；
- 一次前两帧朝左的夏季动作表；
- 旧的木门、实体手账、料亭与撞屏分镜；
- 重复上传的服装照片；
- 损坏或无关的截图。

如本地仓库中已存在同名旧文件，应先做只读比对，再移出运行时目录；不要直接覆盖用户文件。
