# D-149 阅读追球素材记录

## 蹲姿人物

文件：`public/assets/reading/person-crouch-watch-right.png`。2026-10-02经用户明确授权，以`design-assets/intro/reference/model-sheets/person-summer-model-sheet.png`为身份/服装参考，使用内建Image Gen生成独立透明全身深蹲朝右人物。前臂搭膝、双脚接地、平静观看；保留桶帽、圆眼镜、相机图案衬衫、深蓝短裤与布鞋。

尺寸1173×1341，1547825 bytes，PNG Alpha；可见范围约x170/y100/w874/h1158。SHA256：`415f8cc628163d14ef96983fac6b1728ed687672c0b9d31567a5df064eed7367`。不覆盖原模型表，不改变原角色图集或Manifest。现有`person-slide-in-rise-stand`第5帧只表示半蹲起身扶帽，故未把它当作蹲看姿态。

## 嘉乐与球

- 嘉乐：`public/assets/home/runtime/dog-orbit-run-8dir-4f.webp`，1024×1536，4列8行，单帧256×192；第一行0–3为东向跑步。四帧可见Alpha并集x8/y15/w240/h173，以同一裁框显示，避免换帧时尺寸跳动。
- 球：`public/assets/intro/runtime/ball-bounce-8f.webp`，640×320，4列2行，单帧160×160；使用第0帧。可见Alpha框x8/y15/w144/h132，包含原白边，黄色球体约16px宽显示。
- 两者均仅以CSS选择原图帧和裁去透明空白，不生成新狗、不拉伸球形，不修改原文件。
- 可见狗框70×50.4583px，球框18.7317×17.1707px，独占轨道高度62px。正文100%时两框横向约8px间距；球与狗按地面对齐，表示跑到球旁。
- 位置只由阅读进度决定；步态按位移选帧，停止滚动即静止，减少动效和终点使用接触帧。
