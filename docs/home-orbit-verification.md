# Home Orbit 透视验证记录(A2-HOME Task 7)

日期:2026-08-15
实现基线提交:`cd687b4`(本文件随验证提交一并入库)
素材模式:`/lab/intro?assetMode=placeholder`(DOM/CSS Sprite 占位轨),生产图集审计已于 A0-V 单独完成。

## 构建与测试

- `bun run check`:0 errors / 0 warnings(60 files)。
- `bun run build`:24 pages built,成功。
- `bun run test:unit`:6 files / 39 tests 全部通过。
- `bun run test:e2e -- tests/e2e/home-orbit.spec.ts tests/e2e/intro.spec.ts`:68 tests 通过,连续三轮全绿(含并发 worker 下的竞态复测)。

## 三视口验收(1280×720 / 1440×900 / 1920×1080)

- 无水平溢出:`documentElement.scrollWidth - clientWidth ≤ 0`,三视口通过。
- 身份区链接保持可见可点击。
- 人物脚底锚点与椭圆中心重合:实测漂移 ≤1px(`--person-feet-x/y` 对 `[data-person-feet-anchor]` 中心)。
- 90° 前景点小狗整体位于人物膝盖以下(狗顶边 > 人物 50% 身高线)。
- 无重复演员:progress 0.82 / 0.94 / 1 下,orbit 激活时 intro 移动演员全部 `data-visible="false"`,反之亦然。

## 四个透视检查点

快照基线:`tests/e2e/home-orbit.spec.ts-snapshots/home-orbit-{0,90,180,270}-desktop-chromium-darwin.png`,按 270°(后)→ 0°(右)→ 90°(前)→ 180°(左)空间顺序人工检查:

- 270°(正后方):狗位于人物正后方、完全被人物遮挡(几何正确的日食态);缩放 0.86 档。
- 0°(右侧):狗在人物右前方,前层,人物注视朝向狗(渲染位置驱动)。
- 90°(正前方):狗在椭圆最低点,缩放 1.06 档,前层,项圈/轮廓完整,位于膝盖以下。
- 180°(左侧):狗在人物左侧,前层,人物注视向左。
- 阴影为 `rgba(37,35,31,0.16)` × 深度不透明度,柔和,无黑色贴片。

## 实测数据

- 最大脚步漂移:**0px**(270° / 90° / 0° / 180° 下 `[data-dog-visual]` 底边对 `[data-orbit-anchor]` 底边,断言上限 1px)。
- 层级迟滞:围绕 180° 边界在 ±0.079 rad 死区内交替 60 帧,层级切换 0 次;+0.081 rad 越界后切到 behind,0° 边界同态。
- 切线朝向:狗朝向按角速度符号取切线方向,顺/逆时针两向均有 E2E 断言(`data-dog-direction` 随运动方向翻转)。
- 交接 delta:**角度差 0 rad,角速度连续**(`baozi:intro-orbit-handoff` detail 直接成为 orbit 初始状态;交接时实测 angle=3.7524 rad,与 intro 末态一致)。
- reduced-motion:激活四固定位(35°/145°/215°/325°),方向键/点按按索引切换,步态帧恒 0,仅 180ms 交叉淡化;orbit 接管演员,`[data-intro-final-art]` 保持隐藏(无双演员)。
- 素材失败:狗图 404/中断时 `data-asset-error="true"`,锚点隐藏,身份内容保持可见;person 素材失败走 `baozi:intro-person-error` 自愈路径。
- 触摸:`touch-action: pan-y`,水平拖拽(移出 90px 死区)更新目标角且不阻断垂直滚动;合成事件需带 `bubbles: true`。

## 素材负载

完整 intro 相关素材负载约 **3.7 MB**(`public/assets` 合计 3776 KB:intro 3504 KB + orbit 运行表 272 KB),**低于 6 MB 上限**。

## 已修复的竞态(本次验证发现)

- `setFinalState` 先派发 `baozi:intro-orbit-reset` 再写 `orbitActive="false"`,会覆盖 reduced-motion 激活,导致偶发"控件已启用但 orbit 隐藏、键盘事件因 `visibility:hidden` 无法聚焦"的卡死态(全量并发下约 2/3 复现)。已改为先复位再广播,控制器持有 `orbitActive` 最终写权。
- reduced-motion 激活与最终静态图互斥:`setFinalState` 在 orbit 接管时跳过最终图显示;probe 晚于 intro 完成时,激活路径主动隐藏最终图。

## 已知问题

- 实验室页人物锚点靠近内容纸左缘(脚点 x≈237px,radiusX=230px),狗在 180°/215° 附近半出纸面左缘;90° 最低点狗脚略低于纸面下缘。这是 `/lab/intro` 占位布局的人物站位所致,非轨道逻辑缺陷;接入正式首页时需按设计规格给人物更居中的站位。不阻断验收。
