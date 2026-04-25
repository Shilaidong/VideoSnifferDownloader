param()

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$hostOutputDir = Join-Path $root "runtime\native-host"
$hostOutputPath = Join-Path $hostOutputDir "video-sniffer-host.exe"

New-Item -ItemType Directory -Force -Path $hostOutputDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $hostOutputDir "requests") | Out-Null

Push-Location $root
try {
  npm install
  npx pkg ".\native-host\src\index.js" --targets "node18-win-x64" --output $hostOutputPath
  if ($LASTEXITCODE -ne 0) {
    throw "pkg failed with exit code $LASTEXITCODE"
  }
  Copy-Item -LiteralPath (Join-Path $root "native-host\run-download.ps1") -Destination (Join-Path $hostOutputDir "run-download.ps1") -Force
  Copy-Item -LiteralPath (Join-Path $root "native-host\open-cmd-window.ps1") -Destination (Join-Path $hostOutputDir "open-cmd-window.ps1") -Force
}
finally {
  Pop-Location
}

Write-Host "Native host built at $hostOutputPath"
