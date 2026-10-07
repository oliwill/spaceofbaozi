import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createFixtureEnvironment, fingerprintSeedCache } from "./fixtureEnvironment";
import { projectsForCase, type ProjectFixtureCase } from "../../tests/fixtures/projects/projects";

const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const arguments_ = process.argv.slice(2);
const cases = ["empty", "one", "mixed", "work-only", "personal-only"] as const;
const negatives = ["invalid-fields", "invalid-kind", "invalid-link", "invalid-cover", "orphan-asset", "missing-asset", "dimension-mismatch", "disguised-svg", "format-mismatch"] as const;
const caseName = arguments_.find((argument) => argument.startsWith("--case="))?.slice(7) ?? "mixed";
const negative = arguments_.find((argument) => argument.startsWith("--negative="))?.slice(11);
if (!cases.some((name) => name === caseName) || (negative && !negatives.some((name) => name === negative))) {
  throw new Error("使用 --case=empty|one|mixed|work-only|personal-only；负例使用 --negative=invalid-fields|invalid-kind|invalid-link|invalid-cover|orphan-asset|missing-asset|dimension-mismatch|disguised-svg|format-mismatch");
}
if (negative && caseName === "empty" && negative !== "orphan-asset") throw new Error("公开字段或登记资源负例需要至少一个公开项目");

async function hashes(directory: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const walk = async (path: string): Promise<void> => {
    for (const name of (await readdir(path)).sort()) {
      const target = join(path, name);
      const stat = await lstat(target);
      if (stat.isSymbolicLink()) throw new Error(`保护核对目录禁止符号链接: ${target}`);
      if (stat.isDirectory()) await walk(target);
      else if (stat.isFile()) result[relative(directory, target).split(sep).join("/")] = createHash("sha256").update(await readFile(target)).digest("hex");
    }
  };
  await walk(directory);
  return result;
}
async function checkpoints(root: string) {
  return {
    source: await hashes(join(root, "src")),
    public: await hashes(join(root, "public")),
    lock: createHash("sha256").update(await readFile(join(root, "bun.lock"))).digest("hex"),
  };
}

