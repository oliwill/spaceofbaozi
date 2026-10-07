# 本地 GitHub Pages 发布候选

本轮只实现本地候选与检查，不构成上线批准。旧 D-130 的 Cloudflare 生产决定保留为历史；不得运行旧 `publish` 或 `deploy:cf` 脚本来启用此候选。没有提交、推送、部署、账户设置、CMS App 安装或 DNS 操作。

## 日常保存与基线

`publishing:check` 校验全部 Blog 原始 YAML 后再使用既有 schema：禁止 raw slug、重复键、非布尔开关、空或不存在的日期；首次日期接受 `yyyy-MM-dd` 及 UTC ISO 时间，统一为 UTC。`updated` 必须省略或为有效日期，且不早于首次日期。现有历史文章无需改写。

未来启用的流程必须使用目标仓库、`refs/heads/main`、`github-pages` 的最后可核实成功部署。读取所有部署/状态分页，以最新有效 success 状态和完成时间选择，再按已验证源码 SHA 查询 Pages 状态 `succeed`。API 错误、未知或失活基线、重复 SHA 尝试造成的歧义均阻止发布；不退回上一条提交、上次保存或成功构建。旧部署继续服务。源码按提交、树和内容 blob 的不可变身份读取。

已公开文章的仓库路径、首次日期和公开状态必须保持。A 正常部署后，B 误改首次日期被拦，C 仅改正文或上传图片仍须与 A 比较。标题、正文、封面和合法 updated 可在原路径维护。新文章只有原始字段合法且 `draft: false`、`approved: true` 才进入预期详情及标签路由。人工公开批准仍由内容负责人做出，本轮没有替任何既有稿件改批准字段。

迁移、重命名、删除、撤回与恢复不在日常路径中实现，也没有宽泛豁免开关。首次接入需要另行批准、范围和摘要绑定的不可变初始化快照；运行时初始化目前故意留空，历史远程 SHA 不视为批准。恢复旧产物必须另行证明实际产物来源；checkout SHA、workflow SHA 和产物来源不一致时拒绝恢复，不把控制工作流的 SHA 当作旧产物的来源。

## 产物边界

`publishing:audit [distDir]` 默认使用 `SITE_URL`、`SITE_BASE` 与 `publication-policy.ts`。Blog 路由来自全部原始字段校验后的候选；非 Blog 内容、空 Media 源快照、既有 28 个 public 文件的身份被冻结，Media 年份路由复用既有模型和审计时间，不固定为 2026。九个 Astro 构建辅助文件（七个 collection schema、两个空 Map 模块）保留具名、精确哈希清单；它们不是发布产物。Astro 向项目外 outDir 构建时可能把这些 `.astro` 辅助文件带入输出，build-done 先核对全部已存在文件的普通文件类型、路径安全与哈希，再逐项移除；正常 dist 中缺失允许，同名未知字节或不安全文件阻止构建。正式审计的 `generatedFiles` 为空，仅另行允许带哈希名称的 `_astro` JS/CSS，不允许任意 JSON/JS 或生成图片绕过清单。

源 `public/_redirects` 原样保留，只在生成产物中明确排除这一个旧平台文件，以免旧 301 规则覆盖中性兼容页；其余 27 个 public 文件包括 `_headers` 按字节核对。`_headers` 不代表 GitHub Pages 已启用 HTTP 头。旧地址有九个仅含批准中性文案的兼容页、两个 HTML 跳转；不宣称服务器 301。resume、Labs 与未批准详情不存在于产物范围。

新 Blog 图片仅限 `public/assets/blog/<安全文件名>.jpg|jpeg|png|webp`，审计核对候选源与产物字节一致；不放宽为整个 assets 目录。图片上传前仍须按 [维护说明](pages-cms.md) 人工检查公开批准、隐私、文件内容和命名，审计无法代替批准，也不能阻止上传已写入 Git 仓库。

HTML 使用结构化解析，检查 href/src/srcset/poster、canonical/OG、目标片段、模板内容、CSS/font/inline URL 与明确运行时 Manifest 的 src；检查两种 base、中文编码、query/hash、404 在深层未知路径的资源引用及符号/硬链接。任意动态 JavaScript 请求仍需浏览器验证；这些检查不声称证明内容隐私。

隔离合成验收可调用 `auditDist(distDir, site, base, policy)`，显式提供完整 `DistPolicy`：`htmlRoutes`、`publicFiles` 与 `generatedFiles` 的相对路径/sha256、`legacyRoutes`、`runtimeManifests`。无 skip 或 fixture 豁免；夹具策略必须记录确切允许范围，不写回生产策略。

## 尚未启用的 Actions

`.github/workflows/pages.yml` 仅有 `workflow_dispatch`，三个 job 均为字面量 `${{ false }}`，没有可随意打开写入的 input/变量。顶层 permissions 为空；仅读取所需 contents/deployments/pages，只有 deploy job 声明 pages/id-token 写权限。只上传通过审计的 dist，构建 hook 已生成旧路由，不重复生成。官方 actions 使用不可变提交，Bun 固定 1.4.2；安装使用 frozen lockfile。停用模板的首次验收地址明确固定为 `https://oliwill.github.io/spaceofbaozi`，所有构建/审计共享 `SITE_URL=https://oliwill.github.io`、`SITE_BASE=/spaceofbaozi`；未来根域切换需另行审阅，不能沿用尚未迁移的 baozi.space 默认地址。

整个流程使用仓库加 github-pages 的固定 concurrency，`cancel-in-progress: false`；未来批准的恢复也必须共用这个锁。开始和部署前检查目标分支最新 SHA，环境批准等待结束后再次核对基线身份和分支；过时运行跳过，不假定队列 FIFO。部署后的独立只读核验 job 不声明环境，并重读真实成功部署。deploy-pages 只使用其文档输出 `page_url`；该 URL 本身不是成功证明，不伪造 deployment ID 输出。

正式启用仍需单独批准代码改动与可信 main push 触发，核验仓库/账户 Pages 条件、环境和分支保护、初始来源批准、实际官方 action 产物兼容性及部署关联、重复 SHA/恢复映射、托管 CMS 保存与真实手机流程、未解决的 Gridea 旧 URL。当前模板不能完成首次部署；本地绿色不关闭这些门槛。
