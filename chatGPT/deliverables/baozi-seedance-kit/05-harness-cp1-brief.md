# 可直接交给 Harness 的 CP1 指令

```text
只执行 CP1：冻结 Seedance 与 Home v2 共用素材，不生成视频，不接入 Rive，不修改生产首页路由。

当前 CP0 已通过。以已批准的 1440×900 和 390×844 Home v2 为唯一视觉基线。

需要完成：

1. 建立 public/assets/intro/source/。
2. 增加仅供截图的 capture mode（例如 ?capture=video-plate）：
   - 隐藏问候、导航、个人信息、CTA、分区文字、箭头等 DOM；
   - 保留纸张、点阵、草地/地面阴影、人物、嘉乐和底部色块；
   - 禁止动画并冻结 HomeOrbit 初始状态；
   - 不复制第二套 Home 组件。
3. 从真实 Home v2 导出：
   - handoff-final-desktop.png，1440×900；
   - handoff-final-mobile.png，390×844。
4. 从生产 Sprite/原始素材导出人物设定表 character-reference.png：正面、左侧、右侧、背面，最长边至少 2000px；保持渔夫帽、眼镜、印花短袖、深蓝短裤、鞋、水彩纹理和白色描边。
5. 从生产 Sprite/原始素材导出 jiale-reference.png：正面、左侧、右侧、背面，最长边至少 2000px；保持白色比熊体型、脸型、耳朵、尾巴和蓝色项圈。
6. 输出 style-reference.png：只包含点阵纸、B-lite 草地、白描边和绿/暖白/深蓝/黄色色板，不包含文字或历史方案。
7. 复核现有 intro-first-desktop.png 与 intro-first-mobile.png；若草地或点阵与生产资产不一致，用生产素材重导，不用 AI 重画。
8. 创建 handoff-coordinates.json，记录：
   - viewport；
   - dotGridOrigin；
   - personFootPivot；
   - jialeCenter 与 jialeFootPivot；
   - nextSectionTop；
   - 每个值同时提供 px 与归一化坐标。
9. 对完整 Home v2 截图和 capture mode 截图做差异审计：角色、背景、地面阴影和底部色块必须一致，差异只允许出现在 DOM/UI 区域。
10. 更新 CP1 清单并输出文件尺寸、Alpha、像素尺寸、SHA-256 和两张 capture mode 截图。

出口条件：
- 所有首尾帧均可独立显示；
- 人物与嘉乐参考足以判断生成结果是否为同一角色；
- handoff 坐标可测量；
- 无文字、导航、浏览器控件、鼠标或 placeholder 泄漏。

发现构图仍需调整时停止，不进入 Seedance 生成。
```

