/* 封面开本反馈：rAF 节流 scroll 监听，仅 reduced-motion: no-preference 时生效。
   无 JS 时 CSS 默认状态已完整可用（封面正常滚动走，纯 CSS sticky 开本）。 */
(() => {
  "use strict";

  if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

  const cover = document.querySelector(".cover");
  if (!cover) return;

  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    cover.classList.toggle("is-opening", y > 0);
    cover.classList.toggle("is-open", y > window.innerHeight);
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );

  /* 页尾「合上本子」：JS 平滑滚回封面，无 JS 时 href="#cover" 锚点跳转兜底 */
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-scroll-top]");
    if (!trigger) return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", "#cover");
  });
})();
