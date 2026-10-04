#!/bin/sh
# Stoppt die Nachlassverwaltung.
cd "$(dirname "$0")" || exit 1
HIER=$(pwd -P)
PORT="${NACHLASS_PORT:-8484}"

# Gehört der Prozess zu diesem server.py? Nur ein Python-Prozess, der genau server.py ausführt,
# und dessen Arbeitsverzeichnis dieser Ordner ist (sonst würden z. B. Editoren mit server.py getroffen).
ist_unser_server() {
  ps -p "$1" -o args= 2>/dev/null \
    | grep -Eq '^([^ ]*/)?python[0-9.]*( -[^ ]+)* (\./)?server\.py( |$)' || return 1
  [ "$(readlink "/proc/$1/cwd" 2>/dev/null)" = "$HIER" ]
}

beenden() {
  kill "$1"
  i=0
  while kill -0 "$1" 2>/dev/null && [ $i -lt 50 ]; do sleep 0.1; i=$((i + 1)); done
  if kill -0 "$1" 2>/dev/null; then
    echo "Server reagiert nicht und wird hart beendet."
    kill -9 "$1"
  fi
}

if [ -f server.pid ]; then
  PID=$(cat server.pid)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null && ist_unser_server "$PID"; then
    beenden "$PID"
    rm -f server.pid
    echo "Nachlassverwaltung gestoppt."
    exit 0
  fi
  echo "Veraltete server.pid wird entfernt."
  rm -f server.pid
fi

# Ersatzsuche: Server ohne server.pid, z. B. von einer älteren start.sh im Vordergrund gestartet
GEFUNDEN=0
for PID in $(pgrep -f "server\.py"); do
  if ist_unser_server "$PID"; then
    beenden "$PID"
    GEFUNDEN=1
    echo "Nachlassverwaltung (PID $PID, ohne server.pid) gestoppt."
  fi
done
[ $GEFUNDEN = 1 ] && exit 0

echo "Die Nachlassverwaltung läuft nicht."
if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$PORT" | grep -q LISTEN; then
  echo "Port $PORT ist aber von einem anderen Programm belegt:"
  ss -ltnp "sport = :$PORT" | tail -n +2
  echo "Entweder dieses Programm beenden oder einen anderen Port nutzen: NACHLASS_PORT=8485 ./start.sh"
fi
