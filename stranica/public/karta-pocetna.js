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
    var skripte = ['/app/astronomy.js', '/app/asteroids.js', '/app/core.js', '/app/nebo.js', '/app/citanje.js'];
    ucitano = skripte.reduce(function (p, src) {
      return p.then(function () { return new Promise(function (ok, ne) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ne; document.head.appendChild(s); }); });
    }, Promise.resolve());
    return ucitano;
  }

  function podaci() {
    var d = forma.datum.value.split('-'), bez = forma.neznam.checked, v = (forma.vrijeme.value || '12:00').split(':');
    if (d.length !== 3 || (!bez && !forma.vrijeme.value)) return null;
    var m;
    if (forma.rucno.checked) {
      var la = parseFloat(String(forma.lat.value).replace(',', '.')), lo = parseFloat(String(forma.lon.value).replace(',', '.'));
      if (!(Math.abs(la) <= 90 && Math.abs(lo) <= 180)) return null;
      m = { ime: la.toFixed(2) + ', ' + lo.toFixed(2), lat: la, lon: lo, zona: forma.zona.value };
    } else if (odabranoMjesto) m = { ime: odabranoMjesto.ime + ', ' + odabranoMjesto.zemlja, lat: odabranoMjesto.lat, lon: odabranoMjesto.lon, zona: odabranoMjesto.zona };
    else m = Mjesta.dohvati(forma.mjesto.value.split(',')[0].trim());   // upisano ime s kratkog popisa (bez odabira)
    if (!m) return null;
    return { g: +d[0], m: +d[1], d: +d[2], h: +v[0], min: +v[1], bezVremena: bez, lat: m.lat, lon: m.lon, zona: m.zona, mjesto: m.ime, ime: forma.ime.value.trim() };
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
      '<a class="gumb" id="k-app" href="/app/">' + t('nat.uAplikaciju') + '</a></div>' +
      '<label class="karta-check"><input type="checkbox" id="k-podaci"> ' + t('nat.sPodacima') + '</label>' +
      '<p id="k-poruka" class="karta-poruka" aria-live="polite"></p><div id="k-dijeli" class="karta-dijeli" hidden></div>' +
      '<details class="karta-polozaji" open><summary>' + t('nat.polozaji') + '</summary><table>' + c.tablica.map(function (x) {
        return '<tr><td class="g">' + x.glif + '</td><td>' + esc(x.ime) + '</td><td>' + esc(x.polozaj) + '</td></tr>';
      }).join('') + '</table></details>' +
      c.dijelovi.map(function (d) { return '<section class="karta-dio"><h4>' + d.naslov + '</h4>' + d.html + '</section>'; }).join('');
    $('#k-kopiraj').addEventListener('click', kopiraj);
    $('#k-podijeli').addEventListener('click', podijeli);
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
      zadnje = { r: r, k: k }; prikazi();
      izlaz.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function () { izlaz.innerHTML = '<p class="karta-poruka">' + t('nat.forma.greska') + '</p>'; })
      .then(function () { gumb.disabled = false; gumb.textContent = t('nat.forma.gumb'); });
  });

  function tekstZaDijeljenje() { return Citanje.tekst(zadnje.c, $('#k-podaci').checked, zadnje.r); }
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
    var url = 'https://fenikspi.com/', kratko = t('nat.dijeliTekst', { sazetak: zadnje.c.sazetak });
    if (navigator.share) { navigator.share({ title: 'Feniks π', text: kratko + ' ' + url }).catch(function () {}); return; }
    var u = encodeURIComponent(url), tx = encodeURIComponent(kratko + ' ' + url), d = $('#k-dijeli');
    d.innerHTML = [['WhatsApp', 'https://wa.me/?text=' + tx], ['Telegram', 'https://t.me/share/url?url=' + u + '&text=' + encodeURIComponent(kratko)],
      ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + u], ['X', 'https://twitter.com/intent/tweet?text=' + tx],
      ['E-mail', 'mailto:?subject=' + encodeURIComponent('Feniks π') + '&body=' + encodeURIComponent(tekstZaDijeljenje())]]
      .map(function (x) { return '<a class="cip" href="' + x[1] + '" target="_blank" rel="noopener noreferrer">' + x[0] + '</a>'; }).join('');
    d.hidden = false;
  }
  // Spremanje u aplikaciju: isti preglednik, ista domena, ista lokalna baza; ništa ne ide na poslužitelj.
  function spremiUAplikaciju(e) {
    if (!zadnje) return;
    e.preventDefault();
    var r = zadnje.r, p = { ime: r.ime, zivi: { ime: r.mjesto, lat: r.lat, lon: r.lon, zona: r.zona },
      rodenje: { g: r.g, m: r.m, d: r.d, h: r.h, min: r.min, mjesto: r.mjesto, lat: r.lat, lon: r.lon, zona: r.zona, bezVremena: r.bezVremena } };
    var z = indexedDB.open('feniks-pi', 1);
    z.onupgradeneeded = function () { var db = z.result; db.createObjectStore('zapisi', { keyPath: 'id' }); db.createObjectStore('postavke'); };
    z.onsuccess = function () { var tr = z.result.transaction('postavke', 'readwrite'); tr.objectStore('postavke').put(p, 'profil'); tr.oncomplete = function () { location.href = '/app/'; }; };
    z.onerror = function () { location.href = '/app/'; };
  }

  I18n.promjena(function () { popuniMjesta(); var g = forma.querySelector('button[type=submit]'); if (!g.disabled) g.textContent = t('nat.forma.gumb'); if (zadnje) prikazi(); });
})();
