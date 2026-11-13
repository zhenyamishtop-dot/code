# Starts a free Cloudflare quick tunnel (public HTTPS for the mini app) and the Gogi Trade bot.
# The tunnel address changes on every start; the bot re-registers it as the menu button automatically.
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $PSScriptRoot
Set-Location $dir
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
New-Item -ItemType Directory -Force (Join-Path $dir 'data') | Out-Null
$log = Join-Path $dir 'data\tunnel.log'
Remove-Item $log -ErrorAction SilentlyContinue

$cf = $null
$exe = Join-Path $dir 'cloudflared.exe'
if (Test-Path $exe) {
  Write-Host 'Starting tunnel...'
  $cf = Start-Process -FilePath $exe -ArgumentList 'tunnel', '--no-autoupdate', '--url', 'http://localhost:8080' -RedirectStandardError $log -WindowStyle Hidden -PassThru
  $url = $null
  for ($i = 0; $i -lt 45 -and -not $url; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $log) {
      $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
      if ($m) { $url = $m.Matches[0].Value }
    }
  }
  if ($url) {
    $env:WEBAPP_URL = $url
    Write-Host "Mini app address: $url" -ForegroundColor Green
  } else {
    Write-Host 'Tunnel did not start. The bot will work without the mini app (use /add, /remove, /list).' -ForegroundColor Yellow
  }
}

try {
  node src/index.js
} finally {
  if ($cf) { Stop-Process -Id $cf.Id -Force -ErrorAction SilentlyContinue }
}
