# baozi.space V2 · 内容批准清单

**状态：** 等待真实内容逐条确认；已知占位内容已确认为不公开

**用途：** 区分“当前可以构建”与“用户批准进入 V2 生产”。现有 schema 的 `draft: false` 只代表技术上公开，不代表内容已经获得 V2 发布批准。

## 状态说明

| 用户决定 | 含义 |
|---|---|
| Approve | 用户动作；完成后 PRD 编辑状态变为 Approved，可进入后续设计与发布 QA |
| Edit | 保留，但用户需要补充或修改后再批准 |
| Draft | 保留在仓库，V2 发布前设为 `draft: true` |
| Retire | 不进入 V2；是否删除文件在开发阶段另行确认 |
| Pending | 尚未判断 |

> `Phase 2 Design-ready / Publication pending` 是补充设计状态，不替代上述用户决定；内容可用于设计时仍可保持 `Edit`，且不得计入生产发布门禁。

## 发布规则

- 本清单由用户确认。
- Phase 5–6 根据确认结果更新 frontmatter 或内容，不在 Phase 1 修改正式内容。
- 只有 `Approve`，或完成修改后从 `Edit` 转为 `Approve` 的内容，才能将 frontmatter 设为 `approved: true` 并进入 V2 生产候选。
- Phase 5 所有列表和详情统一过滤为 `draft: false && approved: true`；`status` 不承担公开门禁。
- `Approve` 后仍需通过 schema、图片来源、alt、链接和排版 QA。
- 新内容也必须进入本清单或后续同等批准流程。
- V2 生产首发要求 Blog、Photos、Project、Drinks、Books、Music、Movies 各至少有一条真实内容达到 `draft: false && approved: true`；主栏目与次栏目使用同一门禁。
- 现有占位内容、布局样本和生成的假内容不能获得首发计数；用户已明确要求它们不展示。
- About 不计入七个内容栏目数量，但完整页面也必须使用用户批准的正式内容。
- 预览或迁移过程中有效内容为零的栏目保留 URL，显示“正在整理”并设置 `noindex`；第一条有效内容发布后由内容数量自动取消该状态。

## V2 首发门禁检查

| 目标栏目 / 页面 | 最低要求 | 当前可计数内容 | 当前结论 |
|---|---:|---:|---|
| Blog | 1 条真实且已批准内容 | 0 | 《料亭菜单 NO.5——将心注入》已标记为 `Phase 2 Design-ready / Publication pending`；发布状态仍为 Edit，Phase 5 修订并最终 Approve 前不计数 |
| Photos | 1 条真实且已批准内容 | 0 | 首发相册的主题、排版和顺序由包子完整策展；方案及真实原创照片尚未交付 |
| Project | 1 条真实且已批准内容 | 0 | 「中华一番包子铺」已标记为 `Phase 2 Design-ready / Publication pending`；六个核心字段、精简详情、截图方案及链接策略已确认，真实截图、正式内容文件和最终 Approve 尚未完成，当前 AI Works 占位条目不计数 |
| Drinks | 1 条真实且已批准内容 | 0 | 首条真实酒款记录暂不拆解，由包子准备好后一次性交付完整记录；当前占位条目不计数 |
| Books | 1 条真实且已批准内容 | 0 | 首条真实阅读记录暂不拆解，由包子准备好后一次性交付完整记录；当前占位条目不计数 |
| Music | 1 条真实且已批准内容 | 0 | KOKIA《Songbird》保持 `Phase 1 Input pending`；包子暂时没有个人简短感受，不生成代写内容，当前占位条目也不计数 |
| Movies（收录电影 + 剧集） | 1 条真实且已批准内容 | 0 | 首发样本《火花》(2016) 已标记为 `Phase 2 Design-ready / Publication pending`；真实结构、10 集信息、观看日期和个人短评可用于 Phase 2 设计，但正式内容文件、未确认素材和最终 Approve 尚未完成，仍不计入门禁 |
| About | 用户批准的正式完整页面 | 0 | 短版身份已确认；长版页面待确认 |

> “当前可计数内容”只统计已经由用户 Approve 且最终满足发布字段与 QA 的内容；技术上当前可构建或公开不计入。

## V2 栏目迁移说明

- 当前文件路径继续记录 Phase 0 事实，本阶段不移动内容文件。
- 用户确认后，获准保留的 Thoughts 内容在 Phase 5 并入 Blog。
- 获准保留的 AI Works 内容在 Phase 5 并入 Project。
- 每条被迁移且曾公开的内容都必须保留旧 URL 永久跳转；Retire 内容是否保留跳转在开发前逐条确认。

## 当前 18 个公开详情页

| 栏目 | 文件 | 当前性质 | 当前技术状态 | 用户决定 | 备注 / 修改要求 |
|---|---|---|---|---|---|
| Blog | `src/content/blog/welcome-to-baozi-space.md` | 已知占位 | 公开 | Draft | 用户已确认不展示；Phase 5 设为草稿或另行 Retire |
| Blog | `src/content/blog/jiangjian-niuxiaopai.md` | 迁移旧内容 | 公开 | Pending | |
| Blog | `src/content/blog/niuwei-gutang.md` | 迁移旧内容 | 公开 | Pending | |
| Blog | `src/content/blog/ryoutei-menu-05.md` | 迁移旧内容；Blog 首发设计样本（`Phase 2 Design-ready / Publication pending`） | 公开 | Edit | 原创、摘要、标签已确认；开头引文保留，需修正引号并署名“——又吉直树《火花》”；Milk Boy / M-1 段落保留，统一名称并按官方结果与历史资料校正，补充官方来源；现有第三方内容链接全部保留为普通外链，不嵌入，统一标题并在上线前检查有效性；正文采用轻度校对；两处「更加捕鼠器」确认改为「更佳捕鼠器」；“让将灵魂注入油豆腐”确认删除多余的「将」；第二人称保留「妳」；其余明确错漏按轻度校对处理；当前门禁计数为 0，完成差异检查后再由包子 Approve |
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

Codex 会将结果回写为逐条状态，并在 Phase 5–6 生成对应实施任务。
