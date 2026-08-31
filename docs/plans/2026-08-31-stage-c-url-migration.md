# 阶段 C · URL 迁移与重定向表

**状态：** 草案，待包子确认后进入阶段 C 执行
**日期：** 2026-08-31
**依据：** D-021（逐条永久跳转）、D-106（IA 收缩为 Blog / Photos / Shelf / Projects / About，覆盖 D-015 的三独立页面）、`2026-08-13-v2.1-project-restructure.md`

## 1. 栏目级映射

| 旧栏目 | 条目数（公开/草稿） | 目标栏目 | 目标路由 | 旧路由处置 |
| --- | --- | --- | --- | --- |
| blog | 10（7/3） | Blog | `/blog/<slug>` 不变 | 无 |
| thoughts | 7（4/3） | Blog | `/blog/<原slug>` | 逐条 301 |
| photos | 1（0/1 占位） | Photos | `/photos/<slug>` 不变 | 无 |
| ai-works | 1（0/1 占位） | Projects | `/projects/<原slug>` | 逐条 301 |
| books | 1（0/1） | Shelf | 见开放问题 1 | 逐条 301 |
| music | 1（0/1） | Shelf | 见开放问题 1 | 逐条 301 |
| movies | 无旧集合 | Shelf | 同上 | 无旧路由 |
| drinks | 1（0/1） | 逐条确认（D-106） | 见开放问题 2 | 待定 |
| about | 1（0/1） | About | `/about` | `/about/me` → `/about` 301 |

slug 冲突检查：thoughts 七个 slug（friends-reunion、listenhub-embed、oppenheimer-cast、read-me、reading-outline、spring-visit、webpage-as-room）与 blog 十个 slug 无交集，可直接平移。

## 2. 逐条迁移表

### thoughts → Blog

| 旧 URL | 标题 | 日期 | 草稿 | 新 URL |
| --- | --- | --- | --- | --- |
| `/thoughts/friends-reunion` | 老友小聚 | 2024-02-18 | 是 | `/blog/friends-reunion` |
| `/thoughts/listenhub-embed` | ListenHub | 2025-10-09 | 否 | `/blog/listenhub-embed` |
| `/thoughts/oppenheimer-cast` | 奥本海默人物表 | 2023-09-03 | 是 | `/blog/oppenheimer-cast` |
| `/thoughts/read-me` | Read me | 2019-01-25 | 否 | `/blog/read-me` |
| `/thoughts/reading-outline` | 是什么，看什么，怎么看 | 2025-01-03 | 是 | `/blog/reading-outline` |
| `/thoughts/spring-visit` | 在春天之时，我会去见妳 | 2025-03-31 | 否 | `/blog/spring-visit` |
| `/thoughts/webpage-as-room` | 把网页当成房间来布置 | 2026-07-22 | 否 | `/blog/webpage-as-room` |

### ai-works → Projects

| 旧 URL | 标题 | 草稿 | 新 URL |
| --- | --- | --- | --- |
| `/ai-works/first-experiment` | 第一件 AI 实验（占位） | 是 | `/projects/first-experiment`（占位内容不发布，仅保留映射） |

### books / music → Shelf

| 旧 URL | 标题 | 草稿 | 新 URL |
| --- | --- | --- | --- |
| `/books/reading-stack` | 正在读 / 想读的一叠 | 是 | 待开放问题 1 |
| `/music/vinyl-corner` | 黑胶角的第一张 | 是 | 待开放问题 1 |

### drinks → 逐条确认

| 旧 URL | 标题 | 候选去向 |
| --- | --- | --- |
| `/drinks/kitten-three` | 伊势角屋「小猫三只」 | a) Blog 短文（关联链接）；b) 下线并 301 到 `/blog`；c) 保留为标签页。需包子逐条拍板 |

### about

| 旧 URL | 新 URL |
| --- | --- |
| `/about/me` | `/about`（D-021） |

## 3. 重定向实现

Cloudflare Pages 部署（D-010）下用 `public/_redirects` 实现真实 301，每行一条：

```text
/thoughts/friends-reunion  /blog/friends-reunion  301
/thoughts/listenhub-embed  /blog/listenhub-embed  301
/thoughts/oppenheimer-cast  /blog/oppenheimer-cast  301
/thoughts/read-me  /blog/read-me  301
/thoughts/reading-outline  /blog/reading-outline  301
/thoughts/spring-visit  /blog/spring-visit  301
/thoughts/webpage-as-room  /blog/webpage-as-room  301
/ai-works/first-experiment  /projects/first-experiment  301
/about/me  /about  301
```

不使用 Astro `redirects` 配置的 meta-refresh 页（非真实 301，SEO 与分享语义弱）。栏目根 `/thoughts`、`/ai-works` 分别 301 到 `/blog`、`/projects`。

## 4. 前置依赖（同阶段切换，不可拆分）

- content schema 增加 `approved`、`updated`、`coverAlt`、`coverCredit`（PRD / D-026 门禁）；
- `src/content/` 建立 `shelf`、`projects` 集合并删除 `thoughts`、`ai-works`、`books`、`music`、`drinks` 旧集合；
- 所有查询（主页精选 / 最近更新 / 栏目列表）切换到新集合；
- 重定向断言：每条旧 URL 返回 301 且落点正确（e2e 或部署后 curl 清单）。

## 5. 开放问题

1. **Shelf 详情 URL 形态**：`/shelf/<slug>` 还是 `/shelf/books/<slug>` 等分子类型？前者扁平、后者保留媒体类型语义；决定后 books / music 两条映射才能定稿。
2. **Drinks 单条去向**：见上表候选；D-106 只说“降级为标签或主题并逐条确认”。
3. **占位条目是否保留映射**：`ai-works/first-experiment` 为占位草稿，从未公开发布的话可不做重定向，直接删除。
