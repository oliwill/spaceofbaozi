# baozi.space 素材工程规范（Asset Pipeline）

**文档定位：** 与 `baozi-space-spec.md`（视觉设计规格）、`baozi-space-prd.md`（产品需求）同级的第三份规范——**素材工程规范**。  
**适用范围：** 所有进入网站的实拍物件、纸片、贴纸、印章与手绘标记的加工、命名与投产。  
**关联：** 输出参数与 `baozi-space-prd.md` 第八章「导出与输出系统」、第十章「性能指标」互相引用；CSS 阴影/白边复用 `src/styles/global.css` 既有设计令牌。  
**版本：** v1 · 2026-07-24

---

## 0. 一句话原则（最高约束）

> **Everything on the desk should feel owned, used, and collected by Baozi — not invented by AI.**
> Every object keeps its real-world identity. AI acts only as a **darkroom technician**: it may cut out, de-dust, and match lighting — it may **never** repaint, restyle, add, remove, or invent any part of the object. **If a detail wasn't in the photo, it doesn't exist.**

「暗房师（darkroom technician）」而非「工匠（craftsman）」：工匠会创造，暗房师只冲洗。这条是全流程的红线，任何工序与任何模式都不得违反。

---

## 1. 核心工程决策（先读这一节）

这套规范和大多数「一个 Prompt 丢给生成模型」的做法有四个根本区别，它们是全篇的基石：

1. **抠图与描边允许用 AI 工具，但「内容完整性」是不可让渡的红线。** 实际流程：拍摄照片 → AI 工具完成抠图与描边 → 存放到本地母版目录。允许 AI 做去背、白边、去灰、统一色温；**不允许**它重绘物件的任何内容——文字、logo、按钮、镜头、划痕、颜色，一律以原图为准。每个资产出图后必须**对照原图逐件人工验收**：发现任何被重绘、新增或丢失的细节，即返工或换工具。程序化抠图（rembg / sharp / ImageMagick）是可选增强而非强制；工具可以换，红线不变。
2. **区分「母版」与「投产版」两层。** 母版为归档保真，投产版为网页性能。绝不把 4096px/300dpi 的印刷级大图直接塞进网页——那会一张就击穿 PRD 第十章「首屏图片 ≤ 900KB」的预算。
3. **落影（投射到桌面的阴影）不烤进 PNG，交给 CSS。** 物件在网页里会带随机小角度旋转，烤死的阴影会跟着歪、露馅、换纸色时发脏。PNG 只出「白边物件本体」；落影用 CSS `drop-shadow` 全站统一。物件自身的真实质感阴影（纸的折痕/卷边自阴影）属于「物件真实身份」，保留在图内。
4. **实物照片与手绘插画是两类资产，规则不同。** 实物照片（相机、酒、书……）走「暗房师」规则——AI 只清理、不创造。手绘/插画装饰（数字手绘箭头、小图标、AI 手绘贴纸）**允许 AI 生成**，因为它们本就是「画出来的」；但风格必须锁定在手账体系内（见第 2 节 Mode I 与第 8 节）。一条判断线：它在现实里摸得着，就不许 AI 发明；它本来就是一笔画，AI 可以画。

---

## 2. 物件模式决策表（拍什么 → 用哪个模式）

先查表，无需靠记忆归类。**白边一律用绝对像素（见第 4 节），落影一律走 CSS（见第 5 节）。**

| 物件类型 | 模式 | 白边 | CSS 落影 | 图内自阴影 | 典型例子 |
|---|---|---|---|---|---|
| 硬质小物 · 可平放 | **A** | 有（绝对 px） | 有（标准） | 无 | 相机、酒罐、钢笔、咖啡杯 |
| 厚重立体物 · 有明显体积 | **A-** | **无** | 有（更重） | 保留物体自身明暗 | 书、游戏机、Walkman、机器人模型 |
| 纸片 / 票据 | **B** | **无** | 极轻 | 保留折痕/卷边 | 便签、电影票、门票、明信片、信封、标签 |
| 拍立得照片 | **B+** | **用其自带白边**，不再描 | 有（标准） | 保留相纸质感 | 生活照、旅行照 |
| 已有 die-cut 贴纸 | **C** | 保留原有，不叠加 | 极轻 | 保留原样 | Mofusand、旅行贴纸、品牌贴纸 |
| 标记 / 笔迹 / 印章（真实纸面抠出） | **D** | 无 | 无 | 无 | 手绘箭头、圈画、印章、荧光笔痕 |
| 数字手绘 / AI 插画装饰 | **I** | 无 | 无（可 multiply 压纸） | 保留笔触 | 数字手绘箭头、小图标、AI 插画贴纸 |

