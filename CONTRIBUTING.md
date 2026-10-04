# Mitmachen

Danke, dass du die Vorlage verbessern möchtest! Fehler, Ideen und Verbesserungen gern als
Issue oder Pull Request.

## Grundregeln

- **Nur Beispieldaten.** Niemals echte Namen, Adressen, Domains, E-Mail-Adressen, IP-Adressen,
  Seriennummern oder Fotos committen. Platzhalter wie `beispiel.de`, `name@beispiel-familie.de`
  oder `192.168.178.x` verwenden.
- **Keine Abhängigkeiten.** Nur Python-Standardbibliothek und Vanilla-JavaScript, kein Build-Schritt.
- **Deutsch** für Bezeichner, Kommentare, Meldungen und Doku.
- Aufbau und Regeln im Detail: [`CLAUDE.md`](CLAUDE.md).

## Changelog pflegen

Jeder Pull Request, der etwas für Nutzerinnen und Nutzer ändert, trägt die Änderung in
[`CHANGELOG.md`](CHANGELOG.md) unter **`## [Unveröffentlicht]`** ein. Passende Unterabschnitte:

- `### Hinzugefügt` – neue Funktionen oder Kapitel
- `### Geändert` – Änderungen an bestehendem Verhalten oder Inhalt
- `### Veraltet` – Funktionen, die bald entfernt werden
- `### Entfernt` – entfernte Funktionen oder Kapitel
- `### Behoben` – Fehlerbehebungen
- `### Sicherheit` – sicherheitsrelevante Änderungen

Ein Eintrag ist ein Satz aus Sicht der Nutzenden, z. B.
„Tabellen lassen sich jetzt per Knopf um eine Spalte links erweitern.“

Reine Tippfehler-, Formatierungs- oder CI-Änderungen brauchen keinen Eintrag. Dann im Pull Request
das Label **`kein-changelog`** setzen. Eine automatische Prüfung schlägt sonst fehl, wenn
`CHANGELOG.md` im Pull Request nicht geändert wurde.

## Neue Version veröffentlichen (Maintainer)

1. In `CHANGELOG.md` `## [Unveröffentlicht]` in `## [X.Y.Z] – JJJJ-MM-TT` umbenennen und darüber
   einen neuen, leeren Abschnitt `## [Unveröffentlicht]` anlegen.
2. Committen, taggen (`git tag vX.Y.Z`) und pushen (`git push --tags`).
3. Optional auf GitHub ein Release aus dem Tag erstellen und den Changelog-Abschnitt hineinkopieren.

## Testen

Es gibt keine automatisierten Tests. Wie man manuell prüft, steht in [`CLAUDE.md`](CLAUDE.md#testen).
