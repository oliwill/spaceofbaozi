# 书影音维护（首版，私下验证）

生产 `src/data/media/public.json` 当前为空。这份实现不代表真实二十年档案已迁移，不包含真实 Excel/RSS 适配验证、发布、域名或凭据设置。所有合成内容只能由隔离 runner 写入仓库之外的新副本。真实资料须另有安全输入、字段核验、逐修订批准及发布授权。

## 数据契约与私有位置

`safe-json.ts` 接受明确 `schemaVersion:1`、`sourceAt`（已知可靠来源时间或 null）、`coverage:'complete'|'partial'`、`reliable:boolean`、`records:NormalizedRecord[]`。这是规范化安全 JSON 契约，不是豆伴原始导出兼容声明。类型字段见 `src/lib/media/schema.ts`；每条必须明确来源、稳定身份、完成状态、可见性、本人评分与标记日期的语义。未知值为 null/unknown，不能用导入时刻、0星或总评分替代。日期原始值、精度、可信瞬时分别保留；未来或不一致字段进入异常。

拒绝 ZIP、账号/会话/凭据字段、不在白名单的列、超10MiB、超50,000行、单评论超100,000字符。超限应拆成明确 partial 批次，不静默截断。不要提供完整账号备份、密码、cookie、token；不要将私下原件或账本放进仓库、public、构建输出或交付包。路径必须为真实绝对路径，且私有目录已存在、在项目之外。拒绝任意符号链接组成部分；macOS `/var`、`/tmp` 别名请先用 `realpath` 得到 `/private/...` 的真实路径，不关闭检查。

先运行默认预览：

```sh
bun scripts/media/import.ts --input "$PRIVATE_MEDIA_DIR/marks.json" --private-dir "$PRIVATE_MEDIA_DIR" --preview
```

确认私下导入结果后加 `--apply-private`，只写该私有目录中的 `archive.json` 和统计报告。任何模式都不改生产快照、不发网络请求、不执行 Excel 公式或脚本。报告仅包含统计、行号和原因，不回显原评论或疑似凭据。失败的实际私下导入保存 failed 阻断状态，保留此前成功时间；成功、partial、failed 分别显示。完整成功时间还要求可靠来源时间且不晚于当前；旧回灌不能推进它。不要并发执行同一个私有目录的维护操作。

## 审核与候选

初次导入待审。评分/评论改动产生新的修订 hash，不随导入自动发布。旧数据或不可靠变更进入 conflict；缺项不代表删除。可靠新修订显示变私密/非完成时，下一候选排除并阻断，直到明确处理。私下 `publication.json` 保存站内 hidden 持久否决；重导入或后续批准文件的 hidden:false 不会复活。首版无自动解除隐藏命令；如确需恢复，要另行审阅具体记录和维护方案。

批准文件结构：`schemaVersion:1`、`expectedSnapshotHash`（当前生产 JSON 原始字节 SHA256）、`decisions`（id→approvedRevision/hash|null、hidden、可选 override/cover）、`unresolvedWithdrawals`、`coverage`。批准应由审阅者明确提供具体修订，不允许“全部自动公开”。override 可修改本站评论/本人评分，原始数据仍只在私下。封面只接受已授权本地 `/assets/media/` 静态资源及真实尺寸、alt；本工具不下载封面。候选命令不自动批准 Blog 链接；详情构建再次限定为实际存在且通过原项目 isPublishable 门禁的文章，只链接一个正文。

```sh
bun scripts/media/publish-candidate.ts --private-dir "$PRIVATE_MEDIA_DIR" --approval "$PRIVATE_MEDIA_DIR/approval.json" --expected-snapshot-hash "$APPROVED_PREVIOUS_HASH" --out "$PRIVATE_MEDIA_DIR/candidate.json"
```

此命令仅原子写私有候选和维护账本，检查批准文件及旧快照 hash、未解决撤回/冲突、导入失败状态；临时文件写完再次校验旧 hash。中断不损坏原候选，生产快照从不替换。候选输出不得覆盖 archive、publication、last-report 或批准文件。得到候选后仍需人工审查、受测本地快照替换与单独的发布授权。没有自动发布/部署脚本。原件不删除，不上传第三方。

“候选已排除”不等于“线上已下架”：本工具 onlineStatus 固定 not-verified。线上旧版本可能仍可访问，必须在另行授权的部署及线上核验后才能确认下架。

## 构建与审计

使用 fresh dist 构建，禁止把旧详情目录累积进新构建。执行：

```sh
bun run test:unit
bun run check
bun run build
bun scripts/media/audit-output.ts --dist ./dist --snapshot ./src/data/media/public.json
```

审计遍历全部文件名与字节文本，包括 HTML、JS、JSON、maps、索引、站点地图、结构化数据与资源。它检查未批准详情引用、私有字段、未批准封面和批准详情/封面缺失；API额外接受私有哨兵列表。搜索/站点地图若不存在，结果标 not-applicable，不视为已测试该产品功能。审计不是秘密识别万能扫描；真实迁移还须根据私有数据提供针对性哨兵，在受控环境查看统计报告。交付包明确排除私有维护目录，不能只依赖 gitignore。

归档历史3个D155检查错误与当前源码检查分开记录；不要修改根tsconfig、删历史证据或降低断言掩盖错误。

## 静态日期、返回与更新

站点遵循既有 Astro `trailingSlash:'never'`，书影音 URL 不带末尾斜线。年份/类型/分页可直接刷新；只生成有已批准记录且非未来的日路径。无记录日显示文字等价信息，不生成404链接；未来不可操作。每页24条。选中日只筛列表、日历保持全年；再次点击清除。

当前年以构建时 Asia/Shanghai 为准。每年上海时间1月1日后的第一次维护，执行同一测试、fresh build、审计，再按已授权方式发布；首版没有自动跨年任务。未重建仍显示实际已生成年份。无JS详情普通返回到条目所属年/日期待补，浏览器原生返回保持来源URL；有JS支持合法from与锚点、同导航链原生Back及独立baoziMedia位置恢复，不借用Projects状态。

## 私下验收

`bun scripts/media/run-fixtures.ts --case mixed --out /真实/仓库外/新目录`，另有 empty、twenty-years、withdrawal。runner复制产品代码和依赖，源指纹前后相同，覆盖只发生在新副本。twenty-years证明跨度处理，不证明真实历史；withdrawal通过正式候选规则排除隐藏、未批准、私密哨兵。浏览器使用独立配置、2workers、0retry，保留真实失败。Safari、实体iOS及原生200%按本次证据报告实际状态，不以模拟视口冒充。

审计 CLI 可加 `--forbidden "$PRIVATE_MEDIA_DIR/sentinels.json"`，该文件为非空字符串数组，仅保存在仓库外真实私有路径。普通、URL编码、Unicode/十六进制及HTML实体形式的稳定ID一并核对；私有哨兵命中的路径在报告中隐去。源码根按脚本真实位置确定，从其他cwd执行也不能把public/dist当私有维护目录。

独立站内覆盖按字段持久保留：后续批准只更新revision hash时，不会清掉原comment/myRating override或已批准cover；新明确字段才覆盖。`myRating:null`明确表示本站未评分，不等于清除覆盖。首版无自动“恢复来源值”的命令，需另行审阅维护账本操作。
