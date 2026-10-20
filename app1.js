/* ============================================================
   静帧 · app1.js — 纯原生 JavaScript，无依赖
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 留言数据库配置（restdb.io，国内可访问） ----------
     网址、Key、集合都由本站配置好，无需改动。
  ------------------------------------------------------------- */
  const RESTDB_CONFIG = {
    url: "https://letterjj-21c7.restdb.io",
    apiKey: "6ad605f40f7a2937358bd168",
    collection: "letters"
  };
  const RESTDB_ON = !!(RESTDB_CONFIG.url && RESTDB_CONFIG.apiKey);

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

  /* ---------- 远方来信：Firebase 永久保存 + 实时显示（未配置则临时模式） ---------- */
  function initLetters() {
    const form = document.getElementById("letterForm");
    if (!form) return;
    const nameInput = document.getElementById("letterName");
    const msgInput = document.getElementById("letterMsg");
    const anonInput = document.getElementById("letterAnon");
    const list = document.getElementById("letterList");
    const countEl = document.getElementById("letterCount");
    const empty = document.getElementById("letterEmpty");
    const live = document.getElementById("letterLive");
    const hint = document.getElementById("letterHint");

    let count = 0;

    const fmtTime = function (d) {
      const p = function (n) { return String(n).padStart(2, "0"); };
      return d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate()) +
        "  " + p(d.getHours()) + ":" + p(d.getMinutes());
    };

    const renderEmpty = function () {
      if (empty) empty.style.display = count === 0 ? "block" : "none";
      if (countEl) countEl.textContent = count + " 封来信";
    };

    const createNote = function (who, text, when) {
      const note = document.createElement("article");
      note.className = "letter-note";

      const head = document.createElement("div");
      head.className = "letter-note__head";
      const whoSpan = document.createElement("span");
      whoSpan.className = "who";
      whoSpan.textContent = who;
      const whenSpan = document.createElement("span");
      whenSpan.className = "when";
      whenSpan.textContent = when;
      head.appendChild(whoSpan);
      head.appendChild(whenSpan);

      const body = document.createElement("p");
      body.textContent = text;

      note.appendChild(head);
      note.appendChild(body);
      return note;
    };

    const appendNote = function (who, text, when) {
      list.insertBefore(createNote(who, text, when), list.firstChild);
      count += 1;
      if (empty) empty.style.display = "none";
      if (countEl) countEl.textContent = count + " 封来信";
    };

    const announce = function (who) {
      if (live) {
        live.textContent = "";
        live.textContent = "收到来自 " + who + " 的留言";
      }
    };

    // ---------- restdb.io 模式：永久保存 + 自动刷新显示 ----------
    if (RESTDB_ON && window.fetch) {
      const colUrl = RESTDB_CONFIG.url + "/rest/" + RESTDB_CONFIG.collection;
      const headers = {
        "x-apikey": RESTDB_CONFIG.apiKey,
        "Content-Type": "application/json"
      };
      let pollTimer = null;

      if (hint) hint.textContent = "留言会永久保存，并实时显示在下方。";

      const renderFromData = function (data) {
        if (!Array.isArray(data)) throw new Error("bad data");
        list.innerHTML = "";
        count = 0;
        data.forEach(function (d) {
          const who = d.name || "未署名";
          const when = d.time ? fmtTime(new Date(Number(d.time) * 1000)) : fmtTime(new Date());
          appendNote(who, d.message || "", when);
        });
        renderEmpty();
      };

      const loadLetters = function () {
        fetch(colUrl + "?sort=time&dir=-1&max=100", { headers: headers })
          .then(function (res) {
            if (!res.ok) throw new Error("load failed");
            return res.json();
          })
          .then(renderFromData)
          .catch(function () {
            if (hint) hint.textContent = "留言加载失败，请稍后重试。";
          });
      };

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        const text = msgInput.value.trim();
        if (!text) { msgInput.focus(); return; }
        const isAnon = anonInput.checked;
        const rawName = nameInput.value.trim();
        const who = isAnon ? "匿名访客" : (rawName || "未署名");

        const payload = {
          name: who,
          message: text,
          time: Math.floor(Date.now() / 1000)
        };

        fetch(colUrl, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (!res.ok) throw new Error("post failed");
          return res.json();
        }).then(function () {
          announce(who);
          form.reset();
          msgInput.focus();
          loadLetters();
        }).catch(function () {
          if (hint) hint.textContent = "发送失败，请稍后再试。";
        });
      });

      loadLetters();

      // 自动刷新：每 30 秒同步一次（仅页面可见时）
      pollTimer = setInterval(function () {
        if (!document.hidden) loadLetters();
      }, 30000);

      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) loadLetters();
      });

      return;
    }

    // ---------- 降级：临时模式（刷新即消失） ----------
    if (hint) hint.textContent = "留言仅保存在当前页面，刷新后会自动消失。";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const text = msgInput.value.trim();
      if (!text) { msgInput.focus(); return; }
      const isAnon = anonInput.checked;
      const rawName = nameInput.value.trim();
      const who = isAnon ? "匿名访客" : (rawName || "未署名");

      appendNote(who, text, fmtTime(new Date()));
      announce(who);
      form.reset();
      msgInput.focus();
    });
    renderEmpty();
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
    initLetters();
    initFilmReel();
    initActiveNav();
    initPageTransition();
    initPhotoStack();
    initRelLightbox();
  });
})();
