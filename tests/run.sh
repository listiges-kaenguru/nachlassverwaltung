#!/usr/bin/env bash
# Server-Test der Nachlassverwaltung (Bash, ohne Framework und ohne Abhängigkeiten).
# Läuft in der Testumgebung (~/projects/testumgebung):
#   pt test                 mit Syntax- und Linkprüfung
#   pt bash tests/run.sh    nur dieser Test
# Braucht python3 und curl. Arbeitet auf einer Kopie des Arbeitsstands (ohne ignorierte Dateien wie hochgeladene
# Fotos und gesicherte Versionen) in einem temporären Ordner; im Repo entsteht nichts.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${TEST_PORT:-8485}"
U="http://127.0.0.1:$PORT"
for t in python3 curl git; do
  command -v "$t" >/dev/null || { echo "$t fehlt – in der Testumgebung ausführen: ~/projects/testumgebung/pt test" >&2; exit 2; }
done

TMP="$(mktemp -d)"
SRV=
aufraeumen() { [ -n "$SRV" ] && kill "$SRV" 2>/dev/null; rm -rf "$TMP"; }
trap aufraeumen EXIT

mkdir -p "$TMP/app"
(cd "$ROOT" && git ls-files -co --exclude-standard -z | tar --null -T - -c) | tar -x -C "$TMP/app"
NACHLASS_PORT="$PORT" python3 -B "$TMP/app/server.py" >"$TMP/server.log" 2>&1 &
SRV=$!
for _ in $(seq 1 50); do curl -s -o /dev/null "$U/" && break; sleep 0.2; done

FEHLER=0
CODE="$(curl -s -o /dev/null -w '%{http_code}' "$U/")"
if [ "$CODE" = 200 ]; then echo "ok   Startseite (200)"
else echo "FAIL Startseite: HTTP $CODE"; FEHLER=1; tail -20 "$TMP/server.log"; fi

echo "1 Prüfung, $FEHLER fehlgeschlagen"
[ "$FEHLER" -eq 0 ]
