import type { V2Manifest } from "@/lib/intro-oil/v2";

const held = new WeakMap<HTMLElement, () => void>();

/** Read layout from the original Home layers without changing their atlas identity. */
export function homeActor(home: HTMLElement | null, actor: "person" | "dog"): HTMLElement | null {
  const orbit = home?.querySelector<HTMLElement>("[data-home-orbit-root]");
  if (window.matchMedia("(min-width: 768px)").matches && orbit?.dataset.orbitActive === "true" && orbit.dataset.personOrbitError !== "true") {
    if (actor === "person" || orbit.dataset.assetError !== "true") return orbit.querySelector<HTMLElement>(actor === "person" ? "[data-orbit-person]" : "[data-dog-visual]");
  }
  return home?.querySelector<HTMLElement>(`[data-home-${actor}]`) ?? null;
}

export const isIntroPoseHeld = (home: HTMLElement | null): boolean => home?.dataset.introPoseOwner === "held";
export function releaseHeldIntroPose(home: HTMLElement | null): void { if (home) held.get(home)?.(); }

/** Transfer the original Intro nodes, never copy their art into a Home sprite. */
export function holdIntroPose(home: HTMLElement, actors: { person: HTMLElement; dog: HTMLElement }, manifest: V2Manifest): void {
  const container = home.querySelector<HTMLElement>(".site-characters");
  if (!container || container.dataset.homeArtState) return;
  releaseHeldIntroPose(home);
  const lifetime = new AbortController();
  const layer = document.createElement("div");
  layer.className = "home-intro-handoff";
  layer.dataset.introHandoff = "true";
  layer.setAttribute("aria-hidden", "true");
  const original = { person: actors.person.parentElement, dog: actors.dog.parentElement };
  const bounds = { person: actors.person.getBoundingClientRect(), dog: actors.dog.getBoundingClientRect() };
  const origin = container.getBoundingClientRect();
  for (const actor of ["person", "dog"] as const) {
    layer.append(actors[actor]);
    actors[actor].style.transform = `translate3d(${bounds[actor].left - origin.left}px, ${bounds[actor].top - origin.top}px, 0)`;
  }
  container.append(layer);
  home.dataset.introPoseOwner = "held";

  const refresh = () => {
    const origin = container.getBoundingClientRect();
    for (const actor of ["person", "dog"] as const) {
      const destination = homeActor(home, actor);
      if (!destination) continue;
      const rect = destination.getBoundingClientRect();
      const seq = manifest.sequences[actor === "person" ? "person-slide-in-rise-stand" : "dog-look-up-settle"];
      const anchor = seq.frames.at(-1)!.anchors.ground;
      const width = rect.width;
      const height = width * seq.frameSize.height / seq.frameSize.width;
      const frame = seq.frameCount - 1;
      Object.assign(actors[actor].style, {
        width: `${width}px`, height: `${height}px`,
        transform: `translate3d(${rect.left - origin.left}px, ${rect.bottom - anchor[1] * height - origin.top}px, 0)`,
        backgroundSize: `${seq.columns * width}px ${seq.rows * height}px`,
        backgroundPosition: `${-(frame % seq.columns) * width}px ${-Math.floor(frame / seq.columns) * height}px`,
      });
    }
  };
  const resize = new ResizeObserver(refresh);
  resize.observe(container);
  const mutation = new MutationObserver(refresh);
  mutation.observe(home, { subtree: true, attributes: true, attributeFilter: ["data-orbit-active"] });
  const release = () => {
    lifetime.abort(); resize.disconnect(); mutation.disconnect();
    held.delete(home);
    delete home.dataset.introPoseOwner;
    // Keep the hidden Intro DOM structurally reusable (including BFCache re-entry).
    for (const actor of ["person", "dog"] as const) original[actor]?.append(actors[actor]);
    layer.remove();
  };
  held.set(home, release);
  window.addEventListener("resize", refresh, { signal: lifetime.signal });
  document.addEventListener("astro:before-swap", release, { signal: lifetime.signal });
  window.addEventListener("pagehide", event => { if (!event.persisted) release(); }, { signal: lifetime.signal });
  window.addEventListener("baozi:home-assets-failed", event => {
    if ((event as CustomEvent).detail?.home === home) release();
  }, { signal: lifetime.signal });
}
