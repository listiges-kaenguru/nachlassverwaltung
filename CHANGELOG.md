# Changelog

Alle nennenswerten Änderungen an diesem Projekt stehen in dieser Datei.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionsnummern folgen [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

## [1.1.2] – 2026-10-05

### Sicherheit

- Fotos und Editor-Dateien werden nur noch aus ihrem eigenen Ordner ausgeliefert, auch wenn dort symbolische Links liegen.

## [1.1.1] – 2026-10-05

### Behoben

- Der Editor lädt jetzt auch unter Windows zuverlässig, wenn dort Dateitypen falsch registriert sind.
- Ein gezielt präpariertes Dokument kann beim Speichern den Server nicht mehr lahmlegen.

### Sicherheit

- Die Auswahl „Absatz …“ im Editor akzeptiert nur noch die vorgesehenen Formate (normaler Text, Überschrift, Unterüberschrift).

## [1.1.0] – 2026-10-04

### Hinzugefügt

- `CHANGELOG.md`, `CONTRIBUTING.md` mit Beitragsregeln und eine Vorlage für Pull Requests.
- Automatische Prüfung (GitHub-Action) bei Pull Requests, ob `CHANGELOG.md` ergänzt wurde.
  Ausnahme per Label `kein-changelog`.
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

[Unveröffentlicht]: https://github.com/listiges-kaenguru/nachlassverwaltung/compare/v1.1.2...HEAD
[1.1.2]: https://github.com/listiges-kaenguru/nachlassverwaltung/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/listiges-kaenguru/nachlassverwaltung/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/listiges-kaenguru/nachlassverwaltung/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/listiges-kaenguru/nachlassverwaltung/releases/tag/v1.0.0
