# claude.dev 文章页左栏拆解：阅读进度与树形目录

> 探测方式：curl 落盘静态产物 + chunk 去混淆 + 浏览器运行时测量（Playwright/Chromium 1440×900）
> 探测时间：2026-09-30 · 样本页：`https://claude.dev/blog/getting-the-most-out-of-opus-5-5/`
> 原始数据：`E:\baozi\.workbuddy\tmp-claude-dev\`（page.html + 11 个首屏 chunk + 13 个懒加载 chunk + 4 个 CSS）

---

## 0. 一句话结论

两个效果都不依赖动画库。**阅读进度是一条 28 格的等宽块字符文本条**（每帧重写 `innerHTML`，分母只算正文容器），**目录跳转是原生 `scrollIntoView({behavior:'smooth'})` 加 `scroll-margin-top`**。全站没有 Lenis、没有 lerp、没有 wheel 劫持，滚动是原生的。手法本身轻，可复用；但有三处代价必须在移植时处理，其中「与 Lenis 冲突」直接决定本站能不能照抄。

---

## 1. 取证与技术栈

| 项 | 结论 | 证据 |
|---|---|---|
| 框架 | Next.js App Router（静态产物 + RSC 内联载荷） | `self.__next_f.push`、`/_next/static/chunks/*`、turbo runtime chunk |
| 样式 | 原生 CSS，按页面作用域隔离 | `@scope(html[data-pg=article])` 出现在 `20n8gv9q7cccj.css` |
| 客户端逻辑 | 单 chunk 内的 `ArticleClient` island | `1d9wx5sok5pry.js` 中去混淆后的 `useEffect` 主体 |
| 平滑滚动 | 原生 `scroll-behavior` + `scrollIntoView` | 全部 chunk 中 `Lenis` / `lerp` / `wheel` 监听 / `passive:false` 命中数为 0 |
| 进度条形态 | 文本块字符，随等宽字体排版 | `#prog` 的 `textContent` 运行时为 28 个 `░` + `00%` |

去混淆代码在本文中只保留逻辑等价形式，变量名已改写。

---

## 2. 版面骨架

```
.body-grid  (12 列栅格，padding-top 4rem)
├── aside.rail      grid-column 1/5，sticky top 2rem，min-height calc(100dvh - 4rem)
│   ├── .rail-title   当前文章标题，滚动后浮出
│   ├── .th           "TREE"
│   ├── #tree         目录（h2/h3 锚点）
│   ├── .prog         阅读进度条     ← 目标 1
│   ├── .hint         "PRESS ↑ / ↓ TO SCROLL"
│   └── .share        margin-top:auto 顶到左栏底部
└── div.prose#body    正文
```

左栏是整屏高的 flex 列，进度条紧贴目录下方，分享区用 `margin-top:auto` 抵到底部。运行时实测（1440×900）：`position: sticky`、`top: 36px`、`min-height: 828px`。

---

## 3. 阅读进度条

### 3.1 不是图形条，是 28 格文本

服务端直出的 HTML 就是最终形态：

```html
<div class="prog" id="prog"><b></b>░░░░░░░░░░░░░░░░░░░░░░░░░░░░<span class="pct">00%</span></div>
```

滚动时整段重写：

```js
const cells = 28;
const n = Math.round(cells * t);
prog.innerHTML =
  `<b>${"▓".repeat(n)}</b>${"░".repeat(cells - n)}` +
  `<span class="pct">${String(Math.round(100 * t)).padStart(2, "0")}%</span>`;
```

CSS 只做色彩分层，不做宽度动画：

```css
.rail .prog    { color: var(--ink-4); white-space: nowrap; font-size: .875rem; overflow: hidden; }
.rail .prog b  { color: var(--ink); font-weight: 400; }   /* 已读段更深 */
.rail .pct     { color: var(--ink-2); margin-left: 8px; }
```

沿用左栏等宽字体，不需要新增组件、SVG 或伪元素遮罩；进度条随字号缩放，深浅两级靠 `--ink` / `--ink-4`。

### 3.2 分母只算正文容器

```js
const scrollable = body.getBoundingClientRect().bottom + scrollY - innerHeight;
const t = Math.max(0, Math.min(1, scrollY / Math.max(1, scrollable)));
```

`body` 指 `#body`（正文容器），不是 `documentElement`。实测：正文可滚动距离 11215px，整页可滚动距离 12877px，相差 1662px（页脚与相关文章）。所以正文末尾贴到视口下沿即 100%，之后 `Math.min` 保持 100% 不再增长。

### 3.3 窄屏改用 1px 顶条

