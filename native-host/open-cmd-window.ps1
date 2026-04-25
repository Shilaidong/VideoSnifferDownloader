param(
  [Parameter(Mandatory = $true)]
  [string]$LauncherPath,
  [Parameter(Mandatory = $true)]
  [string]$HostDir
)

$ErrorActionPreference = "Stop"

$logPath = Join-Path $HostDir "launcher.log"
Add-Content -LiteralPath $logPath -Value ("[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] starting cmd with launcher: " + $LauncherPath)
$shell = New-Object -ComObject WScript.Shell
$command = 'cmd.exe /k call ""' + $LauncherPath + '""'
$shell.CurrentDirectory = $HostDir
$shell.Run($command, 1, $false) | Out-Null
