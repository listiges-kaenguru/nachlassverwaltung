/* Nachlassverwaltung – Editor für den Digitalen Nachlass.
   Der Server blendet diese Datei nur beim Bearbeiten ein. Alles, was der Editor
   hinzufügt, trägt data-editor bzw. Klassen mit "ne-" und wird beim Speichern entfernt. */
(function () {
  'use strict';

  const main = document.querySelector('main');
  if (!main) return;

  const MAX_KANTE = 1600;      // Fotos werden auf diese Kantenlänge verkleinert
  const MAX_VERLAUF = 100;     // Schritte für Rückgängig
  const VERLAUF_PAUSE = 600;   // ms Tipp-Pause, nach der ein Rückgängig-Schritt entsteht
  let aenderung = 0;           // zählt Änderungen seit dem Laden
  let gespeichert = 0;         // Stand der letzten Speicherung
  let speichertGerade = false;

  // ---------------------------------------------------------------- Werkzeugleiste
  document.documentElement.classList.add('ne-on');

  const leiste = document.createElement('div');
  leiste.id = 'ne-bar';
  leiste.setAttribute('data-editor', '');
  leiste.innerHTML = `
    <span class="ne-brand">Nachlassverwaltung</span>
    <button type="button" data-aktion="rueckgaengig" title="Rückgängig (Strg+Z)">↶ Rückgängig</button>
    <button type="button" data-aktion="wiederholen" title="Wiederholen (Strg+Y)">↷ Wiederholen</button>
    <span class="ne-sep"></span>
    <select data-auswahl="absatz" title="Absatzformat: normaler Text oder Überschrift">
      <option value="">Absatz …</option>
      <option value="p">Normaler Text</option>
      <option value="h3">Überschrift</option>
      <option value="h4">Unterüberschrift</option>
    </select>
    <button type="button" data-aktion="fett" data-format="b" title="Fett (Strg+B)"><b>F</b></button>
    <button type="button" data-aktion="code" data-format="code" title="Als Code formatieren: Internetadressen, IP-Adressen, E-Mail-Adressen, Befehle"><code>Code</code></button>
    <button type="button" data-aktion="ui" data-format="span.ui" title="Als Bedienelement formatieren: Menüpunkte und Knöpfe, z. B. „Einstellungen“"><span class="ne-ui-probe">Menüpunkt</span></button>
    <button type="button" data-aktion="klein" data-format="span.small" title="Kleingedruckt (kleiner, grau)"><small>klein</small></button>
    <button type="button" data-aktion="link" data-format="a" title="Link setzen, ändern oder entfernen">Link</button>
    <button type="button" data-aktion="offen" data-format=".fill" title="Als offen (gelb) markieren bzw. Markierung entfernen">Offen</button>
    <span class="ne-sep"></span>
    <select data-auswahl="liste" title="Liste einfügen oder umwandeln">
      <option value="">Liste …</option>
      <option value="ul">Aufzählung</option>
      <option value="ol">Nummerierte Liste</option>
      <option value="steps">Schritt-für-Schritt-Anleitung</option>
      <option value="check">Checkliste</option>
      <option value="weg">Liste auflösen</option>
    </select>
    <select data-auswahl="kasten" title="Hinweiskasten einfügen, umfärben oder auflösen">
      <option value="">Kasten …</option>
      <option value="info">Hinweis (blau)</option>
      <option value="rot">Wichtig (rot)</option>
      <option value="gelb">Achtung (gelb)</option>
      <option value="gruen">Tipp (grün)</option>
      <option value="todo">Noch auszufüllen</option>
      <option value="weg">Kasten auflösen</option>
    </select>
    <span class="ne-sep"></span>
    <select data-auswahl="tabelle" title="Tabelle einfügen, Spalten ändern oder Tabelle löschen">
      <option value="">Tabelle …</option>
      <option value="neu">Neue Tabelle mit Kopfzeile</option>
      <option value="kv">Neue Tabelle „Bezeichnung – Wert“</option>
      <option value="spalte-plus">Spalte rechts einfügen</option>
      <option value="spalte-minus">Spalte löschen</option>
      <option value="weg">Tabelle löschen</option>
    </select>
    <button type="button" data-aktion="zeile-plus" title="Neue Tabellenzeile unter der aktuellen Zeile">Zeile +</button>
    <button type="button" data-aktion="zeile-minus" title="Aktuelle Tabellenzeile löschen">Zeile −</button>
    <span class="ne-sep"></span>
    <span class="ne-label">Ampel:</span>
    <button type="button" data-aktion="ampel-rot" class="ne-ampel ne-rot" title="Markierung rot: umfärben oder markierten Text zur Markierung machen">●</button>
    <button type="button" data-aktion="ampel-gelb" class="ne-ampel ne-gelb" title="Markierung gelb: umfärben oder markierten Text zur Markierung machen">◆</button>
    <button type="button" data-aktion="ampel-gruen" class="ne-ampel ne-gruen" title="Markierung grün: umfärben oder markierten Text zur Markierung machen">○</button>
    <button type="button" data-aktion="ampel-weg" title="Markierung entfernen (Text bleibt erhalten)">✕</button>
    <span class="ne-spacer"></span>
    <span id="ne-status">Alles gespeichert</span>
    <button type="button" data-aktion="hilfe" title="Kurze Hilfe">?</button>
    <button type="button" data-aktion="drucken">Drucken</button>
    <button type="button" data-aktion="export" title="Eine einzelne HTML-Datei mit eingebetteten Fotos herunterladen">Einzeldatei</button>
    <button type="button" data-aktion="speichern" class="ne-primary" title="Speichern (Strg+S)">Speichern</button>`;
  document.body.prepend(leiste);
  const hoeheSetzen = () => document.documentElement.style.setProperty('--ne-hoehe', leiste.offsetHeight + 'px');
  new ResizeObserver(hoeheSetzen).observe(leiste);
  hoeheSetzen();

  const hilfe = document.createElement('div');
  hilfe.id = 'ne-help';
  hilfe.hidden = true;
  hilfe.setAttribute('data-editor', '');
  hilfe.innerHTML = `
    <h3>So funktioniert die Bearbeitung</h3>
    <ul>
      <li><b>Text ändern:</b> Einfach hineinklicken und tippen.</li>
      <li><b>Rückgängig / Wiederholen:</b> Knöpfe oben links oder Strg+Z / Strg+Y. Das gilt auch für Fotos, Tabellenzeilen und Markierungen.</li>
      <li><b>Gelbe Felder</b> sind noch offen. Ein Klick markiert den Platzhalter, beim Tippen wird er ersetzt und das Gelb verschwindet.</li>
      <li><b>Textformate</b> (F, Code, Menüpunkt, klein, Link, Offen): Text markieren und Knopf drücken. Steht der Cursor schon in so einem Format, entfernt derselbe Knopf es wieder (der Knopf ist dann hervorgehoben).
          <i>Code</i> für Adressen und Befehle, <i>Menüpunkt</i> für Knöpfe und Menüs, die man anklicken soll, <i>Offen</i> für noch auszufüllende Stellen.</li>
      <li><b>Absatz …</b> macht aus dem aktuellen Absatz eine Überschrift oder wieder normalen Text.</li>
      <li><b>Liste …</b> wandelt den Absatz in eine Liste um oder ändert die Art der aktuellen Liste (z. B. in eine Schritt-für-Schritt-Anleitung). Zeilenumbruch ohne neuen Punkt: Shift+Enter.</li>
      <li><b>Kasten …</b> macht aus dem Absatz einen farbigen Hinweiskasten, färbt einen Kasten um oder löst ihn auf.</li>
      <li><b>Tabelle …</b> fügt unter der aktuellen Stelle eine neue Tabelle ein: mit Kopfzeile oder als zweispaltige Tabelle „Bezeichnung – Wert“.
          Steht der Cursor in einer Tabelle, lassen sich dort Spalten einfügen oder löschen oder die ganze Tabelle löschen. Zeilen: „Zeile +“ / „Zeile −“.</li>
      <li><b>Tabellen:</b> Cursor in eine Zeile setzen, dann „Zeile +“ oder „Zeile −“.</li>
      <li><b>Listen:</b> Am Ende eines Punkts Enter drücken erzeugt einen neuen Punkt.</li>
      <li><b>Ampel:</b> Steht der Cursor in einer Markierung (z. B. „Kann weg“), ändert ein Farbknopf ihre Farbe.
          Ist Text markiert, wird daraus eine neue Markierung. Ohne markierten Text wird eine neue Markierung „Markierung“ eingefügt, die du gleich überschreiben kannst.
          ✕ entfernt die Markierung, der Text bleibt stehen.</li>
      <li><b>Fotos:</b> In den gestrichelten Fotobereichen auf „+ Foto hinzufügen“ klicken oder Bilder hineinziehen. Unter der Gerätetabelle (Kapitel 7.2) hat jedes Gerät einen eigenen Bereich. Fotos werden automatisch verkleinert.</li>
      <li><b>Offene Hinweise</b> (gelbe Kästen) über „erledigt“ entfernen.</li>
      <li><b>Speichern</b> legt jedes Mal automatisch eine Sicherung des vorherigen Stands an. Das Datum „Stand“ auf dem Deckblatt wird dabei aktualisiert.</li>
      <li><b>Keine Passwörter eintragen.</b> Die gehören nur in den Passwortmanager und auf das Papierblatt.</li>
    </ul>`;
  document.body.appendChild(hilfe);

  const status = leiste.querySelector('#ne-status');
  const knopf = (aktion) => leiste.querySelector(`[data-aktion="${aktion}"]`);

  function statusSetzen(text, art) {
    status.textContent = text;
    status.className = art ? 'ne-' + art : '';
  }

  // ---------------------------------------------------------------- Bearbeitungselemente
  main.contentEditable = 'true';
  main.spellcheck = true;

  // Offene Hinweise (.todo) bekommen einen "erledigt"-Knopf
  function todoKnopf(todo) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ne-todo-x';
    b.textContent = 'erledigt ✓';
    b.setAttribute('data-editor', '');
    b.contentEditable = 'false';
    b.addEventListener('click', () => {
      if (confirm('Diesen offenen Hinweis entfernen?')) { vorAktion(); todo.remove(); geaendert(); }
    });
    todo.prepend(b);
  }

  function fotoWerkzeuge(fig) {
    const cap = fig.querySelector('figcaption') || fig.appendChild(document.createElement('figcaption'));
    cap.contentEditable = 'true';
    const w = document.createElement('div');
    w.className = 'ne-figtools';
    w.setAttribute('data-editor', '');
    w.innerHTML = '<button type="button" title="Nach links">←</button><button type="button" title="Nach rechts">→</button><button type="button" title="Foto entfernen">✕</button>';
    const [links, rechts, weg] = w.querySelectorAll('button');
    links.addEventListener('click', () => {
      const vor = fig.previousElementSibling;
      if (vor && vor.matches('figure.foto')) { vorAktion(); fig.parentNode.insertBefore(fig, vor); geaendert(); }
    });
    rechts.addEventListener('click', () => {
      const nach = fig.nextElementSibling;
      if (nach && nach.matches('figure.foto')) { vorAktion(); fig.parentNode.insertBefore(nach, fig); geaendert(); }
    });
    weg.addEventListener('click', () => {
      if (confirm('Foto aus dem Dokument entfernen?\n(Lässt sich mit „Rückgängig“ zurückholen.)')) {
        vorAktion(); fig.remove(); geaendert();
      }
    });
    fig.appendChild(w);
  }

  function fotobereich(bereich) {
    bereich.contentEditable = 'false';
    // Beschriftung, wofür der Bereich gedacht ist (nicht bei Gerätekarten, die haben einen Namen)
    if (bereich.dataset.titel && !bereich.closest('.geraet')) {
      const titel = document.createElement('div');
      titel.className = 'ne-slot-titel';
      titel.setAttribute('data-editor', '');
      titel.textContent = 'Fotos: ' + bereich.dataset.titel;
      bereich.prepend(titel);
    }
    bereich.querySelectorAll('figure.foto').forEach(fotoWerkzeuge);

    const hinzu = document.createElement('label');
    hinzu.className = 'ne-add';
    hinzu.setAttribute('data-editor', '');
    hinzu.innerHTML = '<span>+ Foto hinzufügen</span><small>oder Bilder hierher ziehen</small>';
    const eingabe = document.createElement('input');
    eingabe.type = 'file';
    eingabe.accept = 'image/jpeg,image/png,image/webp,image/*';
    eingabe.multiple = true;
    eingabe.hidden = true;
    eingabe.addEventListener('change', () => { fotosHochladen(bereich, eingabe.files); eingabe.value = ''; });
    hinzu.appendChild(eingabe);
    bereich.appendChild(hinzu);

    bereich.addEventListener('dragover', (e) => { e.preventDefault(); bereich.classList.add('ne-drop'); });
    bereich.addEventListener('dragleave', () => bereich.classList.remove('ne-drop'));
    bereich.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      bereich.classList.remove('ne-drop');
      fotosHochladen(bereich, e.dataTransfer.files);
    });
  }

  // Wird beim Start und nach jedem Rückgängig/Wiederholen ausgeführt
  function dekorieren() {
    main.querySelectorAll('svg').forEach((svg) => svg.setAttribute('contenteditable', 'false'));
    main.querySelectorAll('.todo').forEach(todoKnopf);
    main.querySelectorAll('.fotos').forEach(fotobereich);
  }
  dekorieren();

  // Dateien, die neben einen Fotobereich fallen, nicht als Seite öffnen
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());

  // ---------------------------------------------------------------- Fotos hochladen
  async function verkleinern(datei) {
    let bild;
    try {
      bild = await createImageBitmap(datei, { imageOrientation: 'from-image' });
    } catch (e) {
      try {
        bild = await createImageBitmap(datei);
      } catch (e2) {
        throw new Error(`„${datei.name}“ kann der Browser nicht lesen (z. B. HEIC vom iPhone). Bitte als JPG oder PNG speichern.`);
      }
    }
    const faktor = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height));
    const b = Math.round(bild.width * faktor);
    const h = Math.round(bild.height * faktor);
    const leinwand = document.createElement('canvas');
    leinwand.width = b;
    leinwand.height = h;
    const ctx = leinwand.getContext('2d');
    const png = datei.type === 'image/png';
    if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, b, h); }
    ctx.drawImage(bild, 0, 0, b, h);
    if (bild.close) bild.close();
    return new Promise((ok, fehler) => leinwand.toBlob(
      (blob) => (blob ? ok(blob) : fehler(new Error('Bild konnte nicht umgewandelt werden.'))),
      png ? 'image/png' : 'image/jpeg', 0.85));
  }

  async function fotosHochladen(bereich, dateien) {
    const bilder = [...dateien].filter((d) => d.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(d.name));
    if (!bilder.length) return;
    vorAktion();
    for (let i = 0; i < bilder.length; i++) {
      statusSetzen(`Foto ${i + 1} von ${bilder.length} wird hochgeladen …`, 'dirty');
      try {
        const blob = await verkleinern(bilder[i]);
        const antwort = await fetch('/api/foto?slot=' + encodeURIComponent(bereich.dataset.slot || 'foto'), {
          method: 'POST',
          headers: { 'Content-Type': blob.type, 'X-Nachlass': '1' },
          body: blob,
        });
        const daten = await antwort.json().catch(() => ({}));
        if (!antwort.ok) throw new Error(daten.fehler || antwort.statusText);
        // Bereich kann durch Rückgängig während des Hochladens ersetzt worden sein
        const ziel = main.contains(bereich) ? bereich
          : main.querySelector(`.fotos[data-slot="${CSS.escape(bereich.dataset.slot || '')}"]`);
        if (!ziel) continue;

        const fig = document.createElement('figure');
        fig.className = 'foto';
        const img = document.createElement('img');
        img.src = daten.src;
        img.alt = '';
        fig.appendChild(img);
        fig.appendChild(document.createElement('figcaption'));
        ziel.insertBefore(fig, ziel.querySelector('.ne-add'));
        fotoWerkzeuge(fig);
        geaendert();
      } catch (e) {
        alert('Foto konnte nicht hinzugefügt werden:\n' + e.message);
      }
    }
    statusAktualisieren();
  }

  // ---------------------------------------------------------------- Bereinigen
  // Entfernt alles, was nur der Editor hinzufügt
  function saeubern(wurzel) {
    if (wurzel.style) {
      wurzel.style.removeProperty('--ne-hoehe');
      if (!wurzel.getAttribute('style')) wurzel.removeAttribute('style');
    }
    wurzel.querySelectorAll('[data-editor]').forEach((n) => n.remove());
    wurzel.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
    wurzel.querySelectorAll('[spellcheck]').forEach((n) => n.removeAttribute('spellcheck'));
    [wurzel, ...wurzel.querySelectorAll('[class]')].forEach((n) => {
      [...n.classList].filter((k) => k.startsWith('ne-')).forEach((k) => n.classList.remove(k));
      if (n.hasAttribute('class') && !n.classList.length) n.removeAttribute('class');
    });
    return wurzel;
  }

  function mainHtml() {
    return saeubern(main.cloneNode(true)).innerHTML;
  }

  // ---------------------------------------------------------------- Inhaltsverzeichnis und Seitenleiste
  function ueberschriftText(h) {
    const kopie = h.cloneNode(true);
    kopie.querySelectorAll('.num, [data-editor]').forEach((n) => n.remove());
    return kopie.textContent.replace(/\s+/g, ' ').trim();
  }

  // Überträgt eine geänderte Überschrift in den passenden Eintrag des Inhaltsverzeichnisses
  function inhaltAbgleichen(h) {
    if (!h || !h.id) return;
    const link = main.querySelector(`#toc a[href="#${CSS.escape(h.id)}"]`);
    if (!link) return;
    const text = ueberschriftText(h);
    const nummer = link.querySelector('.n');
    const kapitel = h.querySelector('.num');
    if (nummer && kapitel && nummer.textContent !== kapitel.textContent.trim()) {
      nummer.textContent = kapitel.textContent.trim();
    }
    const bisher = (nummer ? link.textContent.slice(nummer.textContent.length) : link.textContent).trim();
    if (bisher === text) return;
    link.textContent = '';
    if (nummer) link.appendChild(nummer);
    link.appendChild(document.createTextNode(text));
  }

  // Die linke Navigationsleiste ist eine Kopie des Inhaltsverzeichnisses.
  // Das Dokument bringt dafür seitenleisteAufbauen() mit (trennt Nummern mit " - ").
  function seitenleisteAktualisieren() {
    if (typeof window.seitenleisteAufbauen === 'function') { window.seitenleisteAufbauen(); return; }
    const ziel = document.getElementById('sidenav-list');
    const quelle = main.querySelector('#toc > ol');
    if (!ziel || !quelle) return;
    ziel.replaceChildren(saeubern(quelle.cloneNode(true)));
  }

  // ---------------------------------------------------------------- Verlauf (Rückgängig / Wiederholen)
  // Eigener Verlauf statt des Browser-Verlaufs, damit auch Fotos, Zeilen und Markierungen erfasst werden.
  const verlauf = [mainHtml()];
  let position = 0;
  let geplant = null;

  function schnappschuss() {
    clearTimeout(geplant);
    geplant = null;
    const html = mainHtml();
    if (html !== verlauf[position]) {
      verlauf.splice(position + 1);
      verlauf.push(html);
      if (verlauf.length > MAX_VERLAUF) verlauf.shift();
      position = verlauf.length - 1;
    }
    seitenleisteAktualisieren();
    verlaufKnoepfe();
  }

  function schnappschussPlanen() {
    clearTimeout(geplant);
    geplant = setTimeout(schnappschuss, VERLAUF_PAUSE);
    verlaufKnoepfe();
  }

  // Vor größeren Aktionen: bisheriges Tippen als eigenen Schritt abschließen
  function vorAktion() {
    if (geplant) schnappschuss();
  }

  function wiederherstellen(html) {
    const y = window.scrollY;
    main.innerHTML = html;
    dekorieren();
    beobachter.takeRecords();
    seitenleisteAktualisieren();
    aenderung++;
    statusAktualisieren();
    verlaufKnoepfe();
    window.scrollTo(0, y);
  }

  function rueckgaengig() {
    vorAktion();
    if (position > 0) wiederherstellen(verlauf[--position]);
  }

  function wiederholen() {
    vorAktion();
    if (position < verlauf.length - 1) wiederherstellen(verlauf[++position]);
  }

  function verlaufKnoepfe() {
    knopf('rueckgaengig').disabled = position === 0 && !geplant;
    knopf('wiederholen').disabled = position >= verlauf.length - 1 || !!geplant;
  }

  // ---------------------------------------------------------------- Änderungen verfolgen
  function geaendert() {
    aenderung++;
    statusAktualisieren();
    schnappschussPlanen();
  }
  function statusAktualisieren() {
    if (aenderung !== gespeichert) statusSetzen('Ungespeicherte Änderungen', 'dirty');
    else statusSetzen('Alles gespeichert');
  }
  const beobachter = new MutationObserver(geaendert);
  beobachter.observe(main, { subtree: true, childList: true, characterData: true });

  window.addEventListener('beforeunload', (e) => {
    if (aenderung !== gespeichert) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------------------------------------------------------------- Platzhalter (.fill)
  main.addEventListener('click', (e) => {
    const feld = e.target.closest && e.target.closest('.fill');
    if (!feld || !main.contains(feld)) return;
    const auswahl = window.getSelection();
    if (!auswahl.isCollapsed) return;
    const bereich = document.createRange();
    bereich.selectNodeContents(feld);
    auswahl.removeAllRanges();
    auswahl.addRange(bereich);
  });

  // Sobald in einem gelben Feld getippt wurde, gilt es als ausgefüllt.
  main.addEventListener('input', () => {
    const el = aktuellesElement();
    const feld = el?.closest('.fill');
    if (feld && feld.textContent.trim()) auspacken(feld);
    const ueberschrift = el?.closest('h2[id], h3[id], h4[id]');
    if (ueberschrift) {
      inhaltAbgleichen(ueberschrift);
      seitenleisteAktualisieren();
    }
  });

  function auspacken(el) {
    const eltern = el.parentNode;
    while (el.firstChild) eltern.insertBefore(el.firstChild, el);
    el.remove();
  }

  // Nur reinen Text einfügen, damit keine fremden Formatierungen hineingeraten
  main.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });

  // Rückgängig über Kontextmenü oder Systemtasten auf den eigenen Verlauf umleiten
  main.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'historyUndo') { e.preventDefault(); rueckgaengig(); }
    if (e.inputType === 'historyRedo') { e.preventDefault(); wiederholen(); }
  });

  // ---------------------------------------------------------------- Kontext
  function aktuellesElement() {
    const auswahl = window.getSelection();
    if (!auswahl.rangeCount) return null;
    let knoten = auswahl.getRangeAt(0).startContainer;
    if (knoten.nodeType === Node.TEXT_NODE) knoten = knoten.parentNode;
    return knoten && main.contains(knoten) ? knoten : null;
  }
  function aktuelleZeile() {
    const tr = aktuellesElement()?.closest('tr');
    return tr && tr.parentNode && tr.parentNode.tagName !== 'THEAD' ? tr : null;
  }

  function kontextAktualisieren() {
    const el = aktuellesElement();
    const zeile = aktuelleZeile();
    knopf('zeile-plus').disabled = !zeile;
    knopf('zeile-minus').disabled = !zeile;
    const inFotobereich = !!(el && el.closest('.fotos, svg'));
    ['rot', 'gelb', 'gruen'].forEach((f) => { knopf('ampel-' + f).disabled = !el || inFotobereich; });
    knopf('ampel-weg').disabled = !(el && el.closest('.tag'));
    leiste.querySelectorAll('button[data-format]').forEach((b) => {
      b.disabled = !el || inFotobereich;
      const aktiv = !!(el && b.dataset.format !== 'b' && el.closest(b.dataset.format));
      b.classList.toggle('ne-aktiv', aktiv);
    });
  }
  document.addEventListener('selectionchange', kontextAktualisieren);
  kontextAktualisieren();
  verlaufKnoepfe();

  // ---------------------------------------------------------------- Formatierungen
  const BLOECKE = 'p, div, li, ul, ol, table, tr, td, th, h1, h2, h3, h4, h5, figure, pre, section';

  function inhaltAuswaehlen(el) {
    const r = document.createRange();
    r.selectNodeContents(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(r);
  }
  function cursorAnsEnde(el) {
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(r);
  }

  // Oberster Block (direkt in main, section oder nav), in dem das Element liegt
  function blockVon(el) {
    let b = el;
    while (b && b.parentElement && b.parentElement !== main && !b.parentElement.matches('section, nav')) b = b.parentElement;
    return b && b !== main && main.contains(b) ? b : null;
  }

  // Textformat umschalten: Cursor im Format → Format entfernen, sonst Auswahl damit umschließen
  function textFormat(selektor, erzeugen, platzhalter) {
    const el = aktuellesElement();
    if (!el) return;
    const vorhanden = el.closest(selektor);
    if (vorhanden && main.contains(vorhanden)) { auspacken(vorhanden); return; }
    const bereich = window.getSelection().getRangeAt(0);
    if (!bereich.collapsed && bereich.cloneContents().querySelector(BLOECKE + ', ' + selektor)) {
      alert('Bitte nur Text innerhalb eines Absatzes bzw. einer Tabellenzelle markieren.');
      return;
    }
    const neu = erzeugen();
    if (bereich.collapsed) neu.textContent = platzhalter;
    else neu.appendChild(bereich.extractContents());
    bereich.insertNode(neu);
    inhaltAuswaehlen(neu);
  }

  function elementMitKlasse(tag, klasse) {
    return () => { const n = document.createElement(tag); if (klasse) n.className = klasse; return n; };
  }

  function linkBearbeiten() {
    const el = aktuellesElement();
    if (!el) return;
    const bereich = window.getSelection().getRangeAt(0).cloneRange();
    const a = el.closest('a');
    const eingabe = prompt('Linkziel eingeben:\n• Internetadresse, z. B. https://www.beispiel.de\n• E-Mail, z. B. mailto:name@beispiel.de\n• Kapitel in diesem Dokument, z. B. #k4-3\n\nLeer lassen entfernt den Link.',
      a ? a.getAttribute('href') : 'https://');
    if (eingabe === null) return;
    const ziel = eingabe.trim();
    if (ziel && !/^(https?:\/\/|mailto:|#)/i.test(ziel)) {
      alert('Erlaubt sind Adressen, die mit https://, http://, mailto: oder # beginnen.');
      return;
    }
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(bereich);
    if (a && main.contains(a)) {
      if (!ziel) auspacken(a);
      else { a.setAttribute('href', ziel); geaendert(); }
      return;
    }
    if (!ziel || ziel === 'https://') return;
    textFormat('a', () => { const n = document.createElement('a'); n.href = ziel; return n; }, ziel);
  }

  function absatzFormat(ziel) {
    if (!['p', 'h3', 'h4'].includes(ziel)) return;
    const el = aktuellesElement();
    const block = el && el.closest('p, h3, h4');
    if (!block || !main.contains(block) || block.closest('li, td, th, nav')) {
      alert('Bitte den Cursor in einen normalen Absatz oder eine Überschrift setzen.');
      return;
    }
    if (block.tagName.toLowerCase() === ziel) return;
    const neu = document.createElement(ziel);
    if (block.id) neu.id = block.id;
    while (block.firstChild) neu.appendChild(block.firstChild);
    block.replaceWith(neu);
    cursorAnsEnde(neu);
  }

  const LISTEN = { ul: ['ul', ''], ol: ['ol', ''], steps: ['ol', 'steps'], check: ['ul', 'check'] };

  function listenFormat(art) {
    const el = aktuellesElement();
    if (!el) return;
    if (el.closest('nav')) { alert('Das Inhaltsverzeichnis bitte nicht umformatieren.'); return; }
    const liste = el.closest('ul, ol');
    if (liste && main.contains(liste)) {
      if (art === 'weg') {
        const absaetze = [...liste.children].map((li) => {
          const p = document.createElement('p');
          while (li.firstChild) p.appendChild(li.firstChild);
          return p;
        });
        liste.replaceWith(...absaetze);
        if (absaetze.length) cursorAnsEnde(absaetze[0]);
        return;
      }
      const [tag, klasse] = LISTEN[art];
      let ziel = liste;
      if (liste.tagName.toLowerCase() !== tag) {
        ziel = document.createElement(tag);
        while (liste.firstChild) ziel.appendChild(liste.firstChild);
        liste.replaceWith(ziel);
      }
      if (klasse) ziel.className = klasse; else ziel.removeAttribute('class');
      geaendert();
      if (ziel.lastElementChild) cursorAnsEnde(ziel.lastElementChild);
      return;
    }
    if (art === 'weg') return;
    const [tag, klasse] = LISTEN[art];
    const neu = document.createElement(tag);
    if (klasse) neu.className = klasse;
    const li = document.createElement('li');
    neu.appendChild(li);
    const absatz = el.closest('p');
    if (absatz && main.contains(absatz) && !absatz.closest('td, th, li')) {
      while (absatz.firstChild) li.appendChild(absatz.firstChild);
      absatz.replaceWith(neu);
      cursorAnsEnde(li);
    } else {
      const block = blockVon(el);
      if (!block) return;
      li.textContent = 'Punkt';
      block.after(neu);
      inhaltAuswaehlen(li);
    }
  }

  const KAESTEN = { info: 'box', rot: 'box rot', gelb: 'box gelb', gruen: 'box gruen', todo: 'todo' };

  function kastenAufloesen(kasten) {
    const titel = kasten.querySelector(':scope > .title');
    if (titel) { const b = document.createElement('b'); b.textContent = titel.textContent; titel.replaceWith(b); }
    // Lose Textteile zu Absätzen zusammenfassen, Blöcke (Listen, Absätze) bleiben erhalten
    const teile = [];
    let absatz = null;
    [...kasten.childNodes].forEach((n) => {
      if (n.nodeType === Node.ELEMENT_NODE && n.matches('p, ul, ol, div, table, pre, h3, h4')) {
        absatz = null;
        teile.push(n);
      } else {
        if (n.nodeType === Node.TEXT_NODE && !n.textContent.trim() && !absatz) return;
        if (!absatz) { absatz = document.createElement('p'); teile.push(absatz); }
        absatz.appendChild(n);
      }
    });
    kasten.replaceWith(...teile);
  }

  function kastenFormat(art) {
    const el = aktuellesElement();
    if (!el) return;
    const kasten = el.closest('.box, .todo');
    if (kasten && main.contains(kasten)) {
      kasten.querySelectorAll(':scope > .ne-todo-x').forEach((n) => n.remove());
      if (art === 'weg') { kastenAufloesen(kasten); return; }
      kasten.className = KAESTEN[art];
      if (art === 'todo') todoKnopf(kasten);
      geaendert();
      return;
    }
    if (art === 'weg') return;
    const neu = document.createElement('div');
    neu.className = KAESTEN[art];
    const absatz = el.closest('p');
    if (absatz && main.contains(absatz) && !absatz.closest('td, th, li')) {
      while (absatz.firstChild) neu.appendChild(absatz.firstChild);
      absatz.replaceWith(neu);
    } else {
      const block = blockVon(el);
      if (!block) return;
      neu.textContent = 'Text';
      block.after(neu);
    }
    if (art === 'todo') todoKnopf(neu);
    cursorAnsEnde(neu);
  }

  // ---------- Tabellen
  function zelle(tag, inhalt) {
    const z = document.createElement(tag);
    if (inhalt) z.textContent = inhalt; else z.innerHTML = '<br>';
    return z;
  }

  function tabelleEinfuegen(art) {
    const el = aktuellesElement();
    const block = el && blockVon(el);
    if (!block || el.closest('.fotos, svg, nav')) { alert('Bitte zuerst an die Stelle klicken, unter der die Tabelle erscheinen soll.'); return; }
    const huelle = document.createElement('div');
    huelle.className = 'tablewrap';
    const tabelle = document.createElement('table');
    huelle.appendChild(tabelle);
    const rumpf = document.createElement('tbody');

    if (art === 'kv') {
      tabelle.className = 'kv';
      for (let i = 0; i < 3; i++) {
        const tr = document.createElement('tr');
        tr.append(zelle('th', 'Bezeichnung'), zelle('td'));
        rumpf.appendChild(tr);
      }
      tabelle.appendChild(rumpf);
    } else {
      const eingabe = prompt('Wie viele Spalten soll die Tabelle haben? (1 bis 8)', '3');
      if (eingabe === null) return;
      const spalten = parseInt(eingabe, 10);
      if (!(spalten >= 1 && spalten <= 8)) { alert('Bitte eine Zahl von 1 bis 8 eingeben.'); return; }
      const kopf = document.createElement('thead');
      const kopfzeile = document.createElement('tr');
      for (let i = 1; i <= spalten; i++) kopfzeile.appendChild(zelle('th', 'Spalte ' + i));
      kopf.appendChild(kopfzeile);
      for (let r = 0; r < 2; r++) {
        const tr = document.createElement('tr');
        for (let i = 0; i < spalten; i++) tr.appendChild(zelle('td'));
        rumpf.appendChild(tr);
      }
      tabelle.append(kopf, rumpf);
    }
    block.after(huelle);
    inhaltAuswaehlen(tabelle.rows[0].cells[0]);
  }

  function aktuelleZelle() {
    const z = aktuellesElement()?.closest('td, th');
    return z && main.contains(z) ? z : null;
  }

  function spalteAendern(art) {
    const z = aktuelleZelle();
    if (!z) { alert('Bitte den Cursor in eine Zelle der Tabelle setzen.'); return; }
    const tabelle = z.closest('table');
    const index = z.cellIndex;
    const zeilen = [...tabelle.rows];
    if (art === 'spalte-minus') {
      if (z.parentNode.cells.length <= 1) { alert('Die letzte Spalte kann nicht gelöscht werden. Dafür „Tabelle löschen“ verwenden.'); return; }
      zeilen.forEach((tr) => { if (tr.cells[index]) tr.cells[index].remove(); });
      return;
    }
    zeilen.forEach((tr) => {
      const vorlage = tr.cells[index];
      const neu = zelle(vorlage && vorlage.tagName === 'TH' && tr.parentNode.tagName === 'THEAD' ? 'th' : 'td',
        tr.parentNode.tagName === 'THEAD' ? 'Neue Spalte' : '');
      if (vorlage) vorlage.after(neu); else tr.appendChild(neu);
    });
    const ziel = z.parentNode.cells[index + 1];
    if (ziel) inhaltAuswaehlen(ziel);
  }

  function tabelleLoeschen() {
    const z = aktuelleZelle();
    if (!z) { alert('Bitte den Cursor in die Tabelle setzen, die gelöscht werden soll.'); return; }
    const tabelle = z.closest('table');
    if (!confirm('Die ganze Tabelle löschen?\n(Lässt sich mit „Rückgängig“ zurückholen.)')) return;
    const huelle = tabelle.parentElement.matches('.tablewrap') ? tabelle.parentElement : tabelle;
    huelle.remove();
  }

  function tabellenAktion(art) {
    if (art === 'neu' || art === 'kv') tabelleEinfuegen(art);
    else if (art === 'weg') tabelleLoeschen();
    else spalteAendern(art);
  }

  // Auswahlmenüs nehmen dem Text den Fokus – deshalb die letzte Textposition merken
  let gemerkterBereich = null;
  document.addEventListener('selectionchange', () => {
    const auswahl = window.getSelection();
    if (auswahl.rangeCount && aktuellesElement()) gemerkterBereich = auswahl.getRangeAt(0).cloneRange();
  });
  const AUSWAHL = { absatz: absatzFormat, liste: listenFormat, kasten: kastenFormat, tabelle: tabellenAktion };
  leiste.querySelectorAll('select[data-auswahl]').forEach((feld) => {
    feld.addEventListener('change', () => {
      const wert = feld.value;
      feld.value = '';
      if (!wert) return;
      if (!gemerkterBereich || !main.contains(gemerkterBereich.startContainer)) {
        alert('Bitte zuerst an die gewünschte Stelle im Text klicken.');
        return;
      }
      main.focus({ preventScroll: true });
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(gemerkterBereich);
      vorAktion();
      AUSWAHL[feld.dataset.auswahl](wert);
    });
  });

  // ---------------------------------------------------------------- Aktionen
  const aktionen = {
    rueckgaengig,
    wiederholen,

    fett() { document.execCommand('bold'); },

    offen() { textFormat('.fill', elementMitKlasse('span', 'fill'), '…'); },
    code() { textFormat('code', elementMitKlasse('code'), 'Code'); },
    ui() { textFormat('span.ui', elementMitKlasse('span', 'ui'), 'Menüpunkt'); },
    klein() { textFormat('span.small', elementMitKlasse('span', 'small muted'), 'Hinweis'); },
    link: linkBearbeiten,

    'zeile-plus'() {
      const zeile = aktuelleZeile();
      if (!zeile) return;
      const neu = zeile.cloneNode(true);
      neu.querySelectorAll('td, th').forEach((zelle) => { zelle.innerHTML = '<br>'; });
      zeile.after(neu);
      const ziel = document.createRange();
      ziel.setStart(neu.cells[0], 0);
      ziel.collapse(true);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(ziel);
    },

    'zeile-minus'() {
      const zeile = aktuelleZeile();
      if (!zeile) return;
      if (zeile.parentNode.rows.length <= 1) { alert('Die letzte Zeile einer Tabelle kann nicht gelöscht werden.'); return; }
      zeile.remove();
    },

    'ampel-rot'() { ampel('rot'); },
    'ampel-gelb'() { ampel('gelb'); },
    'ampel-gruen'() { ampel('gruen'); },
    'ampel-weg'() {
      const tag = aktuellesElement()?.closest('.tag');
      if (tag) auspacken(tag);
    },

    hilfe() { hilfe.hidden = !hilfe.hidden; },
    drucken() { window.print(); },

    export() {
      if (aenderung !== gespeichert && !confirm('Es gibt ungespeicherte Änderungen. Die Einzeldatei enthält nur den gespeicherten Stand.\n\nTrotzdem fortfahren?')) return;
      window.location.href = '/api/export';
    },

    speichern,
  };

  // Bestehende Markierung umfärben – oder markierten Text zu einer neuen Markierung machen
  function ampel(farbe) {
    const el = aktuellesElement();
    if (!el) return;
    const tag = el.closest('.tag');
    if (tag) {
      tag.classList.remove('rot', 'gelb', 'gruen');
      tag.classList.add(farbe);
      geaendert();
      return;
    }
    const auswahl = window.getSelection();
    const bereich = auswahl.getRangeAt(0);
    if (!bereich.collapsed) {
      // Nur innerhalb eines Absatzes bzw. einer Zelle, sonst würde die Struktur zerrissen
      const probe = bereich.cloneContents();
      if (probe.querySelector('p, div, li, ul, ol, table, tr, td, th, h1, h2, h3, h4, h5, figure, .tag')) {
        alert('Bitte nur Text innerhalb eines Absatzes bzw. einer Tabellenzelle markieren, der noch keine Markierung enthält.');
        return;
      }
    }
    const span = document.createElement('span');
    span.className = 'tag ' + farbe;
    if (bereich.collapsed) span.textContent = 'Markierung';
    else span.appendChild(bereich.extractContents());
    bereich.insertNode(span);
    const neu = document.createRange();
    neu.selectNodeContents(span);
    auswahl.removeAllRanges();
    auswahl.addRange(neu);
  }

  // mousedown statt click, damit die Textauswahl im Dokument erhalten bleibt
  leiste.addEventListener('mousedown', (e) => {
    const b = e.target.closest('button[data-aktion]');
    if (!b) return;
    e.preventDefault();
    if (b.disabled) return;
    if (b.dataset.aktion !== 'rueckgaengig' && b.dataset.aktion !== 'wiederholen') vorAktion();
    aktionen[b.dataset.aktion]();
  });

  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const taste = e.key.toLowerCase();
    if (taste === 's') { e.preventDefault(); speichern(); }
    else if (taste === 'z' && !e.shiftKey) { e.preventDefault(); rueckgaengig(); }
    else if (taste === 'y' || (taste === 'z' && e.shiftKey)) { e.preventDefault(); wiederholen(); }
  });

  // ---------------------------------------------------------------- Speichern
  function heute() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }

  function bereinigtesHtml() {
    const wurzel = saeubern(document.documentElement.cloneNode(true));
    wurzel.querySelectorAll('.fill').forEach((n) => { if (!n.textContent.trim()) n.remove(); });
    wurzel.querySelectorAll('.fotos').forEach((n) => { if (!n.querySelector('figure')) n.innerHTML = ''; });
    const nav = wurzel.querySelector('#sidenav-list');
    if (nav) nav.innerHTML = '';
    return '<!doctype html>\n' + wurzel.outerHTML + '\n';
  }

  async function speichern() {
    if (speichertGerade) return;
    speichertGerade = true;
    statusSetzen('Speichere …', 'dirty');
    try {
      const stand = document.getElementById('stand-datum');
      if (stand && stand.textContent !== heute()) {
        stand.textContent = heute();
        beobachter.takeRecords();
        schnappschuss();
      }
      const stempel = aenderung;
      const antwort = await fetch('/api/speichern', {
        method: 'POST',
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Nachlass': '1' },
        body: bereinigtesHtml(),
      });
      const daten = await antwort.json().catch(() => ({}));
      if (!antwort.ok) throw new Error(daten.fehler || antwort.statusText);
      gespeichert = stempel;
      statusAktualisieren();
      if (aenderung === gespeichert) {
        statusSetzen('Gespeichert um ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (e) {
      statusSetzen('Speichern fehlgeschlagen!', 'error');
      alert('Speichern fehlgeschlagen:\n' + e.message + '\n\nLäuft der Server noch? (./start.sh)');
    } finally {
      speichertGerade = false;
    }
  }
})();
