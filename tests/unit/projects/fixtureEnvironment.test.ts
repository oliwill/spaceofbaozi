import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createFixtureEnvironment, fingerprintSeedCache } from "../../../scripts/projects/fixtureEnvironment";

const roots: string[] = [];
async function fixture(directoryAlias = false) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "projects-env-test-"));
  roots.push(temporaryRoot);
  let root = temporaryRoot;
  if (directoryAlias) {
    const physicalRoot = join(temporaryRoot, "physical-root");
    root = join(temporaryRoot, "aliased-root");
    await mkdir(physicalRoot);
    await symlink(physicalRoot, root, process.platform === "win32" ? "junction" : "dir");
  }
  for (const directory of ["output", "external-home", "external-cache", "external-tmp", "seed/package@1"]) await mkdir(join(root, directory), { recursive: true });
  for (const directory of ["external-home", "external-cache", "external-tmp"]) await writeFile(join(root, directory, "SENTINEL"), "original");
  await writeFile(join(root, "seed/package@1/index.js"), "export const SYNTHETIC = true;");
  await symlink(join(root, "seed/package@1"), join(root, "seed/package-alias"));
  const incoming: NodeJS.ProcessEnv = {
    PATH: process.env.PATH, HOME: join(root, "external-home"), XDG_CACHE_HOME: join(root, "external-cache"), XDG_CONFIG_HOME: join(root, "external-cache"),
    TMPDIR: join(root, "external-tmp"), TMP: join(root, "external-tmp"), TEMP: join(root, "external-tmp"), BUN_INSTALL_CACHE_DIR: join(root, "seed"),
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: join(root, "external-cache"), FONTCONFIG_FILE: join(root, "external-home/fonts.conf"),
    NODE_OPTIONS: "--require /outside/unrequested-code.js", PROJECTS_FIXTURE_CASE: "mixed", PLAYWRIGHT_PORT: "4412", PLAYWRIGHT_CHROMIUM_EXECUTABLE: "/readonly/chromium",
  };
  return { root, output: join(root, "output"), incoming };
}
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("fixture runtime isolation", () => {
  it("keeps the startup entry below Bun's 4KB cache threshold with only built-in imports", async () => {
    const bootstrap = await readFile("scripts/projects/run-fixtures.ts", "utf8");
    expect(Buffer.byteLength(bootstrap)).toBeLessThan(4096);
    for (const imported of bootstrap.matchAll(/from "([^"]+)"/g)) expect(imported[1]).toMatch(/^node:/);
  });
  it("keeps all runtime write directories inside the fresh fixture", async () => {
    const { output, incoming } = await fixture();
    const { environment } = await createFixtureEnvironment(output, incoming);
    for (const key of ["HOME", "USERPROFILE", "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME", "TMPDIR", "TMP", "TEMP", "BUN_INSTALL_CACHE_DIR", "BUN_INSTALL", "BUN_RUNTIME_TRANSPILER_CACHE_PATH", "npm_config_cache", "NPM_CONFIG_CACHE", "PLAYWRIGHT_BROWSERS_PATH", "FONTCONFIG_PATH", "FONTCONFIG_FILE"]) {
      const path = environment[key];
      expect(path, key).toBeTruthy();
      expect(relative(output, path!), key).not.toMatch(/^\.\.|^\//);
    }
    expect(environment.ASTRO_TELEMETRY_DISABLED).toBe("1");
    expect(environment.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD).toBe("1");
    expect(environment.NODE_OPTIONS).toBeUndefined();
    expect(environment.PATH).toBe(incoming.PATH);
    expect(environment.PLAYWRIGHT_CHROMIUM_EXECUTABLE).toBe(incoming.PLAYWRIGHT_CHROMIUM_EXECUTABLE);
    expect(environment.PROJECTS_FIXTURE_CASE).toBe("mixed");
    const fontconfig = await readFile(environment.FONTCONFIG_FILE!, "utf8");
    expect(fontconfig).toContain(`<cachedir>${environment.XDG_CACHE_HOME}/fontconfig</cachedir>`);
  });
  it.each([
    { name: "ordinary temporary root", directoryAlias: false },
    { name: "symlinked temporary root", directoryAlias: true },
  ])("copies trusted seed bytes and rewrites aliases into the fresh cache without changing the seed ($name)", async ({ directoryAlias }) => {
    const { root, output, incoming } = await fixture(directoryAlias);
    if (directoryAlias) expect(await realpath(root)).not.toBe(root);
    const seed = incoming.BUN_INSTALL_CACHE_DIR!;
    const seedBefore = await fingerprintSeedCache(seed);
    const seedHash = createHash("sha256").update(await readFile(join(seed, "package@1/index.js"))).digest("hex");
    const { environment, seedCache } = await createFixtureEnvironment(output, incoming);
    const cache = environment.BUN_INSTALL_CACHE_DIR!;
    const canonicalCache = await realpath(cache);
    const canonicalPackage = await realpath(join(cache, "package@1"));
    expect(cache).not.toBe(incoming.BUN_INSTALL_CACHE_DIR);
    expect(canonicalCache).not.toBe(await realpath(seed));
    expect(relative(await realpath(output), canonicalCache)).toBe(join(".cache", "bun", "install"));
    expect(relative(canonicalCache, canonicalPackage)).toBe("package@1");
    expect(await readFile(join(cache, "package@1/index.js"), "utf8")).toBe("export const SYNTHETIC = true;");
    expect(await realpath(join(cache, "package-alias"))).toBe(canonicalPackage);
    expect((await lstat(cache)).isSymbolicLink()).toBe(false);
    expect((await lstat(cache)).isDirectory()).toBe(true);
    expect((await lstat(join(cache, "package@1"))).isSymbolicLink()).toBe(false);
    expect((await lstat(join(cache, "package@1"))).isDirectory()).toBe(true);
    expect((await lstat(join(cache, "package-alias"))).isSymbolicLink()).toBe(true);
    expect(seedCache?.root).toBe(await realpath(seed));
    expect(seedCache?.before).toEqual(seedBefore);
    expect(seedCache?.before["package@1/index.js"]).toBe(seedHash);
    await writeFile(join(cache, "package-alias/index.js"), "modified inside fixture");
    expect(await readFile(join(cache, "package@1/index.js"), "utf8")).toBe("modified inside fixture");
    expect(await readFile(join(root, "seed/package@1/index.js"), "utf8")).toBe("export const SYNTHETIC = true;");
    expect(await fingerprintSeedCache(seed)).toEqual(seedBefore);
    for (const directory of ["external-home", "external-cache", "external-tmp"]) {
      expect(await readdir(join(root, directory))).toEqual(["SENTINEL"]);
      expect(await readFile(join(root, directory, "SENTINEL"), "utf8")).toBe("original");
    }
  });
  it("rejects a seed-cache alias pointing outside the trusted seed root", async () => {
    const { root, output, incoming } = await fixture();
    await writeFile(join(root, "external-home/secret"), "synthetic-private");
    await symlink(join(root, "external-home/secret"), join(root, "seed/unsafe-alias"));
    await expect(createFixtureEnvironment(output, incoming)).rejects.toThrow(/缓存.*根外/);
  });
  it("can prepare fresh local caches without a seed", async () => {
    const { output, incoming } = await fixture();
    delete incoming.BUN_INSTALL_CACHE_DIR;
    const { environment, seedCache } = await createFixtureEnvironment(output, incoming);
    expect(seedCache).toBeUndefined();
    expect(await readdir(environment.BUN_INSTALL_CACHE_DIR!)).toEqual([]);
  });
});
