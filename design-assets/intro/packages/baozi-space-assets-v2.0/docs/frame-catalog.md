# 帧目录

完整的逐帧数据以 `manifest/asset-manifest.v2.json` 为准；本页用于人工快速核对。

| 序列 ID | 运行时文件 | 帧数 | 网格 | 用途 |
| --- | --- | ---: | --- | --- |
| `ball-bounce` | `assets/intro/runtime/ball-bounce-8f.webp` | 8 | 4×2 | 0–8%，球先入场 |
| `dog-chase-right` | `assets/intro/runtime/dog-chase-right-8f.webp` | 8 | 4×2 | 小狗向右追球 |
| `person-pulled-run-right` | `assets/intro/runtime/person-pulled-run-right-8f.webp` | 8 | 4×2 | 被拉入并向右跑 |
| `person-stumble-fall-exit-right` | `assets/intro/runtime/person-stumble-fall-exit-right-10f.webp` | 10 | 5×2 | 踉跄、前扑、触地、翻滚、滑出 |
| `person-slide-in-rise-stand` | `assets/intro/runtime/person-slide-in-rise-stand-8f.webp` | 8 | 4×2 | 首页滑入、撑起、站稳 |
| `dog-look-up-settle` | `assets/intro/runtime/dog-look-up-settle-8f.webp` | 8 | 4×2 | 减速、抬头、坐下 |
| `person-look-around-12dir` | `assets/home/runtime/person-look-around-12dir.webp` | 12 | 4×3 | 身体固定，头部观察小狗 |
| `dog-orbit-run-8dir-4f` | `assets/home/runtime/dog-orbit-run-8dir-4f.webp` | 32 | 4×8 | 八方向，每方向四步 |

## 跌倒序列的唯一正确顺序

| 帧 | ID | 可见动作 |
| ---: | --- | --- |
| 1 | `pulled-lean` | 被绳拉住并前倾 |
| 2 | `off-balance-reach` | 失衡并伸手 |
| 3 | `stumble-catch-step` | 前倾约 45°，右脚跨步救平衡 |
| 4 | `pre-fall-hop` | 救步失败，双脚将离地 |
| 5 | `forward-dive` | 身体水平前扑 |
| 6 | `fall-impact` | 胸腹触地前悬空，双手准备撑地 |
| 7 | `hands-knees-impact` | 手膝触地 |
| 8 | `side-collapse` | 向侧面蜷缩倒下 |
| 9 | `shoulder-roll` | 经肩背翻滚 |
| 10 | `belly-slide-exit` | 趴地向右滑出 |

对应验收图：`qa/contact-sheets/person-stumble-fall-exit-right.png`。

## 首页小狗方向顺序

每一行四步，行序固定为：

1. east
2. southeast
3. south
4. southwest
5. west
6. northwest
7. north
8. northeast

人物的 12 个观察方向以 `0°` 起、每次顺时针增加 `30°`，文件名和 Manifest 均包含角度。
