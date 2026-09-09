# 启动页资源包规范（v2 · 2026-09-05）

**目的：** 取代 2026-08-31 包与历次补帧（文件名与内容不符的教训，见决策日志 D-128 与 asset-request-2026-09-04）。新包到达后 Harness 重建图集并重新配置运行时。

## 目录结构（zip 或文件夹均可）

```text
<package>/
  manifest.txt          # 必填：每行 "文件名<TAB>一句话内容描述"，人工核对用
  person/
    run.png             # 被绳子拽着跑（侧面朝右、全身）
    pulled-lunge.png    # 被猛拉后向前扑、身体前倾失衡
    fall-dive.png       # 摔倒飞出、身体接近水平
    fall-slide.png      # 倒地后贴地向右滑出
  jiale/
    run-contact.png     # 跑循环：后脚蹬地
    run-stretch.png     # 跑循环：伸展
    run-gathered.png    # 跑循环：收腿
    run-airborne.png    # 跑循环：腾空
  props/
    yellow-ball.png     # 黄色球（静态，旋转由程序驱动）
  background/
    grass-desktop.png   # 草地（桌面全宽）
    grass-mobile.png    # 草地（移动）
```

## 硬性要求

1. **文件名必须描述内容本身**（上面的名字即语义）；不接受 neutral/pose1 这类无名名字。
2. 角色帧：透明背景 PNG，侧面朝右，全身入画，四周留白，最长边 ≥1500px；手中不得有绳子或道具；无地面、阴影、文字。
3. 身份一致：与 `design-assets/intro/oil-motion/source/identity/person-bible.png` / `jiale-bible.png` 同角色（发型、服装、体型、水彩剪纸质感、白描边）。
4. 嘉乐四帧需带蓝色项圈标记点（pipeline 用蓝点检测项圈锚点；沿用旧包做法）。
5. `manifest.txt` 是强制人工核对环节：Harness 入库前逐行对照「文件名 ↔ 内容」，不一致即拒收。

## Harness 入库流程（新包到达后）

1. 解压到 `assets-master/deliverables/<package>/`；
2. 逐行核对 manifest.txt（像素 diff + contact sheet）；
3. 改 `scripts/intro-materials/prepare-confirmed-materials.mjs` 的 SOURCE_ROOT 与帧列表；
4. 跑 pipeline → 自动产出 contact sheet（`design-assets/intro/oil-motion/qa/contact-sheet.png`）；
5. 包子过目 contact sheet → 确认后更新运行时引用。
