# Sicherheits- und Negativtests der Nachlassverwaltung. Wird von tests/run.sh eingebunden (Server und Helfer
# stehen dort bereit), nicht allein ausführen.
# Abschnitte: Bindung, Host-Prüfung (DNS-Rebinding), CSRF, Pfade, Fotos, Speichern, Export, Fehlermeldungen.

# anfrage <curl-argumente …> → "<status> <antwort>" (Antwort ins Protokoll)
code() {
  local r; r="$(curl -s -w '\n%{http_code}' "$@" | tr -d '\0')"
  printf '%s\n' "$r" >> "$LOG"; printf '%s' "${r##*$'\n'}"
}
koerper() {
  local r; r="$(curl -s "$@" | tr -d '\0')"
  printf '%s\n' "$r" >> "$LOG"; printf '%s' "$r"
}
POST=(-H 'X-Nachlass: 1' -H "Origin: $U" -X POST)
DOK="$TMP/app/daten/Digitaler-Nachlass.html"
BILDER="$TMP/app/daten/bilder"
jpeg() { { printf '\xff\xd8\xff\xe0'; head -c "$(( ${2:-100} - 4 ))" /dev/zero; } > "$1"; }

# ---------------------------------------------------------------------------------------------------------
abschnitt "Bindung nur an 127.0.0.1"
# Eigene Netzwerkadresse ermitteln (UDP-connect sendet nichts, liefert nur die Absenderadresse)
EIGENE_IP="$(python3 -c 'import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(("10.255.255.255", 1)); print(s.getsockname()[0])')"
pruefe "eigene Netzwerkadresse gefunden ($EIGENE_IP)" "$(jq -n --arg i "$EIGENE_IP" '$i')" 'test("^[0-9.]+$") and . != "127.0.0.1"'
pruefe "über die Netzwerkadresse nicht erreichbar" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://$EIGENE_IP:$PORT/")" '. == 0'

# ---------------------------------------------------------------------------------------------------------
abschnitt "Host-Prüfung gegen DNS-Rebinding"
for h in 'boese.example' "boese.example:$PORT" "127.0.0.1.boese.example:$PORT" 'localhost.boese.example' ''; do
  pruefe "GET mit Host »$h« → 403" "$(code -H "Host: $h" "$U/")" '. == 403'
done
for h in "127.0.0.1:$PORT" "localhost:$PORT" "[::1]:$PORT"; do
  pruefe "GET mit Host »$h« → 200" "$(code -H "Host: $h" "$U/")" '. == 200'
done
pruefe "Bilder mit fremdem Host → 403" "$(code -H 'Host: boese.example' "$U/editor/editor.js")" '. == 403'
pruefe "POST mit fremdem Host → 403" "$(code -H 'Host: boese.example' "${POST[@]}" "$U/api/speichern" -d 'x')" '. == 403'

# ---------------------------------------------------------------------------------------------------------
abschnitt "CSRF: POST nur mit Pflicht-Header und eigener Herkunft"
ALT_MD5="$(md5sum < "$DOK")"
pruefe "ohne X-Nachlass → 403" "$(code -H "Origin: $U" -X POST "$U/api/speichern" --data-binary @"$DOK")" '. == 403'
pruefe "mit falschem X-Nachlass → 403" "$(code -H 'X-Nachlass: 0' -H "Origin: $U" -X POST "$U/api/speichern" --data-binary @"$DOK")" '. == 403'
pruefe "mit fremdem Origin → 403" "$(code -H 'X-Nachlass: 1' -H 'Origin: https://boese.example' -X POST "$U/api/speichern" --data-binary @"$DOK")" '. == 403'
pruefe "mit Origin null → 403" "$(code -H 'X-Nachlass: 1' -H 'Origin: null' -X POST "$U/api/speichern" --data-binary @"$DOK")" '. == 403'
pruefe "mit Origin anderer Port → 403" "$(code -H 'X-Nachlass: 1' -H 'Origin: http://127.0.0.1:1' -X POST "$U/api/speichern" --data-binary @"$DOK")" '. == 403'
pruefe "Formular-POST (einfache Cross-Site-Anfrage) → 403" "$(code -X POST "$U/api/foto" -d 'x=1')" '. == 403'
pruefe "Dokument unverändert" "$([ "$(md5sum < "$DOK")" = "$ALT_MD5" ] && echo true || echo false)" '. == true'
pruefe "keine Version angelegt" "$(find "$TMP/app/daten/versionen" -name '*.html' | wc -l)" '. == 0'

