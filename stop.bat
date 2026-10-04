@echo off
rem Stoppt die Nachlassverwaltung per Doppelklick.
rem Ruft stop.ps1 auf, ohne die PowerShell-Ausfuehrungsrichtlinie (ExecutionPolicy) zu aendern.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1" %*
if errorlevel 1 pause
