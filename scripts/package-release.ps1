param(
  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $root "package.json"
$packageJson = Get-Content -LiteralPath $packageJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $packageJson.version

$binDir = Join-Path $root "runtime\bin"
$hostDir = Join-Path $root "runtime\native-host"
$hostExe = Join-Path $hostDir "video-sniffer-host.exe"
$nm3u8Exe = Join-Path $binDir "N_m3u8DL-RE.exe"
$ffmpegExe = Join-Path $binDir "ffmpeg.exe"

if ($Rebuild -or -not (Test-Path -LiteralPath $nm3u8Exe) -or -not (Test-Path -LiteralPath $ffmpegExe)) {
  & (Join-Path $PSScriptRoot "download-runtime.ps1")
}

if ($Rebuild -or -not (Test-Path -LiteralPath $hostExe)) {
  & (Join-Path $PSScriptRoot "build-host.ps1")
}

$distDir = Join-Path $root "dist"
$releaseName = "VideoSnifferDownloader-v$version-windows-x64-portable"
$stageDir = Join-Path $distDir $releaseName
$zipPath = Join-Path $distDir "$releaseName.zip"

if (Test-Path -LiteralPath $stageDir) {
  Remove-Item -LiteralPath $stageDir -Recurse -Force
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Force -Path $stageDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stageDir "extension") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stageDir "native-host") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stageDir "runtime\bin") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stageDir "runtime\native-host") | Out-Null

Copy-Item -LiteralPath (Join-Path $root "README.md") -Destination (Join-Path $stageDir "README.md") -Force
Copy-Item -LiteralPath (Join-Path $root "LICENSE") -Destination (Join-Path $stageDir "LICENSE") -Force
Copy-Item -LiteralPath (Join-Path $root "THIRD_PARTY_NOTICES.md") -Destination (Join-Path $stageDir "THIRD_PARTY_NOTICES.md") -Force
Copy-Item -LiteralPath (Join-Path $root "release-assets\install.ps1") -Destination (Join-Path $stageDir "install.ps1") -Force
Copy-Item -LiteralPath (Join-Path $root "release-assets\install.bat") -Destination (Join-Path $stageDir "install.bat") -Force
Copy-Item -LiteralPath (Join-Path $root "native-host\native-host-manifest.template.json") -Destination (Join-Path $stageDir "native-host\native-host-manifest.template.json") -Force
Copy-Item -LiteralPath (Join-Path $root "runtime\native-host\video-sniffer-host.exe") -Destination (Join-Path $stageDir "runtime\native-host\video-sniffer-host.exe") -Force
Copy-Item -LiteralPath (Join-Path $root "runtime\native-host\run-download.ps1") -Destination (Join-Path $stageDir "runtime\native-host\run-download.ps1") -Force
Copy-Item -LiteralPath (Join-Path $root "runtime\native-host\open-cmd-window.ps1") -Destination (Join-Path $stageDir "runtime\native-host\open-cmd-window.ps1") -Force
Copy-Item -Path (Join-Path $root "extension\*") -Destination (Join-Path $stageDir "extension") -Recurse -Force
Copy-Item -Path (Join-Path $root "runtime\bin\*") -Destination (Join-Path $stageDir "runtime\bin") -Recurse -Force

Compress-Archive -LiteralPath $stageDir -DestinationPath $zipPath -Force

Write-Host "Release folder: $stageDir"
Write-Host "Release zip: $zipPath"
