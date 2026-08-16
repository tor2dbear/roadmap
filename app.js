/* Roadmap aggregator UI. Reads window.__ROADMAP__ (from data/roadmap.js). */
(function () {
  "use strict";

  var DATA = window.__ROADMAP__;
  var board = document.getElementById("board");

  if (!DATA) {
    board.innerHTML =
      '<div class="banner">No data loaded. Run <code>node scripts/harvest.mjs</code> to' +
      " generate <code>data/roadmap.js</code>, then reload. When served over http this" +
      " page reads that file automatically.</div>";
    document.getElementById("subtitle").textContent = "No data";
    return;
  }

  var STATUS_LABEL = { now: "Now", next: "Next", later: "Later", inbox: "Inbox", done: "Done" };
  var state = {
    repos: new Set(), // empty = all
    tags: new Set(), // empty = all
    query: "",
    showDone: false,
    attention: false,
    view: "board", // "board" (kanban columns) | "list" (one column, grouped by status)
  };
  try {
    var savedView = localStorage.getItem("roadmap-view");
    if (savedView === "list" || savedView === "board") state.view = savedView;
  } catch (e) {}

  // ── auto-status ──
  // The harvester computes the flags (item.signals, discrete types) so the JSON,
  // digest and board agree and an agent can read them. The board just renders
  // them, turning a `stale` flag into a live "N days" string for display.
  function daysSince(dateStr) {
    if (!dateStr) return null;
    var t = Date.parse(dateStr + "T00:00:00Z");
    if (isNaN(t)) return null;
    return Math.floor((Date.now() - t) / 86400000);
  }
  function isFlagged(item) { return (item.signals || []).length > 0; }
  function signalMessages(item) {
    return (item.signals || []).map(function (s) {
      if (s.type === "stale") {
        var ds = daysSince(item.updated);
        return STATUS_LABEL[item.status] +
          (ds != null ? " sedan " + ds + " dagar utan uppdatering" : " utan uppdatering") +
          " — fortfarande aktiv?";
      }
      if (s.type === "issue-closed") return "Issue #" + item.issue + " är stängd — markera done?";
      if (s.type === "issue-open") return "Markerad done men issue #" + item.issue + " är fortfarande öppen.";
      return s.type;
    });
  }

  // ── tiny, safe markdown (escape first, then a whitelist of inline + block bits) ──
  function esc(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function mdInline(s) {
    return s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function renderMd(src) {
    var out = [];
    var lines = esc(src).split("\n");
    var inList = false;
    var para = []; // buffer of wrapped lines that form one paragraph
    var inCode = false;
    var code = []; // buffer of lines inside a ``` fence
    function flushPara() {
      if (para.length) { out.push("<p>" + mdInline(para.join(" ")) + "</p>"); para = []; }
    }
    function closeList() {
      if (inList) { out.push("</ul>"); inList = false; }
    }
    function flushCode() {
      if (code.length) { out.push("<pre><code>" + code.join("\n") + "</code></pre>"); code = []; }
    }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*```/.test(line)) {
        if (inCode) { flushCode(); inCode = false; }
        else { flushPara(); closeList(); inCode = true; }
        continue;
      }
      if (inCode) { code.push(line); continue; }
      var h = /^(#{2,4})\s+(.*)$/.exec(line);
      var li = /^\s*[-*]\s+(.*)$/.exec(line);
      if (h) {
        flushPara();
        closeList();
        var lvl = Math.min(h[1].length, 4);
        out.push("<h" + lvl + ">" + mdInline(h[2]) + "</h" + lvl + ">");
      } else if (li) {
        flushPara();
        if (!inList) { out.push("<ul>"); inList = true; }
        out.push("<li>" + mdInline(li[1]) + "</li>");
      } else if (line.trim() === "") {
        flushPara();
        closeList();
      } else {
        closeList();
        para.push(line.trim()); // fold wrapped lines into the current paragraph
      }
    }
    flushPara();
    closeList();
    if (inCode) flushCode();
    return out.join("\n");
  }

  function matches(item) {
    if (state.attention && !isFlagged(item)) return false;
    // In attention mode, flagged done items should surface even if "show done" is off.
    if (!state.attention && !state.showDone && item.status === "done") return false;
    if (state.repos.size && !state.repos.has(item.repo)) return false;
    if (state.tags.size) {
      var hit = item.tags.some(function (t) { return state.tags.has(t); });
      if (!hit) return false;
    }
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = (item.title + " " + item.body + " " + item.tags.join(" ") + " " + item.repoName).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // A card is a compact summary; tapping it opens the full detail in a modal
  // (fullscreen on mobile) so long bodies don't blow up the column height.
  function card(item) {
    var sig = signalMessages(item);
    var c = el("div", "card" + (item.native ? "" : " adapted") + (sig.length ? " flagged" : ""));
    c.style.setProperty("--repo", item.repoColor);

    // Row 1: title.
    c.appendChild(el("h3", "card-title", item.title));

    // Row 2: repo (colored dot + name) on the left, ⚠ and date on the right.
    var meta = el("div", "card-meta");
    var repo = el("span", "card-repo");
    var dot = el("span", "repo-dot");
    dot.style.background = item.repoColor;
    repo.appendChild(dot);
    repo.appendChild(document.createTextNode(item.repoName));
    meta.appendChild(repo);
    if (sig.length) {
      var warn = el("span", "warn-badge", "⚠");
      warn.title = sig.join("\n");
      meta.appendChild(warn);
    }
    if (item.updated) meta.appendChild(el("span", "card-date", item.updated));
    c.appendChild(meta);

    // Row 3: tags (static badges).
    if (item.tags.length || !item.native) {
      var tags = el("div", "card-tags");
      item.tags.forEach(function (t) { tags.appendChild(el("span", "tagpill", "#" + t)); });
      if (!item.native) tags.appendChild(el("span", "adapted-badge", "adapted"));
      c.appendChild(tags);
    }

    c.addEventListener("click", function () { openModal(item); });
    return c;
  }

  function linkEl(text, href) {
    var a = el("a", null, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  // ── detail modal ──
  var modalBackdrop, modalContent, modalPanel;
  function buildModal() {
    modalBackdrop = el("div", "modal-backdrop");
    modalBackdrop.hidden = true;
    var panel = el("div", "modal");
    modalPanel = panel;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    var close = el("button", "modal-close", "✕");
    close.setAttribute("aria-label", "Stäng");
    close.addEventListener("click", closeModal);
    modalContent = el("div", "modal-content");
    panel.appendChild(close);
    panel.appendChild(modalContent);
    modalBackdrop.appendChild(panel);
    modalBackdrop.addEventListener("click", function (e) {
      if (e.target === modalBackdrop) closeModal();
    });
    document.body.appendChild(modalBackdrop);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }

  function openModal(item) {
    modalContent.innerHTML = "";
    modalPanel.style.setProperty("--repo", item.repoColor);

    modalContent.appendChild(el("h2", "modal-title", item.title));

    // Meta row: repo (dot + name) + status pill on the left, date on the right.
    var meta = el("div", "modal-meta");
    var repo = el("span", "card-repo");
    var dot = el("span", "repo-dot");
    dot.style.background = item.repoColor;
    repo.appendChild(dot);
    repo.appendChild(document.createTextNode(item.repoName));
    meta.appendChild(repo);
    meta.appendChild(el("span", "status-pill status-" + item.status, STATUS_LABEL[item.status] || item.status));
    if (item.updated) meta.appendChild(el("span", "card-date", item.updated));
    modalContent.appendChild(meta);

    // Tags on their own row (static badges).
    if (item.tags.length || !item.native) {
      var tags = el("div", "card-tags");
      item.tags.forEach(function (t) { tags.appendChild(el("span", "tagpill", "#" + t)); });
      if (!item.native) tags.appendChild(el("span", "adapted-badge", "adapted"));
      modalContent.appendChild(tags);
    }

    var sig = signalMessages(item);
    if (sig.length) {
      var flags = el("div", "card-flags");
      sig.forEach(function (m) { flags.appendChild(el("div", "flag", "⚠ " + m)); });
      modalContent.appendChild(flags);
    }

    var body = el("div", "modal-body");
    body.innerHTML = renderMd(item.body || "(inga detaljer)");
    modalContent.appendChild(body);

    var links = el("div", "card-links");
    links.appendChild(linkEl("source ↗", item.sourceUrl));
    if (item.issue) {
      links.appendChild(linkEl("issue #" + item.issue, "https://github.com/" + item.repo + "/issues/" + item.issue));
    }
    modalContent.appendChild(links);

    modalBackdrop.hidden = false;
    document.body.classList.add("modal-open");
    modalContent.scrollTop = 0;
  }

  function closeModal() {
    if (!modalBackdrop) return;
    modalBackdrop.hidden = true;
    document.body.classList.remove("modal-open");
  }

  // A compact list row — denser than a card, one vertical column, tap → modal.
  function listRow(item) {
    var sig = signalMessages(item);
    var r = el("div", "list-row" + (sig.length ? " flagged" : ""));
    r.style.setProperty("--repo", item.repoColor);
    r.title = item.repoName;
    var dot = el("span", "repo-dot");
    dot.style.background = item.repoColor;
    r.appendChild(dot);
    r.appendChild(el("span", "list-title", item.title));
    if (sig.length) {
      var warn = el("span", "warn-badge", "⚠");
      warn.title = sig.join("\n");
      r.appendChild(warn);
    }
    if (item.updated) r.appendChild(el("span", "list-date", item.updated));
    r.addEventListener("click", function () { openModal(item); });
    return r;
  }

  function renderColumns(visible, statuses) {
    statuses.forEach(function (status) {
      var group = visible.filter(function (it) { return it.status === status; });
      var col = el("div", "column col-status-" + status);
      var head = el("div", "col-head");
      head.appendChild(el("span", "swatch"));
      head.appendChild(el("h2", null, STATUS_LABEL[status] || status));
      head.appendChild(el("span", "count", String(group.length)));
      col.appendChild(head);
      var cards = el("div", "cards");
      if (group.length === 0) {
        cards.appendChild(el("div", "empty", "—"));
      } else {
        group.forEach(function (it) { cards.appendChild(card(it)); });
      }
      col.appendChild(cards);
      board.appendChild(col);
    });
  }

  function renderList(visible, statuses) {
    statuses.forEach(function (status) {
      var group = visible.filter(function (it) { return it.status === status; });
      if (group.length === 0) return; // no "—" placeholders in the flat list
      var section = el("section", "list-group col-status-" + status);
      var head = el("div", "list-head");
      head.appendChild(el("span", "swatch"));
      head.appendChild(el("h2", null, STATUS_LABEL[status] || status));
      head.appendChild(el("span", "count", String(group.length)));
      section.appendChild(head);
      group.forEach(function (it) { section.appendChild(listRow(it)); });
      board.appendChild(section);
    });
  }

  function renderBoard() {
    board.innerHTML = "";
    board.classList.toggle("as-list", state.view === "list");
    var visible = DATA.items.filter(matches);
    var statuses = DATA.statuses.filter(function (s) {
      return s !== "done" || state.showDone || state.attention;
    });

    if (state.view === "list") renderList(visible, statuses);
    else renderColumns(visible, statuses);

    updateFilterButton();
    var shown = visible.length;
    document.getElementById("footmeta").textContent =
      shown + " of " + DATA.total + " shown · generated " + DATA.generatedAt.slice(0, 16).replace("T", " ") + " UTC · ";
  }

  // ── filter chips ──
  function buildRepoChips() {
    var wrap = document.getElementById("repoFilters");
    DATA.sources.forEach(function (s) {
      var chip = el("button", "chip repo");
      chip.setAttribute("aria-pressed", "false");
      var dot = el("span", "dot");
      dot.style.background = s.color;
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(s.name));
      var n = el("span", "n", String(s.count));
      chip.appendChild(n);
      chip.title = s.blurb + (s.native ? "" : " — adapted from " + s.adapter);
      chip.addEventListener("click", function () {
        toggleSet(state.repos, s.repo, chip);
        renderBoard();
      });
      wrap.appendChild(chip);
    });
  }

  function buildTagChips() {
    var counts = {};
    DATA.items.forEach(function (it) {
      it.tags.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    });
    var tags = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
    var wrap = document.getElementById("tagFilters");
    tags.slice(0, 24).forEach(function (t) {
      var chip = el("button", "chip tag");
      chip.setAttribute("aria-pressed", "false");
      chip.appendChild(document.createTextNode("#" + t));
      chip.appendChild(el("span", "n", String(counts[t])));
      chip.addEventListener("click", function () {
        toggleSet(state.tags, t, chip);
        renderBoard();
      });
      wrap.appendChild(chip);
    });
  }

  function toggleSet(set, key, chip) {
    if (set.has(key)) { set.delete(key); chip.setAttribute("aria-pressed", "false"); }
    else { set.add(key); chip.setAttribute("aria-pressed", "true"); }
  }

  // "Needs attention" filter — only shown when something is actually flagged.
  function buildAttentionChip() {
    var flagged = DATA.items.filter(function (it) { return isFlagged(it); }).length;
    if (!flagged) return;
    var chip = el("button", "chip attention");
    chip.setAttribute("aria-pressed", "false");
    chip.appendChild(document.createTextNode("⚠ Needs attention"));
    chip.appendChild(el("span", "n", String(flagged)));
    chip.title = "Pucks whose declared status disagrees with reality — a linked issue's state, or a now/next puck gone quiet.";
    chip.addEventListener("click", function () {
      state.attention = !state.attention;
      chip.setAttribute("aria-pressed", state.attention ? "true" : "false");
      renderBoard();
    });
    document.getElementById("filters").insertBefore(chip, document.querySelector("#filters .toggle"));
  }

  // ── theme ──
  var root = document.documentElement;
  var themeBtn = document.getElementById("theme");
  var saved = null;
  try { saved = localStorage.getItem("roadmap-theme"); } catch (e) {}
  if (saved) root.setAttribute("data-theme", saved);
  themeBtn.addEventListener("click", function () {
    var cur = root.getAttribute("data-theme");
    var next = cur === "dark" ? "light" : cur === "light" ? "auto" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("roadmap-theme", next); } catch (e) {}
  });

  // ── view toggle (board ⇄ list, remembered) ──
  var viewBtn = document.getElementById("viewToggle");
  function updateViewButton() {
    var toList = state.view === "board";
    viewBtn.textContent = toList ? "☰" : "▦";
    viewBtn.title = toList ? "Byt till listvy" : "Byt till brädvy";
    viewBtn.setAttribute("aria-label", viewBtn.title);
    viewBtn.classList.toggle("active", state.view === "list");
  }
  viewBtn.addEventListener("click", function () {
    state.view = state.view === "board" ? "list" : "board";
    try { localStorage.setItem("roadmap-view", state.view); } catch (e) {}
    updateViewButton();
    renderBoard();
  });

  var searchInput = document.getElementById("search");
  searchInput.addEventListener("input", function (e) {
    state.query = e.target.value.trim();
    renderBoard();
  });
  // iOS keeps the keyboard up until something explicitly blurs the field — a tap
  // on a card or empty space doesn't. Dismiss on Enter and on any tap outside the
  // input so focus never feels stuck.
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") searchInput.blur();
  });
  document.addEventListener("touchstart", function (e) {
    if (document.activeElement === searchInput && e.target !== searchInput) searchInput.blur();
  }, { passive: true });
  document.getElementById("showDone").addEventListener("change", function (e) {
    state.showDone = e.target.checked;
    renderBoard();
  });

  // ── collapsible filters (collapsed by default on narrow screens) ──
  var filterChips = document.getElementById("filterChips");
  var filterToggle = document.getElementById("filterToggle");
  function setFilters(open) {
    filterChips.hidden = !open;
    filterToggle.setAttribute("aria-expanded", open ? "true" : "false");
    filterToggle.classList.toggle("active", open);
  }
  filterToggle.addEventListener("click", function () { setFilters(filterChips.hidden); });
  function updateFilterButton() {
    var n = state.repos.size + state.tags.size;
    filterToggle.textContent = n ? "Filter (" + n + ")" : "Filter";
  }

  // ── boot ──
  var active = DATA.counts.now + DATA.counts.next + DATA.counts.later;
  document.getElementById("subtitle").textContent =
    active + " active · " + DATA.counts.done + " done · " + DATA.sources.length + " repos";
  buildModal();
  buildRepoChips();
  buildTagChips();
  buildAttentionChip();
  updateViewButton();
  setFilters(window.matchMedia("(min-width: 601px)").matches);
  renderBoard();
})();
