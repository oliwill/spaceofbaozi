# 两张重画帧的生成记录

执行方式：ChatGPT 内置图像生成；使用人物模型表、相邻动作帧作为参考。生成器把透明预览棋盘烘进图像后，使用包内 `extract_subject_from_neutral_background()` 做确定性 Alpha 分离，并在深紫色背景上检查暖白边。

## `stumble-catch-step`

```text
Use case: identity-preserve
Asset type: transparent animation keyframe for baozi.space intro
Input images: Image 1 is the authoritative character identity/model sheet; Image 2 is the immediately preceding pulled-lean pose; Image 3 is the later fall-slide-right pose. Preserve Image 1's exact person identity, body proportions, face, shoulder-length black hair, navy bucket hat, round glasses, cream short-sleeve shirt with blue vintage camera print, navy shorts, black round watch, and navy slip-on shoes. Preserve the established B-lite Japanese watercolor cut-paper style: fine deep-indigo hand-inked inner contour, low-saturation watercolor and paper grain, warm off-white cut-paper border, very subtle blue/green misregistration, sparse low-opacity halftone only in dark clothing.
Primary request: Create a NEW intermediate stumble-recovery pose, full-body strict side view facing right, occurring after Image 2 and before Image 3. A sudden leash pull has thrown him off balance, but he has not fallen or left the ground. Torso leans about 45 degrees forward to the right; center of gravity visibly passes beyond the planted forward RIGHT foot. Right foot steps far forward trying to catch balance, sole contacting the implied ground; left foot drags behind with toes still touching the same implied ground. Both knees bent. Both arms are stretched forward by the pull. The farther right hand is clenched in a believable leash-grip shape but holds nothing; the other hand is open. Head remains strict right-facing profile; startled expression. The pose must read as STUMBLING, not sprinting, jumping, flying, lunging, or already falling.
Composition/framing: one complete isolated person, centered, generous transparent margin, no cropping.
Scene/backdrop: genuine transparent background.
Constraints: no leash, no dog, no ball, no ground, no grass, no shadow, no text, no labels, no checkerboard. Exactly two arms, two hands, two legs and two feet. Keep all wardrobe and identity details unchanged.
```

## `fall-impact`

```text
Use case: identity-preserve
Asset type: transparent animation keyframe for baozi.space intro
Input images: Image 1 is the authoritative character identity/model sheet. Image 2 is the immediately preceding stumble-recovery pose. Image 3 is the later belly-slide-right pose. Preserve Image 1's exact identity, proportions, face, shoulder-length black hair, navy bucket hat, round glasses, cream short-sleeve shirt with blue vintage camera print, navy shorts, black round watch, and navy slip-on shoes. Preserve the established B-lite Japanese watercolor cut-paper style: fine deep-indigo hand-inked inner contour, low-saturation watercolor and paper grain, warm off-white cut-paper border, very subtle blue/green misregistration, sparse low-opacity halftone only in dark clothing.
Primary request: Create a NEW forward-fall impact keyframe between Image 2 and Image 3. Strict full-body side view facing right. He has just lost the recovery step and is pitching forward: torso nearly horizontal but chest and abdomen have NOT yet touched the implied ground; both arms extend diagonally down-forward with OPEN palms ready to brace; both legs trail behind and lift slightly off the implied ground, with bent knees and visible momentum. It is the split second before impact, clearly more airborne and forceful than Image 3. The farther right hand keeps a subtle leash-grip curl while remaining empty; do not show a leash. Startled expression, hat and glasses still secure.
Composition/framing: one complete isolated person, centered, generous transparent margin, no cropping.
Scene/backdrop: genuine transparent background.
Constraints: no leash, no dog, no ball, no ground, no grass, no shadow, no text, no labels, no checkerboard. Exactly two arms, two hands, two legs and two feet. Both palms must be in front of the body, not one fist reaching horizontally. Keep all wardrobe and identity details unchanged.
```
