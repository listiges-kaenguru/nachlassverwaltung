@echo off
rem Startet die Nachlassverwaltung per Doppelklick.
rem Ruft start.ps1 auf, ohne die PowerShell-Ausfuehrungsrichtlinie (ExecutionPolicy) zu aendern.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
if errorlevel 1 pause
