const HOST_NAME = "com.videosnifferdownloader.host";
const MEDIA_STORE = new Map();
const REQUEST_HEADERS = new Map();
const STORAGE_KEY = "capturedMediaByTab";
const STORAGE_AREA = chrome.storage.session ?? chrome.storage.local;
const hydratePromise = hydrateStore();

const PLAYLIST_EXTENSIONS = new Set(["m3u8", "mpd"]);
const DIRECT_VIDEO_EXTENSIONS = new Set(["mp4", "mkv", "webm", "mov", "flv", "avi", "wmv"]);
const SEGMENT_EXTENSIONS = new Set([
  "ts",
  "m4s",
  "m4a",
  "m4v",
  "aac",
  "vtt",
  "srt",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "key",
  "cmfa",
  "cmfv",
  "part"
]);

const PLAYLIST_MIME_FRAGMENTS = [
  "application/vnd.apple.mpegurl",
  "application/x-mpegurl",
  "audio/mpegurl",
  "application/mpegurl",
  "application/dash+xml"
];

const NOISE_MIME_FRAGMENTS = [
  "image/",
  "font/",
  "text/css",
  "text/javascript",
  "application/javascript",
  "text/html"
];

const MIN_DIRECT_VIDEO_SIZE = 5 * 1024 * 1024;

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#1f6feb" });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  MEDIA_STORE.delete(tabId);
  persistStore().catch(() => {});
  chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {});
});

chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    REQUEST_HEADERS.set(details.requestId, toHeaderMap(details.requestHeaders));
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    REQUEST_HEADERS.delete(details.requestId);
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    handleResponse(details).catch((error) => {
      console.warn("Failed to process media candidate", error);
    });
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    await hydratePromise;

    if (!message || typeof message !== "object") {
      sendResponse({ ok: false, error: "Invalid message." });
      return;
    }

    if (message.type === "GET_TAB_MEDIA") {
      sendResponse({ ok: true, items: getTabMedia(message.tabId) });
      return;
    }

    if (message.type === "CLEAR_TAB_MEDIA") {
      MEDIA_STORE.delete(message.tabId);
      updateBadge(message.tabId);
      await persistStore();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "START_DOWNLOAD") {
      try {
        const result = await launchNativeDownload(message.tabId, message.itemId, message.platform);
        sendResponse({ ok: true, result });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
      return;
    }

    sendResponse({ ok: false, error: "Unsupported message." });
  })().catch((error) => {
    sendResponse({ ok: false, error: error.message });
  });
  return true;
});

async function handleResponse(details) {
  await hydratePromise;

  const requestHeaders = REQUEST_HEADERS.get(details.requestId) ?? {};
  REQUEST_HEADERS.delete(details.requestId);

  if (details.tabId < 0 || !details.url?.startsWith("http")) {
    return;
  }

  const responseHeaders = toHeaderMap(details.responseHeaders);
  const candidate = detectMediaCandidate(details, requestHeaders, responseHeaders);
  if (!candidate) {
    return;
  }

  const tab = await chrome.tabs.get(details.tabId).catch(() => null);
  if (!tab) {
    return;
  }

  candidate.title = sanitizeTitle(tab.title || candidate.title || "video");
  candidate.pageUrl = tab.url || candidate.pageUrl || requestHeaders.referer || "";
  candidate.favIconUrl = tab.favIconUrl || "";

  upsertMedia(details.tabId, candidate);
}

function detectMediaCandidate(details, requestHeaders, responseHeaders) {
  const url = details.url;
  const parsed = safeUrl(url);
  if (!parsed) {
    return null;
  }

  const extension = getExtension(parsed.pathname);
  const mimeType = normalizeMime(responseHeaders["content-type"]);
  const size = parseSize(responseHeaders["content-length"]);

  if (shouldIgnore(extension, mimeType, size)) {
    return null;
  }

  let mediaType = null;
  if (PLAYLIST_EXTENSIONS.has(extension) || PLAYLIST_MIME_FRAGMENTS.some((part) => mimeType.includes(part))) {
    mediaType = extension === "mpd" || mimeType.includes("dash+xml") ? "mpd" : "m3u8";
  } else if (
    DIRECT_VIDEO_EXTENSIONS.has(extension) ||
    (mimeType.startsWith("video/") && !mimeType.includes("mp2t") && size >= MIN_DIRECT_VIDEO_SIZE)
  ) {
    mediaType = "video";
  }

  if (!mediaType) {
    return null;
  }

  return {
    id: `${details.tabId}:${url}`,
    tabId: details.tabId,
    url,
    extension,
    mimeType,
    mediaType,
    size,
    title: "",
    pageUrl: requestHeaders.referer || details.initiator || "",
    requestHeaders: filterRequestHeaders(requestHeaders),
    detectedAt: Date.now()
  };
}

