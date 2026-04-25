param()

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$hostDir = Join-Path $root "runtime\native-host"
$hostExe = Join-Path $hostDir "video-sniffer-host.exe"
$templatePath = Join-Path $root "native-host\native-host-manifest.template.json"
$manifestPath = Join-Path $hostDir "com.videosnifferdownloader.host.json"
$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.videosnifferdownloader.host"

if (-not (Test-Path -LiteralPath $hostExe)) {
  throw "Missing file: $hostExe"
}

if (-not (Test-Path -LiteralPath $templatePath)) {
  throw "Missing file: $templatePath"
}

$template = Get-Content -LiteralPath $templatePath -Raw -Encoding UTF8
$manifestContent = $template.Replace("__HOST_PATH__", ($hostExe.Replace("\", "\\")))

New-Item -ItemType Directory -Force -Path $hostDir | Out-Null
Set-Content -LiteralPath $manifestPath -Value $manifestContent -Encoding UTF8

New-Item -Path $registryPath -Force | Out-Null
Set-Item -Path $registryPath -Value $manifestPath

Write-Host ""
Write-Host "Video Sniffer Downloader installed."
Write-Host "Chrome extension path:"
Write-Host "$root\extension"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Open chrome://extensions/"
Write-Host "2. Enable developer mode"
Write-Host "3. Load unpacked extension from the path above"
Write-Host ""
Write-Host "If you move this folder later, run install.bat again."
