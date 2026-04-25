param()

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$hostDir = Join-Path $root "runtime\native-host"
$hostExe = Join-Path $hostDir "video-sniffer-host.exe"
$manifestTemplate = Join-Path $root "native-host\native-host-manifest.template.json"
$manifestOutput = Join-Path $hostDir "com.videosnifferdownloader.host.json"
$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.videosnifferdownloader.host"

if (-not (Test-Path -LiteralPath $hostExe)) {
  throw "Native host exe not found: $hostExe"
}

$template = Get-Content -LiteralPath $manifestTemplate -Raw -Encoding UTF8
$manifestContent = $template.Replace("__HOST_PATH__", ($hostExe.Replace("\", "\\")))

New-Item -ItemType Directory -Force -Path $hostDir | Out-Null
Set-Content -LiteralPath $manifestOutput -Value $manifestContent -Encoding UTF8

New-Item -Path $registryPath -Force | Out-Null
Set-Item -Path $registryPath -Value $manifestOutput

Write-Host "Native host registered:"
Write-Host "Manifest: $manifestOutput"
Write-Host "Registry: $registryPath"
