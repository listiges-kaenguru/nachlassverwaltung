# Startet die Nachlassverwaltung im Hintergrund und öffnet sie im Browser.
# Beenden mit stop.bat bzw. .\stop.ps1 – Protokoll in server.log.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$Port = if ($env:NACHLASS_PORT) { $env:NACHLASS_PORT } else { '8484' }
$Url = "http://127.0.0.1:$Port/"

# Läuft der in server.pid eingetragene Prozess noch und ist es unser server.py?
function Test-Laeuft {
    if (-not (Test-Path -LiteralPath 'server.pid')) { return $false }
    $id = "$(Get-Content -LiteralPath 'server.pid' -Raw)".Trim()
    if ($id -notmatch '^\d+$') { return $false }
    $p = Get-CimInstance Win32_Process -Filter "ProcessId = $id" -ErrorAction SilentlyContinue
    return [bool]($p -and $p.CommandLine -match 'server\.py')
}

# Python suchen: zuerst den Starter "py", sonst "python". Der Platzhalter aus dem
# Microsoft Store (öffnet nur den Store) liefert keine Versionsnummer und wird übersprungen.
function Get-Python {
    foreach ($kandidat in @('py -3', 'python')) {
        $teile = $kandidat -split ' '
        if (-not (Get-Command $teile[0] -ErrorAction SilentlyContinue)) { continue }
        try {
            $version = & $teile[0] @($teile[1..9] | Where-Object { $_ }) --version 2>&1
            if ($LASTEXITCODE -eq 0 -and "$version" -match 'Python 3') { return $kandidat }
        } catch { }
    }
    return $null
}

if (Test-Laeuft) {
    Write-Host "Nachlassverwaltung läuft bereits: $Url"
    Start-Process $Url
    exit 0
}

$Python = Get-Python
if (-not $Python) {
    Write-Host 'Python 3 wurde nicht gefunden. Bitte von https://www.python.org/downloads/ installieren'
    Write-Host '(beim Installieren "Add python.exe to PATH" anhaken) und danach erneut starten.'
    exit 1
}

# Über cmd starten, damit Ausgabe und Fehler gemeinsam an server.log angehängt werden.
Start-Process -FilePath 'cmd.exe' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden `
    -ArgumentList '/c', "$Python server.py --browser >> server.log 2>&1"

for ($i = 0; $i -lt 25 -and -not (Test-Laeuft); $i++) { Start-Sleep -Milliseconds 200 }

if (Test-Laeuft) {
    Write-Host "Nachlassverwaltung läuft: $Url"
    Write-Host 'Beenden mit stop.bat'
} else {
    Write-Host 'Start fehlgeschlagen. Letzte Meldungen aus server.log:'
    $log = if (Test-Path -LiteralPath 'server.log') { Get-Content -LiteralPath 'server.log' -Tail 3 } else { @() }
    $log | ForEach-Object { Write-Host $_ }
    if ($log -match '10048|already in use') {
        Write-Host ''
        Write-Host 'Der Port ist belegt – vermutlich läuft noch eine ältere Instanz.'
        Write-Host 'Erst stop.bat ausführen, dann start.bat erneut.'
    }
    exit 1
}
