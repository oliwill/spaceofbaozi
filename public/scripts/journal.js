/* journal.js — 手账首页体验层
   职责：开本、时区问候/日期印章、两步进入（触屏）、装饰拖动。
   所有栏目入口始终是语义 <a href>；JS 仅增强，失败时不阻塞导航。 */
(() => {
  "use strict";

  const stage = document.getElementById("book-stage");
  const paper = document.getElementById("paper");
  const greetingTime = document.getElementById("greeting-time");
  const dhNum = document.getElementById("dh-num");
  const dhWeekday = document.getElementById("dh-weekday");
  const dhMonth = document.getElementById("dh-month");
  const mcTitle = document.getElementById("mc-title");
  const mcGrid = document.getElementById("mc-grid");
  const bookClosed = document.getElementById("book-closed");
  const replayBtn = document.getElementById("replay-btn");

  if (!stage || !paper) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  /* ===== 时区问候与页首日期 ===== */
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

  function setDateHeader() {
    const now = new Date();
    const monthYear = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    if (dhNum) dhNum.textContent = String(now.getDate());
    if (dhWeekday) dhWeekday.textContent = WEEKDAYS[now.getDay()];
    if (dhMonth) dhMonth.textContent = monthYear;
    if (mcTitle) mcTitle.textContent = monthYear;
    if (!mcGrid) return;
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    let html = ["S", "M", "T", "W", "T", "F", "S"]
      .map((w) => `<span class="mc-w">${w}</span>`)
      .join("");
    for (let i = 0; i < first; i++) html += '<span class="mc-d"></span>';
    for (let i = 1; i <= days; i++) {
      html += `<span class="mc-d${i === today ? " mc-today" : ""}">${i}</span>`;
    }
    mcGrid.innerHTML = html;
  }

  /* ===== 开本 ===== */
  function openBook(focusAfter = false) {
    if (stage.classList.contains("is-open")) return;
    stage.classList.add("is-open");
    paper.inert = false;
    if (bookClosed) {
      bookClosed.inert = true;
      bookClosed.setAttribute("aria-hidden", "true");
    }
    if (focusAfter) {
      window.setTimeout(() => {
        paper.querySelector(".entry")?.focus({ preventScroll: true });
      }, prefersReducedMotion ? 0 : 950);
    }
  }

  function closeBook() {
    stage.classList.remove("is-open");
    paper.inert = true;
    if (bookClosed) {
      bookClosed.inert = false;
      bookClosed.setAttribute("aria-hidden", "false");
    }
  }

  function replay() {
    closeBook();
    bookClosed?.focus({ preventScroll: true });
  }

  function initCover() {
    if (prefersReducedMotion) {
      openBook();
      return;
    }
    closeBook();
    stage.addEventListener("click", () => openBook());
    bookClosed?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      openBook(true);
    });
  }

  /* ===== 两步进入：触屏首 tap 浮现批注，次 tap 进入 ===== */
  let lastPointerType = "mouse";

  function unprimeAll(except) {
    document.querySelectorAll(".entry.is-primed").forEach((el) => {
      if (el !== except) el.classList.remove("is-primed");
    });
  }

  function initTwoStep() {
    if (prefersReducedMotion) return; // 减少动态效果：点击直接导航

    document.addEventListener("pointerdown", (e) => {
      lastPointerType = e.pointerType || "mouse";
      if (!e.target.closest(".entry")) unprimeAll(null);
    });

    document.querySelectorAll(".entry").forEach((entry) => {
      entry.addEventListener("click", (e) => {
        // 鼠标/笔：hover 已浮现批注，点击即进入；键盘：聚焦已浮现，Enter 即进入
        if (lastPointerType !== "touch") return;
        if (entry.classList.contains("is-primed")) return; // 第二次 tap：放行
        e.preventDefault();
        unprimeAll(entry);
        entry.classList.add("is-primed");
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") unprimeAll(null);
    });
  }

  /* ===== 装饰拖动（仅纸签；限制在纸面内；不持久化） ===== */
  function initDraggable() {
    const draggables = document.querySelectorAll(".draggable");
    if (!draggables.length) return;

    let active = null;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let scale = 1;

    function onStart(e) {
      const el = e.currentTarget;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      active = el;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = el.offsetLeft;
      initialTop = el.offsetTop;
      const rect = paper.getBoundingClientRect();
      scale = rect.width / 1200 || 1;
      el.classList.add("is-dragging");
      el.setPointerCapture(e.pointerId);
      document.body.classList.add("no-select");
    }

    function onMove(e) {
      if (!active || !active.hasPointerCapture(e.pointerId)) return;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      const margin = 6;
      const maxLeft = 1200 - active.offsetWidth - margin;
      const maxTop = 800 - active.offsetHeight - margin;
      active.style.left = Math.max(margin, Math.min(initialLeft + dx, maxLeft)) + "px";
      active.style.top = Math.max(margin, Math.min(initialTop + dy, maxTop)) + "px";
    }

    function onEnd(e) {
      if (!active) return;
      if (active.hasPointerCapture(e.pointerId)) active.releasePointerCapture(e.pointerId);
      active.classList.remove("is-dragging");
      document.body.classList.remove("no-select");
      active = null;
    }

    draggables.forEach((el) => {
      el.addEventListener("pointerdown", onStart);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onEnd);
      el.addEventListener("pointercancel", onEnd);
    });
  }

  /* ===== 初始化 ===== */
  function init() {
    setGreeting();
    setDateHeader();
    // 无 JS 时页面保持打开态；有 JS 时等待点击/Enter/Space 翻开
    initCover();
    initTwoStep();
    initDraggable();
    if (replayBtn) replayBtn.addEventListener("click", replay);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
