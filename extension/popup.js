let currentTabId = null;

const pageTitle = document.getElementById("pageTitle");
const pageUrl = document.getElementById("pageUrl");
const statusNode = document.getElementById("status");
const mediaList = document.getElementById("mediaList");
const refreshButton = document.getElementById("refreshButton");
const clearButton = document.getElementById("clearButton");
const platformSelect = document.getElementById("platformSelect");
const mediaCardTemplate = document.getElementById("mediaCardTemplate");
const PLATFORM_STORAGE_KEY = "downloadPlatform";

refreshButton.addEventListener("click", () => loadActiveTab(true));
clearButton.addEventListener("click", clearCurrentTab);
platformSelect.addEventListener("change", savePlatformPreference);

initialize();

async function initialize() {
  await loadPlatformPreference();
  await loadActiveTab(false);
}

async function loadPlatformPreference() {
  const saved = await chrome.storage.local.get(PLATFORM_STORAGE_KEY).catch(() => ({}));
  platformSelect.value = saved?.[PLATFORM_STORAGE_KEY] || "auto";
}

async function savePlatformPreference() {
  await chrome.storage.local.set({ [PLATFORM_STORAGE_KEY]: platformSelect.value });
  setStatus(`启动方式已切换为：${platformSelect.options[platformSelect.selectedIndex].textContent}`, false, true);
}

async function loadActiveTab(showStatus) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab?.id ?? null;

  pageTitle.textContent = tab?.title || "未获取到活动标签页";
  pageUrl.textContent = tab?.url || "";

  if (!currentTabId) {
    renderItems([]);
    setStatus("当前没有可读取的标签页。", true);
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "GET_TAB_MEDIA",
    tabId: currentTabId
  });

  renderItems(response?.items || []);
  if (showStatus) {
    setStatus(`已刷新，当前捕获 ${response?.items?.length || 0} 条资源。`, false, true);
  } else {
    setStatus("");
  }
}

async function clearCurrentTab() {
  if (!currentTabId) {
    return;
  }

  await chrome.runtime.sendMessage({
    type: "CLEAR_TAB_MEDIA",
    tabId: currentTabId
  });

  renderItems([]);
  setStatus("当前页面的嗅探结果已清空。", false, true);
}

function renderItems(items) {
  mediaList.textContent = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "还没有发现可交给 N_m3u8DL-RE 的资源。保持页面播放或刷新后再看一次。";
    mediaList.appendChild(empty);
    return;
  }

  for (const item of items) {
    const fragment = mediaCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".card");
    const title = fragment.querySelector(".title");
    const url = fragment.querySelector(".url");
    const mediaType = fragment.querySelector(".media-type");
    const size = fragment.querySelector(".size");
    const launchButton = fragment.querySelector(".launch");
    const copyButton = fragment.querySelector(".copy");

    title.textContent = item.title || "未命名视频";
    url.textContent = item.url;
    mediaType.textContent = item.mediaType;
    size.textContent = item.size ? formatSize(item.size) : (item.extension || item.mimeType || "unknown");

    launchButton.addEventListener("click", () => launchDownload(item, launchButton));
    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(item.url);
      setStatus("链接已复制。", false, true);
    });

    card.dataset.id = item.id;
    mediaList.appendChild(fragment);
  }
}

async function launchDownload(item, button) {
  button.disabled = true;
  setStatus(`正在发送到 N_m3u8DL-RE：${item.title || item.url}`);

  const response = await chrome.runtime.sendMessage({
    type: "START_DOWNLOAD",
    tabId: currentTabId,
    itemId: item.id,
    platform: platformSelect.value
  });

  button.disabled = false;

  if (!response?.ok) {
    setStatus(response?.error || "发送失败。", true);
    return;
  }

  setStatus("已启动下载任务，请稍后在下载目录查看文件。", false, true);
}

function setStatus(message, isError = false, isSuccess = false) {
  statusNode.textContent = message;
  statusNode.className = "status";
  if (isError) {
    statusNode.classList.add("error");
  } else if (isSuccess) {
    statusNode.classList.add("success");
  }
}

function formatSize(size) {
  if (!size) {
    return "unknown";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
