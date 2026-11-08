param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
New-Item -ItemType Directory -Path (Join-Path $projectPath 'logs') -Force | Out-Null
try { $health = Invoke-RestMethod 'http://127.0.0.1:8765/health' -TimeoutSec 2 } catch { $health = $null }
if (-not $health) {
 $nodePath = (Get-Command node.exe).Source
 Start-Process -FilePath $nodePath -ArgumentList 'api/server.mjs' -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectPath 'logs\server.log') -RedirectStandardError (Join-Path $projectPath 'logs\server-error.log')
 for ($i=0;$i -lt 20;$i++) { Start-Sleep -Milliseconds 300; try { $health = Invoke-RestMethod 'http://127.0.0.1:8765/health' -TimeoutSec 1; break } catch {} }
}
if (-not $health.simulation) { throw 'The learning API did not start, or port 8765 belongs to another application.' }
Write-Host 'Local APIs ready at http://127.0.0.1:8765'
if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:8765' }
