#!/bin/sh
# Startet die Nachlassverwaltung im Hintergrund und öffnet sie im Browser.
# Beenden mit ./stop.sh – Protokoll in server.log.
cd "$(dirname "$0")" || exit 1
URL="http://127.0.0.1:${NACHLASS_PORT:-8484}/"

laeuft() {
  [ -f server.pid ] && kill -0 "$(cat server.pid)" 2>/dev/null
}

if laeuft; then
  echo "Nachlassverwaltung läuft bereits: $URL"
  xdg-open "$URL" >/dev/null 2>&1 &
  exit 0
fi

nohup python3 server.py --browser >> server.log 2>&1 &

i=0
while ! laeuft && [ $i -lt 25 ]; do sleep 0.2; i=$((i + 1)); done

if laeuft; then
  echo "Nachlassverwaltung läuft: $URL"
  echo "Beenden mit ./stop.sh"
else
  echo "Start fehlgeschlagen. Letzte Meldungen aus server.log:"
  tail -n 3 server.log
  if tail -n 3 server.log | grep -q "Address already in use"; then
    echo
    echo "Der Port ist belegt – vermutlich läuft noch eine ältere Instanz."
    echo "Erst ./stop.sh ausführen, dann ./start.sh erneut."
  fi
  exit 1
fi
