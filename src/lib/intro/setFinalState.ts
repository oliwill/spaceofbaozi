export function setFinalState(root: HTMLElement, fallbackSrc = ""): void {
  const orbitRoot = root.querySelector<HTMLElement>("[data-home-orbit-root]");
  // Reset orbit ownership before broadcasting: the home-orbit controller listens
  // for baozi:intro-orbit-reset and (under reduced motion) may re-activate the
  // static orbit synchronously, so it must have the final word on orbitActive.
  if (orbitRoot) orbitRoot.dataset.orbitActive = "false";
  window.dispatchEvent(new CustomEvent("baozi:intro-orbit-reset"));
  root.dataset.introComplete = "true";
  root.dataset.introPhase = "complete";
  root.style.setProperty("--intro-progress", "1");
  root.querySelector<HTMLElement>("[data-intro-scene='grass']")?.setAttribute("data-active", "false");
  root.querySelector<HTMLElement>("[data-intro-scene='home']")?.setAttribute("data-active", "true");
  root.querySelectorAll<HTMLElement>("[data-intro-moving]").forEach((element) => {
    element.dataset.visible = "false";
  });
  root.querySelector<SVGPathElement>("[data-intro-leash]")?.setAttribute("opacity", "0");

  const finalArt = root.querySelector<HTMLImageElement>("[data-intro-final-art]");
  if (!finalArt || !fallbackSrc) return;
  // Reduced-motion activation re-enables the orbit inside the reset broadcast above;
  // when the orbit owns the actors the static final art must stay hidden.
  if (orbitRoot?.dataset.orbitActive === "true") return;
  finalArt.hidden = false;
  finalArt.onerror = () => {
    finalArt.hidden = true;
  };
  finalArt.src = fallbackSrc;
}
