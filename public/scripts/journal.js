(() => {
  "use strict";

  const sectionInfo = {
    blog: { number: "01", title: "Blog", desc: "完整文章、教程、经验总结和专题内容。", href: "/blog" },
    thoughts: { number: "02", title: "Thoughts", desc: "短想法、观察、灵感和未完成念头。", href: "/thoughts" },
    photos: { number: "03", title: "Photos", desc: "摄影、生活记录、主题相册和视觉片段。", href: "/photos" },
    drinks: { number: "04", title: "Drinks", desc: "喝过的酒、酒款、场景和主观评价。", href: "/drinks" },
    about: { number: "05", title: "About Me", desc: "个人介绍、当前状态、关注主题与联系方式。", href: "/about" },
    books: { number: "06", title: "Books", desc: "书籍、书摘、推荐和阅读记录。", href: "/books" },
    music: { number: "07", title: "Music", desc: "专辑、歌单、单曲和听感记录。", href: "/music" },
    "ai-works": { number: "08", title: "AI Works", desc: "AI 图像、视频、文字实验和生成作品。", href: "/ai-works" },
  };

  const stage = document.getElementById("book-stage");
  const bookClosed = document.getElementById("book-closed");
  const bookOpen = document.getElementById("book-open");
  const pageSpread = document.getElementById("page-spread");
  const greetingTime = document.getElementById("greeting-time");
  const replayBtn = document.getElementById("replay-btn");
  const overlay = document.getElementById("section-overlay");
  const sectionNumber = document.getElementById("section-number");
  const sectionTitle = document.getElementById("section-title");
  const sectionDesc = document.getElementById("section-desc");
  const sectionEnter = document.getElementById("section-enter");
  const backBtn = document.getElementById("section-back");

  if (!stage || !pageSpread || !overlay) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setGreeting() {
    if (!greetingTime) return;
    const hour = new Date().getHours();
    let text = "夜深了";
    if (hour >= 5 && hour < 11) text = "早上好";
    else if (hour >= 11 && hour < 14) text = "中午好";
    else if (hour >= 14 && hour < 18) text = "下午好";
    else if (hour >= 18 && hour < 22) text = "晚上好";
    greetingTime.textContent = text;
  }

  function openBook() {
    if (prefersReducedMotion) {
      stage.classList.remove("is-closed", "is-opening");
      stage.classList.add("is-open");
      if (bookClosed) bookClosed.setAttribute("aria-hidden", "true");
      if (bookOpen) bookOpen.setAttribute("aria-hidden", "false");
      return;
    }
    stage.classList.remove("is-closed");
    stage.classList.add("is-opening");
    window.setTimeout(() => {
      stage.classList.remove("is-opening");
      stage.classList.add("is-open");
      if (bookClosed) bookClosed.setAttribute("aria-hidden", "true");
      if (bookOpen) bookOpen.setAttribute("aria-hidden", "false");
    }, 900);
  }

  function resetToClosed() {
    stage.classList.remove("is-open", "is-opening");
    stage.classList.add("is-closed");
    if (bookClosed) bookClosed.setAttribute("aria-hidden", "false");
    if (bookOpen) bookOpen.setAttribute("aria-hidden", "true");
    hideOverlay();
  }

  function replay() {
    resetToClosed();
    window.setTimeout(openBook, 400);
  }

  function initDraggable() {
    const draggables = document.querySelectorAll(".draggable");
    let active = null;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let hasMoved = false;

    function onStart(e) {
      const el = e.currentTarget;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      active = el;
      startX = clientX;
      startY = clientY;
      initialLeft = el.offsetLeft;
      initialTop = el.offsetTop;
      hasMoved = false;
      el.classList.add("is-dragging");
      document.body.classList.add("no-select");
    }

    function onMove(e) {
      if (!active) return;
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
      const parent = active.parentElement;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const elRect = active.getBoundingClientRect();
      let newLeft = Math.max(0, Math.min(initialLeft + dx, parentRect.width - elRect.width));
      let newTop = Math.max(0, Math.min(initialTop + dy, parentRect.height - elRect.height));
      active.style.left = newLeft + "px";
      active.style.top = newTop + "px";
    }

    function onEnd() {
      if (!active) return;
      if (hasMoved) active.dataset.dragged = "true";
      active.classList.remove("is-dragging");
      document.body.classList.remove("no-select");
      active = null;
    }

    draggables.forEach((el) => {
      el.addEventListener("mousedown", onStart);
      el.addEventListener("touchstart", onStart, { passive: false });
      el.addEventListener("keydown", (e) => {
        const step = e.shiftKey ? 16 : 8;
        let moved = false;
        if (e.key === "ArrowLeft") { el.style.left = Math.max(0, el.offsetLeft - step) + "px"; moved = true; }
        else if (e.key === "ArrowRight") { el.style.left = el.offsetLeft + step + "px"; moved = true; }
        else if (e.key === "ArrowUp") { el.style.top = Math.max(0, el.offsetTop - step) + "px"; moved = true; }
        else if (e.key === "ArrowDown") { el.style.top = el.offsetTop + step + "px"; moved = true; }
        else if (e.key === "Enter" || e.key === " ") {
          const key = el.dataset.section;
          if (key && key !== "tape") { e.preventDefault(); openSection(key, true); }
        }
        if (moved) e.preventDefault();
      });
    });

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
  }

  function showOverlay(key) {
    const info = sectionInfo[key];
    if (!info) return;
    sectionNumber.textContent = info.number;
    sectionTitle.textContent = info.title;
    sectionDesc.textContent = info.desc;
    if (sectionEnter) sectionEnter.setAttribute("href", info.href);
    overlay.classList.add("is-visible");
    overlay.setAttribute("aria-hidden", "false");
  }

  function hideOverlay() {
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
  }

  function openSection(key, navigateImmediately) {
    const info = sectionInfo[key];
    if (!info) return;
    pageSpread.style.transform = "translateX(-8px)";
    pageSpread.style.opacity = "0.95";
    window.setTimeout(() => {
      pageSpread.style.transform = "translateX(0)";
      pageSpread.style.opacity = "1";
      if (prefersReducedMotion || navigateImmediately) {
        window.location.href = info.href;
        return;
      }
      showOverlay(key);
    }, 220);
  }

  function initSectionClicks() {
    document.querySelectorAll("[data-section]").forEach((scrap) => {
      scrap.addEventListener("click", (e) => {
        if (scrap.dataset.dragged) {
          delete scrap.dataset.dragged;
          e.preventDefault();
          return;
        }
        const key = scrap.dataset.section;
        if (!key || key === "tape") return;
        e.preventDefault();
        openSection(key, false);
      });
    });
    if (backBtn) backBtn.addEventListener("click", hideOverlay);
  }

  function init() {
    setGreeting();
    if (replayBtn) replayBtn.addEventListener("click", replay);
    initDraggable();
    initSectionClicks();
    window.setTimeout(openBook, prefersReducedMotion ? 50 : 700);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();