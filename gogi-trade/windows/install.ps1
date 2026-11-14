# Gogi Trade installer for Windows. Run in PowerShell:
#   irm https://raw.githubusercontent.com/zhenyamishtop-dot/code/claude/casemint-model-gifts/gogi-trade/windows/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$branch = 'claude/casemint-model-gifts'
$target = Join-Path $env:USERPROFILE 'GogiTrade'

function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

Write-Host '== Gogi Trade: install ==' -ForegroundColor Cyan

# 1. Node.js
Refresh-Path
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js not found, installing (winget)...'
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host 'winget is not available. Install Node.js LTS from https://nodejs.org and run this command again.' -ForegroundColor Yellow
    return
  }
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  Refresh-Path
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js was installed. Close this window, open PowerShell again and repeat the command.' -ForegroundColor Yellow
    return
  }
}
Write-Host ('Node.js ' + (node -v))

# 2. Download the app
$tmp = Join-Path $env:TEMP ('gogi-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $tmp | Out-Null
$zip = Join-Path $tmp 'code.zip'
Write-Host 'Downloading Gogi Trade...'
Invoke-WebRequest -UseBasicParsing "https://github.com/zhenyamishtop-dot/code/archive/refs/heads/$branch.zip" -OutFile $zip
Expand-Archive -Path $zip -DestinationPath $tmp -Force
$src = Get-ChildItem -Path $tmp -Directory | ForEach-Object { Join-Path $_.FullName 'gogi-trade' } | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $src) { throw 'gogi-trade folder not found in the archive' }
New-Item -ItemType Directory -Force $target | Out-Null
# keep existing .env and data on update
Copy-Item -Path (Join-Path $src '*') -Destination $target -Recurse -Force
Remove-Item $tmp -Recurse -Force

# 3. Tunnel binary (gives the mini app a public HTTPS address)
$cf = Join-Path $target 'cloudflared.exe'
if (-not (Test-Path $cf)) {
  Write-Host 'Downloading cloudflared...'
  Invoke-WebRequest -UseBasicParsing 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cf
}

# 4. Secrets -> .env (stored only on this computer)
$envFile = Join-Path $target '.env'

function Read-SatelliteKeys {
  Write-Host 'Paste Gift Satellite API keys (Profile -> API access), one per line.' -ForegroundColor Cyan
  Write-Host 'Each key polls its own share of collections. Press Enter on an empty line to finish.' -ForegroundColor Cyan
  $keys = @()
  while ($true) {
    $k = (Read-Host ('Key ' + ($keys.Count + 1))).Trim()
    if (-not $k) { if ($keys.Count) { break } else { continue } }
    if ($k -notmatch '^[A-Za-z0-9]{20,}$') { Write-Host 'This does not look like a key, try again.' -ForegroundColor Yellow; continue }
    if ($keys -contains $k) { Write-Host 'Already added.' -ForegroundColor Yellow; continue }
    $keys += $k
  }
  return ($keys -join ',')
}

if (-not (Test-Path $envFile)) {
  Write-Host ''
  Write-Host 'Paste the bot token (chat with @BotFather, message about gogi_trade_bot):' -ForegroundColor Cyan
  $bot = (Read-Host 'BOT_TOKEN').Trim()
  $sat = Read-SatelliteKeys
  $lines = @("BOT_TOKEN=$bot", "SATELLITE_TOKENS=$sat", 'WEBAPP_URL=', 'PORT=8080', 'OWNER_ID=', 'FRESH_WINDOW_SEC=600', 'DATA_DIR=./data')
  [IO.File]::WriteAllLines($envFile, $lines)
} else {
  Write-Host '.env already exists, keeping the bot token.'
  $old = Get-Content $envFile
  $current = ($old | Where-Object { $_ -match '^SATELLITE_TOKENS?=' } | ForEach-Object { ($_ -split '=', 2)[1] }) -join ',' -split '[,; ]+' | Where-Object { $_ }
  Write-Host ('Gift Satellite keys now: ' + @($current).Count) -ForegroundColor Cyan
  $ans = (Read-Host 'Replace the keys? (y/N)').Trim()
  if ($ans -match '^(y|yes|д|да)$') {
    $sat = Read-SatelliteKeys
    $kept = $old | Where-Object { $_ -notmatch '^SATELLITE_TOKENS?=' }
    [IO.File]::WriteAllLines($envFile, @($kept) + "SATELLITE_TOKENS=$sat")
    Write-Host 'Keys saved.' -ForegroundColor Green
  }
}

# 5. Desktop shortcut
$bat = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Gogi Trade.bat'
$batLines = @('@echo off', 'chcp 65001 >nul', 'title Gogi Trade', "powershell -NoProfile -ExecutionPolicy Bypass -File `"$target\windows\run.ps1`"", 'pause')
[IO.File]::WriteAllLines($bat, $batLines)

Write-Host ''
Write-Host "Done. Installed to $target" -ForegroundColor Green
Write-Host 'Start the bot with the "Gogi Trade" shortcut on the Desktop. Keep its window open while the bot should work.' -ForegroundColor Green
