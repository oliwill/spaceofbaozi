# startup-3: approved terminal pose + asset fallback

Input source Library v19; this candidate is newer. Read the saved receipt for actual output version/sha. Do not run previouscandidate2.

# 启动页与首页末帧交接验收

当前为用户16:11明确批准末帧保留方案后的新候选，包含角色故障回退修复。原v19/精简QA v1虽25项通过，但真实录屏有双影与单资源故障，原失败保持。只有新候选实测可闭环。

1. 从同身份最新源码或精简QA包恢复独立Mac目录，核tar SHA与逐文件清单。保留旧源、旧截图/JSON/失败。冻结依赖与配置；不修改源码/阈值/timeout/retry。
2. 单元应752项/46文件；源码check199/0/0/2hints，完整归档默认check227项仍3个历史错误，需原样披露；精简源省略历史证据，其check不能代表全归档。构建19页。
3. 先--list核41项，再运行一次：PLAYWRIGHT_PREVIEW=1 PLAYWRIGHT_PORT=4339 bun x playwright test tests/e2e/intro-handoff.spec.ts tests/e2e/intro-oil.spec.ts tests/e2e/home-orbit-production.spec.ts tests/e2e/home-asset-fallback.spec.ts tests/e2e/intro-held-pose.spec.ts --workers=2 --retries=0。保持30秒test/5秒expect等原预算，失败存原JSON/trace即回报，不现场修源。
4. 新session的1440×900及390×844窄桌面模拟真实wheel完整录屏：球→狗→人→摔出→滑回站稳/坐定→首页。重点.98/.985/.99/.9925/.995/.997/1，以及完成后静止、首次鼠标移动/点击、首次方向键。必须只有一对全不透明角色、末帧图/节点相同、无突然跳位/白帧，保持真实HTML/导航可用；原矩形对齐不能代替透明轮廓检查。
5. 鼠标事先停在未来角色区域，完成后不能因显示/余下wheel自动换姿；只有后续真正输入释放。第一方向键恰移动一次，首mousemove/点击同次响应。Tab、focus、合成输入、纵向触摸不算意图。资源尚未就绪不能释放成空角色，加载成功本身也不自动释放。
6. 390/767/768/1440以及动效偏好重建保留末帧，鼠标静止resize不能释放。相关skip、directhash/session、反向、草地resize、所有导航往返保持；可用时实际记录BFCache persisted，不用普通Back冒充。
7. 人物/狗/两者/回退图各失败，桌面及390均只有原整张定帧或干净HTML；不得双狗/单角色失踪后无回退。另一asset或Intro manifest永久pending时也要及时退出；故障跨断点/动效偏好不复活；仅隐藏区已持焦点时移至main。
8. 回传原始结果、源哈希、逐文件证据清单、完整新视频与tail/首输入截图，云端复核后再交用户视觉确认。保留原健康路径900ms问题及其他栏目旧失败，不借本41项关闭。禁止commit/push/deploy、素材重绘/发布、真200%权限更改或绕过浏览器限制。