判定要点：
- **书为什么是 A- 不是 A**：书有厚度，沿整个 silhouette 描白边会把书脊阴影区圈进白边，很丑。厚重立体物靠 CSS 阴影「浮起」，不描边。
- **拍立得为什么是 B+ 不是 B**：它物理上就是相纸，本身自带白边；当作纸片处理，但**利用它自己的白边**，绝不再描第二层。
- **D 类为什么单列**：印章/箭头/荧光笔既不是照片也不是纸，是「标记」，应为透明 PNG 或 SVG，无边无落影，网页里用 `mix-blend-mode: multiply` 压在纸上更自然（见 5.3）。

**判定口诀（给「这是哪一类」卡壳时用）：** 先问「它在桌上是纸还是物？」——是纸就不描边（B）；是物就描边（A）；厚到能立住就不描边改重落影（A-）；自带边的（拍立得、die-cut 贴纸）用原边（B+/C）；是真实笔迹印章就无边无影（D）；是凭空画出来的就归插画（I）。典型边界：口红=A（硬质小物，平放）；已经贴在纸上再拍进照片的贴纸=纸的一部分（B），不再单独按 C 处理；玻璃杯=A（保留真实透明质感，勿补不存在的反光）。

---

## 3. 三道工序（拆分后的工作流）

实物照片资产都走同一条流水线。**工序 1 允许 AI 工具；工序 2 的人工验收是红线，不可省略。**（纯手绘/插画资产 @I 不经过此流水线，直接按 8.2 风格约束生成。）

```text
原始照片（包子拍摄）
   │
   ├─ 工序 1 · AI 抠图 + 白边（允许生成/编辑模型）
   │     产出：透明 PNG，物件完整抠出；Mode A 加白边
   │     约束：只准去背与描边，不准动物件内容
   │     附加：defringe 去边缘杂色
   │
   ├─ 工序 2 · 对照原图验收（人工，红线）
   │     逐件核对：文字 / logo / 按钮 / 划痕 / 颜色是否与原图一致
   │     任何被重绘、新增、丢失的细节 → 返工或换工具
   │
   └─ 工序 3 · 母版归档 + 导出投产版
         母版：PNG 2048px bounding box → assets-master/
         投产：WebP 800–1200px、≤150KB → public/assets/
         落影一律不在图内（CSS 负责）
```

（可选增强：批量处理时用 rembg / sharp / ImageMagick 替代工序 1，结果更稳定可复现；非强制。）

**为什么仍要拆工序：** AI 抠图工具的能力差异很大，把「出图」和「验收」分开，红线才不依赖某个具体模型的承诺——工具可以换，验收标准不变。第 0 条原则在工程上的落实方式，就是这道对照原图的人工验收。

---

## 4. 白边规范（Mode A / A- 与 C）

**用绝对像素，不用「物件最长边百分比」。** 原因：同一网页里横放的相机（长边很长）和立起的酒罐（长边中等），按各自最长边百分比描边会得到肉眼可见不同粗细的白边；拍立得白边好看正是因为其物理绝对宽度全世界一致。

| 参数 | 值 | 说明 |
|---|---|---|
| 白边宽度（母版 2048px 画布上） | **14–18 px** | 换算到网页展示尺寸 ≈ 3–4px，与 CSS `--sticker-outline: 0 0 0 4px` 观感一致 |
| 轮廓 | 平滑圆角、无毛刺 | 由 alpha dilate 取轮廓得到，非生成模型玄学 |
| padding | 无额外内边距 | 白边紧贴 silhouette |
| A- / B / B+ / D | **不描白边** | 见决策表 |
| C（已有 die-cut 白边） | 保留原有，**严禁叠加第二层** | 例：Mofusand 保持单层白边，不得变双层 |

> 注：若母版画布尺寸调整，白边像素需等比换算，保证「网页展示时约 4px」这一观感恒定。

---

## 5. 阴影规范（统一走 CSS，复用现有令牌）

### 5.1 原则

