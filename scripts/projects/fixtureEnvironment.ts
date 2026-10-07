import { createHash } from "node:crypto";
import { cp, lstat, mkdir, readFile, readdir, readlink, realpath, symlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export interface SeedCacheCheckpoint {
  root: string;
  before: Record<string, string>;
}
export interface FixtureEnvironment {
  environment: NodeJS.ProcessEnv;
  writePaths: Record<string, string>;
  seedCache?: SeedCacheCheckpoint;
}

export async function fingerprintSeedCache(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const walk = async (directory: string): Promise<void> => {
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name);
      const stat = await lstat(path);
      const key = relative(root, path).split(sep).join("/");
      if (stat.isSymbolicLink()) result[key] = `link:${await readlink(path)}`;
      else if (stat.isDirectory()) await walk(path);
      else if (stat.isFile()) result[key] = createHash("sha256").update(await readFile(path)).digest("hex");
    }
  };
  await walk(root);
  return result;
}

async function copySeedCache(source: string, target: string): Promise<SeedCacheCheckpoint | undefined> {
  try { if (!(await lstat(source)).isDirectory()) throw new Error("Bun 缓存种子必须是普通目录"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
  const root = await realpath(source);
  const before = await fingerprintSeedCache(root);
  const links: Array<{ key: string; target: string }> = [];
  for (const [key, value] of Object.entries(before)) {
    if (!value.startsWith("link:")) continue;
    const resolved = await realpath(resolve(dirname(join(root, key)), value.slice(5)));
    const path = relative(root, resolved);
    if (path.startsWith(`..${sep}`) || path === ".." || isAbsolute(path)) throw new Error(`Bun 缓存别名指向根外: ${key}`);
    links.push({ key, target: join(target, path) });
  }
  await cp(root, target, { recursive: true, filter: async (path) => !(await lstat(path)).isSymbolicLink() });
  for (const link of links) {
    const path = join(target, link.key);
    await mkdir(dirname(path), { recursive: true });
    await symlink(relative(dirname(path), link.target), path);
  }
  if (JSON.stringify(before) !== JSON.stringify(await fingerprintSeedCache(root))) throw new Error("只读 Bun 缓存种子发生变化");
  return { root, before };
}

export async function createFixtureEnvironment(output: string, incoming: NodeJS.ProcessEnv): Promise<FixtureEnvironment> {
  const environment: NodeJS.ProcessEnv = {};
  for (const key of [
    "PATH", "LANG", "LC_ALL", "TZ", "CI", "SystemRoot", "SYSTEMROOT", "WINDIR", "ComSpec", "PATHEXT",
    "PLAYWRIGHT_PORT", "PLAYWRIGHT_CHROMIUM_EXECUTABLE", "PROJECTS_FIXTURE_CASE", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY",
    "http_proxy", "https_proxy", "no_proxy", "SSL_CERT_FILE", "SSL_CERT_DIR", "NODE_EXTRA_CA_CERTS",
  ]) if (incoming[key] !== undefined) environment[key] = incoming[key];
  const cache = join(output, ".cache");
  const config = join(output, ".config");
  const home = join(output, ".home");
  const temporary = join(output, ".tmp");
  const writePaths = {
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: config,
    XDG_CACHE_HOME: cache,
    XDG_DATA_HOME: join(output, ".local/share"),
    TMPDIR: temporary,
    TMP: temporary,
    TEMP: temporary,
    BUN_TMPDIR: temporary,
    BUN_TEMP_DIR: temporary,
    BUN_INSTALL: join(home, ".bun"),
    BUN_INSTALL_CACHE_DIR: join(cache, "bun/install"),
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: join(cache, "bun/transpiler"),
    npm_config_cache: join(cache, "npm"),
    NPM_CONFIG_CACHE: join(cache, "npm"),
    PLAYWRIGHT_BROWSERS_PATH: join(cache, "ms-playwright"),
    FONTCONFIG_PATH: join(config, "fontconfig"),
    FONTCONFIG_FILE: join(config, "fontconfig/fonts.conf"),
  };
  for (const path of new Set(Object.entries(writePaths).filter(([key]) => key !== "FONTCONFIG_FILE").map(([, path]) => path))) await mkdir(path, { recursive: true });
  await mkdir(join(cache, "fontconfig"));
  const escapedCache = cache.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
  await writeFile(writePaths.FONTCONFIG_FILE, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>/usr/share/fonts</dir><dir>/usr/local/share/fonts</dir><dir>/System/Library/Fonts</dir><dir>/Library/Fonts</dir><cachedir>${escapedCache}/fontconfig</cachedir></fontconfig>`);
  Object.assign(environment, writePaths, { ASTRO_TELEMETRY_DISABLED: "1", PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" });
  const seedCache = incoming.BUN_INSTALL_CACHE_DIR ? await copySeedCache(incoming.BUN_INSTALL_CACHE_DIR, writePaths.BUN_INSTALL_CACHE_DIR) : undefined;
  return { environment, writePaths, ...(seedCache ? { seedCache } : {}) };
}
