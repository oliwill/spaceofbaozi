# 给本地 harness 的执行指令

你正在把 baozi.space 的启动动画与首页人物／小狗环绕动画从素材接口 v1 迁移到 v2。

## 必读

先完整阅读：

- `README.md`
- `docs/migration-v1-to-v2.md`
- `docs/integration.md`
- `manifest/asset-manifest.v2.json`

## 执行边界

1. 本包中的图片已经完成视觉生产；不要重新生成、补画、翻转或重命名图片。
2. `assets/**/frames/` 是规范源，`assets/**/runtime/` 是发布文件。
3. 运行时代码必须从 v2 Manifest 读取 `src`、`frameCount`、`columns`、`rows`、`frameSize`、`frameIds` 与锚点，不得复制数值。
4. 不要继续引用 v1 的 `summer-trip-exit-right.webp`；新跌倒序列是 `person-stumble-fall-exit-right-10f.webp`，10 帧，5×2。
5. 启动页素材只从 `assets/intro/runtime/` 读取；首页环绕只从 `assets/home/runtime/` 读取。
6. 首页小狗透视仍为 `0.86 / 0.97 / 1.08`，以脚底中心为缩放原点；图片本身不得再缩放后导出。
7. 若仓库已有同名用户文件，先只读比对，再移动到可恢复的归档目录；不要覆盖未知文件。

## 完成条件

- Manifest v2 可解析且成为唯一生产素材清单。
- 跌倒序列按十个 `frameIds` 正向和反向播放都不跳帧。
- 旧路径搜索只剩迁移文档或兼容映射，不再被运行时代码加载。
- 启动页八个进度检查点、低动态模式、跳过动画和素材失败回退均通过。
- 首页小狗的八方向、四步、前后遮挡和连续透视均通过。

不要扩展内容系统、重构整站或改变已确认的角色与画风。