# ---------------------------------------------------------------------------------------------------------
abschnitt "Pfade: nur Dateien direkt in bilder/ und editor/"
pruefe "Editor-Skript wird ausgeliefert" "$(code "$U/editor/editor.js")" '. == 200'
pruefe "Editor-Skript mit JavaScript-Typ" "$(curl -s -D - -o /dev/null "$U/editor/editor.js" | tr -d '\r' | grep -ic '^content-type: text/javascript')" '. == 1'
for p in '/bilder/../server.py' '/editor/../server.py' '/bilder/%2e%2e%2fserver.py' '/bilder/..%2f..%2fserver.py' \
  '/editor/..%2f..%2fserver.py' '/bilder/%2e%2e/%2e%2e/server.py' '/bilder/.gitkeep' '/bilder/%00' '/bilder/' \
  '/server.py' '/daten/Digitaler-Nachlass.html' '/bilder/..%5c..%5cserver.py' '/editor/%2fetc%2fpasswd'; do
  pruefe "GET $p → 404" "$(code --path-as-is "$U$p")" '. == 404'
done
ln -s ../../server.py "$BILDER/link.jpg"
pruefe "symbolischer Link aus bilder/ heraus → 404" "$(code "$U/bilder/link.jpg")" '. == 404'
rm -f "$BILDER/link.jpg"
pruefe "keine Python-Quelle in irgendeiner Antwort" "$(grep -c 'def signatur_passt' "$LOG")" '. == 0'

# ---------------------------------------------------------------------------------------------------------
abschnitt "Fotos hochladen"
jpeg "$TMP/foto.jpg"
foto() { koerper "${POST[@]}" -H "Content-Type: $1" --data-binary @"$2" "$U/api/foto${3:-}"; }
NAME_MUSTER='^bilder/[a-z0-9-]{1,40}_[0-9]{8}-[0-9]{6}_[0-9a-f]{6}\\.(jpg|png|webp)$'
pruefe "JPEG wird angenommen" "$(foto image/jpeg "$TMP/foto.jpg")" ".src | test(\"$NAME_MUSTER\")"
printf '\x89PNG\r\n\x1a\n0000' > "$TMP/foto.png"
pruefe "PNG wird angenommen" "$(foto image/png "$TMP/foto.png")" '.src | endswith(".png")'
printf 'RIFF0000WEBPVP8 ' > "$TMP/foto.webp"
pruefe "WebP wird angenommen" "$(foto image/webp "$TMP/foto.webp")" '.src | endswith(".webp")'
printf '<html><script>alert(1)</script>' > "$TMP/boese.html"
pruefe "HTML als Foto → 415" "$(code "${POST[@]}" -H 'Content-Type: text/html' --data-binary @"$TMP/boese.html" "$U/api/foto")" '. == 415'
pruefe "SVG als Foto → 415" "$(code "${POST[@]}" -H 'Content-Type: image/svg+xml' --data-binary @"$TMP/boese.html" "$U/api/foto")" '. == 415'
pruefe "HTML mit JPEG-Typ (falsche Signatur) → 400" "$(code "${POST[@]}" -H 'Content-Type: image/jpeg' --data-binary @"$TMP/boese.html" "$U/api/foto")" '. == 400'
pruefe "PNG-Inhalt mit JPEG-Typ → 400" "$(code "${POST[@]}" -H 'Content-Type: image/jpeg' --data-binary @"$TMP/foto.png" "$U/api/foto")" '. == 400'
pruefe "leeres Foto → 413" "$(code "${POST[@]}" -H 'Content-Type: image/jpeg' --data-binary '' "$U/api/foto")" '. == 413'
jpeg "$TMP/genau.jpg" $((15 * 1024 * 1024))
jpeg "$TMP/zu-gross.jpg" $((15 * 1024 * 1024 + 1))
pruefe "Foto genau 15 MB → 201" "$(code "${POST[@]}" -H 'Content-Type: image/jpeg' --data-binary @"$TMP/genau.jpg" "$U/api/foto")" '. == 201'
pruefe "Foto 15 MB + 1 Byte → 413" "$(code "${POST[@]}" -H 'Content-Type: image/jpeg' --data-binary @"$TMP/zu-gross.jpg" "$U/api/foto")" '. == 413'
pruefe "Content-Length ungültig → 413" "$(code "${POST[@]}" -H 'Content-Type: image/jpeg' -H 'Content-Length: abc' "$U/api/foto")" '. == 413'
for s in '../../boese' '..%2F..%2Fboese' 'a/b\c' '<script>' 'Ümlaut' "$(printf 'x%.0s' $(seq 1 100))"; do
  pruefe "Slot »${s:0:15}«: Dateiname bleibt im erlaubten Muster" "$(foto image/jpeg "$TMP/foto.jpg" "?slot=$(jq -rn --arg s "$s" '$s | @uri')")" ".src | test(\"$NAME_MUSTER\")"
