param()

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

& (Join-Path $PSScriptRoot "download-runtime.ps1")
& (Join-Path $PSScriptRoot "build-host.ps1")
& (Join-Path $PSScriptRoot "register-native-host.ps1")

Write-Host ""
Write-Host "All done."
Write-Host "1. Open chrome://extensions/"
Write-Host "2. Enable developer mode"
Write-Host "3. Load unpacked extension from: $($root)\extension"