```css
#topProg { position: fixed; top: 0; left: 0; height: 1px; width: 0; z-index: 1200; display: none; }
@media (max-width: 900px) { #topProg { display: block; } .rail .prog, .rail .hint { display: none; } }
```

两处写同一个 `t`：左栏写 `innerHTML`，顶条写 `style.width = 100 * t + "%"`。

---

## 4. 目录树与高亮

### 4.1 高亮不用 IntersectionObserver

滚动处理器里线性扫描全部标题，取「最后一个越过视口 40% 线」的下标为当前项：

```js
let active = 0;
headings.forEach((h, i) => {
  if (h.getBoundingClientRect().top < 0.4 * innerHeight) active = i;
});
links.forEach((a, i) => a.classList.toggle("on", i === active));
```

实测样本页 26 个标题、26 个目录项，`<a data-i="N">` 的下标与标题数组一一对应，所以高亮不需要按 id 查找。

三个数值决定手感：`0.4` 而不是 0 或 1，标题进入上 2/5 区域就切换；「最后越过者胜」在快速滚动时不会漏进漏出，也不会两个同时点亮；扫描而非观察器，意味着不存在观察器回调落后于滚动的情况。

### 4.2 目录 DOM 按标题现生成

SSR 已渲染一份，客户端只在数量不一致时用标题数组重建（`h3` 标 `class="sub"`，连续 `h3` 外包 `.subs`）。同时给缺 id 的标题补一个 slug。

---

## 5. 分组展开与左栏顶部标题

### 5.1 展开靠 CSS 栅格行，不量高度

```css
.rail .subs        { display: grid; grid-template-rows: 0fr; visibility: hidden;
                     transition: grid-template-rows .3s var(--ease-out), visibility .3s; }
.rail .subs.open   { grid-template-rows: 1fr; visibility: visible; }
.rail .subs > div  { min-height: 0; overflow: hidden; }
```

父节激活或包含当前项时加 `.open`，并同步父链接的 `aria-expanded`。实测滚动到 4200px 时：6 个 `.subs` 中 1 个展开，其父链接 `aria-expanded="true"`，当前项为 `Tell it which stops you want`。

### 5.2 当前文章标题滚出后浮出

```js
railTitle.classList.toggle("on", h1.getBoundingClientRect().bottom < 0);
```

```css
.rail-title    { opacity: 0; max-height: 0; transform: translateY(8px); overflow: hidden;
                 transition: opacity .4s, transform .4s var(--ease-out), max-height .4s, margin .4s; }
.rail-title.on { opacity: 1; max-height: 240px; margin-bottom: 24px; transform: none; }
```

用 `max-height` 0 → 240px 让目录平滑下移，而不是瞬间跳位。实测展开高度 54px，顶部（scrollY 0）与中段（scrollY 4200）分别是关闭 / 开启。

---

## 6. 点击跳转与键盘

### 6.1 四步

```js
link.addEventListener("click", (e) => {
  e.preventDefault();
  const target = headings[+link.dataset.i];
  target.closest("[data-reveal]")?.classList.add("is-in");
  target.scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
  history.pushState(null, "", "#" + target.id);
});
```

- 按 `data-i` 取 DOM，不查 hash，省一次 `querySelector`。
- 先补 `.is-in`：正文段落由 `[data-reveal]` 驱动（初始 `translateY` + `opacity:0`），不先落地就会滚到元素的错误位置。CSS 侧对应 `[data-reveal].is-in { opacity: 1; transform: none; }`。
- 落点由 `#body h2, #body h3, #body h4 { scroll-margin-top: 2rem }` 控制。实测点击第 6 个目录项后标题 `rect.top = 36px`，等于 `scroll-margin-top`。
- `pushState` 而非默认锚点，避免触发原生跳转和 `hashchange`。
- reduced-motion 时 `behavior` 换成 `auto`，不做滚动动画。

### 6.2 首屏带 hash 的补正

```js
if (location.hash) {
  const el = document.getElementById(location.hash.slice(1));
  if (el && headings.includes(el)) setTimeout(() => scrollToEl(el), 150);
}
```

原生锚点跳转发生在字体与图片落位之前，150ms 后再平滑校正一次落点。

### 6.3 键盘

```js
const behavior = reducedMotion ? "auto" : "smooth";
if (e.key === "ArrowDown") { e.preventDefault(); window.scrollBy({ top: 340, behavior }); }
if (e.key === "ArrowUp")   { e.preventDefault(); window.scrollBy({ top: -340, behavior }); }
```

先排除修饰键与 `INPUT` / `TEXTAREA` / `SELECT` / `contenteditable` 焦点。文章页以 `keyboardScroll(340, { signal })` 调用，参数与左栏那句 `PRESS ↑ / ↓ TO SCROLL` 对应。

