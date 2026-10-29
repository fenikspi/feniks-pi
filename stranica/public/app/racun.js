/* Feniks π: račun i šifrirano usklađivanje (neobavezno). Sve šifriranje je OVDJE, na uređaju (WebCrypto):
   lozinka → PBKDF2-SHA-256 (600.000 ponavljanja, sol s poslužitelja) → HKDF → (a) „provjera” koja ide poslužitelju
   i (b) ključ koji omata nasumični podatkovni ključ (AES-256-GCM). Poslužitelj dobiva samo provjeru, omotani ključ i
   šifrirane podatke. Ključ za oporavak (prikaže se jednom) omata isti podatkovni ključ, pa se zaboravljena lozinka
   može zamijeniti. Podatkovni ključ ostaje na uređaju kao neizvoziv CryptoKey. Bez računa aplikacija radi kao i prije. */
var Racun = (function () {
  'use strict';
  // bez WebCrypta (stari preglednik ili stranica bez HTTPS-a) računa nema, a ostatak aplikacije radi normalno
  if (!(window.crypto && crypto.subtle && window.TextEncoder && window.indexedDB)) return { podrzano: false };
  var API = location.protocol === 'https:' && /fenikspi\.com$/i.test(location.hostname) || /^(127\.0\.0\.1|localhost)$/.test(location.hostname) ? '/api/racun' : 'https://fenikspi.com/api/racun';
  var C = crypto.subtle, E = new TextEncoder(), D = new TextDecoder();
  var PONAVLJANJA = 600000, IME = /^[a-z0-9._-]{3,32}$/;

  /* ---------- pomoćne ---------- */
  function b64(u) { var s = ''; u = new Uint8Array(u); for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function odB64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); var b = atob(s + '==='.slice((s.length + 3) % 4)), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function bajtovi(n) { var u = new Uint8Array(n); crypto.getRandomValues(u); return u; }
  var B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';             // bez 0/O i 1/I/L, da se ključ lako prepiše
  function uKljuc(u) { var s = ''; for (var i = 0; i < u.length; i++) s += B32[u[i] % 32]; return s.match(/.{1,4}/g).join('-'); }
  function izKljuca(s) { s = String(s).toUpperCase().replace(/[^A-Z0-9]/g, ''); var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) { var k = B32.indexOf(s[i]); if (k < 0) throw new Error('kljuc'); u[i] = k; } return u; }

  function zahtjev(put, nacin, tijelo, token) {
    var h = { 'Content-Type': 'application/json' }; if (token) h.Authorization = 'Bearer ' + token;
    return fetch(API + (put ? '/' + put : ''), { method: nacin, headers: h, body: tijelo ? JSON.stringify(tijelo) : undefined, credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (o) { return (o.status === 204 ? Promise.resolve({}) : o.json().catch(function () { return {}; })).then(function (d) { if (!o.ok) { var g = new Error(d.greska || ('HTTP ' + o.status)); g.status = o.status; g.do = d.do; throw g; } return d; }); });
  }

  /* ---------- ključevi ---------- */
  // iz tajne (lozinka ili ključ za oporavak) izvodi provjeru (za poslužitelj) i ključ za omatanje (ostaje ovdje)
  function izvedi(tajna, sol, oznaka) {
    var osnova = typeof tajna === 'string'
      ? C.importKey('raw', E.encode(tajna.normalize('NFC')), 'PBKDF2', false, ['deriveBits']).then(function (k) { return C.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: odB64(sol), iterations: PONAVLJANJA }, k, 256); })
      : Promise.resolve(tajna);
    return osnova.then(function (bitovi) { return C.importKey('raw', bitovi, 'HKDF', false, ['deriveBits', 'deriveKey']); }).then(function (h) {
      var p = function (info) { return { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: E.encode('feniks-pi:' + oznaka + ':' + info) }; };
      return Promise.all([C.deriveBits(p('provjera'), h, 256), C.deriveKey(p('omot'), h, { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey'])])
        .then(function (r) { return { provjera: b64(r[0]), omot: r[1] }; });
    });
  }
  function omotaj(kljuc, omotac) { var iv = bajtovi(12); return C.wrapKey('raw', kljuc, omotac, { name: 'AES-GCM', iv: iv }).then(function (w) { return { iv: b64(iv), kljuc: b64(w) }; }); }
  function odmotaj(o, omotac, izvoziv) { return C.unwrapKey('raw', odB64(o.kljuc), omotac, { name: 'AES-GCM', iv: odB64(o.iv) }, { name: 'AES-GCM', length: 256 }, izvoziv, izvoziv ? ['encrypt', 'decrypt'] : ['encrypt', 'decrypt']); }
  function sifriraj(kljuc, obj) { var iv = bajtovi(12); return C.encrypt({ name: 'AES-GCM', iv: iv }, kljuc, E.encode(JSON.stringify(obj))).then(function (s) { return { iv: b64(iv), sifrirano: b64(s) }; }); }
  function desifriraj(kljuc, p) { return C.decrypt({ name: 'AES-GCM', iv: odB64(p.iv) }, kljuc, odB64(p.sifrirano)).then(function (b) { return JSON.parse(D.decode(b)); }); }

  /* ---------- lokalna pohrana (ista baza kao aplikacija) ---------- */
  var baza = null;
  function db() { return baza || (baza = new Promise(function (ok, ne) { var z = indexedDB.open('feniks-pi', 1); z.onupgradeneeded = function () { z.result.createObjectStore('zapisi', { keyPath: 'id' }); z.result.createObjectStore('postavke'); }; z.onsuccess = function () { ok(z.result); }; z.onerror = function () { ne(z.error); }; })); }
  function tx(sp, nacin, rad) { return db().then(function (d) { return new Promise(function (ok, ne) { var t = d.transaction(sp, nacin), r = rad(sp.map ? sp.map(function (x) { return t.objectStore(x); }) : t.objectStore(sp)); t.oncomplete = function () { ok(r && r.result); }; t.onerror = function () { ne(t.error); }; }); }); }
  function postavka(k) { return tx('postavke', 'readonly', function (s) { return s.get(k); }); }
  function spremi(k, v) { return tx('postavke', 'readwrite', function (s) { s.put(v, k); }); }
  function makni(k) { return tx('postavke', 'readwrite', function (s) { s.delete(k); }); }   // samo prijava na ovom uređaju

  /* ---------- račun ---------- */
  function prijavljen(korisnik, odgovor, kljuc) { return spremi('racun', { korisnik: korisnik, token: odgovor.token, istjece: odgovor.istjece, kljuc: kljuc, verzija: 0 }); }
  function provjeriIme(ime) { ime = String(ime || '').trim().toLowerCase(); if (!IME.test(ime)) throw new Error('ime'); return ime; }

  function novi(ime, lozinka) {
    ime = provjeriIme(ime); if (String(lozinka).length < 10) return Promise.reject(new Error('lozinka'));
    var sol = b64(bajtovi(16)), oporavak = bajtovi(26), podatkovni, kljucZaOporavak = uKljuc(oporavak);
    return C.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']).then(function (k) {
      podatkovni = k;
      return Promise.all([izvedi(lozinka, sol, 'lozinka'), izvedi(izKljuca(kljucZaOporavak), null, 'oporavak')]);
    }).then(function (r) {
      return Promise.all([omotaj(podatkovni, r[0].omot), omotaj(podatkovni, r[1].omot)]).then(function (o) {
        return zahtjev('novi', 'POST', { korisnik: ime, sol: sol, provjera: r[0].provjera, provjeraOporavka: r[1].provjera, omot: o[0], omotOporavka: o[1] });
      });
    }).then(function (odg) {
      return C.exportKey('raw', podatkovni).then(function (raw) { return C.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); })
        .then(function (k) { return prijavljen(ime, odg, k); });
    }).then(function () { return uskladi().then(function () { return kljucZaOporavak; }); });
  }

  function prijava(ime, lozinka) {
    ime = provjeriIme(ime);
    return zahtjev('sol?korisnik=' + encodeURIComponent(ime), 'GET').then(function (s) { return izvedi(lozinka, s.sol, 'lozinka'); })
      .then(function (k) { return zahtjev('prijava', 'POST', { korisnik: ime, provjera: k.provjera }).then(function (odg) {
        return odmotaj(odg.omot, k.omot, false).then(function (pk) { return prijavljen(ime, odg, pk); });
      }); }).then(uskladi);
  }

  // zaboravljena lozinka: ključ za oporavak otključa podatkovni ključ, koji se omota novom lozinkom
  function oporavak(ime, kljucZaOporavak, novaLozinka) {
    ime = provjeriIme(ime); if (String(novaLozinka).length < 10) return Promise.reject(new Error('lozinka'));
    var r, novaSol = b64(bajtovi(16));
    return izvedi(izKljuca(kljucZaOporavak), null, 'oporavak').then(function (x) { r = x; return zahtjev('omot-oporavka', 'POST', { korisnik: ime, provjera: r.provjera }); })
      .then(function (o) { return odmotaj(o.omotOporavka, r.omot, true); })
      .then(function (pk) {
        return izvedi(novaLozinka, novaSol, 'lozinka').then(function (n) { return omotaj(pk, n.omot).then(function (noviOmot) {
          return zahtjev('oporavak', 'POST', { korisnik: ime, provjera: r.provjera, novaSol: novaSol, novaProvjera: n.provjera, noviOmot: noviOmot });
        }); }).then(function (odg) {
          return C.exportKey('raw', pk).then(function (raw) { return C.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }).then(function (k) { return prijavljen(ime, odg, k); });
        });
      }).then(uskladi);
  }

  function odjava() {
    return postavka('racun').then(function (r) { return r ? zahtjev('sesija', 'DELETE', null, r.token).catch(function () {}) : null; }).then(function () { return makni('racun'); });
  }

  // brisanje računa na poslužitelju (traži lozinku); podaci na ovom uređaju ostaju
  function obrisi(lozinka) {
    var r;
    return postavka('racun').then(function (x) { r = x; if (!r) throw new Error('prijava'); return zahtjev('sol?korisnik=' + encodeURIComponent(r.korisnik), 'GET'); })
      .then(function (s) { return izvedi(lozinka, s.sol, 'lozinka'); })
      .then(function (k) { return zahtjev('', 'DELETE', { provjera: k.provjera }, r.token); })
      .then(function () { return makni('racun'); });
  }

  /* ---------- usklađivanje ---------- */
  // Spajanje: zapisi = unija po id-u, bez obrisanih (popis obrisanih id-eva putuje s podacima); profil = noviji.
  function lokalno() {
    return tx(['zapisi', 'postavke'], 'readonly', function (s) { var a = s[0].getAll(), p = s[1].get('profil'), v = s[1].get('profilVrijeme'), o = s[1].get('obrisani'); return { get result() { return { zapisi: a.result || [], profil: p.result || null, profilVrijeme: v.result || '', obrisani: o.result || [] }; } }; });
  }
  function spoji(a, b) {
    var obrisani = Array.from(new Set((a.obrisani || []).concat(b.obrisani || []))), mrtvi = new Set(obrisani), z = {};
    (a.zapisi || []).concat(b.zapisi || []).forEach(function (x) { if (x && x.id && !mrtvi.has(x.id)) z[x.id] = x; });
    var profilA = (a.profilVrijeme || '') >= (b.profilVrijeme || '');
    return { v: 1, zapisi: Object.keys(z).map(function (k) { return z[k]; }), obrisani: obrisani,
      profil: profilA ? a.profil || b.profil : b.profil || a.profil, profilVrijeme: profilA ? a.profilVrijeme : b.profilVrijeme };
  }
  function zapisiLokalno(s) {
    return tx(['zapisi', 'postavke'], 'readwrite', function (st) {
      st[0].clear(); s.zapisi.forEach(function (x) { st[0].put(x); });
      if (s.profil) st[1].put(s.profil, 'profil'); st[1].put(s.profilVrijeme || '', 'profilVrijeme'); st[1].put(s.obrisani, 'obrisani');
    });
  }
  var radi = null, opet = false;
  function uskladi() {
    if (radi) { opet = true; return radi; }
    radi = postavka('racun').then(function (r) {
      if (!r) return null;
      var pokusaj = function (n) {
        return Promise.all([zahtjev('podaci', 'GET', null, r.token), lokalno()]).then(function (x) {
          var s = x[0], lok = x[1];
          return (s.podaci ? desifriraj(r.kljuc, s.podaci) : Promise.resolve({})).then(function (udaljeno) {
            var spojeno = spoji(lok, udaljeno);
            return sifriraj(r.kljuc, spojeno).then(function (sif) { return zahtjev('podaci', 'PUT', { verzija: s.verzija, podaci: sif }, r.token); })
              .then(function (odg) { return zapisiLokalno(spojeno).then(function () { r.verzija = odg.verzija; r.uskladeno = new Date().toISOString(); return spremi('racun', r); }); })
              .then(function () { document.dispatchEvent(new Event('feniks:uskladeno')); return r; });
          });
        }).catch(function (g) { if (g.status === 409 && n < 3) return pokusaj(n + 1); if (g.status === 401) return makni('racun').then(function () { throw g; }); throw g; });
      };
      return pokusaj(0);
    }).then(function (x) { radi = null; if (opet) { opet = false; return uskladi(); } return x; }, function (g) { radi = null; opet = false; throw g; });
    return radi;
  }
  var odgoda = 0;
  function uskladiKasnije() { clearTimeout(odgoda); odgoda = setTimeout(function () { uskladi().catch(function () {}); }, 1500); }
  function zapamtiBrisanje(id) { return postavka('obrisani').then(function (o) { o = o || []; if (o.indexOf(id) < 0) o.push(id); return spremi('obrisani', o); }); }

  return { podrzano: true, stanje: function () { return postavka('racun'); }, novi: novi, prijava: prijava, oporavak: oporavak, odjava: odjava, obrisi: obrisi,
    uskladi: uskladi, uskladiKasnije: uskladiKasnije, zapamtiBrisanje: zapamtiBrisanje, _spoji: spoji };
})();

