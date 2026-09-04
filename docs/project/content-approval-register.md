# baozi.space V2 · 内容批准清单

**状态：** 等待真实内容逐条确认；已知占位内容已确认为不公开。D-127（2026-09-04）起门禁在代码层强制执行。

**用途：** 区分“当前可以构建”与“用户批准进入 V2 生产”。D-127 前 `draft: false` 只代表技术上公开；现在所有生产查询统一要求 `draft: false && approved: true`，未批准内容不进入列表与详情。

## 状态说明

| 用户决定 | 含义 |
|---|---|
| Approve | 用户动作；完成后 PRD 编辑状态变为 Approved，可进入后续设计与发布 QA |
| Edit | 保留，但用户需要补充或修改后再批准 |
| Draft | 保留在仓库，V2 发布前设为 `draft: true` |
| Retire | 不进入 V2；是否删除文件在开发阶段另行确认 |
| Pending | 尚未判断 |

> `Design-ready / Publication pending` 是补充设计状态，不替代上述用户决定；内容可用于设计时仍可保持 `Edit`，且不得计入生产发布门禁。旧文档中的 `Phase 1/2/5/6` 名称按 D-107 视为历史阶段称呼。

## 发布规则

- 本清单由用户确认。
- 阶段 C 根据确认结果更新 frontmatter 或内容；只有 `Approve` 才能设置 `approved: true`。
- 所有生产列表和详情统一过滤为 `draft: false && approved: true`；`status` 不承担公开门禁。
- `Approve` 后仍需通过 schema、图片来源、alt、链接和排版 QA。
- 新内容也必须进入本清单或后续同等批准流程。
- v2.1 生产首发要求 Blog、Photos、Projects 各至少一条真实批准内容；Shelf 内 Books、Movies、Music 各至少一条；About 使用批准后的完整页面。
- Drinks 不再有独立栏目门禁；旧记录逐条确认目标，确认前不计入任何门禁。
- 占位内容、布局样本和生成的假内容不能获得首发计数。
- 预览或迁移过程中有效内容为零的目标栏目保留 URL，显示“正在整理”并设置 `noindex`；第一条有效内容发布后自动恢复。

## v2.1 首发门禁检查

| 目标栏目 / 页面 | 最低要求 | 当前可计数内容 | 当前结论 |
|---|---:|---:|---|
| Blog | 1 条真实且已批准内容 | 0 | 《料亭菜单 NO.5——将心注入》为 Design-ready / Publication pending；完成修订并最终 Approve 前不计数 |
| Photos | 1 条真实且已批准内容 | 0 | 首发相册及真实原创照片尚未交付 |
| Projects | 1 条真实且已批准内容 | 0 | 「中华一番包子铺」为 Design-ready / Publication pending；真实截图、正式文件和最终 Approve 尚未完成 |
| Shelf / Books | 1 条真实且已批准内容 | 0 | 首条真实阅读记录尚未交付；旧占位不计数 |
| Shelf / Movies | 1 条真实且已批准内容 | 0 | 《火花》(2016) 为 Design-ready / Publication pending；正式内容文件与最终 Approve 尚未完成 |
| Shelf / Music | 1 条真实且已批准内容 | 0 | KOKIA《Songbird》缺少个人简短感受；不得代写，旧占位不计数 |
| About | 用户批准的正式完整页面 | 0 | 短版身份已确认；长版页面待确认 |

> “当前可计数内容”只统计用户 Approve 且满足最终字段与 QA 的内容；技术上可构建或公开不计入。

## v2.1 内容迁移说明

- 当前文件路径继续记录 D-105 生产事实；A0-H / A1 不移动内容文件。
- 经批准 Thoughts 在阶段 C 并入 Blog；AI Works 并入 Projects；Books / Movies / Music 统一迁入 Shelf 并保留类型语义。
- Drinks 逐条确认目标，不做整栏盲迁移。
- 每条曾公开内容必须保留旧 URL 永久跳转；Retire 内容是否保留跳转在迁移前逐条确认。

