# baozi.space 完整素材包 v2.0

这是启动页与首页环绕动画的完整替换包。它解决 v1 中“文件名、实际动作与帧号不一致”的问题。

## 从哪里开始

本地 harness 依次阅读：

1. `HARNESS-PROMPT.md`
2. `docs/migration-v1-to-v2.md`
3. `docs/integration.md`
4. `manifest/asset-manifest.v2.json`

## v2 的核心变化

- `assets/**/frames/`：94 张带语义名称的规范源 PNG；每一张都是一个明确画面。
- `assets/**/runtime/`：由源 PNG 自动编译的 WebP Sprite；不要手工修改。
- `manifest/asset-manifest.v2.json`：记录帧 ID、源文件、中文动作说明、锚点、网格与旧路径迁移关系。
- 人物跌倒序列改为 10 帧、`5×2`：明确包含 `stumble-catch-step` 和 `fall-impact`。
- 启动页与首页环绕素材完全分开，禁止交叉配置。

## 运行时素材

```text
assets/intro/runtime/
  ball-bounce-8f.webp
  dog-chase-right-8f.webp
  dog-look-up-settle-8f.webp
  person-pulled-run-right-8f.webp
  person-stumble-fall-exit-right-10f.webp
  person-slide-in-rise-stand-8f.webp
  intro-grass.webp
  intro-final-still.webp

assets/home/runtime/
  person-look-around-12dir.webp
  dog-orbit-run-8dir-4f.webp
```

## 重建与验证

在本目录运行：

```bash
python tools/build_runtime.py .
python tools/build_qa.py .
python -m unittest discover -s tests -v
python tools/verify_package.py .
```

验证器会逐格比较 WebP 与源 PNG，而不只检查文件是否存在。验收图位于 `qa/contact-sheets/`。

## 已锁定的视觉与交互

- B-lite 水彩剪纸：深靛内轮廓、暖白剪纸边、克制套色和暗部 Tone。
- 首页小狗自然透视：后方 `0.86`、侧面 `0.97`、前方 `1.08`。
- 透视、阴影和前后层级在运行时计算，不烘进图片。

旧 v1 包只用于迁移比对，不应继续作为运行时来源。
