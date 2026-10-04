# Changelog

Alle nennenswerten Änderungen an diesem Projekt stehen in dieser Datei.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionsnummern folgen [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

### Hinzugefügt

- Start- und Stoppskripte für Windows: `start.bat` und `stop.bat` (Doppelklick) bzw. `start.ps1` und `stop.ps1`
  (PowerShell). Sie finden Python automatisch (`py` oder `python`) und schreiben Meldungen nach `server.log`.
  **Hinweis:** Mangels Windows-PC konnte das nicht getestet werden. Rückmeldungen gern als Issue.
- `.gitattributes` legt die Zeilenenden der Skripte fest (`.sh` LF, `.bat`/`.ps1` CRLF).

## [1.0.0] – 2026-10-04

### Hinzugefügt

- Leere Vorlage „Digitaler Nachlass“ (`daten/Digitaler-Nachlass.html`) mit Kapiteln zu Passwortmanager,
  E-Mail und Domains, Heimnetz, Server, Geräten, Konten, Finanzen und einem Anhang für IT-Helfer.
- Lokale Weboberfläche zum Bearbeiten im Browser: Textformate, Listen, Hinweiskästen, Tabellen,
  Ampel-Markierungen, Fotos, Rückgängig/Wiederholen.
- Speichern mit automatischer Versionssicherung in `daten/versionen/`.
- Export als Einzeldatei mit eingebetteten Fotos und Druckansicht.
- `start.sh` und `stop.sh` zum Starten und Stoppen im Hintergrund.
