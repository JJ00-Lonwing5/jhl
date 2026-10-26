/* ============================================================
   静帧 · app1.js — 纯原生 JavaScript，无依赖
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 移动端菜单（MENU / Escape 关闭） ---------- */
  function initMenu() {
    const btn = document.getElementById("menuBtn");
    const nav = document.getElementById("siteNav");
    if (!btn || !nav) return;

    const setState = function (open) {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "CLOSE" : "MENU";
    };

    btn.addEventListener("click", function () {
      setState(!nav.classList.contains("is-open"));
    });

    // 点击导航链接后关闭
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setState(false);
    });

    // Escape 关闭
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setState(false);
        btn.focus();
      }
    });
  }

  /* ---------- 通用复制工具 ---------- */
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function bindCopy(btnId, text, copiedText, restoreText, onFail) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener("click", function () {
      const done = function () {
        btn.setAttribute("data-copied", "true");
        btn.textContent = copiedText;
        setTimeout(function () {
          btn.setAttribute("data-copied", "false");
          btn.textContent = restoreText;
        }, 2000);
      };
      const fail = function () { if (onFail) onFail(); };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {
          if (fallbackCopy(text)) { done(); } else { fail(); }
        });
      } else if (fallbackCopy(text)) {
        done();
      } else {
        fail();
      }
    });
  }

  /* ---------- 联系方式：复制邮箱 / 微信号 ---------- */
  function initCopyContact() {
    bindCopy(
      "copyEmailBtn",
      "JJ002015@outlook.com",
      "已复制邮箱",
      "复制常用邮箱",
      function () { window.location.href = "mailto:JJ002015@outlook.com"; }
    );
    bindCopy(
      "copyWechatBtn",
      "Lonwing5",
      "已复制微信号",
      "Lonwing5",
      null
    );
  }

  /* ---------- 音乐：极简播放开关（视觉，不自动播放） ---------- */
  function initPlayToggle() {
    const btn = document.getElementById("playToggle");
    const stage = document.getElementById("nowPlaying");
    if (!btn || !stage) return;

    btn.addEventListener("click", function () {
      const playing = stage.classList.toggle("is-playing");
      btn.setAttribute("aria-pressed", String(playing));
      btn.innerHTML = playing
        ? '<span class="ico" aria-hidden="true">❚❚</span> 暂停'
        : '<span class="ico" aria-hidden="true">▶</span> 播放';
    });
  }

  /* ---------- 电影轮播：左右箭头 ---------- */
  function initFilmReel() {
    const track = document.getElementById("filmTrack");
    const prev = document.getElementById("reelPrev");
    const next = document.getElementById("reelNext");
    if (!track || !prev || !next) return;

    const step = function () {
      const card = track.querySelector(".film-card");
      return card ? card.getBoundingClientRect().width + 20 : 300;
    };

    prev.addEventListener("click", function () {
      track.scrollBy({ left: -step(), behavior: "smooth" });
    });
    next.addEventListener("click", function () {
      track.scrollBy({ left: step(), behavior: "smooth" });
    });
  }

  /* ---------- 设置当前页导航高亮 ---------- */
  function initActiveNav() {
    const here = (location.pathname.split("/").pop() || "index1.html").toLowerCase();
    document.querySelectorAll(".site-nav a[data-page]").forEach(function (a) {
      if (a.getAttribute("data-page").toLowerCase() === here) {
        a.setAttribute("aria-current", "page");
      }
    });
  }

  /* ---------- 页面过渡：镜头拉远后跳转 ---------- */
  function initPageTransition() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // 后退/缓存恢复时清除离开态
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) document.body.classList.remove("is-leaving");
    });
    document.body.classList.remove("is-leaving");

    document.addEventListener("click", function (e) {
      // 只处理普通左键点击
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var link = e.target.closest("a");
      if (!link) return;
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#" || /^(https?:|mailto:|tel:)/i.test(href)) return;
      if (link.target === "_blank") return;
      if (!/\.html$/i.test(href.split("?")[0].split("#")[0])) return;

      e.preventDefault();

      if (document.body.classList.contains("is-leaving")) return;

      document.body.classList.add("is-leaving");
      setTimeout(function () {
        window.location.href = href;
      }, 430);
    });
  }

  /* ---------- 关于我：点击照片切换重叠顺序 ---------- */
  function initPhotoStack() {
    const stack = document.querySelector(".photo-stack");
    if (!stack) return;
    stack.setAttribute("tabindex", "0");
    stack.setAttribute("role", "button");
    stack.setAttribute("aria-label", "点击切换照片叠放顺序");

    stack.addEventListener("click", function () {
      stack.classList.toggle("is-swapped");
    });
    stack.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        stack.classList.toggle("is-swapped");
      }
    });
  }

  /* ---------- 关系照片墙：点击放大查看 ---------- */
  function initRelLightbox() {
    const cards = document.querySelectorAll(".rel-card");
    if (!cards.length) return;

    // 创建 lightbox（克隆照片墙相框样式）
    const lb = document.createElement("div");
    lb.className = "rel-lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "照片预览");
    lb.innerHTML =
      '<div class="rel-lightbox__stage">' +
      '<span class="rel-lightbox__hint">Click anywhere to close · 点击任意处关闭</span>' +
      '<button class="rel-lightbox__close" aria-label="关闭">×</button>' +
      '<figure class="rel-card" aria-hidden="true"></figure>' +
      '</div>';
    document.body.appendChild(lb);

    const figure = lb.querySelector(".rel-card");

    const open = function (card) {
      const img = card.querySelector("img");
      const name = card.querySelector(".rel-card__name");
      figure.innerHTML = "";
      const photo = document.createElement("div");
      photo.className = "rel-card__photo";
      photo.appendChild(img.cloneNode(true));
      const cap = document.createElement("figcaption");
      cap.innerHTML = '<span class="rel-card__name"></span>';
      cap.querySelector(".rel-card__name").textContent = name ? name.textContent : "";
      figure.appendChild(photo);
      figure.appendChild(cap);
      lb.classList.add("is-open");
      document.body.style.overflow = "hidden";
    };
    const close = function () {
      lb.classList.remove("is-open");
      document.body.style.overflow = "";
    };

    cards.forEach(function (card) {
      card.addEventListener("click", function () { open(card); });
    });

    lb.addEventListener("click", function (e) {
      if (e.target === lb) close();
    });
    lb.querySelector(".rel-lightbox__close").addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb.classList.contains("is-open")) close();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMenu();
    initCopyContact();
    initPlayToggle();
    initFilmReel();
    initActiveNav();
    initPageTransition();
    initPhotoStack();
    initRelLightbox();
  });
})();