- **落影不烤进 PNG。** PNG 只含「白边 + 物件本体」，背景纯透明。
- **落影由 CSS 提供**，全站一致，随物件旋转/纸色自适应。
- **图内保留的只有物件自身质感阴影**：书的体积明暗、纸的折痕/卷边自阴影、相纸厚度——这些属于「物件真实身份」，删了就假。

### 5.2 CSS 落影令牌（对齐 `src/styles/global.css`）

直接复用既有令牌，不另开一套：

| 模式 | 推荐 CSS | 对应令牌 |
|---|---|---|
| A（硬质小物） | `filter: drop-shadow(0 4px 8px rgba(40,32,24,0.14))` | 近似 `--shadow-soft` 加强 |
| A-（厚重立体物） | `filter: drop-shadow(0 10px 22px rgba(40,32,24,0.18))` | 近似 `--shadow-lift` |
| B / C（纸片、贴纸） | `filter: drop-shadow(0 2px 6px rgba(40,32,24,0.10))` | `--shadow-soft` |
| B+（拍立得） | 沿用 `.photo-frame` 的 `--shadow-lift` | 已存在 |
| D（标记/印章） | 无阴影 | — |

> 目标参数区间（供新增令牌时参考）：opacity 10–18%，blur 6–22px，offset 2–10px，方向统一向下偏右。已有 `--shadow-soft`、`--shadow-lift` 已落在此区间，优先复用而非新造。

### 5.3 D 类混合模式

印章、箭头、荧光笔痕用透明 PNG 或 SVG，网页里加 `mix-blend-mode: multiply`，让墨色/荧光真正「压」在纸纹上，而不是浮在表面像贴纸。

---

## 6. 输出规范（母版 / 投产双版）

**「4096px / 300dpi / 正方形」适合印刷素材库，不适合要跑 Lighthouse 的静态站。** 拆成两层：

### 6.1 母版 Master（归档保真）

| 参数 | 值 |
|---|---|
| 格式 | PNG 无损，透明 |
| 尺寸 | 长边 **2048px** |
| 画布 | 按物件真实**外接矩形（bounding box）裁切**，非正方形 |
| 阴影 | **不含落影**（仅图内自阴影） |
| 用途 | 长期归档、未来重新导出投产版 |
| 存放 | gitignore 的冷目录（参照 `fonts-src/` 模式）或图床冷存，**不进 `public/`** |

### 6.2 投产版 Web（上线用）

| 参数 | 值 | 依据 |
|---|---|---|
| 格式 | **WebP**（必要时 AVIF） | PRD 第八章图片格式 |
| 尺寸 | 长边 **800–1200px**（按展示尺寸 ×2 for retina） | 避免过采样 |
| 单张体积 | **≤ 150KB** | 分摊 PRD 第十章预算 |
| 首屏物件合计 | **≤ 900KB** | 对齐 PRD 第十章「首屏图片 ≤ 900KB」硬阈值 |
| 透明边距 | 收紧到 **2–4%** | 对齐由 CSS 定位负责，不靠图内留白 |
| 阴影 | 不含（CSS 提供） | 见第 5 节 |
| DPI | **不写 dpi**（网页无意义，只认 CSS 像素） | 删除误导性字段 |

> 关键取舍：dpi 只影响打印物理尺寸，浏览器只认 CSS 像素；写进网页资产规范纯属噪音。正方形画布 + 15% 安全边距会让细长物件（钢笔）有效像素只占中间一条、四周全废，故投产版按 bounding box 收紧、对齐交给 CSS。

**预算分配（2026-07-24 按首页实际结构校准）：** 首页当前仅 4 个入口物件（手账本、便利贴、相机、包子）+ 若干装饰。入口物件优先保障质量，单张 ≤150KB（4 张 ≈ 600KB）；装饰物件从简，单张 30–80KB，且 `loading="lazy"` 延迟加载——装饰品不计入首屏 900KB 预算，但计入总页重。若装饰增多使总页重超过 1.5MB，先砍装饰数量，不动入口质量。

---

## 7. 命名与目录规范

没有命名规范，几十个物件后必乱。目录已在仓库中建好：

```text
assets-master/                    ← 本地母版库（gitignored，不进仓库）
  raw/                            ← 原始照片（未经处理）
    home/  blog/  thoughts/  photos/  drinks/  books/  music/  about/  ai-works/
  master/                         ← 抠图验收后的 PNG 母版（2048px bounding box）
    home/  blog/  ...（同上的九个目录）

public/assets/                    ← 投产版（进仓库，网站直接引用）
  home/                           ← 首页物件（入口 + 装饰）
  blog/  thoughts/  photos/  drinks/  books/  music/  about/  ai-works/
```

