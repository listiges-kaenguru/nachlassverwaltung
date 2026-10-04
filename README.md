# Nachlassverwaltung – Vorlage „Digitaler Nachlass“

Eine Mappe für die Angehörigen: Was muss nach meinem Tod oder im Notfall mit Passwortmanager,
E-Mail, Domains, Heimnetz, Server, Geräten, Konten und Abos passieren? Geschrieben für Menschen
ohne IT-Kenntnisse, mit Schritt-für-Schritt-Anleitungen, Checklisten und einem Anhang für IT-Helfer.

Dazu gehört eine kleine lokale Weboberfläche, mit der sich die Mappe direkt im Browser ausfüllen,
mit Fotos ergänzen, drucken und als Einzeldatei weitergeben lässt.

Das Dokument in `daten/` ist eine **leere Vorlage**: Gelb hinterlegte Felder und Beispieltexte durch
eigene Angaben ersetzen, nicht zutreffende Abschnitte löschen.

## Voraussetzungen

- Python 3.8 oder neuer, **keine Zusatzpakete**
- Ein aktueller Browser (Firefox, Chrome, Edge, Safari)
- **Linux:** `start.sh` / `stop.sh`
- **Windows:** `start.bat` / `stop.bat` (Doppelklick genügt). Python von [python.org](https://www.python.org/downloads/)
  installieren und dabei „Add python.exe to PATH“ anhaken. *Noch nicht auf einem echten Windows-PC getestet –
  Rückmeldungen sind willkommen.*
- **macOS:** Server direkt starten mit `python3 server.py --browser`, beenden mit `Strg+C`.

## Einrichten

```sh
git clone https://github.com/listiges-kaenguru/nachlassverwaltung.git
cd nachlassverwaltung
./start.sh
```

Oder auf GitHub über **Code → Download ZIP** herunterladen und entpacken.

> **Achtung – deine ausgefüllte Mappe gehört nicht auf GitHub.**
> Sie enthält Namen, Adressen, Domains, Gerätedaten und Hinweise auf Zugänge. Die Vorlage daher
> **nicht forken** (Forks öffentlicher Repositories sind öffentlich) und den ausgefüllten Stand nicht
> in ein öffentliches Repository pushen. Am einfachsten: ZIP herunterladen oder nach dem Klonen den
> Ordner `.git` löschen. Fotos (`daten/bilder/`) und Versionen (`daten/versionen/`) sind zwar per
> `.gitignore` ausgeschlossen, das Dokument selbst aber nicht.

## Starten und Stoppen

```sh
./start.sh   # startet im Hintergrund und öffnet http://127.0.0.1:8484/ im Browser
./stop.sh    # beendet den Server
```

Unter Windows stattdessen `start.bat` und `stop.bat` doppelklicken (oder in PowerShell `.\start.ps1` / `.\stop.ps1`).

Läuft der Server schon, öffnet das Startskript nur den Browser. Meldungen landen in `server.log`.
Im Vordergrund (Beenden mit `Strg+C`): `python3 server.py`. Anderer Port: `NACHLASS_PORT=8485 ./start.sh`
(Windows-Eingabeaufforderung: `set NACHLASS_PORT=8485`, dann `start.bat`).

## Bearbeiten

- **Text:** direkt im Dokument klicken und tippen. Eingefügter Text wird ohne Formatierung übernommen.
- **Rückgängig / Wiederholen:** Knöpfe in der Leiste oder `Strg+Z` / `Strg+Y`. Der Verlauf erfasst auch Fotos,
  Tabellenzeilen, Ampel und Markierungen (bis zu 100 Schritte, bis die Seite neu geladen wird).
- **Gelbe Felder** (`.fill`) sind offene Platzhalter. Klick markiert den Platzhalter, Tippen ersetzt ihn und entfernt das Gelb.
  „Offen-Markierung“ in der Leiste macht markierten Text gelb oder entfernt die Markierung.
- **Textformate:** Text markieren, dann **F** (fett), **Code** (Adressen, Befehle), **Menüpunkt** (Knöpfe/Menüs zum Anklicken),
  **klein** (Kleingedrucktes), **Link** oder **Offen**. Steht der Cursor schon in einem Format, ist der Knopf
  hervorgehoben und entfernt es wieder.
- **Absatz …:** aktuellen Absatz in Überschrift, Unterüberschrift oder normalen Text umwandeln.
- **Liste …:** Absatz in Aufzählung, nummerierte Liste, Schritt-für-Schritt-Anleitung oder Checkliste umwandeln,
  die Art einer bestehenden Liste ändern oder sie auflösen. Shift+Enter = Zeilenumbruch ohne neuen Punkt.
- **Kasten …:** Absatz zu einem Hinweiskasten (blau, rot, gelb, grün, „Noch auszufüllen“) machen, umfärben oder auflösen.
- **Tabelle …:** neue Tabelle mit Kopfzeile (Spaltenzahl wird abgefragt) oder zweispaltige Tabelle
  „Bezeichnung – Wert“ unter der aktuellen Stelle einfügen. In einer Tabelle: Spalte rechts einfügen,
  Spalte löschen oder ganze Tabelle löschen. Zeilen: Cursor in eine Zeile, dann „Zeile +“ / „Zeile −“.
- **Ampel:** Cursor in eine Markierung („Kann weg“ usw.) und Farbe wählen, um sie umzufärben.
  Text markieren und Farbe wählen macht daraus eine neue Markierung. Ohne markierten Text wird eine neue
  Markierung „Markierung“ eingefügt. ✕ entfernt eine Markierung, der Text bleibt erhalten.
- **Offene Hinweise** (gelbe Kästen) über „erledigt ✓“ entfernen.
- **Fotos:** in den gestrichelten Fotobereichen „+ Foto hinzufügen“ oder Bilder hineinziehen.
  Unter der Gerätetabelle (Kapitel 7.2) hat jedes Gerät einen eigenen Fotobereich. Weitere Bereiche
  für Screenshots und Bedienungsdetails stehen bei den jeweiligen Anleitungen.
  Bilder werden im Browser auf max. 1600 px verkleinert. HEIC (iPhone) kann der Browser nicht lesen,
  solche Bilder vorher als JPG speichern. Beim Darüberfahren erscheinen Knöpfe zum Verschieben und Entfernen.
- **Speichern:** Knopf oder `Strg+S`. Das Datum „Stand“ auf dem Deckblatt wird dabei automatisch gesetzt.
- **Inhaltsverzeichnis:** wird nicht automatisch erzeugt. Neue Abschnitte dort bitte von Hand nachtragen.

## Drucken und Weitergeben

- **Drucken:** Knopf „Drucken“ in der Leiste. Leere Fotobereiche und alle Bearbeitungselemente werden nicht gedruckt.
- **Einzeldatei:** Knopf „Einzeldatei“ lädt `Digitaler-Nachlass_JJJJ-MM-TT.html` herunter, mit allen Fotos eingebettet.
  Diese Datei funktioniert ohne Server, z. B. auf einem USB-Stick, in einer Dokumentenablage oder einem Cloud-Speicher.

## Dateien

| Pfad | Inhalt |
|------|--------|
| `daten/Digitaler-Nachlass.html` | Das Dokument. Lässt sich auch direkt im Browser öffnen, dann aber nur lesen. |
| `daten/bilder/` | Hochgeladene Fotos. Entfernte Fotos bleiben hier liegen, weil ältere Versionen sie noch verwenden. |
| `daten/versionen/` | Vor jedem Speichern wird der vorherige Stand hier abgelegt (die letzten 200). |
| `server.py` | Kleiner Webserver (nur Python-Standardbibliothek). |
| `start.sh`, `stop.sh` | Starten und Stoppen unter Linux. Der laufende Server steht in `server.pid`. |
| `start.bat`, `stop.bat` | Starten und Stoppen unter Windows. Rufen `start.ps1` bzw. `stop.ps1` auf. |
| `server.log` | Protokoll des Servers. |
| `CLAUDE.md` | Hinweise zum Aufbau für Entwickler und KI-Assistenten. |
| `CHANGELOG.md` | Änderungen je Version. |
| `editor/` | Bearbeitungsfunktionen. Werden nur beim Bearbeiten eingeblendet und nie ins Dokument gespeichert. |

**Alten Stand wiederherstellen:** Server beenden, die gewünschte Datei aus `daten/versionen/` nach
`daten/Digitaler-Nachlass.html` kopieren und den Server neu starten.

## Sicherheit

- Beim Speichern übernimmt der Server nur den Inhaltsbereich (`<main>`). Kopf, Styles und Skripte des
  Dokuments bleiben unverändert, auch wenn Browser-Erweiterungen etwas in die Seite einfügen.

- Der Server lauscht nur auf `127.0.0.1`, ist also nur auf diesem Rechner erreichbar.
- Schreibzugriffe verlangen einen eigenen HTTP-Header, und fremde Hostnamen werden abgewiesen.
  So können andere Webseiten im Browser nichts speichern (CSRF, DNS-Rebinding).
- Es gibt **keine Anmeldung**. Für den Zugriff aus dem Heimnetz (`NACHLASS_HOST=0.0.0.0`,
  `NACHLASS_ALLOWED_HOSTS=name.im.netz`) daher unbedingt einen Proxy mit Anmeldung davorschalten.
- **Keine Passwörter ins Dokument schreiben.** Die gehören nur in den Passwortmanager und auf das handschriftliche Notfallblatt.

## Entstehung

Dieses Projekt ist per **Vibecoding** mit [Claude](https://claude.ai) (Anthropic) und Claude Code entstanden:
Code, Weboberfläche und Dokumentation wurden im Dialog mit der KI geschrieben. Die Inhalte der Mappe wurden
aus einer von mir erstellten Vorlage generiert und anschließend zu dieser leeren Vorlage verallgemeinert.

## Mitmachen

Fehler, Ideen und Verbesserungen gern als Issue oder Pull Request. Bitte dabei nur Beispieldaten
verwenden (`beispiel.de`, `192.168.178.x` …), niemals echte Angaben. Jede Änderung gehört in
[`CHANGELOG.md`](CHANGELOG.md). Details stehen in [`CONTRIBUTING.md`](CONTRIBUTING.md), der Aufbau
des Codes in [`CLAUDE.md`](CLAUDE.md).

## Haftungsausschluss

Diese Vorlage ersetzt keine rechtliche Beratung, kein Testament und keine Vorsorgevollmacht.
Sie hilft nur, technische Zusammenhänge für Angehörige verständlich festzuhalten.

## Lizenz

[GNU GPL v3](LICENSE)
