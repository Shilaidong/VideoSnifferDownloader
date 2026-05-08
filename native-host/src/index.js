"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const HOST_NAME = "com.videosnifferdownloader.host";
const SUPPORTED_PLATFORMS = new Set(["windows", "macos"]);

if (process.env.VIDEO_SNIFFER_RUN_DOWNLOAD === "1") {
  const exitCode = runDownloadFromFile(process.env.VIDEO_SNIFFER_REQUEST_FILE);
  process.exit(exitCode);
}

let inputBuffer = Buffer.alloc(0);

process.stdin.on("data", (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
  consumeMessages();
});

process.stdin.on("error", () => {});

function consumeMessages() {
  while (inputBuffer.length >= 4) {
    const messageLength = inputBuffer.readUInt32LE(0);
    if (inputBuffer.length < 4 + messageLength) {
      return;
    }

    const rawMessage = inputBuffer.slice(4, 4 + messageLength).toString("utf8");
    inputBuffer = inputBuffer.slice(4 + messageLength);

    try {
      const message = JSON.parse(rawMessage);
      const response = dispatch(message);
      writeMessage({ ok: true, ...response });
      scheduleNativeHostExit();
    } catch (error) {
      writeMessage({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
      scheduleNativeHostExit();
    }
  }
}

function dispatch(message) {
  if (!message || typeof message !== "object") {
    throw new Error("Unsupported native host message.");
  }

  if (message.action === "getHostInfo") {
    return getHostInfo();
  }

  if (message.action === "launchDownload") {
    return launchDownload(message.item || {}, message.options || {});
  }

  throw new Error("Unsupported native host action.");
}

function getHostInfo() {
  const platform = getCurrentPlatform();
  return {
    hostName: HOST_NAME,
    platform,
    supportedPlatforms: Array.from(SUPPORTED_PLATFORMS),
    runtimeRoot: resolveRuntimeRoot()
  };
}

function launchDownload(item, options) {
  const currentPlatform = getCurrentPlatform();
  const requestedPlatform = normalizeRequestedPlatform(options.platform);

  if (!SUPPORTED_PLATFORMS.has(currentPlatform)) {
    throw new Error(`当前系统暂不支持：${process.platform}`);
  }

  if (requestedPlatform !== "auto" && requestedPlatform !== currentPlatform) {
    throw new Error(`当前安装的是 ${formatPlatformName(currentPlatform)} 宿主，不能使用 ${formatPlatformName(requestedPlatform)} 启动方式。`);
  }

  const runtimeRoot = resolveRuntimeRoot();
  const binDir = path.join(runtimeRoot, "bin");
  const hostDir = path.join(runtimeRoot, "native-host");
  const requestDir = path.join(hostDir, "requests");
  const debugLogPath = path.join(hostDir, "native-host.log");
  const binaries = getRuntimeBinaries(currentPlatform, binDir);

  ensureFileExists(binaries.nm3u8Path, `Native host missing ${path.relative(runtimeRoot, binaries.nm3u8Path)}`);
  ensureFileExists(binaries.ffmpegPath, `Native host missing ${path.relative(runtimeRoot, binaries.ffmpegPath)}`);

  fs.mkdirSync(requestDir, { recursive: true });

  const downloadsDir = path.join(os.homedir(), "Downloads");
  const tempDir = path.join(downloadsDir, "VideoSnifferDownloader-temp");
  fs.mkdirSync(downloadsDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  cleanupOldLaunchFiles(hostDir, requestDir);

  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const requestPath = path.join(requestDir, `request-${requestId}.json`);
  const launcherPath = currentPlatform === "windows" ? createLauncherPath(hostDir, requestId) : "";

  const payload = {
    hostName: HOST_NAME,
    platform: currentPlatform,
    url: item.url,
    pageUrl: item.pageUrl || "",
    saveName: sanitizeTitle(item.title || "video"),
    downloadsDir,
    tempDir,
    nm3u8Path: binaries.nm3u8Path,
    ffmpegPath: binaries.ffmpegPath,
    headers: filterHeaders(item.requestHeaders || {})
  };

  fs.writeFileSync(requestPath, JSON.stringify(payload, null, 2), "utf8");
  if (currentPlatform === "windows") {
    writeLauncher(launcherPath, requestPath, runtimeRoot);
  }
  appendDebugLog(debugLogPath, `launch request created: ${requestPath}`);

  const openResult = openLauncher(launcherPath, requestPath, runtimeRoot, hostDir, currentPlatform, payload, debugLogPath);
  appendDebugLog(debugLogPath, `opener exit=${openResult.status} error=${openResult.error ? openResult.error.message : ""}`);
  if (openResult.stdout) {
    appendDebugLog(debugLogPath, `opener stdout: ${openResult.stdout.trim()}`);
  }
  if (openResult.stderr) {
    appendDebugLog(debugLogPath, `opener stderr: ${openResult.stderr.trim()}`);
  }

  if (openResult.error) {
    throw openResult.error;
  }

  if (openResult.status !== 0) {
    throw new Error(openResult.stderr?.trim() || `Launcher exited with code ${openResult.status}`);
  }

  return {
    launched: true,
    platform: currentPlatform,
    requestPath,
    launcherPath: launcherPath || null,
    downloadsDir
  };
}

function runDownloadFromFile(requestPath) {
  if (!requestPath) {
    console.error("[Video Sniffer Downloader] Missing request file.");
    return 1;
  }

  const debugLogPath = path.join(path.dirname(path.dirname(requestPath)), "native-host.log");

  try {
    ensureFileExists(requestPath, `Request file not found: ${requestPath}`);
    const request = JSON.parse(fs.readFileSync(requestPath, "utf8").replace(/^\uFEFF/, ""));
    const args = buildDownloaderArgs(request);
    appendDebugLog(debugLogPath, `runner start url=${request.url}`);
    const result = spawnSync(request.nm3u8Path, args, {
      stdio: "inherit",
      windowsHide: false
    });

    const exitCode = typeof result.status === "number" ? result.status : 1;
    if (result.error) {
      appendDebugLog(debugLogPath, `runner error=${result.error.message}`);
      console.error(`[Video Sniffer Downloader] Failed to run N_m3u8DL-RE: ${result.error.message}`);
      return 1;
    }

    appendDebugLog(debugLogPath, `runner exit=${exitCode}`);
    if (exitCode !== 0) {
      console.log("");
      console.log(`[Video Sniffer Downloader] N_m3u8DL-RE exited with code ${exitCode}`);
    }

    return exitCode;
  } catch (error) {
    appendDebugLog(debugLogPath, `runner exception=${error instanceof Error ? error.message : String(error)}`);
    console.error(`[Video Sniffer Downloader] ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    fs.rmSync(requestPath, { force: true });
  }
}

function buildDownloaderArgs(request) {
  const args = [
    request.url,
    "--save-dir",
    request.downloadsDir,
    "--tmp-dir",
    request.tempDir,
    "--save-name",
    request.saveName,
    "--ffmpeg-binary-path",
    request.ffmpegPath,
    "--append-url-params",
    "--auto-select",
    "--concurrent-download",
    "--use-system-proxy",
    "--ui-language",
    "zh-CN"
  ];

  for (const [name, value] of Object.entries(request.headers || {})) {
    if (!String(value || "").trim()) {
      continue;
    }

    args.push("-H", `${name}: ${value}`);
  }

  return args;
}

function getCurrentPlatform() {
  if (process.platform === "win32") {
    return "windows";
  }

  if (process.platform === "darwin") {
    return "macos";
  }

  return process.platform;
}

function normalizeRequestedPlatform(value) {
  if (value === "windows" || value === "macos") {
    return value;
  }

  return "auto";
}

function formatPlatformName(platform) {
  if (platform === "windows") {
    return "Windows";
  }

  if (platform === "macos") {
    return "macOS";
  }

  return platform;
}

function getRuntimeBinaries(platform, binDir) {
  if (platform === "windows") {
    return {
      nm3u8Path: path.join(binDir, "N_m3u8DL-RE.exe"),
      ffmpegPath: path.join(binDir, "ffmpeg.exe")
    };
  }

  return {
    nm3u8Path: path.join(binDir, "N_m3u8DL-RE"),
    ffmpegPath: path.join(binDir, "ffmpeg")
  };
}

function createLauncherPath(hostDir, requestId) {
  return path.join(hostDir, `launch-${requestId}.cmd`);
}

function writeLauncher(launcherPath, requestPath, runtimeRoot) {
  const hostExe = process.execPath;

  fs.writeFileSync(
    launcherPath,
    [
      "@echo off",
      "setlocal",
      "chcp 65001>nul",
      `cd /d "${escapeForCmd(runtimeRoot)}"`,
      "set VIDEO_SNIFFER_RUN_DOWNLOAD=1",
      `set VIDEO_SNIFFER_REQUEST_FILE=${escapeForCmd(requestPath)}`,
      `"${escapeForCmd(hostExe)}"`,
      "set EXIT_CODE=%errorlevel%",
      `del /q "${escapeForCmd(requestPath)}" >nul 2>nul`,
      "echo.",
      "echo [Video Sniffer Downloader] Task finished. Exit code: %EXIT_CODE%",
      "endlocal"
    ].join("\r\n"),
    "utf8"
  );
}

function openLauncher(launcherPath, requestPath, runtimeRoot, hostDir, platform, payload, debugLogPath) {
  if (platform === "windows") {
    const openerScript = path.join(hostDir, "open-cmd-window.ps1");
    ensureFileExists(openerScript, "Native host missing runtime/native-host/open-cmd-window.ps1");
    return spawnSync(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        openerScript,
        launcherPath,
        hostDir
      ],
      {
        cwd: hostDir,
        windowsHide: false,
        encoding: "utf8"
      }
    );
  }

  return startMacDownload(requestPath, runtimeRoot, hostDir, payload, debugLogPath);
}

function startMacDownload(requestPath, runtimeRoot, hostDir, payload, debugLogPath) {
  const args = buildDownloaderArgs(payload);
  const command = [payload.nm3u8Path, ...args].map(shellQuoteArg).join(" ");
  const runnerScript = [
    "set -u",
    `REQUEST_PATH=${shellQuoteArg(requestPath)}`,
    `LOG_PATH=${shellQuoteArg(debugLogPath)}`,
    `cd ${shellQuoteArg(runtimeRoot)}`,
    "mkdir -p \"$(dirname \"$LOG_PATH\")\"",
    `printf '[%s] runner start url=%s\\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" ${shellQuoteArg(payload.url)} >> "$LOG_PATH"`,
    "if command -v script >/dev/null 2>&1; then",
    `  /usr/bin/script -qa "$LOG_PATH" /bin/bash -lc ${shellQuoteArg(command)} >/dev/null 2>&1`,
    "else",
    `  ${command} >> "$LOG_PATH" 2>&1`,
    "fi",
    "EXIT_CODE=$?",
    "printf '[%s] runner exit=%s\\n' \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\" \"$EXIT_CODE\" >> \"$LOG_PATH\"",
    "rm -f \"$REQUEST_PATH\"",
    "exit \"$EXIT_CODE\""
  ].join("\n");
  const logPath = path.join(hostDir, "native-host.log");
  const outFd = fs.openSync(logPath, "a");
  const errFd = fs.openSync(logPath, "a");

  try {
    const child = spawn("/bin/bash", ["-lc", runnerScript], {
      cwd: runtimeRoot,
      detached: true,
      env: process.env,
      stdio: ["ignore", outFd, errFd]
    });
    child.unref();
  } finally {
    fs.closeSync(outFd);
    fs.closeSync(errFd);
  }

  return {
    status: 0,
    stdout: "",
    stderr: ""
  };
}

function resolveRuntimeRoot() {
  const currentDir = path.dirname(process.execPath);
  return path.resolve(currentDir, "..");
}

function ensureFileExists(filePath, message) {
  if (!fs.existsSync(filePath)) {
    throw new Error(message);
  }
}

function filterHeaders(headers) {
  const allowed = ["referer", "origin", "user-agent", "cookie", "authorization"];
  const result = {};

  for (const key of allowed) {
    if (headers[key]) {
      result[key] = String(headers[key]);
    }
  }

  return result;
}

function cleanupOldLaunchFiles(hostDir, requestDir) {
  const maxAgeMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const dir of [hostDir, requestDir]) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !/^launch-|^request-/.test(entry.name)) {
        continue;
      }

      const filePath = path.join(dir, entry.name);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.rmSync(filePath, { force: true });
      }
    }
  }
}

function sanitizeTitle(value) {
  const cleaned = String(value || "video")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 180) || "video";
}

function escapeForCmd(value) {
  return String(value).replace(/"/g, '""');
}

function escapeForShell(value) {
  return String(value).replace(/(["\\$`])/g, "\\$1");
}

function shellQuoteArg(value) {
  const text = String(value ?? "");
  if (!text) {
    return "''";
  }

  return `'${text.replace(/'/g, "'\\''")}'`;
}

function escapeForAppleScript(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function appendDebugLog(logPath, line) {
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${line}\n`, "utf8");
}

function writeMessage(message) {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length, 0);
  process.stdout.write(header);
  process.stdout.write(payload);
}

function scheduleNativeHostExit() {
  setImmediate(() => process.exit(0));
}