## 当前 18 个公开详情页

| 栏目 | 文件 | 当前性质 | 当前技术状态 | 用户决定 | 备注 / 修改要求 |
|---|---|---|---|---|---|
| Blog | `src/content/blog/welcome-to-baozi-space.md` | 已知占位 | 公开 | Draft | 用户已确认不展示；阶段 C 设为草稿或另行 Retire |
| Blog | `src/content/blog/jiangjian-niuxiaopai.md` | 迁移旧内容 | 公开 | Pending | |
| Blog | `src/content/blog/niuwei-gutang.md` | 迁移旧内容 | 公开 | Pending | |
| Blog | `src/content/blog/ryoutei-menu-05.md` | 迁移旧内容；Blog 首发设计样本 | 公开 | **Approve**（2026-09-04） | 2026-09-04 登记修订完成并由包子批准：引文署名「——又吉直树《火花》」、Milk Boy 正名 + M-1 官方来源、description/tags、三处校对。Blog 首发门禁计数：1 |
| Blog | `src/content/blog/roasted-chicken-wings.md` | 迁移旧内容 | 公开 | Pending | |
| Blog | `src/content/blog/biomed-supply-chain.md` | 迁移/现有内容 | 公开 | Pending | |
| Blog | `src/content/blog/unsplash-daily-image.md` | 迁移/现有内容 | 公开 | Pending | |
| Blog | `src/content/blog/claudecode-beginner-guide.md` | 迁移/现有内容 | 公开 | Pending | |
| Thoughts | `src/content/thoughts/webpage-as-room.md` | 项目期候选内容 | 公开 | Pending | |
| Thoughts | `src/content/thoughts/listenhub-embed.md` | 迁移旧内容 | 公开 | Pending | |
| Thoughts | `src/content/thoughts/read-me.md` | 迁移旧内容 | 公开 | Pending | |
| Thoughts | `src/content/thoughts/spring-visit.md` | 迁移旧内容 | 公开 | Pending | |
| Photos | `src/content/photos/placeholder-frame.md` | 已知占位 | 公开 | Draft | 用户已确认不展示；不计入 Photos 首发门禁 |
| Drinks | `src/content/drinks/kitten-three.md` | 已知占位 | 公开 | Draft | 用户已确认不展示；不计入 Drinks 首发门禁 |
| Books | `src/content/books/reading-stack.md` | 已知占位 | 公开 | Draft | 用户已确认不展示；不计入 Books 首发门禁 |
| Music | `src/content/music/vinyl-corner.md` | 已知占位 | 公开 | Draft | 用户已确认不展示；不计入 Music 首发门禁 |
| About | `src/content/about/me.md` | 已知占位 | 公开 | Draft | 用户已确认不展示；需用正式 About 内容替代 |
| AI Works | `src/content/ai-works/first-experiment.md` | 已知占位；仅有 `status: draft-concept` | 公开 | Draft | 用户已确认不展示；不计入 Project 首发门禁，且当前 `status` 不会触发草稿过滤 |

## 当前 5 个草稿

这些内容已被现有 `draft: true` 正确排除，但未来如需公开，仍需用户批准。

| 栏目 | 文件 | 当前技术状态 | 用户决定 | 备注 / 修改要求 |
|---|---|---|---|---|
| Blog | `src/content/blog/miro-board.md` | Draft | Pending | |
| Blog | `src/content/blog/software-list.md` | Draft | Pending | |
| Thoughts | `src/content/thoughts/friends-reunion.md` | Draft | Pending | |
| Thoughts | `src/content/thoughts/oppenheimer-cast.md` | Draft | Pending | |
| Thoughts | `src/content/thoughts/reading-outline.md` | Draft | Pending | |

## 用户填写方法

可直接回复：

```text
Approve: ryoutei-menu-05, spring-visit
Edit: biomed-supply-chain（补摘要和来源）
Draft: welcome-to-baozi-space, placeholder-frame
Retire: ...
```

Codex 会将结果回写为逐条状态，并在阶段 C / E 生成对应实施任务。
