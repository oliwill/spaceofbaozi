# 从 v1 迁移到 v2

v2 是完整替换，不要把新旧素材混装在同一个运行时目录。

## 路径映射

| v1 路径 | v2 资产 ID | v2 路径 |
| --- | --- | --- |
| `/assets/intro/production/ball/ball-bounce.webp` | `ball-bounce` | `/assets/intro/runtime/ball-bounce-8f.webp` |
| `/assets/intro/production/dog/dog-run-right.webp` | `dog-chase-right` | `/assets/intro/runtime/dog-chase-right-8f.webp` |
| `/assets/intro/production/dog/dog-circle-settle.webp` | `dog-look-up-settle` | `/assets/intro/runtime/dog-look-up-settle-8f.webp` |
| `/assets/intro/production/person/summer-pulled-run-right.webp` | `person-pulled-run-right` | `/assets/intro/runtime/person-pulled-run-right-8f.webp` |
| `/assets/intro/production/person/summer-trip-exit-right.webp` | `person-stumble-fall-exit-right` | `/assets/intro/runtime/person-stumble-fall-exit-right-10f.webp` |
| `/assets/intro/production/person/summer-land-stand.webp` | `person-slide-in-rise-stand` | `/assets/intro/runtime/person-slide-in-rise-stand-8f.webp` |
| `/assets/intro/production/environment/intro-grass.webp` | `intro-grass` | `/assets/intro/runtime/intro-grass.webp` |
| `/assets/intro/production/intro-final-still.webp` | `intro-final-still` | `/assets/intro/runtime/intro-final-still.webp` |
| `/assets/orbit/runtime/person-look-12dir.webp` | `person-look-around-12dir` | `/assets/home/runtime/person-look-around-12dir.webp` |
| `/assets/orbit/runtime/dog-orbit-run-8dir-4f.webp` | `dog-orbit-run-8dir-4f` | `/assets/home/runtime/dog-orbit-run-8dir-4f.webp` |

相同映射也存放在 Manifest 的 `legacyAliases`，供自动迁移脚本读取。

## 迁移步骤

1. 在仓库中搜索所有 v1 路径与 `personTrip`、`personRun`、`personStand`。
2. 把旧运行时目录移动到可恢复的归档目录。
3. 复制 v2 的 `assets/intro/runtime/`、`assets/home/runtime/` 与 Manifest。
4. 将运行时代码改为按 v2 的序列 ID 和 Manifest 读取。
5. 把跌倒序列从 8 帧 4×2 改为 10 帧 5×2；不要手写帧数。
6. 调试叠层显示语义 `frameId`。
7. 运行启动页八节点截图、反向滚动、低动态、跳过和素材失败测试。
8. 运行首页八方向、前后层级、脚底锚定及 `0.86 / 0.97 / 1.08` 连续透视测试。

## 不再使用的独立补丁文件

旧的 `person-stumble.png` 与 `person-fall-impact.png` 不再单独接入。它们已经以规范名称进入：

```text
assets/intro/frames/person/person-stumble-fall-exit-right/03-stumble-catch-step.png
assets/intro/frames/person/person-stumble-fall-exit-right/06-fall-impact.png
```

运行时统一使用十帧 Sheet 和 v2 Manifest。
