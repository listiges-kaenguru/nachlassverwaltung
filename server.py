#!/usr/bin/env python3
"""Nachlassverwaltung – lokale Weboberfläche zur Pflege des Digitalen Nachlasses.

Nur Python-Standardbibliothek, keine Zusatzpakete.
Start:  python3 server.py [--browser]   →   http://127.0.0.1:8484/
"""
import base64
import json
import os
import re
import secrets
import shutil
import signal
import sys
import threading
import webbrowser
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

BASIS = Path(__file__).resolve().parent
DATEN = BASIS / "daten"
DOKUMENT = DATEN / "Digitaler-Nachlass.html"
BILDER = DATEN / "bilder"
VERSIONEN = DATEN / "versionen"
EDITOR = BASIS / "editor"
PIDDATEI = BASIS / "server.pid"

HOST = os.environ.get("NACHLASS_HOST", "127.0.0.1")
PORT = int(os.environ.get("NACHLASS_PORT", "8484"))
ERLAUBTE_HOSTS = {"127.0.0.1", "localhost", "::1"} | {
    h.strip().lower() for h in os.environ.get("NACHLASS_ALLOWED_HOSTS", "").split(",") if h.strip()
}
if HOST not in ("0.0.0.0", ""):
    ERLAUBTE_HOSTS.add(HOST.lower())

MAX_VERSIONEN = 200
MAX_DOKUMENT = 20 * 1024 * 1024
MAX_BILD = 15 * 1024 * 1024
BILD_TYPEN = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
# Feste Zuordnung statt mimetypes: Unter Windows liefert die Registry z. B. für .js teils text/plain,
# was der Browser wegen „nosniff“ dann nicht ausführt.
DATEI_TYPEN = {
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
}
DATEINAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")

# Wird nur beim Ausliefern eingefügt und vom Editor beim Speichern wieder entfernt.
EINBLENDUNG = ('<link data-editor rel="stylesheet" href="/editor/editor.css">'
               '<script data-editor src="/editor/editor.js" defer></script>')


def signatur_passt(daten: bytes, typ: str) -> bool:
    if typ == "image/jpeg":
        return daten[:3] == b"\xff\xd8\xff"
    if typ == "image/png":
        return daten[:8] == b"\x89PNG\r\n\x1a\n"
    if typ == "image/webp":
        return daten[:4] == b"RIFF" and daten[8:12] == b"WEBP"
    return False


def hauptbereich(html: str):
    """Start und Ende von <main>…</main>, oder None, wenn nicht genau einmal vorhanden."""
    anfaenge = [m.start() for m in re.finditer(r"<main[\s>]", html, re.I)]
    ende = html.lower().rfind("</main>")
    if len(anfaenge) != 1 or ende < anfaenge[0]:
        return None
    return anfaenge[0], ende + len("</main>")


def version_sichern() -> str:
    """Kopiert den aktuellen Stand nach daten/versionen und gibt den Dateinamen zurück."""
    if not DOKUMENT.is_file():
        return ""
    stempel = datetime.now().strftime("%Y%m%d-%H%M%S")
    ziel = VERSIONEN / f"Digitaler-Nachlass_{stempel}.html"
    n = 1
    while ziel.exists():
        ziel = VERSIONEN / f"Digitaler-Nachlass_{stempel}_{n}.html"
        n += 1
    shutil.copy2(DOKUMENT, ziel)
    return ziel.name


def versionen_aufraeumen() -> None:
    alle = sorted(VERSIONEN.glob("Digitaler-Nachlass_*.html"))
    for alt in alle[:-MAX_VERSIONEN]:
        alt.unlink(missing_ok=True)