命名：`<slug>@<mode>.<ext>`；首页装饰物加 `deco-` 前缀；数字手绘/插画类用 `@I`。

首页槽位（2026-07-27 已按实际落地校准，新增物件追加在后）：

| 槽位 | 文件（public/assets/home/） | 模式 | 状态 |
|---|---|---|---|
| Blog 入口（主锚点） | —（CSS 纸片实现，无需图片） | B | 已上线 |
| Thoughts 入口 | —（CSS 便利贴实现，无需图片） | B | 已上线 |
| Photos 入口 | `camera@B.webp` | B | 已上线（最终选了无白边版本） |
| About 入口 | `baozi@A.webp` | A | 已上线 |
| 封面麻布（空白） | `cover-linen@A-.webp` | A- | 待制作（当前为 CSS 占位，到位后替换 .cover-front 背景） |
| 封面手写真迹 | `cover-hand@D.webp` | D（暗字转白） | 待制作（到位后替换 .cover-quote 占位文字） |
| ~~封面（正/背）~~ | ~~`cover@A.webp` / `cover@B.webp`~~ | — | 已过时（2026-07-27 封面重构，不再引用；文件留仓备查） |
| 装饰 · 贴纸 | `deco-sticker-airpods@C.webp`、`deco-sticker-michelin@C.webp`、`deco-sticker-washer@C.webp` | C | 已上线（airpods 带 WebGL 掀开交互） |
| 装饰 · 玩偶 | `deco-wukong@I.webp` | I | 已上线 |
| 装饰 · 插画 | `deco-jiale01.webp` | I | 已上线（命名缺 @mode，新增时按 `deco-名字@I.webp`） |
| 装饰 · 唱片/花/印章 | `deco-vinyl@A-.webp`、`deco-flower@A.webp`、`deco-stamp-名字@D.webp` | A-/A/D | 待制作 |

- 母版同名存 `assets-master/master/home/<同名>.png`；原始照片存 `assets-master/raw/home/`。
- `<slug>`：英文短横线命名，与内容 Markdown 的 slug 对应或语义关联。
- 栏目内容图（正文插图）存对应栏目目录，规则相同；首页物件的网页坐标属于 `journal.css` 视觉设计，不在本规范。

---

## 8. 共用 Style Guide（所有模式统一）

### 8.1 光线 Lighting

```text
color temperature : neutral-to-slightly-warm, 5000–5500K（不偏黄）
white balance     : 中性偏暖，不发黄不发蓝
contrast          : soft natural
禁止              : HDR、戏剧化高光、硬阴影
```

> 修正：原「warm daylight + neutral white balance」自相矛盾（暖 vs 中性打架）。目标是 MUJI / Hobonichi 感，故明确色温 5000–5500K，用数值替代形容词，逐张可对齐。

### 8.2 质感 Texture（绝不移除）

```text
paper grain / scratches / fingerprints / ink texture /
leather texture / fabric texture / wood texture
```

真实感 > 「干净」。磨损、划痕、指纹、纸纤维都是「被 Baozi 真实使用过」的证据。

### 8.3 色彩 Color

```text
never oversaturate
目标气质：Japanese stationery shop / MUJI / Traveler's Notebook / Midori / Hobonichi
反面参照：Dribbble / Behance / 3D Render
```

### 8.4 边缘清洁

抠图/修图后边缘常残留半透明灰边，网页放大可见。统一要求：**defringe 去边缘杂色，alpha 边缘干净、不带原背景色**。

---

## 9. 可访问性钩子（资产阶段就产出 alt）

每个资产在网页里都要有 `alt`；**别等开发阶段补，出图时同时产出一句中文 alt 文案**，直接写进 Markdown 或资产清单。

```text
canon-a1@A.webp   → alt="包子的佳能 A-1 胶片相机"
kitten-three@A    → alt="伊势角屋『小猫三只』啤酒罐"
```

对齐 PRD 第七章空/错误状态：图片加载失败时 alt 是唯一可读信息，必须有意义、非文件名。

---

## 10. 各模式加工 Prompt（仅用于工序 3 / 或不支持程序化描边时的降级）

