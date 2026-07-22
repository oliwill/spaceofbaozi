(function () {
  "use strict";

  const stage = document.getElementById("book-stage");
  const bookClosed = document.getElementById("book-closed");
  const bookOpen = document.getElementById("book-open");
  const pageSpread = document.getElementById("page-spread");
  const greetingTime = document.getElementById("greeting-time");
  const overlay = document.getElementById("section-overlay");
  const sectionTitle = document.getElementById("section-title");
  const sectionNumber = document.getElementById("section-number");
  const sectionDesc = document.getElementById("section-desc");
  const backBtn = document.getElementById("section-back");
  const replayBtn = document.getElementById("replay-btn");

  const sectionInfo = {
    blog: { number: "01", title: "Blog", desc: "完整文章、教程与专题。" },
    thoughts: { number: "02", title: "Thoughts", desc: "短想法、观察与灵感。" },
    photos: { number: "03", title: "Photos", desc: "胶片、生活与视觉片段。" },
    drinks: { number: "04", title: "Drinks", desc: "喝过的酒、酒款与场景。" },
    about: { number: "05", title: "About Me", desc: "个人介绍、当前状态与联系方式。" },
    books: { number: "06", title: "Books", desc: "书摘、推荐与阅读记录。" },
    music: { number: "07", title: "Music", desc: "专辑、歌单与听感。" },
    "ai-works": { number: "08", title: "AI Works", desc: "AI 图像、文字与实验。" },
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ===== 时间问候 ===== */
  function setGreeting() {
    const hour = new Date().getHours();
    let text = "早上好";
    if (hour >= 12 && hour < 18) text = "下午好";
    if (hour >= 18 || hour < 5) text = "晚上好";
    if (greetingTime) greetingTime.textContent = text;
  }

  /* ===== 打开手账 ===== */
  function openBook() {
    if (!stage || prefersReducedMotion) {
      stage.classList.remove("is-closed");
      stage.classList.add("is-open");
      if (bookClosed) bookClosed.setAttribute("aria-hidden", "true");
      if (bookOpen) bookOpen.setAttribute("aria-hidden", "false");
      return;
    }

    stage.classList.remove("is-closed");
    stage.classList.add("is-opening");

    setTimeout(() => {
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
    setTimeout(openBook, 400);
  }

  /* ===== 拖动 ===== */
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
      const rect = el.getBoundingClientRect();
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
      const parentRect = parent.getBoundingClientRect();
      const elRect = active.getBoundingClientRect();

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // 限制在当前页面内
      newLeft = Math.max(
        0,
        Math.min(newLeft, parentRect.width - elRect.width)
      );
      newTop = Math.max(
        0,
        Math.min(newTop, parentRect.height - elRect.height)
      );

      active.style.left = `${newLeft}px`;
      active.style.top = `${newTop}px`;
    }

    function onEnd(e) {
      if (!active) return;

      if (hasMoved) {
        active.dataset.dragged = "true";
      }

      active.classList.remove("is-dragging");
      document.body.classList.remove("no-select");
      active = null;
    }

    draggables.forEach((el) => {
      el.addEventListener("mousedown", onStart);
      el.addEventListener("touchstart", onStart, { passive: false });
    });

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
  }

  /* ===== 栏目点击 ===== */
  function showOverlay(key) {
    const info = sectionInfo[key];
    if (!info) return;

    sectionNumber.textContent = info.number;
    sectionTitle.textContent = info.title;
    sectionDesc.textContent = info.desc;

    overlay.classList.add("is-visible");
    overlay.setAttribute("aria-hidden", "false");
  }

  function hideOverlay() {
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
  }

  function initSectionClicks() {
    const scraps = document.querySelectorAll(".scrap[data-section]");

    scraps.forEach((scrap) => {
      scrap.addEventListener("click", (e) => {
        // 如果刚刚拖动过，不触发点击
        if (scrap.dataset.dragged) {
          delete scrap.dataset.dragged;
          return;
        }

        const key = scrap.dataset.section;
        if (!key || key === "tape") return;

        e.preventDefault();

        // 模拟翻页：先让页面轻微移动
        pageSpread.style.transform = "translateX(-8px)";
        pageSpread.style.opacity = "0.95";

        setTimeout(() => {
          pageSpread.style.transform = "translateX(0)";
          pageSpread.style.opacity = "1";
          showOverlay(key);
        }, 220);
      });
    });

    backBtn.addEventListener("click", hideOverlay);
  }

  /* ===== 初始化 ===== */
  function init() {
    setGreeting();

    if (replayBtn) {
      replayBtn.addEventListener("click", replay);
    }

    initDraggable();
    initSectionClicks();

    // 自动打开
    setTimeout(openBook, prefersReducedMotion ? 50 : 700);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
