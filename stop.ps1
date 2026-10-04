# Stoppt die Nachlassverwaltung.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$Port = if ($env:NACHLASS_PORT) { $env:NACHLASS_PORT } else { '8484' }

if (Test-Path -LiteralPath 'server.pid') {
    $id = "$(Get-Content -LiteralPath 'server.pid' -Raw)".Trim()
    $p = if ($id -match '^\d+$') {
        Get-CimInstance Win32_Process -Filter "ProcessId = $id" -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath 'server.pid' -Force
    # Nur beenden, wenn der Prozess wirklich server.py ausführt (die PID könnte inzwischen
    # an ein anderes Programm vergeben sein).
    if ($p -and $p.CommandLine -match 'server\.py') {
        Stop-Process -Id $p.ProcessId -Force
        Write-Host 'Nachlassverwaltung gestoppt.'
        exit 0
    }
    Write-Host 'Veraltete server.pid wurde entfernt.'
}

Write-Host 'Die Nachlassverwaltung läuft nicht.'
$belegt = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($belegt) {
    Write-Host "Port $Port ist aber von einem anderen Programm belegt:"
    $belegt | ForEach-Object {
        $prozess = Get-CimInstance Win32_Process -Filter "ProcessId = $($_.OwningProcess)" -ErrorAction SilentlyContinue
        Write-Host "  PID $($_.OwningProcess): $($prozess.CommandLine)"
    }
    Write-Host 'Läuft dort noch eine ältere Nachlassverwaltung, diesen Prozess im Task-Manager beenden.'
    Write-Host 'Sonst einen anderen Port nutzen: set NACHLASS_PORT=8485 und dann start.bat'
}
