param(
  [Parameter(Mandatory = $true)]
  [string]$RequestFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $RequestFile)) {
  throw "Request file not found: $RequestFile"
}

$request = Get-Content -LiteralPath $RequestFile -Raw -Encoding UTF8 | ConvertFrom-Json

$args = @(
  $request.url,
  "--save-dir", $request.downloadsDir,
  "--tmp-dir", $request.tempDir,
  "--save-name", $request.saveName,
  "--ffmpeg-binary-path", $request.ffmpegPath,
  "--append-url-params",
  "--auto-select",
  "--concurrent-download",
  "--use-system-proxy",
  "--ui-language", "zh-CN"
)

foreach ($property in $request.headers.PSObject.Properties) {
  if ([string]::IsNullOrWhiteSpace($property.Value)) {
    continue
  }

  $args += "-H"
  $args += "$($property.Name): $($property.Value)"
}

& $request.nm3u8Path @args
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  Write-Host ""
  Write-Host "[Video Sniffer Downloader] N_m3u8DL-RE exited with code $exitCode" -ForegroundColor Yellow
}

exit $exitCode
