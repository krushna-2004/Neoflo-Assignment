// content.js — runs inside every page, reports interaction-level signals
// up to the background service worker via chrome.runtime.sendMessage.

(() => {
  const pageLoadedAt = Date.now();
  let maxScrollDepth = 0;
  let clickCount = 0;

  function send(type, extra = {}) {
    try {
      chrome.runtime.sendMessage({
        source: "activity-agent-content",
        payload: { type, ...extra },
      });
    } catch {
      // Extension context may be invalidated (e.g. during reload) — ignore.
    }
  }

  send("page_view", { title: document.title });

  document.addEventListener(
    "click",
    (e) => {
      clickCount += 1;
      const target = e.target;
      send("click", {
        tag: target?.tagName,
        // Keep this generic/non-sensitive: no input values or text content.
        elementId: target?.id || null,
        elementClass: (target?.className || "").toString().slice(0, 100),
      });
    },
    { capture: true, passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0) {
        const depth = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
        if (depth > maxScrollDepth) maxScrollDepth = depth;
      }
    },
    { passive: true }
  );

  function reportUnload() {
    send("page_exit", {
      timeOnPageMs: Date.now() - pageLoadedAt,
      maxScrollDepth,
      clickCount,
    });
  }

  window.addEventListener("beforeunload", reportUnload);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") reportUnload();
  });
})();
