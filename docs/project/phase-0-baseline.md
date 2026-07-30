# baozi.space V2 · Phase 0 基线

**状态：** 完成

**快照时间：** 2026-07-30（Asia/Shanghai）

**范围：** 仓库、生产构建、页面与内容、设计原型、规范文件

**原则：** Phase 0–1 只调整产品文档，不修改正式页面实现。

## 1. 生产仓库快照

| 项目 | 基线 |
|---|---|
| 工作区 | `E:\baozi` |
| Git remote | `https://github.com/oliwill/spaceofbaozi.git` |
| 分支 | `main` |
| HEAD | `00022b4ace8d42a582197912f2702c4b6b364b5a` |
| 框架 | Astro 5.12，静态输出 |
| 内容源 | Astro Content Collections + Markdown / MDX |
| 客户端实现 | 原生 CSS / JavaScript，Astro ClientRouter |
| 运行要求 | Node.js 20+ |
| 正式部署 | 尚未连接 Cloudflare Pages |

### Phase 0 开始前的未提交变更

以下变更早于本轮文档工作，必须保留，不能被 Phase 0–1 覆盖或误提交：

| 文件 | 基线状态 | 已知用途 |
|---|---|---|
| `assets-master/raw/home/cover-bookmark.png` | modified | 狗狗金属书签原始素材更新 |
| `baozi-space-prd.md` | modified | 新增 AI for UI 质量门槛 |
| `src/pages/index.astro` | modified | 首页入口转场与体验增强 |
| `src/styles/journal.css` | modified | 书脊、书签和入口微交互调整 |

开始本轮前的 diff 规模为：4 个文件，184 行新增、99 行删除，另有 1 个二进制素材变化。

## 2. 可运行性基线

2026-07-30 实际执行：

| 检查 | 结果 |
|---|---|
| `bun run check` | 通过；0 errors、0 warnings、20 hints |
| `bun run build` | 通过；生成 27 个静态页面 |
| 输出目录 | `E:\baozi\dist`（Git ignored） |

20 个 hints 来自：

- vendored `public/vendor/sticker-forge/sticker-forge.es.js` 的 TypeScript 建议；
-两个带 `src` 属性的 Astro `<script>` 被当作 inline script 的提示。

它们不是当前构建阻塞项，但 V2 若移除旧贴纸交互，应重新评估是否继续保留 `sticker-forge`。

## 3. 页面与路由基线

```text
/

/blog                 /blog/<slug>
/thoughts             /thoughts/<slug>
/photos               /photos/<slug>
/drinks               /drinks/<slug>
/books                /books/<slug>
/music                 /music/<slug>
/about                 /about/<slug>
/ai-works              /ai-works/<slug>
```

八个栏目路由和详情路由已存在，当前共生成：

- 1 个首页；
- 8 个栏目归档页；
- 18 个公开详情页；
- 合计 27 页。

## 4. 内容基线

| 栏目 | Markdown 总数 | 当前公开 | 草稿 | 内容状态 |
|---|---:|---:|---:|---|
| Blog | 10 | 8 | 2 | 有真实旧文，也有站点占位文章 |
| Thoughts | 7 | 4 | 3 | 有真实旧文 |
| Photos | 1 | 1 | 0 | 公开占位 |
| Drinks | 1 | 1 | 0 | 公开占位 |
| Books | 1 | 1 | 0 | 公开占位 |
| Music | 1 | 1 | 0 | 公开占位 |
| About | 1 | 1 | 0 | 公开占位 |
| AI Works | 1 | 1 | 0 | `status: draft-concept`，但没有 `draft: true`，因此当前公开 |

### 上线前必须处理的公开占位内容

- `src/content/blog/welcome-to-baozi-space.md`
- `src/content/photos/placeholder-frame.md`
- `src/content/drinks/kitten-three.md`
- `src/content/books/reading-stack.md`
- `src/content/music/vinyl-corner.md`
- `src/content/about/me.md`
- `src/content/ai-works/first-experiment.md`

这些文件在用户明确批准前不得被视为正式内容。尤其 `AI Works` 的 `status: draft-concept` 不会触发现有草稿过滤，属于发布前内容治理风险。

## 5. 素材基线