class Handler(BaseHTTPRequestHandler):
    server_version = "Nachlassverwaltung/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s  %s\n" % (self.log_date_time_string(), fmt % args))

    # ---------- Hilfen ----------
    def _senden(self, status, inhalt=b"", typ="text/plain; charset=utf-8", kopf=None):
        self.send_response(status)
        self.send_header("Content-Type", typ)
        self.send_header("Content-Length", str(len(inhalt)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (kopf or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(inhalt)

    def _json(self, status, daten):
        self._senden(status, json.dumps(daten).encode("utf-8"), "application/json; charset=utf-8")

    def _host_ok(self) -> bool:
        # Schutz gegen DNS-Rebinding: nur bekannte Hostnamen zulassen.
        host = (self.headers.get("Host") or "").lower()
        host = host.rsplit(":", 1)[0] if not host.endswith("]") else host
        return host.strip("[]") in ERLAUBTE_HOSTS

    def _koerper(self, maximal):
        try:
            laenge = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if laenge <= 0 or laenge > maximal:
            return None
        return self.rfile.read(laenge)

    # ---------- GET ----------
    def do_GET(self):
        if not self._host_ok():
            return self._senden(HTTPStatus.FORBIDDEN, b"Host nicht erlaubt")
        pfad = urlparse(self.path).path
        if pfad in ("/", "/index.html"):
            return self._dokument()
        if pfad == "/api/export":
            return self._export()
        if pfad.startswith("/bilder/"):
            return self._datei(BILDER, pfad[len("/bilder/"):])
        if pfad.startswith("/editor/"):
            return self._datei(EDITOR, pfad[len("/editor/"):])
        self._senden(HTTPStatus.NOT_FOUND, b"Nicht gefunden")

    def _dokument(self):
        html = DOKUMENT.read_text(encoding="utf-8")
        html = re.sub(r"</head>", lambda m: EINBLENDUNG + m.group(0), html, count=1, flags=re.I)
        self._senden(HTTPStatus.OK, html.encode("utf-8"), "text/html; charset=utf-8")

    def _datei(self, wurzel, name):
        name = unquote(name)
        if not DATEINAME.fullmatch(name):
            return self._senden(HTTPStatus.NOT_FOUND, b"Nicht gefunden")
        # resolve() löst auch symbolische Links auf; die Datei muss direkt im Ordner liegen.
        datei = (wurzel / name).resolve()
        if datei.parent != wurzel.resolve() or not datei.is_file():
            return self._senden(HTTPStatus.NOT_FOUND, b"Nicht gefunden")
        typ = DATEI_TYPEN.get(datei.suffix.lower(), "application/octet-stream")
        self._senden(HTTPStatus.OK, datei.read_bytes(), typ)

    def _export(self):
        """Liefert das Dokument als Einzeldatei mit eingebetteten Fotos."""
        html = DOKUMENT.read_text(encoding="utf-8")

        def einbetten(m):
            datei = BILDER / m.group(1)
            typ = DATEI_TYPEN.get(datei.suffix.lower(), "")
            if not typ.startswith("image/") or not datei.is_file():
                return m.group(0)
            daten = base64.b64encode(datei.read_bytes()).decode("ascii")
            return f'src="data:{typ};base64,{daten}"'

        html = re.sub(r'src="bilder/([A-Za-z0-9][A-Za-z0-9._-]*)"', einbetten, html)
        name = f"Digitaler-Nachlass_{datetime.now():%Y-%m-%d}.html"
        self._senden(HTTPStatus.OK, html.encode("utf-8"), "text/html; charset=utf-8",
                     {"Content-Disposition": f'attachment; filename="{name}"'})

    # ---------- POST ----------
    def do_POST(self):
        if not self._host_ok():
            return self._json(HTTPStatus.FORBIDDEN, {"fehler": "Host nicht erlaubt."})
        # Eigener Header erzwingt bei fremden Webseiten eine CORS-Vorabprüfung, die hier nie erlaubt wird.
        if self.headers.get("X-Nachlass") != "1":
            return self._json(HTTPStatus.FORBIDDEN, {"fehler": "Anfrage abgelehnt."})
        origin = self.headers.get("Origin")
        if origin and urlparse(origin).netloc.lower() != (self.headers.get("Host") or "").lower():
            return self._json(HTTPStatus.FORBIDDEN, {"fehler": "Fremde Herkunft abgelehnt."})
        url = urlparse(self.path)
        if url.path == "/api/speichern":
            return self._speichern()
        if url.path == "/api/foto":
            return self._foto(parse_qs(url.query))
        self._json(HTTPStatus.NOT_FOUND, {"fehler": "Unbekannte Adresse."})

    def _speichern(self):
        roh = self._koerper(MAX_DOKUMENT)
        if roh is None:
            return self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"fehler": "Dokument leer oder zu groß."})
        try:
            text = roh.decode("utf-8")
        except UnicodeDecodeError:
            return self._json(HTTPStatus.BAD_REQUEST, {"fehler": "Ungültige Zeichenkodierung."})
        klein = text.lower()
        if (not klein.lstrip().startswith("<!doctype html") or "</html>" not in klein[-500:]
                or "<main" not in klein):
            return self._json(HTTPStatus.BAD_REQUEST,
                              {"fehler": "Das Dokument sieht unvollständig aus und wurde nicht gespeichert."})
        if re.search(r"<[^<>]*\sdata-editor[\s=>]", text):
            return self._json(HTTPStatus.BAD_REQUEST,
                              {"fehler": "Im Dokument sind noch Editor-Bestandteile. Nicht gespeichert."})
        # Nur den Inhaltsbereich übernehmen. Kopf und Skripte kommen aus der Datei auf der Platte,
        # damit z. B. von Browser-Erweiterungen eingefügte Styles nicht ins Dokument geraten.
        bisher = DOKUMENT.read_text(encoding="utf-8")
        neu_main, alt_main = hauptbereich(text), hauptbereich(bisher)
        if not neu_main or not alt_main:
            return self._json(HTTPStatus.BAD_REQUEST,
                              {"fehler": "Inhaltsbereich (<main>) nicht eindeutig gefunden. Nicht gespeichert."})
        text = bisher[:alt_main[0]] + text[neu_main[0]:neu_main[1]] + bisher[alt_main[1]:]
        version = version_sichern()
        tmp = DOKUMENT.with_suffix(".tmp")
        tmp.write_text(text, encoding="utf-8")
        os.replace(tmp, DOKUMENT)
        versionen_aufraeumen()
        self._json(HTTPStatus.OK, {"ok": True, "version": version})

    def _foto(self, query):
        typ = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        endung = BILD_TYPEN.get(typ)
        if not endung:
            return self._json(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, {"fehler": "Nur JPG, PNG oder WebP."})
        daten = self._koerper(MAX_BILD)
        if daten is None:
            return self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"fehler": "Bild leer oder zu groß."})
        if not signatur_passt(daten, typ):
            return self._json(HTTPStatus.BAD_REQUEST, {"fehler": "Die Datei ist kein gültiges Bild."})
        slot = re.sub(r"[^a-z0-9-]", "", query.get("slot", ["foto"])[0].lower())[:40] or "foto"
        name = f"{slot}_{datetime.now():%Y%m%d-%H%M%S}_{secrets.token_hex(3)}{endung}"
        (BILDER / name).write_bytes(daten)
        self._json(HTTPStatus.CREATED, {"src": f"bilder/{name}"})


def main():
    BILDER.mkdir(parents=True, exist_ok=True)
    VERSIONEN.mkdir(parents=True, exist_ok=True)
    if not DOKUMENT.is_file():
        sys.exit(f"Dokument nicht gefunden: {DOKUMENT}")
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError as fehler:
        sys.exit(f"Server konnte nicht starten ({fehler}). Läuft er schon? Anderer Port: NACHLASS_PORT=8485")
    adresse = f"http://{'127.0.0.1' if HOST in ('0.0.0.0', '') else HOST}:{PORT}/"
    PIDDATEI.write_text(str(os.getpid()))

    def beenden(signum, frame):  # stop.sh sendet SIGTERM
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, beenden)
    print(f"Nachlassverwaltung läuft: {adresse}", flush=True)
    print("Beenden mit ./stop.sh oder Strg+C.", flush=True)
    if "--browser" in sys.argv:
        threading.Timer(0.6, webbrowser.open, [adresse]).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Beendet.", flush=True)
    finally:
        server.server_close()
        if PIDDATEI.is_file() and PIDDATEI.read_text().strip() == str(os.getpid()):
            PIDDATEI.unlink()


if __name__ == "__main__":
    main()