---

## 7. 降级

| 条件 | 行为 |
|---|---|
| `≤900px` | 左栏进度与快捷键提示隐藏，改用 1px 顶部条；`≤900px` 时左栏整体转竖排（`order:2`、退出 sticky） |
| `prefers-reduced-motion: reduce` | `scrollIntoView` 与 `scrollBy` 都走 `auto`；`[data-reveal]` 的动画与过渡整体关闭（`animation: none` + `opacity: 1 !important`） |
| 页面加载时 `visibilityState === hidden` | 给根元素加 `.reveal-hold`，暂停 `[data-reveal]` 动画，`visibilitychange` 后移除，避免后台标签页里的进场动画被跳过 |

---

## 8. 代价与坑

1. **每帧写 `innerHTML`，随后读 20 余个标题 rect。** 写 DOM 在前、读布局在后，每个 scroll 事件触发一次强制同步布局，且没有用 rAF 合并。标题多、正文长时是首要优化点（只在 `n` 变化时改 DOM，或整体挪进 rAF）。
2. **`pushState` 不触发 `hashchange`，也没有监听 `popstate`。** 浏览器返回键只改 URL，不回到对应章节。移植时要么监听 `popstate` 自行回滚，要么改回真实锚点。
3. **跳转落点安全，靠的是导航容器高度等于导航自身高度。** `.nav` 是 `position: sticky`，但其父容器 `#app` 只包裹导航本身（实测二者高度均为 95px），sticky 没有行程空间，实测 `scrollY = 1000` 时导航 `rect.top = -1000`，即它随页面滚走。所以 36px 的 `scroll-margin-top` 不会被遮挡。**若目标站有真正粘住的头部，落点必须改为「头部高度 + 间隙」。**
4. **进度条会在正文结束处先到 100%。** 分母排除页脚，正文末尾之后进度保持 100%（实测 `t` 在页面最低点已到 1.148，被 `Math.min` 截断）。这是刻意的，不是 bug。

---

## 9. 与 baozi.space 现状的对照

| 项 | claude.dev | baozi.space 现状 |
|---|---|---|
| 左栏 | 文章目录 + 进度条 + 分享 | `ShellLayout` 的 280px sticky 导航（品牌 + 四个栏目），无目录、无进度 |
| 平滑滚动 | 原生 | Lenis（`lerp: 0.1`，GSAP ticker 回灌，D-124） |
| 章节跳转 | 原生 `scrollIntoView({behavior:'smooth'})` | 仅 `/lab/page-turn` 有，`src/pages/lab/page-turn.astro:628`，同写法 |
| 移动端 | 顶部 1px 条 | `≤767px` 走 `initNavHide` 收起导航 |

**关键的移植障碍：`/lab/page-turn` 是独立页面，没有加载 Lenis，所以 `scrollIntoView({behavior:'smooth'})` 在那里可用。生产文档页跑着 Lenis（`smoothWheel` 每帧 `window.scrollTo`），原生平滑滚动会与 Lenis 的逐帧写位互相覆盖，落点会抖或直接吸附。移植到生产必须改用 `lenis.scrollTo(target, { offset: -36 })`（或等价封装），而不是照抄 `scrollIntoView`。**

可直接借鉴且与本站既有约束不冲突的部分：块字符进度条（纯文本，零新增依赖）、0.4 屏线的目录高亮（比 IntersectionObserver 更适合长短不一的章节）、`.subs` 的 `0fr / 1fr` 展开、左栏顶部当前标题。需要重写的部分：滚动驱动的实现（Lenis）、返回键行为（`popstate`）、落点偏移（本站有 `≤767px` 的导航收放）。

---

## 10. 若采用：范围与前置条件

- 只做评审用 demo（`/lab`），通过 checkpoint 人工评审后才谈生产路由，与 D-138 对 Sue Park 翻页的处理一致。
- 不引入新依赖；进度条不引入 SVG、Canvas 或滚动库。
- `prefers-reduced-motion` 下直切，不做滚动动画。
- 采用前需新增 D-xxx 记录本次映射的边界，并说明「原生 smooth scroll → Lenis」的替换点。
- 内容侧无影响：目录由正文章节生成，不新增 frontmatter 字段，不改变 `draft` / `approved` 门禁。

---

## 11. 未闭环

- 是否把该手法引入 Blog / 文档页左栏，待包子决定。
- 若采用，需要先在 `/lab` 出一版带 Lenis 的真实环境 demo（与本拆解的原生实现不同），再评审手感。
- 阅读进度的口径需要包子确认：claude.dev 是「正文读完即 100%」，本站正文较长且带底部导航，是否沿用同一口径。
