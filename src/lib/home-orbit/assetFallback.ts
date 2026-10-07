/** Home's failed atlases must never reveal another copy of the surviving actor.
 * The original v2 contract permits its complete still as a separate fallback.
 */
export function watchHomeAssets(root: HTMLElement, onFailure: () => void = () => {}): () => void {
  const container = root.closest<HTMLElement>(".site-characters");
  const still = container?.querySelector<HTMLImageElement>("[data-home-asset-fallback]");
  let disposed = false;
  const images: HTMLImageElement[] = [];
  const stopImages = () => images.forEach(image => { image.onload = null; image.onerror = null; });
  const unavailable = () => {
    if (disposed || !container || !still) return;
    container.dataset.homeArtState = "unavailable";
    still.hidden = true;
  };
  still?.addEventListener("error", unavailable);

  const fail = () => {
    if (disposed) return;
    const restoreFocus = still && root.contains(document.activeElement);
    root.dataset.homeAssetFailure = "true";
    root.dataset.orbitReady = "true";
    stopImages();
    onFailure();
    if (!container || !still) return; // The separate lab retains its existing fallback text.
    if (container.dataset.homeArtState !== "unavailable") {
      container.dataset.homeArtState = "fallback";
      still.hidden = false;
      if (!still.getAttribute("src")) still.src = still.dataset.src ?? "";
    }
    const home = root.closest<HTMLElement>("#home");
    window.dispatchEvent(new CustomEvent("baozi:home-assets-failed", { detail: { home } }));
    if (restoreFocus) home?.querySelector<HTMLElement>("#main")?.focus({ preventScroll: true });
  };

  if (root.dataset.homeAssetFailure === "true") {
    fail(); // A media remount keeps the failure latch; it does not retry failed assets.
  } else {
    let loaded = 0;
    for (const [source, flag] of [["personOrbitSrc", "personOrbitError"], ["dogOrbitSrc", "assetError"]] as const) {
      const image = new Image();
      images.push(image);
      image.onload = () => {
        if (disposed || root.dataset.homeAssetFailure === "true") return;
        if (++loaded === 2) root.dataset.orbitReady = "true";
      };
      image.onerror = () => {
        if (disposed || root.dataset.homeAssetFailure === "true") return;
        root.dataset[flag] = "true";
        fail();
      };
      image.src = root.dataset[source] ?? "";
    }
  }

  return () => {
    disposed = true;
    stopImages();
    still?.removeEventListener("error", unavailable);
  };
}
