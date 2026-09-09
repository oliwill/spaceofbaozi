# baozi.space 素材接口 v2 设计

状态：Approved  
日期：2026-09-08

## 目标

重建启动页与首页环绕素材包，使每个文件名、实际画面、帧顺序和运行用途一一对应。保留已确认的 B-lite 水彩剪纸风格、角色身份、首页自然透视参数和现有叙事，不重新设计网站。

## 根因

v1 把八个不同动作放进 `summer-trip-exit-right.webp`，Manifest 只记录数字帧号；后补的 `person-stumble.png` 与 `person-fall-impact.png` 又没有进入 Sheet、锚点和时间线。配置者无法只靠文件和 Manifest 判断每格语义。

## v2 规则

1. 单帧 PNG 是规范源文件；每帧都有稳定 ID、语义文件名、中文说明和锚点。
2. WebP Sprite 是编译产物，不允许人工修改。
3. Manifest 同时描述序列、单帧、Sheet 网格、时间线用途与旧路径迁移关系。
4. 启动页和首页素材分别位于 `assets/intro/` 与 `assets/home/`，不得混用。
5. 所有透明素材必须是真实 RGBA；禁止烘入棋盘格、纸张背景、草地、阴影、绳子或文字。

## 目录

```text
assets/
  intro/
    frames/{ball,dog,person}/...
    runtime/
    environment/
    fallback/
  home/
    frames/{dog,person}/...
    runtime/
manifest/asset-manifest.v2.json
spec/sequence-catalog.json
docs/{frame-catalog.md,integration.md,migration-v1-to-v2.md}
qa/contact-sheets/
tools/{asset_pipeline.py,build_runtime.py,verify_package.py}
tests/test_asset_pipeline.py
```

## 启动页序列

| ID | 内容 | 帧数 | Sheet |
| --- | --- | ---: | --- |
| `ball-bounce` | 黄色球形变弹跳 | 8 | 4×2，160×160/格 |
| `dog-chase-right` | 小狗向右追球 | 8 | 4×2，320×240/格 |
| `person-pulled-run-right` | 人物被绳拉动并向右跑 | 8 | 4×2，384×384/格 |
| `person-stumble-fall-exit-right` | 前倾、踉跄、前扑、触地、翻滚、侧滑 | 10 | 5×2，384×384/格 |
| `person-slide-in-rise-stand` | 滑入、撑起、站稳 | 8 | 4×2，384×384/格 |
| `dog-look-up-settle` | 小狗减速、抬头、坐下 | 8 | 4×2，320×240/格 |

`person-stumble-fall-exit-right` 的十帧固定为：

1. `pulled-lean`
2. `off-balance-reach`
3. `stumble-catch-step`
4. `pre-fall-hop`
5. `forward-dive`
6. `fall-impact`
7. `hands-knees-impact`
8. `side-collapse`
9. `shoulder-roll`
10. `belly-slide-exit`

## 首页环绕序列

- 人物：12 个观察方向，4×3，384×342/格；身体固定，仅头部和视线跟随。
- 小狗：东、东南、南、西南、西、西北、北、东北八方向，每方向四步，4×8，256×192/格。
- 透视由运行时连续计算，后/侧/前比例为 `0.86 / 0.97 / 1.08`；图片本身不预烘缩放或阴影。

## 视觉与技术约束

- 人物：深靛内轮廓、暖白剪纸边、克制套色偏移；Tone 只进入帽子、短裤等暗部。
- 小狗：白毛保持干净，青色项圈稳定；Tone 只用于腹部暗部。
- 草地：B-lite 水彩草地，透明上缘，无页面背景。
- PNG 源文件保留无损 Alpha；WebP 使用无损 Alpha。
- 启动运行时图片合计不超过 6 MiB。
- 所有序列的 `frameCount`、`frames.length`、Sheet 容量和锚点数量必须一致。

## 验收

自动验证检查文件存在、尺寸、Alpha、透明角像素、帧数、网格、Manifest 引用、旧路径迁移表和压缩包完整性。人工验收使用带编号与语义名称的 contact sheet；仅看 Manifest 即可确定每一帧的内容与用途。
