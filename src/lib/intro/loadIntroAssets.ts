import { resolveAssetMode, validateIntroManifest, type IntroManifest } from "@/lib/intro/assetManifest";

function preloadImage(src: string): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const image = new Image();
  image.onload = () => resolve();
  image.onerror = () => reject(new Error(`failed to load ${src}`));
  image.src = src;
  return promise;
}

export async function loadIntroAssets(url: URL, isDev: boolean): Promise<IntroManifest> {
  const mode = resolveAssetMode(url, isDev);
  const directory = mode === "placeholder" ? "placeholders" : "production";
  const response = await fetch(`/assets/intro/${directory}/intro-manifest.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`intro manifest request failed: ${response.status}`);
  const manifest = validateIntroManifest(await response.json());
  if (manifest.mode !== mode) throw new Error(`intro manifest mode mismatch: ${manifest.mode}`);
  const sources = [
    ...Object.values(manifest.assets).map((asset) => asset.src),
    ...(manifest.environment ? [manifest.environment.grass.src] : []),
    ...(manifest.fallback ? [manifest.fallback] : []),
  ];
  await Promise.all(sources.map(preloadImage));
  return manifest;
}
