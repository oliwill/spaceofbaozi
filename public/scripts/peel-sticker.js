/* Lazily mounts Sticker Forge on the one opted-in homepage sticker.
   Static <img> remains the fallback for mobile, reduced motion, WebGL failure,
   slow networks, and no-JS visits. */
const host = document.querySelector("[data-peel-sticker]");

if (host) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = window.matchMedia("(min-width: 660px)");
  let initPromise = null;
  let sticker = null;

  async function mountSticker() {
    if (initPromise || reducedMotion.matches || !desktop.matches) return initPromise;

    initPromise = (async () => {
      host.classList.add("is-loading");
      try {
        await import("/vendor/sticker-forge/sticker-forge.es.js");
        await customElements.whenDefined("sticker-forge");

        const element = host.querySelector("sticker-forge");
        const source = host.dataset.source;
        if (!element || !source) throw new Error("Sticker Forge host is incomplete");

        element.setOptions({
          outline: { width: 0, color: "#ffffff" },
          edge: { width: 1.4, strength: 0.5 },
          shadow: {
            color: "#282018",
            opacity: 0.14,
            blur: 12,
            distance: 8,
            angle: 42,
          },
          lighting: {
            direction: { x: -0.38, y: 0.52, z: 0.76 },
            intensity: 0.72,
            ambient: 0.42,
            softness: 0.7,
          },
          peel: {
            radius: 0.14,
            stiffness: 0.68,
            grabWidth: 28,
            maxAngle: 3.3,
            residue: true,
            surfaceShadow: true,
            release: "reset",
          },
          sound: { enabled: true, volume: 0.22 },
          back: { color: "#f7f5f2", gloss: 0.45, roughness: 0.55 },
          material: { type: "original", intensity: 0, scale: 1 },
          tilt: -5,
          wind: 0.05,
          quality: "medium",
        });

        await element.setSource({
          type: "image",
          src: source,
          name: "Kodak Charmera sticker",
          padding: 24,
        });

        sticker = element;
        host.classList.remove("is-loading");
        host.classList.add("is-ready");
        element.addEventListener("peelstart", () => host.classList.add("is-peeling"));
        element.addEventListener("peelchange", (event) => {
          if (event.detail?.progress > 0.04) host.classList.add("has-peeled");
        });
        element.addEventListener("peelend", () => host.classList.remove("is-peeling"));
        element.addEventListener("error", () => host.classList.add("is-fallback"));
      } catch (error) {
        host.classList.remove("is-loading");
        host.classList.add("is-fallback");
        console.warn("Sticker Forge unavailable; keeping the static sticker.", error);
      }
    })();

    return initPromise;
  }

  function scheduleMount() {
    const schedule = window.requestIdleCallback
      ? (callback) => window.requestIdleCallback(callback, { timeout: 1800 })
      : (callback) => window.setTimeout(callback, 900);
    schedule(() => mountSticker());
  }

  // Warm on intent; otherwise initialize only after the cover has opened and
  // the browser becomes idle, keeping the opening path responsive.
  host.addEventListener("pointerenter", mountSticker, { once: true });
  host.addEventListener("focusin", mountSticker, { once: true });

  const stage = document.getElementById("book-stage");
  if (stage?.classList.contains("is-open")) {
    scheduleMount();
  } else if (stage) {
    const observer = new MutationObserver(() => {
      if (!stage.classList.contains("is-open")) return;
      observer.disconnect();
      scheduleMount();
    });
    observer.observe(stage, { attributes: true, attributeFilter: ["class"] });
  }

  window.addEventListener(
    "pagehide",
    () => {
      sticker?.destroy?.();
    },
    { once: true },
  );
}
