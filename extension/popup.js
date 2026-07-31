const statusLabel = document.getElementById("statusLabel");
const toggleBtn = document.getElementById("toggleBtn");
const clearBtn = document.getElementById("clearBtn");
const queueCount = document.getElementById("queueCount");
const openDashboard = document.getElementById("openDashboard");

async function refresh() {
  const { agentEnabled = true, eventQueue = [] } = await chrome.storage.local.get([
    "agentEnabled",
    "eventQueue",
  ]);
  statusLabel.textContent = agentEnabled ? "ON" : "OFF";
  statusLabel.className = "status " + (agentEnabled ? "on" : "off");
  toggleBtn.textContent = agentEnabled ? "Turn Off" : "Turn On";
  queueCount.textContent = eventQueue.length;
}

toggleBtn.addEventListener("click", async () => {
  const { agentEnabled = true } = await chrome.storage.local.get("agentEnabled");
  await chrome.storage.local.set({ agentEnabled: !agentEnabled });
  refresh();
});

clearBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ eventQueue: [] });
  refresh();
});

openDashboard.addEventListener("click", () => {
  chrome.tabs.create({ url: "http://localhost:4000" });
});

refresh();
