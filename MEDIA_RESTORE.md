# BaoziSpace 书影音首版独立源码恢复

本包是基于 Library 权威源码 v25（libfile_0d03c46fad088191b0c936924828105b）的 Mac 独立实现，2026-10-05；不替换该稳定身份。输入产品276项与已验证 next-scroll 源逐字节一致。新实现包含书影音 Tasks1–9，真实数据/Excel/RSS/发布仍待对应条件。生产 media snapshot 为空/noindex，不包含真实或合成历史。

本包为源码专用包，未重复打入权威全历史证据。旧全历史归档的3个D155错误仍NON-GREEN，新代码覆盖到独立全历史副本后实际check285文件也只有这3个旧错误。历史原件仍在原v25 Library文件；本包源码check255文件0errors/0warnings2既有hints，不能用此抹掉历史错误。新的逐文件清单为 `_handoff/MEDIA_MANIFEST.json`；原next-scroll QA_MANIFEST仅是输入历史，故不作为本包现行清单。

恢复到新目录，使用已有Bun和冻结锁：`bun install --frozen-lockfile`，`bun run test:unit`，`bun run check`，`bun run build`。不得在原checkout覆盖本包，不得借恢复执行commit/push/deploy。维护门禁、私有路径和候选命令见 `docs/media-maintenance.md`。现有Intro下一下滚直接Home、相册和Projects产品代码与v25保持一致，唯一旧产品变动为导航两文件与pageTurn的media白名单。

私下UI预览：从此源码执行 `bun scripts/media/run-fixtures.ts --case mixed --out /真实/仓库外/新副本`；在新副本执行 `MEDIA_PREVIEW=1 PLAYWRIGHT_PORT=4420 bun x playwright test --config playwright.media.config.ts --workers=2 --retries=0`。各case自动选择该数据状态的测试集，不将空态/非空互斥断言混跑。empty4、mixed15、twenty-years16、withdrawal6，本次全部真实通过；源码全948单元、原生产119浏览器、Projects mixed146通过+1既有emptycase跳过、Photos55通过。新增导航字体12/9、44px触控、六宽度/24布局命中检查；原生200%列表/详情通过，Safari与实体iOS未验。

新Library交付报告列出全部首次失败、修复和证据路径。新截图/MP4短片为合成示例，功能通过不等于用户视觉认可或发布批准；视频目标iPhone实际播放尚未验证。请父任务选择性整合到权威主源码与主报告；此子任务不写它们的稳定身份。
