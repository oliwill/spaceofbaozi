import { describe, expect, it } from "vitest";
import { resolveAssetMode, validateIntroManifest } from "@/lib/intro/assetManifest";

function makeAsset(id: string, role: "person" | "dog" | "ball") {
  const anchor = role === "person"
    ? { ground: [0.5, 0.92], center: [0.5, 0.5], hand: [0.8, 0.4] }
    : role === "dog"
      ? { ground: [0.5, 0.84], center: [0.5, 0.56], collar: [0.72, 0.44] }
      : { ground: [0.5, 0.82], center: [0.5, 0.5] };
  return {
    src: `/assets/intro/placeholders/${id}.webp`,
    frames: 8,
    columns: 4,
    rows: 2,
    frameSize: { width: role === "person" ? 384 : role === "dog" ? 320 : 160, height: role === "person" ? 384 : role === "dog" ? 240 : 160 },
    displayWidthVh: role === "person" ? 36 : role === "dog" ? 23 : 8,
    loop: id === "ballBounce" || id === "dogRun" || id === "personRun",
    outlineRatio: role === "person" ? 0.028 : role === "dog" ? 0.035 : 0.03,
    anchors: Array.from({ length: 8 }, () => anchor),
  };
}

function validManifest() {
  return {
    version: 1,
    mode: "placeholder",
    fps: 9,
    fallback: "",
    assets: {
      ballBounce: makeAsset("ball/ball-bounce", "ball"),
      dogRun: makeAsset("dog/dog-run-right", "dog"),
      dogSettle: makeAsset("dog/dog-circle-settle", "dog"),
      personRun: makeAsset("person/summer-pulled-run-right", "person"),
      personTrip: makeAsset("person/summer-trip-exit-right", "person"),
      personStand: makeAsset("person/summer-land-stand", "person"),
    },
  };
}

function validProductionManifest() {
  const manifest = validManifest();
  manifest.mode = "production";
  manifest.fallback = "/assets/intro/production/intro-final-still.webp";
  for (const asset of Object.values(manifest.assets)) asset.src = asset.src.replace("/placeholders/", "/production/");
  manifest.assets.ballBounce.displayWidthVh = 5;
  return {
    ...manifest,
    environment: {
      grass: {
        src: "/assets/intro/production/environment/intro-grass.webp",
        selectedVariant: "C2",
        intrinsicSize: { width: 2560, height: 640 },
        visibleBounds: { x: 0, y: 280, width: 2560, height: 360 },
        displayWidthVw: 100,
        align: "bottom",
        transitionOut: [0.78, 0.82],
      },
    },
  };
}

describe("intro manifest", () => {
  it("accepts the six exact eight-frame assets", () => {
    expect(validateIntroManifest(validManifest()).assets.personRun.anchors).toHaveLength(8);
  });

  it("accepts the C2 production grass contract and smaller ball", () => {
    const manifest = validateIntroManifest(validProductionManifest());
    expect(manifest.assets.ballBounce.displayWidthVh).toBe(5);
    expect(manifest.environment?.grass.selectedVariant).toBe("C2");
  });

  it("rejects the stale production ball scale", () => {
    const manifest = validProductionManifest();
    manifest.assets.ballBounce.displayWidthVh = 8;
    expect(() => validateIntroManifest(manifest)).toThrow("production ballBounce displayWidthVh must be 5");
  });

  it("rejects incomplete anchors", () => {
    const manifest = validManifest();
    manifest.assets.personRun.anchors = manifest.assets.personRun.anchors.slice(0, 7);
    expect(() => validateIntroManifest(manifest)).toThrow("personRun anchors must contain 8 entries");
  });

  it("allows placeholder mode only when explicitly requested in development", () => {
    expect(resolveAssetMode(new URL("https://x.test/lab/intro"), true)).toBe("production");
    expect(resolveAssetMode(new URL("https://x.test/lab/intro?assetMode=placeholder"), true)).toBe("placeholder");
    expect(resolveAssetMode(new URL("https://x.test/lab/intro?assetMode=placeholder"), false)).toBe("production");
  });
});
