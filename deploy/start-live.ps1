# Starts the LIVE demo: all services in Docker + one public https link (Cloudflare quick tunnel).
# Usage (PowerShell):  .\deploy\start-live.ps1          (add -NoBuild to skip rebuilding images)
# Your normal local setup (npm run dev, uvicorn) is not touched. Secrets are only copied into deploy\env\ (git-ignored).
param([switch]$NoBuild)

$ErrorActionPreference = 'Stop'
$deploy = $PSScriptRoot
$root   = Split-Path $deploy -Parent
$envDir = Join-Path $deploy 'env'
New-Item -ItemType Directory -Force $envDir | Out-Null
function Say($m) { Write-Host "[live] $m" -ForegroundColor Cyan }
function Fail($m) { Write-Host "[live] $m" -ForegroundColor Red; exit 1 }

# 1. Docker Desktop -------------------------------------------------------------------------
function Test-Docker { cmd /c "docker info >nul 2>&1"; return ($LASTEXITCODE -eq 0) }
if (-not (Test-Docker)) {
  Say 'Docker is not running. Starting Docker Desktop (can take 1-2 minutes)...'
  $dd = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (-not (Test-Path $dd)) { Fail 'Docker Desktop not found. Install it from docker.com and run this again.' }
  Start-Process $dd
  $t = 0
  while (-not (Test-Docker)) { Start-Sleep 5; $t += 5; if ($t -gt 240) { Fail 'Docker did not start in time. Open Docker Desktop manually, wait until it says "running", then run this again.' } }
}
Say 'Docker is running.'

# 2. cloudflared ----------------------------------------------------------------------------
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Say 'Installing cloudflared with winget...'
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements | Out-Null
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
  if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) { Fail 'cloudflared is installed but not on PATH yet. Close this window, open a new PowerShell and run again.' }
}

# 3. Database (the same Postgres container your local setup uses) ------------------------------
Say 'Starting Postgres (existing docker-compose.yml, service: postgres)...'
docker compose -f (Join-Path $root 'docker-compose.yml') up -d postgres | Out-Null
$t = 0
while ($true) {
  cmd /c "docker exec jobportal_postgres pg_isready >nul 2>&1"
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep 2; $t += 2; if ($t -gt 60) { Fail 'Postgres did not become ready.' }
}

# 4. Public link (Cloudflare quick tunnel -> Caddy on 8080) -----------------------------------
$pidFile = Join-Path $deploy 'tunnel.pid'
if (Test-Path $pidFile) { Stop-Process -Id ([int](Get-Content $pidFile)) -Force -ErrorAction SilentlyContinue; Remove-Item $pidFile -Force }
$log = Join-Path $deploy 'tunnel.log'
Remove-Item $log -Force -ErrorAction SilentlyContinue
Say 'Opening Cloudflare quick tunnel...'
$proc = Start-Process cloudflared -ArgumentList 'tunnel','--url','http://127.0.0.1:8080','--no-autoupdate' -RedirectStandardError $log -WindowStyle Hidden -PassThru
$proc.Id | Set-Content $pidFile
$publicUrl = $null
for ($i = 0; $i -lt 60 -and -not $publicUrl; $i++) {
  Start-Sleep 1
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($m) { $publicUrl = $m.Matches[0].Value }
  }
}
if (-not $publicUrl) { Fail "Could not get a tunnel URL. See $log" }
Say "Public link: $publicUrl"

# 5. Copy each service .env into deploy\env with Docker addresses --------------------------------
$names = @{ '3001'='auth-service'; '3002'='job-service'; '3003'='application-service'; '3004'='notification-service'; '8001'='ai-service'; '8002'='interview-service'; '8003'='ats-service' }
$sources = @{
  'auth-service'='backend\auth-service\.env'; 'job-service'='backend\job-service\.env';
  'application-service'='backend\application-service\.env'; 'notification-service'='backend\notification-service\.env';
  'ai-service'='backend\ai-service\.env'; 'interview-service'='backend\interview-service\.env'; 'ats-service'='backend\ats-service\.env'
}
$svcEval = [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $names[$m.Groups[1].Value] + ':' + $m.Groups[1].Value }
foreach ($svc in $sources.Keys) {
  $src = Join-Path $root $sources[$svc]
  if (-not (Test-Path $src)) { Fail "Missing $src" }
  $out = New-Object System.Collections.Generic.List[string]
  foreach ($line in (Get-Content $src -Encoding UTF8)) {
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') { continue }
    $key = $Matches[1]; $val = $Matches[2].Trim()
    if ($val.Length -ge 2 -and (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'")))) { $val = $val.Substring(1, $val.Length - 2) }
    $val = [regex]::Replace($val, '(?:localhost|127\.0\.0\.1):5432', 'jobportal_postgres:5432')
    $val = [regex]::Replace($val, '(?:localhost|127\.0\.0\.1):(3001|3002|3003|3004|8001|8002|8003)\b', $svcEval)
    if ($key -eq 'FRONTEND_URL') { $val = $publicUrl }
    $out.Add("$key=$val")
  }
  [IO.File]::WriteAllText((Join-Path $envDir "$svc.env"), (($out -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding $false))
}
Say 'Environment files ready (deploy\env).'

# 6. Build and start all services --------------------------------------------------------------
$args2 = @('compose','-f',(Join-Path $deploy 'docker-compose.live.yml'),'up','-d')
if (-not $NoBuild) { $args2 += '--build' }
Say 'Building and starting services (first time takes several minutes)...'
& docker @args2
if ($LASTEXITCODE -ne 0) { Fail 'docker compose failed. Scroll up for the error.' }

$publicUrl | Set-Content (Join-Path $deploy 'LIVE_URL.txt')
Write-Host ''
Write-Host "LIVE:  $publicUrl" -ForegroundColor Green
Write-Host 'First start needs ~1 minute after this for all services to be ready. Keep this laptop on and awake.'
Write-Host 'Stop everything with: .\deploy\stop-live.ps1'