| 目录 | 文件数 | 体积 | 角色 |
|---|---:|---:|---|
| `public/assets` | 23 | 约 0.87 MB | 生产投放素材 |
| `assets-master` | 21 | 约 36.80 MB | 原图与母版 |

`baozi-space-assets.md` 的真实素材、母版/投产版、命名、白边与阴影规则仍有复用价值。它尚未覆盖 V2 所需的“生成图片 Style Recipe”，该部分留到 Phase 2。

## 6. 已选设计方向

**唯一视觉来源：** `binder-archive（活页档案）`

原型位置：

`E:\baozi-rivet-artifacts\binder-archive`

原型基于同一 HEAD 创建，目前是未提交的隔离 worktree。已验证：

- 桌面 + 透明活页本启动页；
- 卡片堆叠、抽取、键盘操作和 Escape 收回；
- “进入档案”后进入周记网格主页；
- 八栏目索引、最新文章、最近更新和 About 摘要；
- 1440×900 与 390×844；
- 无 JavaScript 直读和 `prefers-reduced-motion` 降级；
- Astro check/build。

### 原型不是生产规范

原型中的以下内容仍是验证用假设，不自动成为最终需求：

- CSS 桌面和透明活页本占位；
- 11 张启动卡的数量与顺序；
- 原型中的身份、站点说明和 About 文案；
- 首页“最新 Blog + 最近 3 条”的编辑规则；
- 卡片是否全部直接进入栏目；
- 每次访问是否都显示启动页。

这些项目必须由 PRD V2 和用户内容输入确认。

## 7. 现有规范审计

| 文件 | 结论 | Phase 0 处理 |
|---|---|---|
| `baozi-space-prd.md` | 产品与技术基线有价值，但首页仍混有麻布封面、自由拼贴、四个显式入口等旧方向 | 升级为 V2，旧内容由 Git 历史保留 |
| `baozi-space-spec.md` | 2026-07-22 的 V1 设计规格，与活页档案方向存在结构冲突 | 标记为历史规格，Phase 2 再写正式 V2 设计规范 |
| `baozi-space-assets.md` | 真实素材管线仍有效；缺少可复现的生成图 Style Recipe | 保留，Phase 2 扩展 |
| `docs/plans/2026-07-24-home-single-page-design.md` | 已实施过的旧首页计划 | 仅作历史记录 |

## 8. Phase 0 后的事实来源

1. **产品与页面要求：** `baozi-space-prd.md`
2. **用户需要提供的页面内容：** `docs/project/phase-1-content-input.md`
3. **现有内容逐条批准：** `docs/project/content-approval-register.md`
4. **已确认决策：** `docs/project/decision-log.md`
5. **当前技术与素材管线：** 实际代码、`src/content.config.ts`、`baozi-space-assets.md`
6. **当前视觉论证：** `E:\baozi-rivet-artifacts\binder-archive`
7. **未来正式设计规范：** Phase 2 产出，不能由 V1 spec 或原型代码代替。

## 9. 冻结规则

- 用户确认 PRD 和内容结构前，不修改 `src/pages`、`src/styles`、`public/scripts`。
- 用户确认高保真设计与交互原型前，不把 binder 原型迁入生产。
- 用户个人事实、身份介绍、栏目定位、联系方式和正式文案均由用户提供。
- Codex 可以定义字段、指出缺口、整理和润色，但不得把占位文案包装成用户事实。
- Cloudflare 只在开发、内容和 QA 通过后进入生产绑定；开发期先使用预览部署。

## 10. 当前主要风险

| 风险 | 级别 | 处理阶段 |
|---|---|---|
| V1 文档与 binder 方向冲突 | Closed by D-002；V1 已加历史警示 | Phase 0 |
| 正式个人内容未提供 | Blocking | Phase 1 |
| 多个占位条目当前公开 | Blocking before launch | 内容准备 / QA |
| 启动卡数量、回访策略未定 | Blocking before design | Phase 1 |
| 透明活页本和桌面真实素材未制作 | Blocking before final visual | Phase 2–3 |
| 原型尚未迁入生产 | Expected | Phase 5 |
| Cloudflare Pages / DNS 未接通 | Expected | Phase 7 |
