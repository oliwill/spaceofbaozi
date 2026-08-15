export function setFinalState(root: HTMLElement, fallbackSrc = ""): void {
  window.dispatchEvent(new CustomEvent("baozi:intro-orbit-reset"));
  const orbitRoot = root.querySelector<HTMLElement>("[data-home-orbit-root]");
  if (orbitRoot) orbitRoot.dataset.orbitActive = "false";
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
  finalArt.hidden = false;
  finalArt.onerror = () => {
    finalArt.hidden = true;
  };
  finalArt.src = fallbackSrc;
}
