/**
 * 中文字体子集化
 *
 * 流程：扫描 src/ 与 public/scripts/ 的源码文本 → 收集实际用字
 * → pyftsubset 把 fonts-src/ 里的全量字体裁成 woff2 → public/fonts/
 *
 * 用法：node scripts/subset-fonts.mjs   （或 bun run fonts:subset）
 * 依赖：Python + fonttools + brotli（pip install fonttools brotli）
 * 源字体：fonts-src/ 不下进 git，缺了看下方 FONTS 注释里的来源重新下载。
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

// name: 输出文件名；src: fonts-src/ 里的全量字体
// 来源：
//   SlideXiaXing.ttf      — https://www.npmjs.com/package/@fontpkg/slidexiaxing（演示夏行楷，免费商用）
//   LXGWWenKai-Regular.ttf — https://github.com/lxgw/LxgwWenKai/releases（OFL）
const FONTS = [
  { name: "slide-xiaxing", src: "fonts-src/SlideXiaXing.ttf" },
  { name: "lxgw-wenkai", src: "fonts-src/LXGWWenKai-Regular.ttf" },
];

const SCAN_DIRS = ["src", "public/scripts"];
const SCAN_EXTS = new Set([".astro", ".md", ".mdx", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"]);

// 安全字符集：可打印 ASCII + 常用中文标点/符号（防止扫描遗漏运行时拼接的字符）
const SAFETY =
  "，。、；：？！「」『』（）《》〈〉【】〔〕—…·～“”‘’％℃→←↑↓↻↗★☆♪✎×＋－＝｜　";

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      yield* walk(p);
    } else if (SCAN_EXTS.has(extname(entry))) {
      yield p;
    }
  }
}

function collectChars() {
  const chars = new Set(SAFETY);
  for (let cp = 0x20; cp <= 0x7e; cp++) chars.add(String.fromCodePoint(cp));
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      for (const ch of readFileSync(file, "utf8")) chars.add(ch);
    }
  }
  return [...chars].join("");
}

function subset(font, charsFile) {
  const out = `public/fonts/${font.name}.woff2`;
  execFileSync(
    "pyftsubset",
    [
      font.src,
      `--text-file=${charsFile}`,
      "--flavor=woff2",
      `--output-file=${out}`,
      "--layout-features=*",
      "--no-hinting",
      "--desubroutinize",
    ],
    { cwd: ROOT, stdio: "inherit" }
  );
  const kb = (statSync(join(ROOT, out)).size / 1024).toFixed(1);
  console.log(`✓ ${out}  ${kb} KB`);
}

mkdirSync(join(ROOT, "public/fonts"), { recursive: true });
const chars = collectChars();
const charsFile = "fonts-src/_chars.txt";
writeFileSync(join(ROOT, charsFile), chars, "utf8");
console.log(`collected ${[...chars].length} unique chars`);

for (const font of FONTS) subset(font, charsFile);