function shouldIgnore(extension, mimeType, size) {
  if (SEGMENT_EXTENSIONS.has(extension)) {
    return true;
  }

  if (NOISE_MIME_FRAGMENTS.some((part) => mimeType.includes(part))) {
    return true;
  }

  if (mimeType.includes("video/mp2t")) {
    return true;
  }

  if (!extension && mimeType.startsWith("video/") && size > 0 && size < MIN_DIRECT_VIDEO_SIZE) {
    return true;
  }

  return false;
}

function upsertMedia(tabId, candidate) {
  const existing = MEDIA_STORE.get(tabId) ?? [];
  const index = existing.findIndex((item) => item.url === candidate.url);
  if (index >= 0) {
    existing[index] = candidate;
  } else {
    existing.unshift(candidate);
  }

  existing.sort((left, right) => right.detectedAt - left.detectedAt);
  MEDIA_STORE.set(tabId, existing.slice(0, 100));
  updateBadge(tabId);
  persistStore().catch(() => {});
}

function getTabMedia(tabId) {
  return (MEDIA_STORE.get(tabId) ?? []).map((item) => ({ ...item }));
}

async function launchNativeDownload(tabId, itemId, platform) {
  const item = (MEDIA_STORE.get(tabId) ?? []).find((entry) => entry.id === itemId);
  if (!item) {
    throw new Error("未找到要发送的资源，请刷新页面后再试。");
  }

  const payload = {
    action: "launchDownload",
    item,
    options: {
      platform: normalizePlatformPreference(platform)
    }
  };

  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(HOST_NAME, payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Native host 不可用：${chrome.runtime.lastError.message}`));
        return;
      }

      if (!response?.ok) {
        reject(new Error(response?.error || "Native host 返回了未知错误。"));
        return;
      }

      resolve(response);
    });
  });
}

function normalizePlatformPreference(value) {
  return value === "windows" || value === "macos" ? value : "auto";
}

function updateBadge(tabId) {
  const count = (MEDIA_STORE.get(tabId) ?? []).length;
  chrome.action
    .setBadgeText({ tabId, text: count > 0 ? String(Math.min(count, 99)) : "" })
    .catch(() => {});
}

function toHeaderMap(headers) {
  const map = {};
  for (const header of headers ?? []) {
    if (!header?.name) {
      continue;
    }

    map[header.name.toLowerCase()] = header.value ?? "";
  }
  return map;
}

function filterRequestHeaders(headers) {
  const allowed = ["cookie", "referer", "origin", "user-agent", "authorization"];
  const result = {};
  for (const key of allowed) {
    if (headers[key]) {
      result[key] = headers[key];
    }
  }
  return result;
}

function getExtension(pathname) {
  const match = pathname.toLowerCase().match(/\.([a-z0-9]{2,8})$/);
  return match ? match[1] : "";
}

function normalizeMime(value) {
  return String(value || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function parseSize(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function sanitizeTitle(title) {
  return String(title || "video")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "video";
}

async function hydrateStore() {
  const saved = await STORAGE_AREA.get(STORAGE_KEY).catch(() => ({}));
  const rawStore = saved?.[STORAGE_KEY] ?? {};

  for (const [tabId, items] of Object.entries(rawStore)) {
    MEDIA_STORE.set(Number(tabId), Array.isArray(items) ? items : []);
  }
}

async function persistStore() {
  const serializable = Object.fromEntries(MEDIA_STORE.entries());
  await STORAGE_AREA.set({ [STORAGE_KEY]: serializable });
}
