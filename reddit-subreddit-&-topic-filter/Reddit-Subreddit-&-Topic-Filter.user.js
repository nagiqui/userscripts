// ==UserScript==
// @name         Reddit Subreddit & Topic Filter
// @version      1.0
// @description  Hides posts from specific subreddits and by keywords in the title.
// @license      MIT
// @match        *://www.reddit.com/*
// @match        *://old.reddit.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @downloadURL    https://raw.githubusercontent.com/nagiqui/userscripts/main/reddit-subreddit-&-topic-filter/Reddit-Subreddit-&-Topic-Filter.user.js
// @updateURL      https://raw.githubusercontent.com/nagiqui/userscripts/main/reddit-subreddit-&-topic-filter/Reddit-Subreddit-&-Topic-Filter.user.js
// ==/UserScript==

(function () {
  "use strict";

  let BLOCKED_SUBREDDITS = GM_getValue("blocked_subreddits", []);
  let BLOCKED_KEYWORDS = GM_getValue("blocked_keywords", []);

  function buildRegex() {
    if (!BLOCKED_KEYWORDS.length) return null;
    return new RegExp(BLOCKED_KEYWORDS.map(k => `\\b${k}\\b`).join("|"), "i");
  }
  let keywordRegex = buildRegex();

  function save() {
    GM_setValue("blocked_subreddits", BLOCKED_SUBREDDITS);
    GM_setValue("blocked_keywords", BLOCKED_KEYWORDS);
    keywordRegex = buildRegex();
    filterPosts();
  }

  // -- Management panel --
  function injectPanel() {
    if (document.getElementById("rf-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "rf-overlay";
    overlay.style.cssText = `
      position:fixed;inset:0;z-ex:99998;
      background:rgba(0,0,0,.5);display:flex;
      align-items:center;justify-content:center;
    `;

    overlay.innerHTML = `
      <style>
        #rf-panel {
          background:#1a1a1b;border:1px solid #343536;border-radius:8px;
          padding:20px;width:360px;font:14px/1.5 system-ui,sans-serif;
          color:#d7dadc;box-shadow:0 8px 32px rgba(0,0,0,.6);
        }
        #rf-panel h3 { margin:0 0 16px;font-size:15px; }
        #rf-panel label { font-size:12px;color:#818384;display:block;margin-bottom:4px; }
        #rf-panel textarea {
          width:100%;box-sizing:border-box;background:#272729;
          border:1px solid #343536;border-radius:4px;color:#d7dadc;
          font:13px/1.5 monospace;padding:8px;resize:vertical;min-height:80px;
        }
        #rf-panel .rf-section { margin-bottom:14px; }
        #rf-panel .rf-hint { font-size:11px;color:#545454;margin-top:4px; }
        #rf-panel .rf-row { display:flex;gap:8px;margin-top:16px;justify-content:flex-end; }
        #rf-panel button {
          padding:7px 16px;border-radius:4px;border:none;
          cursor:pointer;font-size:13px;font-weight:500;
        }
        #rf-panel .rf-save   { background:#d93a00;color:#fff; }
        #rf-panel .rf-cancel { background:#343536;color:#d7dadc; }
        #rf-panel .rf-stats  {
          font-size:12px;color:#818384;margin-bottom:16px;
          padding:8px;background:#272729;border-radius:4px;text-align:center;
        }
      </style>
      <div id="rf-panel">
        <h3>⚙️ Reddit Filter</h3>
        <div class="rf-stats" id="rf-stats"></div>
        <div class="rf-section">
          <label>Blocked subreddits (one per line)</label>
          <textarea id="rf-ta-sub"></textarea>
          <div class="rf-hint">E.g.: reddit, microsoft, xbox</div>
        </div>
        <div class="rf-section">
          <label>Keywords in title (one per line)</label>
          <textarea id="rf-ta-kw"></textarea>
          <div class="rf-hint">E.g.: custom, console, manga</div>
        </div>
        <div class="rf-row">
          <button class="rf-cancel" id="rf-cancel">Cancel</button>
          <button class="rf-save" id="rf-save">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // - Populate fields -
    document.getElementById("rf-ta-sub").value = BLOCKED_SUBREDDITS.join("\n");
    document.getElementById("rf-ta-kw").value  = BLOCKED_KEYWORDS.join("\n");
    document.getElementById("rf-stats").textContent =
      `${BLOCKED_SUBREDDITS.length} subreddits · ${BLOCKED_KEYWORDS.length} keywords`;

    const close = () => overlay.remove();

    document.getElementById("rf-cancel").addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); }, { once: true });

    document.getElementById("rf-save").addEventListener("click", () => {
      BLOCKED_SUBREDDITS = document.getElementById("rf-ta-sub").value
        .split("\n").map(s => s.trim().toLowerCase()).filter(Boolean);
      BLOCKED_KEYWORDS = document.getElementById("rf-ta-kw").value
        .split("\n").map(s => s.trim().toLowerCase()).filter(Boolean);
      save();
      close();
    });
  }

  // -- Tampermonkey menu entries --
  GM_registerMenuCommand("⚙️ Manage filters", injectPanel);

  GM_registerMenuCommand("🚫 Block current subreddit", () => {
    const match = location.pathname.match(/^\/r\/([^/]+)/);
    const sub = match ? match[1].toLowerCase() : null;
    if (!sub) {
      alert("Navigate to a subreddit to use this option.");
      return;
    }
    if (BLOCKED_SUBREDDITS.includes(sub)) {
      alert(`r/${sub} is already in the list.`);
      return;
    }
    BLOCKED_SUBREDDITS.push(sub);
    save();
    alert(`r/${sub} added to filters.`);
  });

  GM_registerMenuCommand("🔤 Add keyword", () => {
    const kw = prompt("Keyword to block in titles:");
    if (!kw?.trim()) return;
    const clean = kw.trim().toLowerCase();
    if (BLOCKED_KEYWORDS.includes(clean)) {
      alert(`"${clean}" is already in the list.`);
      return;
    }
    BLOCKED_KEYWORDS.push(clean);
    save();
    alert(`"${clean}" added to filters.`);
  });

  // -- Post filtering --
  function shouldBlock(subreddit, title) {
    if (subreddit && BLOCKED_SUBREDDITS.includes(subreddit.replace(/^r\//i, "").toLowerCase())) return true;
    if (title && keywordRegex && keywordRegex.test(title)) return true;
    return false;
  }

  function filterPosts() {
    document.querySelectorAll("shreddit-post").forEach(post => {
      const subreddit = post.getAttribute("subreddit-prefixed-name") || post.getAttribute("subreddit") || "";
      const title = post.getAttribute("post-title") || post.querySelector("[slot='title']")?.textContent || "";
      if (shouldBlock(subreddit, title)) post.style.display = "none";
    });
    document.querySelectorAll(".thing[data-subreddit]").forEach(post => {
      const subreddit = post.getAttribute("data-subreddit") || "";
      const title = post.querySelector("a.title")?.textContent || "";
      if (shouldBlock(subreddit, title)) post.style.display = "none";
    });
  }

  filterPosts();
  new MutationObserver(filterPosts).observe(document.body, { childList: true, subtree: true });
})();