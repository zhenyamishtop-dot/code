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
if (-not (Test-Path $envFile)) {
  Write-Host ''
  Write-Host 'Paste the bot token (chat with @BotFather, message about gogi_trade_bot):' -ForegroundColor Cyan
  $bot = (Read-Host 'BOT_TOKEN').Trim()
  Write-Host 'Paste the Gift Satellite API key (Gift Satellite -> Profile -> API access):' -ForegroundColor Cyan
  $sat = (Read-Host 'SATELLITE_TOKEN').Trim()
  $lines = @("BOT_TOKEN=$bot", "SATELLITE_TOKEN=$sat", 'WEBAPP_URL=', 'PORT=8080', 'OWNER_ID=', 'FRESH_WINDOW_SEC=600', 'DATA_DIR=./data')
  [IO.File]::WriteAllLines($envFile, $lines)
} else {
  Write-Host '.env already exists, keeping it.'
}

# 5. Desktop shortcut
$bat = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Gogi Trade.bat'
$batLines = @('@echo off', 'chcp 65001 >nul', 'title Gogi Trade', "powershell -NoProfile -ExecutionPolicy Bypass -File `"$target\windows\run.ps1`"", 'pause')
[IO.File]::WriteAllLines($bat, $batLines)

Write-Host ''
Write-Host "Done. Installed to $target" -ForegroundColor Green
Write-Host 'Start the bot with the "Gogi Trade" shortcut on the Desktop. Keep its window open while the bot should work.' -ForegroundColor Green
