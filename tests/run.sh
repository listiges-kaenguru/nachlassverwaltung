#!/usr/bin/env bash
# Tests der Nachlassverwaltung (Bash, ohne Framework und ohne Abhängigkeiten).
# Am besten in einem Container mit den Testwerkzeugen ausführen:
#   tests/run.sh                         diese Tests
#   PYTHON_SERVER='python3 -m coverage run' tests/run.sh   mit Zeilen-Coverage von server.py
# Brauchen python3 und curl. Arbeiten auf einer Kopie des Arbeitsstands (ohne ignorierte Dateien wie hochgeladene
# Fotos und gesicherte Versionen) in einem temporären Ordner; im Repo entsteht nichts.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${TEST_PORT:-8485}"
U="http://127.0.0.1:$PORT"
PYTHON_SERVER="${PYTHON_SERVER:-python3 -B}"   # für Coverage: Python mit coverage.py
for t in python3 curl git jq; do
  command -v "$t" >/dev/null || { echo "$t fehlt – in einem Container mit den Testwerkzeugen ausführen (siehe README)" >&2; exit 2; }
done

TMP="$(mktemp -d)"
SRV=
aufraeumen() {
  # SIGTERM statt SIGKILL: der Server beendet sich sauber (wichtig für die Coverage-Daten)
  [ -n "$SRV" ] && kill "$SRV" 2>/dev/null && wait "$SRV" 2>/dev/null
  rm -rf "$TMP"
}
trap aufraeumen EXIT

ANZAHL=0
FEHLER=0
# pruefe <name> <antwort> <jq-ausdruck>
pruefe() {
  ANZAHL=$((ANZAHL + 1))
  if echo "$2" | jq -e "$3" >/dev/null 2>&1; then echo "ok   $1"
  else echo "FAIL $1: ${2:0:300}"; FEHLER=$((FEHLER + 1)); fi
}
abschnitt() { printf '\n-- %s\n' "$1"; }
LOG="$TMP/antworten.log"

mkdir -p "$TMP/app"
(cd "$ROOT" && git ls-files -co --exclude-standard -z | tar --null -T - -c) | tar -x -C "$TMP/app"
# shellcheck disable=SC2086
NACHLASS_PORT="$PORT" $PYTHON_SERVER "$TMP/app/server.py" >"$TMP/server.log" 2>&1 &
SRV=$!
for _ in $(seq 1 50); do curl -s -o /dev/null "$U/" && break; sleep 0.2; done

abschnitt "Grundfunktionen"
pruefe "Startseite (200)" "$(curl -s -o /dev/null -w '%{http_code}' "$U/")" '. == 200'

# shellcheck source=tests/sicherheit.sh
. "$ROOT/tests/sicherheit.sh"

echo
echo "$ANZAHL Prüfungen, $FEHLER fehlgeschlagen"
if [ "$FEHLER" -gt 0 ]; then echo "Serverprotokoll:"; tail -20 "$TMP/server.log"; fi
[ "$FEHLER" -eq 0 ]
