# 相册主人与嘉乐素材

2026-10-03 · 候选待包子视觉确认，未进入 public

六个语义姿态：person-invite / person-open / person-watch / jiale-lie / jiale-head-up / jiale-rest。人物为站立的主人，面对访客邀请；嘉乐卧在影集边，开册抬头一次，之后安静在纸页外。翻页不触发角色动作，减少动效只用静止姿态。

原夏季人物、嘉乐设定表来自历史参考包，仅取参考像素；未用旧代码代替 v5 源码基线。哈希与生成提示见 design-assets/photos/qa/README.md、source/generation-prompts.json。源稿、设定表、六姿态对照和桌面/手机静态布局候选均在 design-assets/photos，不随公开构建输出。候选板使用明确标注的合成几何页，不是真实影集或运行截图。

人物保留桶帽、圆眼镜、相机图案衬衫、短裤和鞋；嘉乐保留比熊毛色、比例、口鼻、耳朵和项圈。独立 PNG 均有真实透明通道，原图约9.95MB；按2×显示尺寸生成WebP的内存估计合计约358KB，尚未生成运行时文件。正式导出前须处理低透明度外围像素、统一 groundAnchor，再逐张检查衣物、白毛、脚底和动作身份。

用户确认后才可创建 public/assets/photos-characters/ 和独立 public/manifest/album-characters.v1.json。Manifest 须含 approved:true 与六姿态记录；每个记录含 src、width、height、visibleBounds（left/top/width/height）、groundAnchor（x/y）及 approved:true。运行时资源目标合计≤1MB。现有 asset-manifest.v2.json 永不修改。manifest缺失、未批准或素材加载失败时隐藏装饰，阅读功能独立可用。

视觉关卡包括真实运行时桌面/手机站位、身份、邀请手势、开册/停留节奏和不遮挡照片与控制。静态候选批准不能冒充浏览器验收，也不批准任何真实照片公开。