/* ---------- sučelje (Profil → Račun i usklađivanje) ---------- */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); }, t = I18n.t;
  if (!$('#racun')) return;
  if (!Racun.podrzano) { $('#racun').hidden = true; return; }
  function poruka(s, greska) { var p = $('#rc-poruka'); p.textContent = s || ''; p.style.color = greska ? '#c86850' : ''; }
  function greska(g) {
    var k = { ime: 'rc.gIme', lozinka: 'rc.gLozinka', zauzeto: 'rc.gZauzeto', 'pogrešno': 'rc.gPogresno', 'zaključano': 'rc.gZakljucano', prijava: 'rc.gPrijava', 'dnevna granica': 'rc.gGranica', kljuc: 'rc.gKljuc' }[g && g.message];
    poruka(k ? t(k) : t('rc.gMreza') + ' (' + (g && g.message) + ')', true);
  }
  function zauzeto(da) { Array.prototype.forEach.call(document.querySelectorAll('#racun button'), function (b) { b.disabled = da; }); if (da) poruka(t('rc.radim')); }
  function prikazi() {
    return Racun.stanje().then(function (r) {
      $('#racun-odjavljen').hidden = !!r; $('#racun-prijavljen').hidden = !r;
      if (r) $('#rc-status').innerHTML = t('rc.status', { ime: String(r.korisnik).replace(/[^a-z0-9._-]/g, ''), kada: r.uskladeno ? new Date(r.uskladeno).toLocaleString(I18n.locale()) : '–' });
    });
  }
  function radnja(fn, uspjeh) {
    zauzeto(true);
    return Promise.resolve().then(fn).then(function (x) { zauzeto(false); poruka(uspjeh ? t(uspjeh) : ''); $('#rc-lozinka').value = ''; $('#rc-nova').value = ''; $('#rc-brisi-lozinka').value = ''; return prikazi().then(function () { return x; }); },
      function (g) { zauzeto(false); greska(g); return prikazi(); });
  }
  $('#rc-prijava').addEventListener('click', function () { radnja(function () { return Racun.prijava($('#rc-ime').value, $('#rc-lozinka').value); }, 'rc.prijavljen'); });
  $('#rc-novi').addEventListener('click', function () {
    radnja(function () { return Racun.novi($('#rc-ime').value, $('#rc-lozinka').value); }, 'rc.napravljen').then(function (kljuc) {
      if (typeof kljuc !== 'string') return;
      $('#rc-kljuc-tekst').textContent = kljuc; $('#rc-kljuc-prikaz').hidden = false; $('#racun-prijavljen').hidden = true;
    });
  });
  $('#rc-kljuc-ok').addEventListener('click', function () { $('#rc-kljuc-tekst').textContent = ''; $('#rc-kljuc-prikaz').hidden = true; prikazi(); });
  $('#rc-oporavi').addEventListener('click', function () { radnja(function () { return Racun.oporavak($('#rc-ime').value, $('#rc-kljuc').value, $('#rc-nova').value); }, 'rc.oporavljeno'); });
  $('#rc-uskladi').addEventListener('click', function () { radnja(Racun.uskladi, 'rc.uskladeno'); });
  $('#rc-odjava').addEventListener('click', function () { radnja(Racun.odjava, 'rc.odjavljen'); });
  $('#rc-brisi').addEventListener('click', function (e) {
    var b = e.target;
    if (b.dataset.potvrda !== '1') { b.dataset.potvrda = '1'; b.textContent = t('rc.brisiSigurno'); setTimeout(function () { b.dataset.potvrda = ''; b.textContent = t('rc.brisi'); }, 5000); return; }
    b.dataset.potvrda = ''; b.textContent = t('rc.brisi');
    radnja(function () { return Racun.obrisi($('#rc-brisi-lozinka').value); }, 'rc.obrisan');
  });
  document.addEventListener('feniks:uskladeno', prikazi);
  I18n.promjena(prikazi);
  prikazi().then(function () { return Racun.stanje(); }).then(function (r) { if (r) Racun.uskladi().catch(function () {}); });   // pri otvaranju aplikacije
})();
