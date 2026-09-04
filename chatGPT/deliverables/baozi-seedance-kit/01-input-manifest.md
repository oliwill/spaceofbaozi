# Seedance 输入素材清单

## A. 已包含的输入

### 1. 桌面首帧

文件：`source/intro-first-desktop.png`

- 尺寸：1440×900。
- 暖灰低对比点阵纸。
- 下方约四分之一为 B-lite 水彩草地。
- 第一帧无人、无狗、无球；黄色球在播放后从左侧进入。
- 无文字、无导航、无按钮。

验收：确认草地仍属于最终 B-lite 风格后才能标记为 `approved`。

### 2. 桌面无 UI 尾帧

文件：`source/handoff-final-desktop.png`

- 尺寸：1440×900。
- 角色位置来自 CP0 已批准桌面稿。
- 首页 DOM 信息已移除。
- 保留暖白纸、角色地面阴影和底部蓝色下一分区色块。

验收：Harness 需要将它与真实 Home v2 的“隐藏 DOM 截图”做像素对比，确认不是靠手工遮盖形成的位置误差。

### 3. 移动首尾帧

- `source/intro-first-mobile.png`：390×844。
- `source/handoff-final-mobile.png`：390×844。

移动端只在桌面样片通过后使用。动作顺序一致，但人物、嘉乐和球的空间路径必须重新排布。

### 4. 动作参考

文件：`source/motion/motion-reference-desktop.webm`

- 约 6.2 秒。
- 1120×540，24fps，无音轨。
- 已移除浏览器工具栏、页面控件、滚动条和固定鼠标。
- 只参考球 → 嘉乐 → 牵引绳 → 人物的出场顺序与加速节奏。
- 不参考旧首页转场、人物最终落点和旧版 UI。

### 5. 临时身份参考

- `source/identity/person-reference-draft.png`
- `source/identity/jiale-reference-draft.png`

两张图来自现有生产画面和动作帧，能帮助判断基本身份，但不是最终角色设定表。它们缺少足够的背面与多方位信息。

## B. 首轮 Seedance 前必须补齐

| 素材 | 最低要求 | 来源 |
| --- | --- | --- |
| `person-reference.png` | 正面、左侧、右侧、背面；渔夫帽、眼镜、印花衬衫、深蓝短裤、鞋、白描边；最长边至少 2000px | 生产 Sprite 原图，不要再次 AI 重画 |
| `jiale-reference.png` | 正面、左侧、右侧、背面；蓝色项圈、耳朵、尾巴、脸型；最长边至少 2000px | 生产 Sprite 原图，不要只用首页小图放大 |
| `style-reference.png` | 点阵纸、草地、水彩斑驳、白色描边、主色板，不含文字 | 从生产资产拼成一张板 |
| `handoff-coordinates.json` | 桌面/移动人物脚底、嘉乐脚底/中心、点阵原点、蓝色分区顶部坐标 | Harness 从 DOM 和 Manifest 实测 |

## C. 不要上传 Seedance 的内容

- 完整首页截图或任何包含中文、导航、CTA 的图片。
- Chrome DevTools、鼠标、滚动条、调试按钮。
- D-105 蓝色首页、木门首页等历史视觉。
- 多套不同服装或不同脸型的角色参考。
- Rive 骨骼预览或低质量 Sprite crossfade 录屏。

