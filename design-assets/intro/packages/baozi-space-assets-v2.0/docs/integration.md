# v2 接入说明

## 1. 发布文件

把以下目录复制到站点的 `public/assets/` 下，并保持目录结构：

```text
assets/intro/runtime/
assets/home/runtime/
manifest/asset-manifest.v2.json
```

推荐最终 URL：

```text
/assets/intro/runtime/...
/assets/home/runtime/...
/manifest/asset-manifest.v2.json
```

如果项目把 Manifest 放在 TypeScript 中，也应由 JSON 生成类型或在构建时导入 JSON；不要手工复制帧数和锚点。

## 2. Sprite 取帧

所有序列使用行优先顺序：

```ts
const column = frameIndex % sequence.columns;
const row = Math.floor(frameIndex / sequence.columns);
```

`frameIndex` 是 `0..frameCount - 1`。显示调试信息时同时输出：

```ts
sequence.frameIds[frameIndex]
```

这样出现错误时可以直接报告 `stumble-catch-step`，不再只报告“第 3 格”。

## 3. 必须更新的跌倒序列

v1 的 `personTrip` 是 8 帧 4×2；v2 为：

```json
{
  "id": "person-stumble-fall-exit-right",
  "frameCount": 10,
  "columns": 5,
  "rows": 2,
  "frameSize": { "width": 384, "height": 384 }
}
```

不要在代码中保留 `8`、`4` 或旧文件名。`frameAtProgress()` 应读取 Manifest 中的 `frameCount`。

## 4. 启动时间线

Manifest 的 `introTimeline` 记录每个阶段可见的序列。主要人物切换为：

- `0.25–0.65`：`person-pulled-run-right`
- `0.65–0.82`：`person-stumble-fall-exit-right`
- `0.82–1.00`：`person-slide-in-rise-stand`

切换点对齐脚底锚点。牵引绳仍由人物当前帧 `hand` 与小狗当前帧 `collar` 运行时计算；图片中没有绳子。

## 5. 首页环绕

首页只加载：

- `person-look-around-12dir`
- `dog-orbit-run-8dir-4f`

小狗方向由轨道实际运动切线决定。透视缩放连续计算：

```ts
const scale = perspectiveScale(depth, {
  back: 0.86,
  side: 0.97,
  front: 1.08,
});
```

缩放原点固定为脚底中心。后方置于人物后层，前方置于人物前层；层级切换保留迟滞。阴影也由运行时绘制。

## 6. 回退

- v2 Manifest 加载失败：直接显示暖白首页纸张与 HTML 身份内容。
- 角色素材加载失败：可显示 `intro-final-still.webp`，不要回退到 v1 Sprite。
- `prefers-reduced-motion: reduce`：直接渲染最终站立状态。
- 调试模式显示序列 ID、帧 ID、帧号和锚点。