const before = await checkpoints(sourceRoot);
const output = process.env.PROJECTS_FIXTURE_WORKER_ROOT!;
const excluded = new Set([
  ".git", "node_modules", "dist", ".astro", ".cache", ".vite", ".local-config", ".config", ".home", ".tmp", ".local", ".superpowers", ".codex", ".aws", ".agents",
  "test-results", "playwright-report", "coverage", "_handoff", "design-assets", "projects-evidence", "__pycache__", ".DS_Store",
]);
await cp(sourceRoot, output, {
  recursive: true,
  filter: (source) => {
    const path = relative(sourceRoot, source).split(sep).join("/");
    return !path.startsWith("src/content/projects") && !path.startsWith("public/assets/projects")
      && !path.split("/").some((part) => excluded.has(part) || part.startsWith(".env") || part.startsWith(".dev.vars"));
  },
});
const evidence = join(output, "projects-evidence");
await mkdir(evidence);
await writeFile(join(evidence, "source-checkpoint.json"), JSON.stringify({ sourceRoot, before }, null, 2));
const runtime = await createFixtureEnvironment(output, { ...process.env, BUN_INSTALL_CACHE_DIR: process.env.PROJECTS_FIXTURE_SEED_CACHE });
const environment: NodeJS.ProcessEnv = { ...runtime.environment, PROJECTS_FIXTURE_CASE: caseName, PLAYWRIGHT_PORT: runtime.environment.PLAYWRIGHT_PORT ?? "4412" };
await writeFile(join(evidence, "environment.json"), JSON.stringify({
  runner: Object.fromEntries(Object.keys(runtime.writePaths).map((key) => [key, process.env[key]])),
  child: Object.fromEntries(Object.keys(runtime.writePaths).map((key) => [key, environment[key]])),
  selectors: { PROJECTS_FIXTURE_CASE: caseName, PLAYWRIGHT_PORT: environment.PLAYWRIGHT_PORT, PLAYWRIGHT_CHROMIUM_EXECUTABLE: environment.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  seedCache: runtime.seedCache,
}, null, 2));
const { default: sharp } = await import("sharp");
const run = (args: string[], logName: string) => new Promise<number>((resolve, reject) => {
  const child = spawn(process.execPath, args, { cwd: output, env: environment, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (data: Buffer) => { const text = data.toString(); log += text; process.stdout.write(text); });
  child.stderr.on("data", (data: Buffer) => { const text = data.toString(); log += text; process.stderr.write(text); });
  child.on("error", reject);
  child.on("close", async (code) => {
    const exitCode = code ?? 1;
    try { await writeFile(join(evidence, logName), `${log}\nEXIT_CODE=${exitCode}\n`); resolve(exitCode); }
    catch (error) { reject(error); }
  });
});
let installExitCode: number | undefined;
let buildExitCode: number | undefined;
let browserExitCode: number | undefined;
try {
  installExitCode = await run(["install", "--frozen-lockfile"], "install.log");
  if (installExitCode !== 0) throw new Error(`冻结依赖安装失败 (${installExitCode})`);
  if ((await lstat(join(output, "node_modules"))).isSymbolicLink()) throw new Error("夹具依赖不得跨根软链接");
  const installedLock = createHash("sha256").update(await readFile(join(output, "bun.lock"))).digest("hex");
  if (installedLock !== before.lock) throw new Error("冻结安装改变了锁文件");

  const fixtures = projectsForCase(caseName as ProjectFixtureCase);
  const assetManifest: Record<string, { width: number; height: number; sha256: string }> = {};
  const publicFixtures = fixtures.filter(({ draft, approved }) => !draft && approved);
  for (const project of publicFixtures) {
    for (const image of project.images) {
      for (const asset of [image, ...(image.variants ?? [])]) {
        if (assetManifest[asset.src]) continue;
        if (negative === "missing-asset") continue;
        const width = negative === "dimension-mismatch" ? asset.width + 1 : asset.width;
        const height = asset.height;
        const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ebe7de"/><rect x="4%" y="8%" width="27%" height="84%" fill="#bcc5cb"/><rect x="36.5%" y="8%" width="27%" height="84%" fill="#a1adb6"/><rect x="69%" y="8%" width="27%" height="84%" fill="#bcc5cb"/><circle cx="50%" cy="50%" r="${Math.min(width, height) / 4}" fill="#333e48"/><text x="50%" y="53%" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${Math.min(width, height) / 10}" font-weight="bold">SYNTHETIC</text></svg>`;
        const target = join(output, "public", asset.src);
        await mkdir(join(target, ".."), { recursive: true });
        if (negative === "disguised-svg") await writeFile(target, svg);
        else if (negative === "format-mismatch") await sharp(Buffer.from(svg)).jpeg().toFile(target);
        else await sharp(Buffer.from(svg)).png().toFile(target);
        assetManifest[asset.src] = { width, height, sha256: createHash("sha256").update(await readFile(target)).digest("hex") };
      }
    }
  }
  if (negative === "orphan-asset") {
    const directory = join(output, "public/assets/projects");
    await mkdir(directory, { recursive: true });
    await sharp({ create: { width: 12, height: 8, channels: 3, background: "red" } }).png().toFile(join(directory, "PRIVATE-PROJECT-ORPHAN.png"));
  }
  await mkdir(join(output, "src/content/projects"), { recursive: true });
  for (const { slug, body, ...data } of fixtures) {
    const metadata: Record<string, unknown> = { ...data };
    if (!data.draft && data.approved && negative === "invalid-fields") delete metadata.role;
    if (!data.draft && data.approved && negative === "invalid-kind") metadata.kind = "synthetic-invalid-kind";
    if (!data.draft && data.approved && negative === "invalid-link") metadata.link = "javascript:alert('SYNTHETIC')";
    if (!data.draft && data.approved && negative === "invalid-cover") metadata.cover = "/assets/projects/unregistered-cover.png";
    await writeFile(join(output, `src/content/projects/${slug}.md`), `---\n${JSON.stringify(metadata, null, 2)}\n---\n\n${body}\n`);
  }
  await writeFile(join(evidence, "fixture-manifest.json"), JSON.stringify({ caseName, negative, assetManifest, fixtures }, null, 2));
  buildExitCode = await run(["run", "build"], "build.log");
  process.exitCode = buildExitCode;
  if (buildExitCode === 0 && !arguments_.includes("--build-only")) {
    const playwrightArgs = arguments_.filter((argument) => !argument.startsWith("--case=") && !argument.startsWith("--negative="));
    browserExitCode = await run(["x", "playwright", "test", "--config", "playwright.projects.config.ts", ...playwrightArgs], "browser.log");
    process.exitCode = browserExitCode;
  }
} finally {
  const after = await checkpoints(sourceRoot);
  const sourceUnchanged = JSON.stringify(before) === JSON.stringify(after);
  const seedCacheAfter = runtime.seedCache ? await fingerprintSeedCache(runtime.seedCache.root) : undefined;
  const seedCacheUnchanged = !runtime.seedCache || JSON.stringify(runtime.seedCache.before) === JSON.stringify(seedCacheAfter);
  await writeFile(join(evidence, "seed-cache-protection.json"), JSON.stringify({ before: runtime.seedCache, after: seedCacheAfter, seedCacheUnchanged }, null, 2));
  await writeFile(join(evidence, "protection.json"), JSON.stringify({ sourceRoot, output, sourceUnchanged, before, after, fixture: await checkpoints(output) }, null, 2));
  await writeFile(join(evidence, "result.json"), JSON.stringify({ caseName, negative, installExitCode, buildExitCode, browserExitCode, sourceUnchanged, seedCacheUnchanged }, null, 2));
  console.log(`PROJECTS_SOURCE_UNCHANGED=${sourceUnchanged}`);
  console.log(`PROJECTS_SEED_CACHE_UNCHANGED=${seedCacheUnchanged}`);
  if (!seedCacheUnchanged) throw new Error("根外 Bun 缓存种子保护核对失败");
  if (!sourceUnchanged) throw new Error("正式源码或公开资源保护核对失败");
}
