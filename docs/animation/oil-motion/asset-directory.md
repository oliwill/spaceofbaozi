# baozi.space 启动页 oil-motion 素材目录说明

状态：CP0.5 锁定（D-121）  
来源：根目录《baozi.space 启动页 Oil Motion 项目管理计划》§6

## 边界：非公开源稿 vs 运行时资产

仓库约定（AGENTS.md Intro Hard Gates、D-107）：源稿、参考、生成母版、Prompt、任务 ID 与 QA 报告属于**非公开**，不得复制到 `public/` 作为生产素材；只有审计通过的最终图集、Manifest 与静态图可以进入 `public/`。

因此计划 §6 目录按下述方式拆分：

```text
design-assets/intro/oil-motion/     # 非公开：源稿、母版、Prompt、QA
  source/
    identity/
      person-bible.png
      jiale-bible.png
    keyframes/
      K0.png
      K1.png
      K2.png
      K3.png
      K4.png
    prompts/
      seedance-person-v1.txt
      seedance-jiale-v1.txt
    master/
      person-master.mp4
      jiale-master.mp4
    motion-brief.yaml
  qa/
    person-raw-contact.jpg
    person-final-contact.jpg
    jiale-raw-contact.jpg
    jiale-final-contact.jpg
    motion-budget.json
    generation-log.md
    qa-report.md

public/assets/intro/oil-motion/     # 运行时：仅审计通过的图集、Manifest 与静态图
  person/
    desktop.webp
    desktop.motion.json
    mobile.webp
    mobile.motion.json
  jiale/
    desktop.webp
    desktop.motion.json
    mobile.webp
    mobile.motion.json
  static/
    stage-desktop.webp
    stage-mobile.webp
    handoff-home-desktop.webp
    handoff-home-mobile.webp
```

## 命名与保留规则

- 生成母版、Prompt、任务 ID 与 QA 报告必须保留；可再生的中间 PNG 可在正式交付后清理。
- 每个角色分别产出桌面与移动尺寸资源，避免移动端解码桌面大图集。
- 不把球、横向位移、草地和牵引绳烧进角色图集；这些由程序化几何与网页静态层承担。
- Manifest（`*.motion.json`）记录帧数、行列、单元格尺寸、fps、参数映射与逐帧锚点，运行时不得把这些数值散落在组件中。
