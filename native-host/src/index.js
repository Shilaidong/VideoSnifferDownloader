"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const HOST_NAME = "com.videosnifferdownloader.host";

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
    } catch (error) {
      writeMessage({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

function dispatch(message) {
  if (!message || message.action !== "launchDownload") {
    throw new Error("Unsupported native host action.");
  }

  return launchDownload(message.item || {});
}

function launchDownload(item) {
  const runtimeRoot = resolveRuntimeRoot();
  const binDir = path.join(runtimeRoot, "bin");
  const hostDir = path.join(runtimeRoot, "native-host");
  const requestDir = path.join(hostDir, "requests");
  const runnerScript = path.join(hostDir, "run-download.ps1");
  const openerScript = path.join(hostDir, "open-cmd-window.ps1");
  const debugLogPath = path.join(hostDir, "native-host.log");

  ensureFileExists(path.join(binDir, "N_m3u8DL-RE.exe"), "Native host missing runtime/bin/N_m3u8DL-RE.exe");
  ensureFileExists(path.join(binDir, "ffmpeg.exe"), "Native host missing runtime/bin/ffmpeg.exe");
  ensureFileExists(runnerScript, "Native host missing runtime/native-host/run-download.ps1");
  ensureFileExists(openerScript, "Native host missing runtime/native-host/open-cmd-window.ps1");

  fs.mkdirSync(requestDir, { recursive: true });

  const downloadsDir = path.join(os.homedir(), "Downloads");
  const tempDir = path.join(downloadsDir, "VideoSnifferDownloader-temp");
  fs.mkdirSync(downloadsDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const requestPath = path.join(requestDir, `request-${requestId}.json`);
  const launcherPath = path.join(hostDir, `launch-${requestId}.cmd`);

  const payload = {
    hostName: HOST_NAME,
    url: item.url,
    pageUrl: item.pageUrl || "",
    saveName: sanitizeTitle(item.title || "video"),
    downloadsDir,
    tempDir,
    nm3u8Path: path.join(binDir, "N_m3u8DL-RE.exe"),
    ffmpegPath: path.join(binDir, "ffmpeg.exe"),
    headers: filterHeaders(item.requestHeaders || {})
  };

  fs.writeFileSync(requestPath, `\uFEFF${JSON.stringify(payload, null, 2)}`, "utf8");
  fs.writeFileSync(
    launcherPath,
    [
      "@echo off",
      "setlocal",
      "chcp 65001>nul",
      `cd /d "${escapeForCmd(runtimeRoot)}"`,
      `powershell.exe -NoLogo -ExecutionPolicy Bypass -File "${escapeForCmd(runnerScript)}" "${escapeForCmd(requestPath)}"`,
      "echo.",
      "echo [Video Sniffer Downloader] Task finished. Exit code: %errorlevel%",
      "endlocal"
    ].join("\r\n"),
    "utf8"
  );
  appendDebugLog(debugLogPath, `launch request created: ${requestPath}`);

  const openResult = spawnSync(
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
    throw new Error(openResult.stderr?.trim() || `open-cmd-window.ps1 exited with code ${openResult.status}`);
  }

  return {
    launched: true,
    requestPath,
    launcherPath,
    downloadsDir
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
