# 拟公开范围简表

此表记录本地候选的公开范围，不表示已部署，也不新增真实内容批准。文章进入生产须同时满足 `draft: false` 与 `approved: true`。

| 标识或范围 | 本轮处理 |
| --- | --- |
| `ryoutei-menu-05` | 保留此前已批准状态。 |
| 其他真实文章、项目、相册 | 原批准字段保持；未批准内容不进入生产。 |
| `/resume`、四个 Labs 页面 | 排除生产输出。 |
| `/thoughts/friends-reunion`、`/thoughts/listenhub-embed`、`/thoughts/oppenheimer-cast`、`/thoughts/read-me`、`/thoughts/reading-outline`、`/thoughts/spring-visit`、`/thoughts/webpage-as-room`、`/ai-works/first-experiment` | 八个旧目标提供中性兼容页，不含未批准文章的标题、摘要、正文或指向它的隐藏链接。 |
| `/about/me` | 中性兼容页，不跳转到未公开简历。 |
| `/thoughts` → `/blog`；`/ai-works` → `/projects` | HTML 兼容跳转，不宣称服务器 301。 |
| 实际 Gridea 的 15 条以上未审查旧路径 | 尚未逐项核对，仍是迁移／部署阻碍，不猜测重定向目标。 |
| 原始／参考素材、交接与历史材料 | 不作为新增公开网站内容。 |

`public/` 中的资产会随站点复制，不受文章 `draft`／`approved` 门禁保护；不要放入私人照片。CMS 图片上传还可能立即写入公开 Git 仓库。既有公开 Git 文件与历史不会因本轮门禁或中性页变成私密。

当前仅本地候选；托管 CMS 保存、真实手机操作与正式上线待分别授权和验证。日常操作见 [Pages CMS 日常维护](pages-cms.md)。
