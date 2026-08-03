(() => {
  const views = [...document.querySelectorAll("[data-page]")];
  const toast = document.getElementById("toast");
  const binder = document.querySelector(".binder-stage");
  const cards = [...document.querySelectorAll(".info-card")];
  let toastTimer;

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2300);
  }

  function setView(name, updateHash = true) {
    const target = document.querySelector('[data-page="' + name + '"]') || document.querySelector('[data-page="launch"]');
    views.forEach((view) => {
      const active = view === target;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });
    if (updateHash) window.history.replaceState(null, "", "#" + name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-view]").forEach((control) => {
    control.addEventListener("click", () => setView(control.dataset.view));
  });

  document.querySelector("[data-draw-card]")?.addEventListener("click", () => {
    const drawn = cards.find((card) => card.classList.contains("is-drawn"));
    cards.forEach((card) => card.classList.remove("is-drawn"));
    const next = drawn ? cards[(cards.indexOf(drawn) + 1) % cards.length] : cards[1];
    next.classList.add("is-drawn");
    showToast(next.dataset.card === "about" ? "抽取了 About Me 信息卡" : "抽取了网站简介信息卡");
  });

  document.querySelector("[data-spread-cards]")?.addEventListener("click", (event) => {
    binder.classList.toggle("is-spread");
    event.currentTarget.textContent = binder.classList.contains("is-spread") ? "−" : "＋";
    event.currentTarget.setAttribute("aria-label", binder.classList.contains("is-spread") ? "收拢装饰图片卡" : "展开装饰图片卡");
    showToast(binder.classList.contains("is-spread") ? "已展开装饰图片卡，可查看完整图案" : "已收拢装饰图片卡");
  });

  document.querySelectorAll("[data-toast]").forEach((control) => {
    control.addEventListener("click", () => showToast(control.dataset.toast));
  });

  function openDialog(id) {
    document.getElementById(id)?.showModal();
  }

  document.querySelectorAll("[data-open-about]").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      openDialog("about-modal");
    });
  });
  document.querySelectorAll("[data-open-movie]").forEach((control) => {
    control.addEventListener("click", () => openDialog("movie-modal"));
  });
  document.querySelectorAll("[data-close-modal]").forEach((control) => {
    control.addEventListener("click", () => control.closest("dialog")?.close());
  });
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  const grid = document.querySelector(".heatmap-grid");
  if (grid) {
    const cells = Array.from({ length: 154 }, (_, index) => {
      const cell = document.createElement("i");
      if (index === 17) {
        cell.className = "active";
        cell.title = "2016-09-29";
      }
      grid.appendChild(cell);
      return cell;
    });
  }

  const hashView = window.location.hash.replace("#", "");
  setView(["launch", "home", "movies"].includes(hashView) ? hashView : "launch", false);
})();
