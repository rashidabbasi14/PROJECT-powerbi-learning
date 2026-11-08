param()
$projectPath = $PSScriptRoot
$apiScript = Join-Path $projectPath 'api\server.mjs'
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like ('*' + $apiScript + '*') -or ($_.CommandLine -match 'api/server.mjs' -and $_.ExecutablePath -eq (Get-Command node.exe).Source) } | ForEach-Object { Write-Host ('API process: ' + $_.ProcessId + '. Stop only the process launched for this workspace.') }
