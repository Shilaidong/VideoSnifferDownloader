param()

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$root = Split-Path -Parent $PSScriptRoot
$binDir = Join-Path $root "runtime\bin"
$cacheDir = Join-Path $root ".tmp\downloads"

New-Item -ItemType Directory -Force -Path $binDir | Out-Null
New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

function Get-GitHubLatestReleasePage {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Repository
  )

  return Invoke-WebRequest -Uri "https://github.com/$Repository/releases/latest" -Headers @{ "User-Agent" = "Codex" }
}

function Get-AssetUrlFromPage {
  param(
    [Parameter(Mandatory = $true)]
    $Page,
    [Parameter(Mandatory = $true)]
    [string]$Pattern
  )

  $asset = $Page.Links | Where-Object { $_.href -match $Pattern } | Select-Object -First 1
  if (-not $asset -or -not $asset.href) {
    throw "Unable to find asset matching pattern: $Pattern"
  }

  if ($asset.href.StartsWith("http")) {
    return $asset.href
  }

  return "https://github.com$($asset.href)"
}

function Expand-ToTemp {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ArchivePath,
    [Parameter(Mandatory = $true)]
    [string]$Destination
  )

  if (Test-Path $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }

  Expand-Archive -LiteralPath $ArchivePath -DestinationPath $Destination -Force
}

$nmReleasePage = Get-GitHubLatestReleasePage -Repository "nilaoda/N_m3u8DL-RE"
$nmUrl = Get-AssetUrlFromPage -Page $nmReleasePage -Pattern "win-x64.*\.zip$"
$nmArchive = Join-Path $cacheDir "N_m3u8DL-RE-win-x64.zip"
$nmExtract = Join-Path $cacheDir "N_m3u8DL-RE"

Invoke-WebRequest -Uri $nmUrl -Headers @{ "User-Agent" = "Codex" } -OutFile $nmArchive
Expand-ToTemp -ArchivePath $nmArchive -Destination $nmExtract

Get-ChildItem -LiteralPath $nmExtract -Recurse -File | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $binDir $_.Name) -Force
}

$ffmpegUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip"
$ffmpegArchive = Join-Path $cacheDir "ffmpeg-win64.zip"
$ffmpegExtract = Join-Path $cacheDir "ffmpeg"

Invoke-WebRequest -Uri $ffmpegUrl -Headers @{ "User-Agent" = "Codex" } -OutFile $ffmpegArchive
Expand-ToTemp -ArchivePath $ffmpegArchive -Destination $ffmpegExtract

$ffmpegExe = Get-ChildItem -LiteralPath $ffmpegExtract -Recurse -File -Filter "ffmpeg.exe" | Select-Object -First 1
$ffprobeExe = Get-ChildItem -LiteralPath $ffmpegExtract -Recurse -File -Filter "ffprobe.exe" | Select-Object -First 1

if (-not $ffmpegExe) {
  throw "ffmpeg.exe not found in downloaded archive."
}

Copy-Item -LiteralPath $ffmpegExe.FullName -Destination (Join-Path $binDir "ffmpeg.exe") -Force
if ($ffprobeExe) {
  Copy-Item -LiteralPath $ffprobeExe.FullName -Destination (Join-Path $binDir "ffprobe.exe") -Force
}

Write-Host "Runtime binaries downloaded into $binDir"