> 用法：以下 Prompt 用于工序 1（AI 抠图 + 描边），是实物资产的主路径。所有 Prompt 都必须叠加第 0 条红线与「do not alter shape/text/details」；出图后一律进入工序 2 人工验收。

### 10.1 Mode A / A-：真实物件

```text
Act as a darkroom technician, not a designer.
Remove the entire background of this photographed object with pixel-level
fidelity. Preserve every authentic detail: real colors, textures, scratches,
reflections, printed text, logos, buttons, signs of use.
Do NOT repaint, redesign, stylize into illustration, simplify, recolor,
or invent any part. If a detail wasn't in the photo, it must not appear.

[Mode A only] Add a clean white sticker border of uniform absolute thickness
(~4px at display size) hugging the silhouette; smooth rounded contour, no
spikes, no extra padding.
[Mode A- : do NOT add any border — thick/3D objects float via shadow only.]

Do NOT bake any drop shadow into the image (shadow is added later via CSS).
Keep the object's own volumetric shading and material texture.
Defringe edges: clean alpha, no leftover background color.

Output: transparent PNG, object centered, tight transparent margins,
original proportions, no cropping, no text, no watermark, no decorations.
```

### 10.2 Mode B / B+：纸类物件 / 拍立得

```text
Act as a darkroom technician, not a designer.
Extract this paper item from its background, preserving its exact original
shape. Do NOT add any sticker border — paper is its own edge.
Preserve authentic paper edges, worn corners, folds, wrinkles, handwriting,
printing texture, tape marks, paper grain.
[Mode B+ / polaroid] Preserve the photo's existing white border; never add a
second border.
Keep the paper flat; no perspective correction unless clearly needed.
Do NOT bake a cast shadow into the image (CSS adds it). Keep only the paper's
own fold/curl self-shadow. Defringe edges cleanly.

Output: transparent PNG, original proportions, centered, no redesign,
no illustration effect, no background, no text generation.
```

### 10.3 Mode C：已有 die-cut 贴纸

```text
Act as a darkroom technician, not a designer.
Remove ONLY the surrounding background. Preserve the sticker exactly as it
exists — do not recreate, redraw, or restyle it.
Keep the original die-cut outline and any existing white border.
Do NOT add another border (no double outline).
Do NOT bake a cast shadow into the image (CSS adds it). Defringe edges.

Output: transparent PNG, original proportions, no background, no text.
```

### 10.4 Mode D：标记 / 印章 / 笔迹

```text
Act as a darkroom technician, not a designer.
Isolate this hand mark / stamp / highlighter stroke on full transparency.
Preserve exact ink texture, edge roughness, and opacity variation.
No border. No cast shadow. No redesign. No fill cleanup that removes texture.
Output: transparent PNG (or trace to SVG if a clean vector is required),
intended to sit on paper with mix-blend-mode: multiply.
```

---

## 11. 验收清单（每个资产上线前自查）

```text
[ ] 抠图/描边已对照原图逐件验收：文字、logo、按钮、划痕、颜色无一被重绘、新增或丢失
[ ] 手绘插画类（@I）风格锁定在手账体系：无 3D 渲染感、无 Dribbble 风、暖中性色
[ ] 白边：仅 Mode A 有，绝对宽度、无毛刺、无双层
[ ] PNG 内无烤死的落影；仅保留物件自身质感阴影
[ ] 边缘无半透明灰边 / 原背景残色（已 defringe）
[ ] 母版：PNG 2048px bounding box，存冷目录
[ ] 投产版：WebP ≤150KB，长边 800–1200px，透明边距 2–4%
[ ] 首屏物件合计 ≤900KB（对齐 PRD 第十章）
[ ] 命名：public/assets/<section>/<slug>@<mode>.webp
[ ] 已产出有意义的中文 alt 文案
[ ] 色温 5000–5500K，未过饱和，无 HDR
```

---

## 12. 与其他规范的边界

- **本规范（素材工程）**：物件从照片到透明资产的加工、命名、投产参数。
- **`baozi-space-spec.md`（视觉设计）**：物件在页面中的排布、比例、纸张编排、批注语言。
- **`baozi-space-prd.md`（产品）**：栏目、路由、内容模型、性能阈值、发布流程；第八章「输出系统」与第十章「性能指标」是本规范输出参数的上位约束。
- **不变量**：无论工具如何替换，第 0 条「AI 只做暗房师、不造物」、实物资产出图必对照原图人工验收、母版/投产双版、落影走 CSS——这四条不可变。
