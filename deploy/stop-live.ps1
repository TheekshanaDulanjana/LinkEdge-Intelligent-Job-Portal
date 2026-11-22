# Stops the live demo (containers + tunnel). Your database and uploads are kept.
$deploy = $PSScriptRoot
$pidFile = Join-Path $deploy 'tunnel.pid'
if (Test-Path $pidFile) { Stop-Process -Id ([int](Get-Content $pidFile)) -Force -ErrorAction SilentlyContinue; Remove-Item $pidFile -Force }
docker compose -f (Join-Path $deploy 'docker-compose.live.yml') down
Write-Host 'Live demo stopped. (Postgres from the normal docker-compose.yml is left running.)'
