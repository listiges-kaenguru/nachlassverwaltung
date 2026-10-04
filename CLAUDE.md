# CLAUDE.md

Hinweise für Claude Code (und andere Mitwirkende) zur Arbeit in diesem Repository.

## Worum es geht

Lokale Weboberfläche zum Ausfüllen und Pflegen einer Mappe „Digitaler Nachlass“. Zielgruppe der
Mappe sind Angehörige ohne IT-Kenntnisse; Zielgruppe der Software ist die Person, die die Mappe
schreibt. Das Dokument `daten/Digitaler-Nachlass.html` ist eine **leere Vorlage** mit Platzhaltern.

## Aufbau

| Datei | Rolle |
|-------|-------|
| `server.py` | Webserver, nur Python-Standardbibliothek (`http.server`). Liefert das Dokument aus, speichert, nimmt Fotos an, exportiert eine Einzeldatei. |
| `editor/editor.js`, `editor/editor.css` | Bearbeitungsoberfläche (Vanilla-JS, kein Build, keine Abhängigkeiten). |
| `daten/Digitaler-Nachlass.html` | Das Dokument. Eigenständiges HTML mit eigenem CSS/JS, muss auch ohne Server lesbar und druckbar sein. |
| `start.sh`, `stop.sh` | POSIX-sh-Skripte zum Starten/Stoppen im Hintergrund (`server.pid`, `server.log`). |
| `start.ps1`, `stop.ps1` | Gegenstücke für Windows (PowerShell 5.1 und 7). `start.bat`/`stop.bat` rufen sie per Doppelklick auf. |

Ablauf:
1. `GET /` liest das Dokument und fügt vor `</head>` die Editor-Dateien ein (`<link/script data-editor>`).
2. Der Editor macht `<main>` bearbeitbar. Alles, was er selbst einfügt, trägt `data-editor` oder Klassen mit
   Präfix `ne-` und wird vor dem Speichern entfernt (`saeubern()`, `bereinigtesHtml()`).
3. `POST /api/speichern` übernimmt **nur** den `<main>`-Bereich in die Datei auf der Platte; Kopf, Styles und
   Skripte des Dokuments bleiben unverändert. Vorher wird der alte Stand nach `daten/versionen/` kopiert.
4. `POST /api/foto` speichert Bilder (JPG/PNG/WebP, Signatur geprüft) unter `daten/bilder/`.
5. `GET /api/export` liefert das Dokument mit base64-eingebetteten Fotos als Download.

## Regeln

- **Keine Abhängigkeiten.** Kein pip, kein npm, kein Build-Schritt, keine CDNs. Nur Python 3 und ein Browser.
- **Deutsch** für Bezeichner, Kommentare, Meldungen und Doku (z. B. `version_sichern`, `fotobereich`).
  Bestehende Benennung beibehalten.
- **Sicherheitsprüfungen nicht aufweichen:** Host-Allowlist (DNS-Rebinding), Pflicht-Header `X-Nachlass: 1`
  und Origin-Prüfung bei POST (CSRF), Dateinamen-Regex gegen Pfad-Traversal, Größenlimits, Bindung an `127.0.0.1`.
- **Editor-Bestandteile dürfen nie im gespeicherten Dokument landen.** Neue UI-Elemente immer mit `data-editor`
  oder `ne-`-Klasse versehen; der Server lehnt Dokumente mit `data-editor` ab.
- **Das Dokument bleibt eigenständig:** Druckansicht (`@media print`, Klasse `no-print`) und Lesbarkeit ohne Server
  erhalten. Kapitel-IDs (`k1`, `k4-3`, `ka` …) werden für Links und Seitenleiste genutzt – nicht umbenennen.
- **Platzhalter** sind `<span class="fill">…</span>` (gelb). Offene Hinweise sind die gelben Kästen mit „erledigt ✓“.
- Änderungen an Bedienung oder Dateien auch in `README.md` nachziehen.
- **Start/Stopp-Skripte gemeinsam pflegen:** Änderungen an `start.sh`/`stop.sh` auch in `start.ps1`/`stop.ps1`
  nachziehen und umgekehrt. `.ps1` als UTF-8 **mit BOM** und CRLF speichern (sonst zeigt Windows PowerShell 5.1
  Umlaute falsch an), `.bat` nur ASCII. Zeilenenden regelt `.gitattributes`.
- **Jede für Nutzende sichtbare Änderung in `CHANGELOG.md` eintragen**, und zwar im selben Commit unter
  `## [Unveröffentlicht]` im passenden Unterabschnitt (`Hinzugefügt`, `Geändert`, `Behoben` …), ein Satz aus
  Nutzersicht. Ausnahmen (Tippfehler, Formatierung, CI) und das Vorgehen bei Releases: `CONTRIBUTING.md`.
  Eine GitHub-Action prüft das bei Pull Requests (Ausnahme per Label `kein-changelog`).

## Datenschutz – wichtig

Dieses Repository ist öffentlich. **Keine echten Namen, Adressen, Domains, E-Mail-Adressen, IP-Adressen,
Seriennummern oder Fotos committen.** In der Vorlage nur neutrale Beispiele verwenden
(`beispiel.de`, `name@beispiel-familie.de`, `192.168.178.x`). `daten/bilder/` und `daten/versionen/` sind
per `.gitignore` ausgeschlossen. Vor jedem Commit von `daten/Digitaler-Nachlass.html` den Diff auf persönliche
Angaben prüfen.

## Testen

Es gibt keine automatisierten Tests. Manuell prüfen:

```sh
python3 -m py_compile server.py          # Syntax
NACHLASS_PORT=8485 python3 server.py     # Vordergrund, eigener Port, Strg+C beendet
```

Dann im Browser `http://127.0.0.1:8485/` öffnen: Text ändern, Foto hinzufügen, speichern (`Strg+S`),
neu laden, „Einzeldatei“ und „Drucken“ ausprobieren. Testdaten danach wieder verwerfen
(`git checkout daten/Digitaler-Nachlass.html`), damit die Vorlage leer bleibt.
