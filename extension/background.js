// background.js — Manifest V3 service worker
// Central event router: listens to browser-level signals (tabs, navigation,
// idle state) and forwards structured events to the local backend.

const API_BASE = "http://localhost:4000";
const QUEUE_KEY = "eventQueue";
const ENABLED_KEY = "agentEnabled";
const FLUSH_ALARM = "flush-queue";
const FLUSH_INTERVAL_MIN = 0.25; // ~15s batching

let sessionId = crypto.randomUUID();
let activeTabId = null;
let activeTabStartedAt = null;

async function isEnabled() {
  const { [ENABLED_KEY]: enabled } = await chrome.storage.local.get(ENABLED_KEY);
  return enabled !== false; // default ON, user can toggle off in popup
}

async function queueEvent(event) {
  if (!(await isEnabled())) return;
  const full = {
    id: crypto.randomUUID(),
    sessionId,
    ts: Date.now(),
    ...event,
  };
  const { [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get(QUEUE_KEY);
  queue.push(full);
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
}

async function flushQueue() {
  const { [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get(QUEUE_KEY);
  if (queue.length === 0) return;

  try {
    const res = await fetch(`${API_BASE}/events/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: queue }),
    });
    if (res.ok) {
      await chrome.storage.local.set({ [QUEUE_KEY]: [] });
    }
    // On failure, keep the queue and retry on next alarm.
  } catch (err) {
    // Backend not reachable (e.g. not running yet) — keep queue for later.
    console.warn("[agent] flush failed, will retry:", err.message);
  }
}

function closeActiveTabDwell() {
  if (activeTabId !== null && activeTabStartedAt !== null) {
    const dwellMs = Date.now() - activeTabStartedAt;
    queueEvent({
      type: "tab_dwell",
      tabId: activeTabId,
      dwellMs,
    });
  }
}

// --- Tab lifecycle -----------------------------------------------------

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  closeActiveTabDwell();
  activeTabId = tabId;
  activeTabStartedAt = Date.now();
  try {
    const tab = await chrome.tabs.get(tabId);
    queueEvent({ type: "tab_activated", tabId, url: tab.url, title: tab.title });
  } catch {
    /* tab may have closed already */
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  queueEvent({ type: "tab_created", tabId: tab.id, url: tab.url });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) closeActiveTabDwell();
  queueEvent({ type: "tab_closed", tabId });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    queueEvent({ type: "tab_updated", tabId, url: tab.url, title: tab.title });
  }
});

// --- Navigation ----------------------------------------------------------

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return; // top-level frames only
  queueEvent({
    type: "page_navigation",
    tabId: details.tabId,
    url: details.url,
  });
});

// --- Idle detection --------------------------------------------------

chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener((state) => {
  queueEvent({ type: "idle_state_changed", state });
});

// --- Messages from content scripts -------------------------------------

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.source !== "activity-agent-content") return;
  queueEvent({
    ...message.payload,
    tabId: sender.tab?.id,
    url: sender.tab?.url,
  });
});

// --- Periodic flush ------------------------------------------------------

chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: FLUSH_INTERVAL_MIN });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FLUSH_ALARM) flushQueue();
});

chrome.runtime.onStartup.addListener(() => {
  sessionId = crypto.randomUUID();
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await chrome.storage.local.set({ [ENABLED_KEY]: true, [QUEUE_KEY]: [] });
  }
});
