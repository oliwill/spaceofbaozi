# Seedance 上传对应表

## 先生成桌面版

按以下顺序上传：

1. `desktop/image-1-desktop-first-frame.png` → 提示词中的 `@图1`
2. `desktop/image-2-desktop-final-frame.png` → 提示词中的 `@图2`
3. `shared/image-3-person-reference-draft.png` → 提示词中的 `@图3`
4. `shared/image-4-jiale-reference-draft.png` → 提示词中的 `@图4`
5. `shared/video-1-motion-reference.webm` → 提示词中的 `@视频1`

如果 Seedance 上传后的引用顺序与这里不同，请以界面实际显示的 `@图片编号` 为准，同步替换提示词编号后再生成。

## 移动版

桌面样片通过后，把前两张替换为：

1. `mobile/image-1-mobile-first-frame.png` → 移动版 `@图1`
2. `mobile/image-2-mobile-final-frame.png` → 移动版 `@图2`

人物、嘉乐和动作参考继续使用 shared 目录中的文件。

## 注意

- `image-2-*-final-frame.png` 是无 UI 尾帧，适合上传 Seedance。
- 不要上传带中文导航和正文的完整 Home v2 截图。
- `image-3`、`image-4` 当前是临时参考。正式生成前仍建议由 Harness 从生产原图导出高清四视图替换。