done
pruefe "alle Fotos liegen direkt in bilder/" "$(find "$TMP/app" -type f \( -name '*.jpg' -o -name '*.png' -o -name '*.webp' \) ! -path "$BILDER/*" | wc -l)" '. == 0'
pruefe "keine Datei boese* außerhalb von bilder/" "$(find "$TMP" -name 'boese*' ! -path "$TMP/boese.html" ! -path "$BILDER/*" | wc -l)" '. == 0'
FOTO="$(foto image/jpeg "$TMP/foto.jpg" | jq -r '.src')"
pruefe "hochgeladenes Foto ist abrufbar, als Bild" "$(curl -s -D - -o /dev/null "$U/$FOTO" | tr -d '\r' | grep -ic '^content-type: image/jpeg')" '. == 1'

# ---------------------------------------------------------------------------------------------------------
abschnitt "Speichern: nur vollständige Dokumente, nur der Inhaltsbereich"
speichern() { code "${POST[@]}" -H 'Content-Type: text/html; charset=utf-8' --data-binary @"$1" "$U/api/speichern"; }
printf 'kein html' > "$TMP/kein.html"
pruefe "kein HTML → 400" "$(speichern "$TMP/kein.html")" '. == 400'
sed 's#<main#<main data-editor#' "$DOK" > "$TMP/editor.html"
pruefe "mit Editor-Bestandteilen → 400" "$(speichern "$TMP/editor.html")" '. == 400'
sed 's#</main>#</main><main>zweiter</main>#' "$DOK" > "$TMP/zwei.html"
pruefe "zwei <main>-Bereiche → 400" "$(speichern "$TMP/zwei.html")" '. == 400'
head -c -200 "$DOK" > "$TMP/abgeschnitten.html"
pruefe "abgeschnittenes Dokument → 400" "$(speichern "$TMP/abgeschnitten.html")" '. == 400'
{ cat "$DOK"; printf '\xff\xfe'; } > "$TMP/kaputt.html"
pruefe "ungültiges UTF-8 → 400" "$(speichern "$TMP/kaputt.html")" '. == 400'
{ cat "$DOK"; head -c $((20 * 1024 * 1024)) /dev/zero | tr '\0' ' '; } > "$TMP/riesig.html"
pruefe "größer als 20 MB → 413" "$(speichern "$TMP/riesig.html")" '. == 413'
pruefe "nach den Fehlversuchen: Dokument unverändert" "$([ "$(md5sum < "$DOK")" = "$ALT_MD5" ] && echo true || echo false)" '. == true'
sed -e 's#</head>#<script>alert("aus dem Kopf")</script></head>#' -e 's#<main\([^>]*\)>#<main\1><p>Neuer Inhalt äöü 😀</p>#' "$DOK" > "$TMP/neu.html"
pruefe "gültiges Dokument wird gespeichert" "$(koerper "${POST[@]}" -H 'Content-Type: text/html; charset=utf-8' --data-binary @"$TMP/neu.html" "$U/api/speichern")" '.ok == true and (.version | test("^Digitaler-Nachlass_[0-9]{8}-[0-9]{6}(_[0-9]+)?\\.html$"))'
pruefe "neuer Inhalt mit Unicode übernommen" "$(grep -c 'Neuer Inhalt äöü 😀' "$DOK")" '. == 1'
pruefe "eingeschleuster Kopf-Inhalt nicht übernommen" "$(grep -c 'aus dem Kopf' "$DOK")" '. == 0'
pruefe "vorheriger Stand als Version gesichert" "$(find "$TMP/app/daten/versionen" -name 'Digitaler-Nachlass_*.html' | wc -l)" '. == 1'
pruefe "keine temporäre Datei übrig" "$(find "$TMP/app/daten" -name '*.tmp' | wc -l)" '. == 0'

# ---------------------------------------------------------------------------------------------------------
abschnitt "Export"
KOPF="$(curl -s -D "$TMP/export.kopf" -o "$TMP/export.html" "$U/api/export"; tr -d '\r' < "$TMP/export.kopf")"
pruefe "Export als Download" "$(printf '%s' "$KOPF" | grep -ic '^content-disposition: attachment; filename="Digitaler-Nachlass_[0-9-]*\.html"')" '. == 1'
pruefe "Export ohne Editor-Bestandteile" "$(grep -c 'data-editor' "$TMP/export.html")" '. == 0'
# Export bettet nur Fotos aus bilder/ ein – auch wenn das Dokument Pfad-Tricks enthält
FOTO_DATEI="${FOTO#bilder/}"
sed "s#<main\([^>]*\)>#<main\1><img src=\"bilder/$FOTO_DATEI\"><img src=\"bilder/../../server.py\"><img src=\"bilder/..%2f..%2fserver.py\"><img src=\"bilder/fehlt.jpg\">#" "$DOK" > "$TMP/mit-bildern.html"
speichern "$TMP/mit-bildern.html" >/dev/null
curl -s -o "$TMP/export2.html" "$U/api/export"
pruefe "Export bettet das Foto als data:-URL ein" "$(grep -c 'src="data:image/jpeg;base64,' "$TMP/export2.html")" '. == 1'
pruefe "Pfad-Trick ../ bleibt unverändert (nichts eingebettet)" "$(grep -c 'src="bilder/../../server.py"' "$TMP/export2.html")" '. == 1'
pruefe "Pfad-Trick %2f bleibt unverändert" "$(grep -c 'src="bilder/..%2f..%2fserver.py"' "$TMP/export2.html")" '. == 1'
pruefe "fehlendes Foto bleibt als Verweis" "$(grep -c 'src="bilder/fehlt.jpg"' "$TMP/export2.html")" '. == 1'
pruefe "kein Inhalt von server.py im Export" "$(grep -c "$(head -c 60 "$TMP/app/server.py" | base64 -w0 | head -c 40)" "$TMP/export2.html")" '. == 0'
pruefe "Antworten mit nosniff" "$(printf '%s' "$KOPF" | grep -ic '^x-content-type-options: nosniff')" '. == 1'

# ---------------------------------------------------------------------------------------------------------
abschnitt "Fehlermeldungen ohne interne Details"
pruefe "unbekannte POST-Adresse → 404 als JSON" "$(koerper "${POST[@]}" "$U/api/gibt-es-nicht" -d 'x')" '.fehler != null'
pruefe "unbekannte Methode → 501" "$(code -X DELETE "$U/")" '. == 501'
pruefe "kaputte Anfragezeile → 400" "$(printf 'KAPUTT\r\n\r\n' | timeout 3 python3 -c 'import socket,sys; s=socket.create_connection(("127.0.0.1", int(sys.argv[1]))); s.sendall(sys.stdin.buffer.read()); print(s.recv(100).split()[1].decode())' "$PORT")" '. == 400'
LECK_MUSTER='Traceback|File "|/tmp/|/home/|/projects/|Error:|Exception'
pruefe "keine Tracebacks oder Pfade in $(wc -l < "$LOG") Antworten" "$(grep -E -c "$LECK_MUSTER" "$LOG")" '. == 0'
pruefe "keine Tracebacks im Serverprotokoll" "$(grep -c 'Traceback' "$TMP/server.log")" '. == 0'
