/* Feniks π: natalna karta i duboko čitanje na početnoj stranici. Sve se računa u pregledniku; podaci ne odlaze nikamo.
   Teške datoteke (efemeride, asteroidi) učitavaju se tek pri prvom izračunu. Kopiranje i dijeljenje zadano bez podataka o rođenju. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); }, t = I18n.t, forma = $('#karta-forma'), izlaz = $('#karta-izlaz');
  if (!forma) return;

  /* mjesto: upis bilo kojeg grada na svijetu (koordinate i zona se upisuju same) ili ručne koordinate */
  var odabranoMjesto = null;
  forma.zona.innerHTML = Mjesta.zone().map(function (z) { return '<option>' + z + '</option>'; }).join('');
  forma.zona.value = 'Europe/Zagreb';
  MjestoTrazi.spoji(forma.mjesto, function (m) {
    odabranoMjesto = m;
    $('#karta-odabrano').textContent = m.lat.toFixed(2) + '°, ' + m.lon.toFixed(2) + '° · ' + m.zona;
  });
  forma.mjesto.addEventListener('input', function () { odabranoMjesto = null; $('#karta-odabrano').textContent = ''; });
  forma.rucno.addEventListener('change', function () { $('#karta-koord').hidden = !forma.rucno.checked; forma.mjesto.disabled = forma.rucno.checked; });
  forma.neznam.addEventListener('change', function () { forma.vrijeme.disabled = forma.neznam.checked; });
  function popuniMjesta() {}

  /* lijeno učitavanje skripti za izračun */
  var ucitano = null;
  function ucitaj() {
    if (ucitano) return ucitano;
    var skripte = ['/app/astronomy.js', '/app/asteroids.js', '/app/core.js', '/app/nebo.js', '/app/kineski.js', '/app/helenisticki.js', '/app/citanje.js'];
    ucitano = skripte.reduce(function (p, src) {
      return p.then(function () { return new Promise(function (ok, ne) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ne; document.head.appendChild(s); }); });
    }, Promise.resolve());
    return ucitano;
  }

  function podaci() {
    var d = forma.datum.value.split('-'), bez = forma.neznam.checked, v = (forma.vrijeme.value || '12:00').split(':');
    if (d.length !== 3 || (!bez && !forma.vrijeme.value) || !forma.spol.value) return null;
    var m;
    if (forma.rucno.checked) {
      var la = parseFloat(String(forma.lat.value).replace(',', '.')), lo = parseFloat(String(forma.lon.value).replace(',', '.'));
      if (!(Math.abs(la) <= 90 && Math.abs(lo) <= 180)) return null;
      m = { ime: la.toFixed(2) + ', ' + lo.toFixed(2), lat: la, lon: lo, zona: forma.zona.value };
    } else if (odabranoMjesto) m = { ime: [odabranoMjesto.ime, odabranoMjesto.zemlja].filter(Boolean).join(', '), lat: odabranoMjesto.lat, lon: odabranoMjesto.lon, zona: odabranoMjesto.zona };
    else m = Mjesta.dohvati(forma.mjesto.value.split(',')[0].trim());   // upisano ime s kratkog popisa (bez odabira)
    if (!m) return null;
    return { g: +d[0], m: +d[1], d: +d[2], h: +v[0], min: +v[1], bezVremena: bez, lat: m.lat, lon: m.lon, zona: m.zona, mjesto: m.ime, ime: forma.ime.value.trim(), spol: forma.spol.value };
  }

  var zadnje = null;
  function prikazi() {
    if (!zadnje) return;
    var c = Citanje.procitaj(zadnje.k);
    zadnje.c = c;
    izlaz.innerHTML =
      '<h3 class="karta-naslov">' + esc(c.naslov.trim()) + '</h3><p class="karta-sazetak">' + esc(c.sazetak) + '</p>' +
      '<div class="karta-akcije"><button type="button" class="gumb" id="k-kopiraj">' + t('nat.kopiraj') + '</button>' +
      '<button type="button" class="gumb" id="k-podijeli">' + t('nat.podijeli') + '</button>' +
      '<button type="button" class="gumb" id="k-datoteka">' + t('nat.datoteka') + '</button>' +
      '<button type="button" class="gumb" id="k-ai">' + t('nat.ai') + '</button>' +
      '<a class="gumb" id="k-app" href="/app/">' + t('nat.uAplikaciju') + '</a></div>' +
      '<label class="karta-check"><input type="checkbox" id="k-podaci"> ' + t('nat.sPodacima') + '</label>' +
      '<p id="k-poruka" class="karta-poruka" aria-live="polite"></p><div id="k-dijeli" class="karta-dijeli" hidden></div>' +
      '<section id="k-ai-tekst" class="karta-dio"' + (zadnje.ai ? '' : ' hidden') + '>' + (zadnje.ai ? aiHtml(zadnje.ai) : '') + '</section>' +
      '<details class="karta-polozaji" open><summary>' + t('nat.polozaji') + '</summary><table>' + c.tablica.map(function (x) {
        return '<tr><td class="g">' + x.glif + '</td><td>' + esc(x.ime) + '</td><td>' + esc(x.polozaj) + '</td></tr>';
      }).join('') + '</table></details>' +
      c.dijelovi.map(function (d) { return '<section class="karta-dio"><h4>' + d.naslov + '</h4>' + d.html + '</section>'; }).join('');
    $('#k-kopiraj').addEventListener('click', kopiraj);
    $('#k-podijeli').addEventListener('click', podijeli);
    $('#k-datoteka').addEventListener('click', spremiDatoteku);
    $('#k-ai').addEventListener('click', dubljeCitanje);
    $('#k-app').addEventListener('click', spremiUAplikaciju);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  forma.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = podaci(); if (!r) { izlaz.innerHTML = '<p class="karta-poruka">' + t('nat.forma.greska') + '</p>'; return; }
    var gumb = forma.querySelector('button[type=submit]'); gumb.disabled = true; gumb.textContent = t('nat.forma.racunam');
    ucitaj().then(function () {
      var k = Citanje.izracunaj(r);
      if (!k) throw new Error('vrijeme');
      zadnje = { r: r, k: k }; prikazi(); pokaziLink();
      izlaz.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function () { izlaz.innerHTML = '<p class="karta-poruka">' + t('nat.forma.greska') + '</p>'; })
      .then(function () { gumb.disabled = false; gumb.textContent = t('nat.forma.gumb'); });
  });

  /* Link s kartom: podaci o rođenju su iza #, a taj dio preglednik nikad ne šalje poslužitelju.
     Tko otvori link, kartu i čitanje izračuna njegov preglednik; nigdje se ništa ne sprema. */
  function b64(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function odB64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); return decodeURIComponent(escape(atob(s + '==='.slice((s.length + 3) % 4)))); }
  function link() {
    var r = zadnje.r;
    return 'https://fenikspi.com/#k=' + b64(JSON.stringify([1, r.g, r.m, r.d, r.h, r.min, r.bezVremena ? 1 : 0, +r.lat.toFixed(4), +r.lon.toFixed(4), r.zona, r.mjesto, r.ime, r.spol, I18n.jezik()]));
  }
  function izLinka() {
    var m = /^#k=([\w-]+)$/.exec(location.hash);
    if (!m) return null;
    try {
      var a = JSON.parse(odB64(m[1]));
      if (a[0] !== 1 || !(Math.abs(a[7]) <= 90 && Math.abs(a[8]) <= 180) || Mjesta.zone().indexOf(a[9]) < 0) return null;
      return { g: a[1], m: a[2], d: a[3], h: a[4], min: a[5], bezVremena: !!a[6], lat: a[7], lon: a[8], zona: a[9], mjesto: String(a[10] || ''), ime: String(a[11] || ''), spol: a[12] === 'm' ? 'm' : 'z', jezik: I18n.JEZICI[a[13]] ? a[13] : null };
    } catch (e) { return null; }
  }
  // Nakon izračuna adresa u pregledniku postaje link na to čitanje (bez ponovnog učitavanja stranice).
  function pokaziLink() { try { history.replaceState(null, '', link().replace('https://fenikspi.com', '')); } catch (e) {} }
  function tekstZaDijeljenje() {
    var txt = Citanje.tekst(zadnje.c, $('#k-podaci').checked, zadnje.r);
    if (zadnje.ai) txt = txt.replace(/\n— Feniks π · https:\/\/fenikspi\.com$/, '') + '\n\n' + t('nat.ai.naslov').toUpperCase() + '\n' + zadnje.ai + '\n\n— Feniks π · https://fenikspi.com';
    return txt + '\n\n' + t('nat.link') + '\n' + link();
  }
  function poruka(s) { var p = $('#k-poruka'); p.textContent = s; setTimeout(function () { if (p.textContent === s) p.textContent = ''; }, 4000); }
  function kopiraj() {
    var txt = tekstZaDijeljenje();
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { poruka(t('nat.kopirano')); }, function () {
      var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); poruka(t('nat.kopirano')); } catch (e) {} ta.remove();
    });
  }
  // Dijeljenje: izbornik sustava (mobitel), inače poveznice. Dijeli se kratki sažetak i poveznica, a puni tekst preko „Kopiraj”.
  function podijeli() {
    var url = link(), kratko = t('nat.dijeliTekst', { sazetak: zadnje.c.sazetak });
    if (navigator.share) { navigator.share({ title: 'Feniks π', text: kratko, url: url }).catch(function () {}); return; }
    var u = encodeURIComponent(url), tx = encodeURIComponent(kratko + ' ' + url), d = $('#k-dijeli');
    d.innerHTML = [['WhatsApp', 'https://wa.me/?text=' + tx], ['Telegram', 'https://t.me/share/url?url=' + u + '&text=' + encodeURIComponent(kratko)],
      ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + u], ['X', 'https://twitter.com/intent/tweet?text=' + tx],
      ['E-mail', 'mailto:?subject=' + encodeURIComponent('Feniks π') + '&body=' + encodeURIComponent(tekstZaDijeljenje())]]
      .map(function (x) { return '<a class="cip" href="' + x[1] + '" target="_blank" rel="noopener noreferrer">' + x[0] + '</a>'; }).join('');
    d.hidden = false;
  }
  // Spremanje u datoteku (HTML): može se poslati e-poštom ili spremiti u oblak; otvara se u bilo kojem pregledniku.
  function spremiDatoteku() {
    var c = zadnje.c, css = 'body{font:17px/1.6 Georgia,serif;max-width:46em;margin:2em auto;padding:0 1em;color:#222}h1,h2{font-weight:normal}td{padding:2px 8px}',
      html = '<!doctype html><html lang="' + I18n.jezik() + '"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(c.naslov.trim()) + '</title><style>' + css + '</style>' +
        '<h1>' + esc(c.naslov.trim()) + '</h1><p><i>' + esc(c.sazetak) + '</i></p><table>' + c.tablica.map(function (x) { return '<tr><td>' + esc(x.ime) + '</td><td>' + esc(x.polozaj) + '</td></tr>'; }).join('') + '</table>' +
        c.dijelovi.map(function (d) { return '<h2>' + d.naslov + '</h2>' + d.html; }).join('') + (zadnje.ai ? '<h2>' + esc(t('nat.ai.naslov')) + '</h2>' + aiHtml(zadnje.ai, true) : '') +
        '<p><a href="' + esc(link()) + '">' + esc(t('nat.link')) + '</a> · Feniks π · <a href="https://fenikspi.com">fenikspi.com</a></p></html>',
      a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    a.download = 'feniks-pi-' + ((zadnje.r.ime || 'citanje').toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'citanje') + '.html';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }

  // Dublje čitanje preko Claudea: poslužitelju ide samo apstraktna karta (znakovi i kuće bez stupnjeva, tekst pravila),
  // bez imena, datuma, vremena i mjesta rođenja. Vidi /privatnost.html#dublje.
  function aiHtml(txt, bezNaslova) {
    return (bezNaslova ? '' : '<h4>' + esc(t('nat.ai.naslov')) + '</h4>') + txt.split(/\n{2,}/).map(function (p) {
      var h = /^#+\s*(.+)$/.exec(p.trim());
      return h ? '<h5>' + esc(h[1]) + '</h5>' : '<p>' + esc(p.trim()).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  function apstraktno() {
    var div = document.createElement('div');
    return { jezik: I18n.jezik(), spol: zadnje.r.spol, bezVremena: !!zadnje.r.bezVremena,
      polozaji: zadnje.c.tablica.map(function (x) { return { ime: String(x.ime).slice(0, 60), polozaj: String(x.polozaj).replace(/\d+\s*°\s*(\d+\s*[′'])?/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, 160) }; }).slice(0, 40),
      dijelovi: zadnje.c.dijelovi.map(function (d) { div.innerHTML = d.html; return { naslov: String(d.naslov).replace(/<[^>]+>/g, '').slice(0, 120), tekst: div.textContent.trim().slice(0, 3000) }; }).slice(0, 20) };
  }
  function dubljeCitanje() {
    var g = $('#k-ai'); g.disabled = true; g.textContent = t('nat.ai.pise'); poruka(t('nat.ai.traje'));
    fetch('/api/duboko', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apstraktno()) })
      .then(function (o) { return o.json().catch(function () { return {}; }).then(function (d) { if (!o.ok || !d.tekst) throw new Error(d.greska || ('HTTP ' + o.status)); return d.tekst; }); })
      .then(function (txt) { zadnje.ai = txt; prikazi(); $('#k-ai-tekst').scrollIntoView({ behavior: 'smooth', block: 'start' }); })
      .catch(function (e) { poruka(t('nat.ai.greska') + ' (' + e.message + ')'); })
      .then(function () { var b = $('#k-ai'); if (b) { b.disabled = false; b.textContent = t('nat.ai'); } });
  }

  // Spremanje u aplikaciju: isti preglednik, ista domena, ista lokalna baza; ništa ne ide na poslužitelj.
  function spremiUAplikaciju(e) {
    if (!zadnje) return;
    e.preventDefault();
    var r = zadnje.r, p = { ime: r.ime, spol: r.spol, zivi: { ime: r.mjesto, lat: r.lat, lon: r.lon, zona: r.zona },
      rodenje: { g: r.g, m: r.m, d: r.d, h: r.h, min: r.min, mjesto: r.mjesto, lat: r.lat, lon: r.lon, zona: r.zona, bezVremena: r.bezVremena } };
    var z = indexedDB.open('feniks-pi', 1);
    z.onupgradeneeded = function () { var db = z.result; db.createObjectStore('zapisi', { keyPath: 'id' }); db.createObjectStore('postavke'); };
    z.onsuccess = function () { var tr = z.result.transaction('postavke', 'readwrite'); tr.objectStore('postavke').put(p, 'profil'); tr.oncomplete = function () { location.href = '/app/'; }; };
    z.onerror = function () { location.href = '/app/'; };
  }

  // Otvoren link s kartom (#k=…): popuni obrazac i odmah izračunaj.
  var izL = izLinka();
  if (izL) {
    // čitanje se otvara na jeziku na kojem je napravljeno (Tor i neki preglednici svima javljaju engleski); izbor se ne pamti
    if (izL.jezik && izL.jezik !== I18n.jezik()) I18n.postavi(izL.jezik, false);
    forma.datum.value = izL.g + '-' + String(izL.m).padStart(2, '0') + '-' + String(izL.d).padStart(2, '0');
    forma.vrijeme.value = String(izL.h).padStart(2, '0') + ':' + String(izL.min).padStart(2, '0');
    forma.neznam.checked = izL.bezVremena; forma.vrijeme.disabled = izL.bezVremena;
    forma.ime.value = izL.ime; forma.spol.value = izL.spol; forma.mjesto.value = izL.mjesto;
    odabranoMjesto = { ime: izL.mjesto, zemlja: '', lat: izL.lat, lon: izL.lon, zona: izL.zona };
    ucitaj().then(function () {
      var k = Citanje.izracunaj(izL);
      if (!k) return;
      zadnje = { r: izL, k: k }; prikazi();
      $('#karta').scrollIntoView({ block: 'start' });
    }).catch(function () {});
  }

  I18n.promjena(function () { popuniMjesta(); var g = forma.querySelector('button[type=submit]'); if (!g.disabled) g.textContent = t('nat.forma.gumb'); if (zadnje) prikazi(); });
})();
