// oil-motion 预算预检：对 person / jiale × desktop / mobile 做 DPR 扫描，
// 运行上游 motion_budget.py，输出报告到 design-assets/intro/oil-motion/qa/budget/。
// 紧裁切比例实测自生产图集 alpha 并集（person/dog 均为 0.90w × 0.86h）。
// 目标是找到每个角色仍满足 alpha-atlas 的最高画质档位；全部档位失败才触发停止条件。
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const BUDGET_PY = join(ROOT, "vendor/oil-motion/scripts/motion_budget.py");
const OUT_DIR = join(ROOT, "design-assets/intro/oil-motion/qa/budget");

const TIGHT = { w: 0.9, h: 0.86 };
const ACTORS = [
  { id: "person", frames: 144, vh: 36, aspect: 1 },
  { id: "jiale", frames: 96, vh: 23, aspect: 320 / 240 },
];
const STAGES = [
  { id: "desktop", stageH: 900, dprs: [2, 1.5, 1.25, 1], memMiB: 96 },
  { id: "mobile", stageH: 844, dprs: [3, 2, 1.5, 1], memMiB: 64 },
];

mkdirSync(OUT_DIR, { recursive: true });

const rows = [];
for (const actor of ACTORS) {
  for (const stage of STAGES) {
    const frameW = Math.round((actor.vh / 100) * stage.stageH);
    const frameH = Math.round(frameW / actor.aspect);
    const dispW = Math.round(frameW * TIGHT.w);
    const dispH = Math.round(frameH * TIGHT.h);
    for (const dpr of stage.dprs) {
      const name = `${actor.id}-${stage.id}-dpr${dpr}`;
      const reportPath = join(OUT_DIR, `${name}.json`);
      const run = spawnSync("python", [
        BUDGET_PY,
        "--frames", String(actor.frames),
        "--display", `${dispW}x${dispH}`,
        "--dpr", String(dpr),
        "--driver", "scroll",
        "--parameter-space", "linear",
        "--background-owner", "page",
        "--scroll-pages", "2",
        "--max-texture", "4096",
        "--atlas-max-memory-mib", String(stage.memMiB),
        "--report", reportPath,
        "--json",
      ], { encoding: "utf8" });
      if (run.error) {
        console.error(`无法执行 python — ${run.error.message}`);
        process.exit(2);
      }
      const report = JSON.parse(readFileSync(reportPath, "utf8"));
      const sel = report.delivery?.selected ?? "unknown";
      const sheets = report.texture?.sheetCount ?? "-";
      const mem = report.decodedFrameMemoryMiB ?? "-";
      rows.push({ name, sel, sheets, mem });
      console.log(`${name.padEnd(24)} ${sel.padEnd(13)} sheets=${sheets} mem=${mem}MiB cell=${dispW}x${dispH}@${dpr}`);
    }
  }
}

const summary = {};
for (const actor of ACTORS) {
  for (const stage of STAGES) {
    const key = `${actor.id}-${stage.id}`;
    const best = rows.find((r) => r.name.startsWith(key) && r.sel === "alpha-atlas");
    summary[key] = best ? best.name : "无可用档位";
  }
}
writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log("\n每组合最高可用档位:", JSON.stringify(summary));
const anyDead = Object.values(summary).includes("无可用档位");
if (anyDead) {
  console.error("存在无任何 alpha-atlas 档位的组合 — 须从 D-123 起另立决策");
  process.exit(1);
}
