/* Feniks π web-aplikacija: profil, Dnevnik simbolizma i sinkroniciteta, dnevna preporuka.
   Sve ostaje na uređaju (IndexedDB). Iznimka su neobavezni račun (racun.js: samo šifrirano, ključ ostaje na uređaju)
   i anonimni obrasci uz pristanak. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var MJESTA = {
    'Zagreb': [45.815, 15.982], 'Split': [43.508, 16.440], 'Rijeka': [45.327, 14.442], 'Osijek': [45.554, 18.696], 'Zadar': [44.119, 15.231],
    'Pula': [44.867, 13.850], 'Slavonski Brod': [45.160, 18.016], 'Karlovac': [45.487, 15.548], 'Varaždin': [46.304, 16.338], 'Šibenik': [43.735, 15.890],
    'Sisak': [45.466, 16.378], 'Dubrovnik': [42.650, 18.094], 'Bjelovar': [45.898, 16.849], 'Koprivnica': [46.163, 16.833], 'Vinkovci': [45.288, 18.805],
    'Vukovar': [45.351, 19.002], 'Čakovec': [46.384, 16.434], 'Požega': [45.340, 17.685], 'Gospić': [44.546, 15.375], 'Virovitica': [45.832, 17.384],
    'Sarajevo': [43.856, 18.413], 'Mostar': [43.343, 17.808], 'Ljubljana': [46.056, 14.506], 'Beograd': [44.787, 20.457], 'Beč': [48.208, 16.373], 'München': [48.137, 11.575]
  };
  var t = I18n.t;

  /* ---------- pohrana na uređaju ---------- */
  var baza = new Promise(function (ok, ne) {
    var z = indexedDB.open('feniks-pi', 1);
    z.onupgradeneeded = function () { var db = z.result; db.createObjectStore('zapisi', { keyPath: 'id' }); db.createObjectStore('postavke'); };
    z.onsuccess = function () { ok(z.result); }; z.onerror = function () { ne(z.error); };
  });
  function tx(spremiste, nacin, rad) {
    return baza.then(function (db) { return new Promise(function (ok, ne) {
      var t = db.transaction(spremiste, nacin), s = t.objectStore(spremiste), r = rad(s);
      t.oncomplete = function () { ok(r && r.result); }; t.onerror = function () { ne(t.error); };
    }); });
  }
  var Pohrana = {
    zapisi: function () { return tx('zapisi', 'readonly', function (s) { return s.getAll(); }).then(function (z) { return (z || []).sort(function (a, b) { return b.vrijeme < a.vrijeme ? -1 : 1; }); }); },
    spremi: function (z) { return tx('zapisi', 'readwrite', function (s) { s.put(z); }); },
    obrisi: function (id) { return tx('zapisi', 'readwrite', function (s) { s.delete(id); }); },
    profil: function () { return tx('postavke', 'readonly', function (s) { return s.get('profil'); }); },
    spremiProfil: function (p) { return tx('postavke', 'readwrite', function (s) { s.put(p, 'profil'); }); },
    postavka: function (k) { return tx('postavke', 'readonly', function (s) { return s.get(k); }); },
    spremiPostavku: function (k, v) { return tx('postavke', 'readwrite', function (s) { s.put(v, k); }); },
    sve: function () { return Promise.all([this.profil(), this.zapisi()]); },
    obrisiSve: function () { return Promise.all([tx('zapisi', 'readwrite', function (s) { s.clear(); }), tx('postavke', 'readwrite', function (s) { s.clear(); })]); }
  };

  var stanje = { profil: null, zapisi: [], doprinos: false };
  // račun je neobavezan: ako racun.js nije dostupan (stari preglednik, stranica bez HTTPS-a), aplikacija radi bez njega
  function racun(radnja, x) { try { return window.Racun && Racun.podrzano ? Racun[radnja](x) : null; } catch (e) { return null; } }

  /* ---------- doprinos anonimnih obrazaca (samo uz pristanak, zadano isključen) ---------- */
  // Šalje se samo apstraktni obrazac: simboli, vrsta zapisa, Mjesečev znak i mijena, glavni tranzit. Nikad tekst, ime, datumi ni mjesto.
  var ADRESA = location.protocol === 'https:' && /fenikspi\.com$/i.test(location.hostname) ? '/api/obrazac' : 'https://fenikspi.com/api/obrazac';
  function posaljiObrazac(z) {
    if (!stanje.doprinos || !z.simboli.length) return;
    var n = z.nebo || {}, m = (n.polozaji || []).filter(function (p) { return p.id === 'moon'; })[0], tr = (n.tranziti || [])[0];
    var o = { simboli: z.simboli.slice(0, 12), vrsta: z.vrsta, mjesec: m ? { znak: m.znak, mijena: n.mijena && n.mijena.kljuc } : null,
      tranzit: tr ? { t: tr.t, aspekt: tr.aspekt, n: tr.n, kuca: tr.kuca || null } : null };
    try { fetch(ADRESA, { method: 'POST', body: JSON.stringify(o), headers: { 'Content-Type': 'text/plain' }, credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true }).catch(function () {}); } catch (e) {}
  }
  // mjesto za nebo: objekt {ime, lat, lon, zona} (novo) ili ime s kratkog popisa (stari profili)
  function mjesto() {
    var z = stanje.profil && stanje.profil.zivi;
    if (z && typeof z === 'object') return { lat: z.lat, lon: z.lon };
    var m = z && MJESTA[z] || MJESTA.Zagreb; return { lat: m[0], lon: m[1] };
  }
  var odabrano = { mjesto: null, zivi: null };
  function imeMjesta(x) { return x && typeof x === 'object' ? x.ime : x || ''; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function datum(iso) { return new Date(iso).toLocaleString(I18n.locale(), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

  /* ---------- sinkronicitet: simboli koji se ponavljaju ---------- */
  function ponavljanja(zapisi, dana) {
    var od = Date.now() - dana * 86400000, broj = {};
    zapisi.forEach(function (z) { if (new Date(z.vrijeme).getTime() >= od) (z.simboli || []).forEach(function (s) { broj[s] = (broj[s] || 0) + 1; }); });
    return Object.keys(broj).map(function (s) { return { simbol: s, puta: broj[s] }; }).sort(function (a, b) { return b.puta - a.puta; });
  }
  function sinkroniciteti(zapisi) { return ponavljanja(zapisi, 7).filter(function (p) { return p.puta >= 3; }); }

  /* ---------- numerologija: osobni dan ---------- */
  function zbroj(n) { while (n > 9 && n !== 11 && n !== 22) n = String(n).split('').reduce(function (a, c) { return a + +c; }, 0); return n; }
  function osobniDan(r, d) { return r ? zbroj(zbroj(r.d) + zbroj(r.m) + zbroj(d.getFullYear()) + zbroj(d.getMonth() + 1) + zbroj(d.getDate())) : null; }

  /* ---------- dnevna preporuka: zrcalo, ne zapovijed ---------- */
  function preporuka(nebo) {
    var mj = nebo.mijena, mjesec = nebo.polozaji.filter(function (p) { return p.id === 'moon'; })[0], dijelovi = [];
    dijelovi.push('<p>' + t('danas.mjesec', { mijena: esc(Nebo.imeMijene(mj)), znak: esc(Nebo.znak(mjesec.znak)), glif: Nebo.glifZnaka(mjesec.znak),
      tema: I18n.niz('znakTema', mjesec.znak), savjet: t('savjet.' + mj.kljuc) }) + '</p>');
    if (nebo.tranziti.length) {
      var tr = nebo.tranziti[0];
      dijelovi.push('<p>' + t('danas.karta', { tranzit: esc(Nebo.tranzitTekst(tr)), glif: tr.glif, zrcalo: t('zrcalo.' + tr.aspekt) }) + '</p>');
    }
    var mk = izracun[kljuc('mjesec')];
    if (mk) { var danas = mk.dogadaji.filter(function (d) { return istiDan(d.ms, Date.now()); });
      if (danas.length) dijelovi.push('<p>' + t('danas.nebo', { lista: danas.map(function (d) { return esc(d.naslov); }).join(' · ') }) + '</p>'); }
    var od = osobniDan(stanje.profil && stanje.profil.rodenje, new Date());
    if (od) dijelovi.push('<p>' + t('danas.osobni', { n: od, tema: t('broj.' + od) }) + '</p>');
    if (nebo.sat) dijelovi.push('<p>' + t('danas.sat', { planet: esc(Nebo.planet(nebo.sat.vladar)), glif: nebo.sat.glif, savjet: t('sat.' + nebo.sat.vladar) }) + '</p>');
    var sink = sinkroniciteti(stanje.zapisi), pon = ponavljanja(stanje.zapisi, 30);
    if (sink.length) dijelovi.push('<p>' + t('danas.sink', { simbol: esc(Simboli.ime(sink[0].simbol)), n: sink[0].puta }) + '</p>');
    else if (pon.length && pon[0].puta > 1) dijelovi.push('<p>' + t('danas.vraca', { simbol: esc(Simboli.ime(pon[0].simbol)), n: pon[0].puta }) + '</p>');
    else dijelovi.push('<p class="tiho">' + t('danas.prazno') + '</p>');
    return dijelovi.join('');
  }

  /* ---------- mjesec i godina ---------- */
  var izracun = {};                                   // predmemorija po profilu i danu
  function kljuc(vrsta) { return vrsta + '|' + I18n.jezik() + '|' + JSON.stringify(stanje.profil && stanje.profil.rodenje) + '|' + (stanje.profil && stanje.profil.zivi) + '|' + new Date().toDateString(); }
  function izracunaj(vrsta) {
    var k = kljuc(vrsta);
    if (!izracun[k]) izracun[k] = vrsta === 'mjesec' ? Prijedlozi.mjesec(stanje.profil, mjesto()) : Prijedlozi.godina(stanje.profil, mjesto());
    return izracun[k];
  }
  function istiDan(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
  function listaDogadaja(el, dog) {
    var sad = Date.now(), prosli = dog.filter(function (d) { return d.ms < sad - 86400000 && !istiDan(d.ms, sad); });
    var dalje = dog.filter(function (d) { return prosli.indexOf(d) < 0; });
    function stavke(lista) { return lista.map(function (d) {
      var kl = istiDan(d.ms, sad) ? 'danas' : d.ms < sad - 86400000 ? 'proslo' : '';
      if (d.gospodar) kl += ' gospodar';
      return '<li class="' + kl + '"><time>' + new Date(d.ms).toLocaleDateString(I18n.locale(), { day: 'numeric', month: 'short', year: el.id === 'godina-dogadaji' ? 'numeric' : undefined }) +
        '</time><div><b>' + esc(d.naslov) + '</b><p>' + esc(d.tekst) + '</p></div></li>';
    }).join(''); }
    el.innerHTML = (stavke(dalje) || '<li class="tiho">' + t('ui.nemaDog') + '</li>') +
      (prosli.length ? '<li class="ranije"><details><summary>' + t('ui.ranije', { n: prosli.length }) + '</summary><ol class="dogadaji">' + stavke(prosli) + '</ol></details></li>' : '');
  }
  function preuzmiIcs(dog, ime) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([Prijedlozi.ics(dog, 'Feniks π · ' + ime)], { type: 'text/calendar' }));
    a.download = 'feniks-pi-' + ime.toLowerCase().replace(/\s+/g, '-') + '.ics'; document.body.appendChild(a); a.click(); a.remove();
  }
  function prikaziMjesec() {
    setTimeout(function () {
      var M = izracunaj('mjesec');
      $('#mjesec-naslov').textContent = new Date().toLocaleDateString(I18n.locale(), { month: 'long', year: 'numeric' }).replace(/^./, function (c) { return c.toUpperCase(); });
      $('#mjesec-sazetak').innerHTML = M.sazetak.map(function (s) { return '<p>' + s + '</p>'; }).join('') || '<p class="tiho">' + t('mj.bezProfila') + '</p>';
      listaDogadaja($('#mjesec-dogadaji'), M.dogadaji);
      var b = $('#mjesec-ics'); b.hidden = false; b.onclick = function () { preuzmiIcs(M.dogadaji.filter(function (d) { return d.ms > Date.now() - 86400000; }), t('ics.mjesec')); };
    }, 30);
  }
  function prikaziGodinu() {
    if (!stanje.profil || !stanje.profil.rodenje) { $('#godina-sazetak').innerHTML = '<p class="tiho">' + t('god.bezProfila') + '</p>'; $('#godina-dogadaji').innerHTML = ''; return; }
    setTimeout(function () {
      var G = izracunaj('godina');
      $('#godina-naslov').textContent = t('god.naslov', { od: Prijedlozi.datumDug(G.od), do: Prijedlozi.datumDug(G.do_) });
      $('#godina-sazetak').innerHTML = G.sazetak.map(function (s) { return '<p>' + s + '</p>'; }).join('');
      listaDogadaja($('#godina-dogadaji'), G.dogadaji);
      var b = $('#godina-ics'); b.hidden = false; b.onclick = function () { preuzmiIcs(G.dogadaji.filter(function (d) { return d.ms > Date.now() - 86400000; }), t('ics.godina')); };
    }, 30);
  }

  /* ---------- prikazi ---------- */
  function prikaziDanas() {
    var nebo = Nebo.trenutak(new Date(), mjesto(), stanje.profil);
    $('#danas-preporuka').innerHTML = preporuka(nebo);
    $('#danas-nebo').innerHTML = nebo.polozaji.map(function (p) {
      return '<li><span class="g">' + Nebo.glifPlaneta(p.id) + '</span> ' + esc(Nebo.planet(p.id)) + ' <span class="tiho">' + esc(Nebo.znak(p.znak)) + ' ' + p.stupanj + '°' + (p.retro ? ' ℞' : '') + '</span></li>';
    }).join('');
    $('#pozdrav').textContent = stanje.profil && stanje.profil.ime ? t('ui.pozdravIme', { ime: stanje.profil.ime }) : t('ui.pozdrav');
  }

  function prikaziDnevnik() {
    var sink = sinkroniciteti(stanje.zapisi), pon = ponavljanja(stanje.zapisi, 30);
    $('#ponavljanja').innerHTML = pon.length ? pon.slice(0, 12).map(function (p) {
      var s = sink.some(function (x) { return x.simbol === p.simbol; });
      return '<button type="button" class="cip' + (s ? ' sink' : '') + '" data-simbol="' + esc(p.simbol) + '">' + esc(Simboli.ime(p.simbol)) + ' <b>' + p.puta + '</b></button>';
    }).join('') : '<span class="tiho">' + t('dn.nemaSimbola') + '</span>';
    var filtar = stanje.filtar;
    var lista = stanje.zapisi.filter(function (z) { return !filtar || (z.simboli || []).indexOf(filtar) >= 0; });
    $('#filtar').hidden = !filtar; $('#filtar-ime').textContent = filtar ? Simboli.ime(filtar) : '';
    $('#zapisi').innerHTML = lista.map(function (z) {
      var n = z.nebo || {}, m = (n.polozaji || []).filter(function (p) { return p.id === 'moon'; })[0];
      return '<article class="zapis"><header><span class="oznaka">' + esc(t('vrsta.' + z.vrsta)) + '</span> <time>' + esc(datum(z.vrijeme)) + '</time>' +
        '<button type="button" class="brisi" data-id="' + z.id + '" aria-label="' + esc(t('dn.obrisi')) + '">×</button></header>' +
        '<p>' + esc(z.tekst).replace(/\n/g, '<br>') + '</p>' +
        ((z.simboli || []).length ? '<p class="simboli">' + z.simboli.map(function (s) { return '<span class="cip">' + esc(Simboli.ime(s)) + '</span>'; }).join('') + '</p>' : '') +
        '<p class="nebo-zapisa tiho">' + (n.mijena ? esc(Nebo.imeMijene(n.mijena)) : '') + (m ? ' · ' + esc(t('dn.mjesecU', { znak: Nebo.znak(m.znak) })) : '') +
        (n.sat ? ' · ' + esc(t('dn.sat', { planet: Nebo.planet(n.sat.vladar) })) : '') +
        ((n.tranziti || []).length ? ' · ' + esc(n.tranziti[0].t ? Nebo.tranzitTekst(n.tranziti[0]) : n.tranziti[0].tekst) : '') + '</p></article>';
    }).join('') || (filtar ? '' : '<p class="tiho">' + t('dn.prazan') + '</p>');
  }

  function prikaziProfil() {
    var p = stanje.profil || {}, r = p.rodenje || {}, f = $('#profil');
    f.ime.value = p.ime || ''; f.datum.value = r.g ? r.g + '-' + String(r.m).padStart(2, '0') + '-' + String(r.d).padStart(2, '0') : '';
    f.vrijeme.value = r.g != null && r.h != null ? String(r.h).padStart(2, '0') + ':' + String(r.min).padStart(2, '0') : '';
    f.mjesto.value = r.mjesto || ''; f.zivi.value = imeMjesta(p.zivi);
    odabrano.mjesto = r.lat != null ? { ime: r.mjesto, lat: r.lat, lon: r.lon, zona: r.zona } : null;
    odabrano.zivi = p.zivi && typeof p.zivi === 'object' ? p.zivi : null;
  }
  function osvjezi() { prikaziDanas(); prikaziDnevnik(); }
  // promjena jezika: sve se ponovno ispisuje na novom jeziku
  I18n.promjena(function () {
    osvjezi(); var ak = document.querySelector('[role=tab][aria-selected=true]');
    if (ak && ak.dataset.t === 'mjesec') prikaziMjesec(); if (ak && ak.dataset.t === 'godina') prikaziGodinu();
  });

  /* ---------- događaji ---------- */
  function tab(ime) {
    document.querySelectorAll('[role=tab]').forEach(function (b) {
      b.setAttribute('aria-selected', b.dataset.t === ime ? 'true' : 'false');
      if (b.dataset.t === ime && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });   // na mobitelu odabrana kartica uvijek vidljiva
    });
    document.querySelectorAll('[role=tabpanel]').forEach(function (s) { s.hidden = s.id !== 't-' + ime; });
    try { localStorage.setItem('feniks-tab', ime); } catch (e) {}
    if (ime === 'danas') prikaziDanas();
    if (ime === 'mjesec') prikaziMjesec();
    if (ime === 'godina') prikaziGodinu();
  }
  document.querySelectorAll('[role=tab]').forEach(function (b) { b.addEventListener('click', function () { tab(b.dataset.t); }); });

  var unos = $('#unos');
  unos.tekst.addEventListener('input', function () {
    var s = Simboli.uTekstu(unos.tekst.value);
    $('#prepoznato').innerHTML = s.length ? esc(t('dn.prepoznati')) + ' ' + s.map(function (x) { return '<span class="cip">' + esc(Simboli.ime(x)) + '</span>'; }).join('') : '';
  });
  unos.addEventListener('submit', function (e) {
    e.preventDefault();
    var tekst = unos.tekst.value.trim(); if (!tekst) return;
    var dodatni = unos.dodatni.value.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    var simboli = Simboli.uTekstu(tekst); dodatni.forEach(function (s) { var k = Simboli.lema(s) || s; if (simboli.indexOf(k) < 0) simboli.push(k); });
    var sada = new Date();
    var z = { id: sada.getTime().toString(36) + Math.random().toString(36).slice(2, 6), vrijeme: sada.toISOString(), vrsta: unos.vrsta.value, tekst: tekst, simboli: simboli,
      nebo: Nebo.trenutak(sada, mjesto(), stanje.profil) };
    Pohrana.spremi(z).then(function () { stanje.zapisi.unshift(z); posaljiObrazac(z); racun('uskladiKasnije'); unos.reset(); $('#prepoznato').innerHTML = ''; osvjezi(); $('#spremljeno').textContent = t('dn.spremljeno'); setTimeout(function () { $('#spremljeno').textContent = ''; }, 4000); });
  });
  $('#zapisi').addEventListener('click', function (e) {
    var b = e.target.closest('.brisi'); if (!b) return;
    if (b.dataset.potvrda !== '1') { b.dataset.potvrda = '1'; b.textContent = t('dn.obrisiPitanje'); setTimeout(function () { b.dataset.potvrda = ''; b.textContent = '×'; }, 3000); return; }
    Promise.resolve(racun('zapamtiBrisanje', b.dataset.id)).then(function () { return Pohrana.obrisi(b.dataset.id); }).then(function () { racun('uskladiKasnije'); stanje.zapisi = stanje.zapisi.filter(function (z) { return z.id !== b.dataset.id; }); osvjezi(); });
  });
  $('#ponavljanja').addEventListener('click', function (e) { var b = e.target.closest('[data-simbol]'); if (!b) return; stanje.filtar = b.dataset.simbol; prikaziDnevnik(); });
  $('#filtar-makni').addEventListener('click', function () { stanje.filtar = null; prikaziDnevnik(); });

  ['mjesto', 'zivi'].forEach(function (polje) {
    MjestoTrazi.spoji($('#profil')[polje], function (m) { odabrano[polje] = { ime: m.ime + ', ' + m.zemlja, lat: m.lat, lon: m.lon, zona: m.zona }; });
    $('#profil')[polje].addEventListener('input', function () { odabrano[polje] = null; });
  });
  // upisano ime bez odabira s popisa: kratki popis (MJESTA, srednja Europa) kao rezerva
  function izPolja(polje) {
    if (odabrano[polje]) return odabrano[polje];
    var ime = $('#profil')[polje].value.split(',')[0].trim(), m = MJESTA[ime];
    return m ? { ime: ime, lat: m[0], lon: m[1], zona: 'Europe/Zagreb' } : null;
  }
  $('#profil').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, d = f.datum.value.split('-'), v = (f.vrijeme.value || '12:00').split(':'), m = izPolja('mjesto') || { ime: 'Zagreb', lat: 45.815, lon: 15.982, zona: 'Europe/Zagreb' };
    var p = { ime: f.ime.value.trim(), zivi: izPolja('zivi') || m,
      rodenje: d.length === 3 ? { g: +d[0], m: +d[1], d: +d[2], h: +v[0], min: +v[1], mjesto: m.ime, lat: m.lat, lon: m.lon, zona: m.zona, bezVremena: !f.vrijeme.value } : null };
    Pohrana.spremiProfil(p).then(function () { return Pohrana.spremiPostavku('profilVrijeme', new Date().toISOString()); }).then(function () { racun('uskladiKasnije'); stanje.profil = p; osvjezi(); setTimeout(function () { izracunaj('mjesec'); prikaziDanas(); }, 50); $('#profil-spremljeno').textContent = t('pr.spremljeno'); });
  });
  $('#izvoz').addEventListener('click', function () {
    Pohrana.sve().then(function (r) {
      var json = JSON.stringify({ feniksPi: 1, izvezeno: new Date().toISOString(), profil: r[0] || null, zapisi: r[1] }, null, 2);
      var polje = $('#izvoz-tekst'); polje.hidden = false; polje.value = json; polje.select();   // ne "t": to je funkcija prijevoda
      $('#izvoz-poruka').textContent = t('pr.izvezeno');
    });
  });
  $('#brisi-sve').addEventListener('click', function (e) {
    var b = e.target;
    if (b.dataset.potvrda !== '1') { b.dataset.potvrda = '1'; b.textContent = t('pr.sigurno'); return; }
    Pohrana.obrisiSve().then(function () { stanje = { profil: null, zapisi: [] }; b.dataset.potvrda = ''; b.textContent = t('pr.brisi'); prikaziProfil(); osvjezi(); });
  });

  $('#doprinos').addEventListener('change', function (e) {
    stanje.doprinos = e.target.checked; Pohrana.spremiPostavku('doprinos', stanje.doprinos);
  });
  Pohrana.postavka('doprinos').then(function (v) { stanje.doprinos = v === true; $('#doprinos').checked = stanje.doprinos; });

  Pohrana.sve().then(function (r) {
    stanje.profil = r[0] || null; stanje.zapisi = r[1] || [];
    prikaziProfil(); osvjezi();
    var t = null; try { t = localStorage.getItem('feniks-tab'); } catch (e) {}
    tab(t || (stanje.profil ? 'danas' : 'profil'));
    setInterval(prikaziDanas, 5 * 60000);
    setTimeout(function () { izracunaj('mjesec'); prikaziDanas(); }, 400);   // današnji događaji mjeseca u preporuci
  });
  // nakon usklađivanja s računom (racun.js) ponovno učitaj profil i zapise
  document.addEventListener('feniks:uskladeno', function () {
    Pohrana.sve().then(function (r) { stanje.profil = r[0] || null; stanje.zapisi = r[1] || []; prikaziProfil(); osvjezi(); });
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
