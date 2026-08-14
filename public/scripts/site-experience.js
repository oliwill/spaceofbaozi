/* Shared navigation experience layer for Astro client transitions. */
(() => {
  "use strict";

  const ENTRY_TURN_ATTR = "data-baozi-entry-turn";
  function enhanceInlineNotes() {
    document.querySelectorAll(".inline-note[data-note]").forEach((note) => {
      const keyword = note.textContent?.trim();
      const annotation = note.dataset.note?.trim();

      if (!keyword || !annotation) return;
      note.setAttribute("data-inline-note-enhanced", "");

      if (!note.hasAttribute("tabindex")) {
        note.setAttribute("tabindex", "0");
      }

      if (!note.hasAttribute("aria-label")) {
        note.setAttribute("aria-label", `${keyword}：${annotation}`);
      }
    });
  }

  enhanceInlineNotes();
  document.addEventListener("astro:page-load", enhanceInlineNotes);


  document.addEventListener("astro:before-preparation", (event) => {
    const sourceElement = event.sourceElement;
    const link = sourceElement instanceof Element ? sourceElement.closest("a") : null;
    const href = link?.getAttribute("href");

    // 非内部链接（外链/锚点/无来源元素）不做视图过渡
    if (!href || href.startsWith("#") || /^(https?:)?\/\//.test(href)) {
      event.preventDefault();
      return;
    }

    const direction = link.closest("[data-turn='back']") ? "back" : "forward";
    document.documentElement.setAttribute(ENTRY_TURN_ATTR, direction);
  });

  document.addEventListener("astro:before-swap", (event) => {
    const entryTurn = document.documentElement.getAttribute(ENTRY_TURN_ATTR);
    if (!entryTurn) return;

    event.newDocument.documentElement.setAttribute(ENTRY_TURN_ATTR, entryTurn);

    event.viewTransition?.finished.finally(() => {
      document.documentElement.removeAttribute(ENTRY_TURN_ATTR);
    });
  });
})();
