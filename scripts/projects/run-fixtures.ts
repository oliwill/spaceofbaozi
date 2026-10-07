import { spawn } from "node:child_process";
import { mkdir, mkdtemp } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const name = args.find((argument) => argument.startsWith("--case="))?.slice(7) ?? "mixed";
if (!["empty", "one", "mixed", "work-only", "personal-only"].includes(name)) throw new Error("非法 Projects 夹具 case");
const root = await mkdtemp(join(tmpdir(), `baozi-projects-${name}-`));
console.log(`PROJECTS_FIXTURE_ROOT=${root}`);
const home = join(root, ".home");
const cache = join(root, ".cache");
const config = join(root, ".config");
const temporary = join(root, ".tmp");
const environment: NodeJS.ProcessEnv = {};
for (const key of ["PATH", "LANG", "LC_ALL", "TZ", "CI", "SystemRoot", "SYSTEMROOT", "WINDIR", "ComSpec", "PATHEXT", "PLAYWRIGHT_PORT", "PLAYWRIGHT_CHROMIUM_EXECUTABLE", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy", "SSL_CERT_FILE", "SSL_CERT_DIR", "NODE_EXTRA_CA_CERTS"]) {
  if (process.env[key] !== undefined) environment[key] = process.env[key];
}
Object.assign(environment, {
  HOME: home, USERPROFILE: home, XDG_CACHE_HOME: cache, XDG_CONFIG_HOME: config, XDG_DATA_HOME: join(root, ".local/share"),
  TMPDIR: temporary, TMP: temporary, TEMP: temporary, BUN_TMPDIR: temporary, BUN_TEMP_DIR: temporary,
  BUN_INSTALL: join(home, ".bun"), BUN_INSTALL_CACHE_DIR: join(cache, "bun/install"), BUN_RUNTIME_TRANSPILER_CACHE_PATH: join(cache, "bun/transpiler"),
  npm_config_cache: join(cache, "npm"), NPM_CONFIG_CACHE: join(cache, "npm"), PLAYWRIGHT_BROWSERS_PATH: join(cache, "ms-playwright"),
  FONTCONFIG_PATH: join(config, "fontconfig"), FONTCONFIG_FILE: join(config, "fontconfig/fonts.conf"),
  ASTRO_TELEMETRY_DISABLED: "1", PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1", PLAYWRIGHT_PORT: environment.PLAYWRIGHT_PORT ?? "4412",
  PROJECTS_FIXTURE_CASE: name, PROJECTS_FIXTURE_WORKER_ROOT: root,
  PROJECTS_FIXTURE_SEED_CACHE: process.env.BUN_INSTALL_CACHE_DIR ?? join(process.env.HOME ?? homedir(), ".bun/install/cache"),
});
await mkdir(environment.BUN_RUNTIME_TRANSPILER_CACHE_PATH!, { recursive: true });
process.exitCode = await new Promise<number>((resolve, reject) => {
  const child = spawn(process.execPath, [fileURLToPath(new URL("./run-fixtures.worker.ts", import.meta.url)), ...args], { cwd: root, env: environment, stdio: "inherit" });
  child.on("error", reject);
  child.on("exit", (code) => resolve(code ?? 1));
});
