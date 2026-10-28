/* Feniks π: mjesečni i godišnji prijedlozi. Sve se računa na uređaju iz natalne karte i neba (core.js, astronomy-engine).
   Mjesec: mijene i kuće u kojima padaju, Mjesečev povratak, ulasci planeta u znakove, retrogradne postaje, točni tranziti.
   Godina (od rođendana do rođendana): Sunčev povratak, profekcija i gospodar godine, pomrčine, veliki tranziti.
   Tekstovi su zrcalo puta, ne zapovijed; kasnije ih dopunjuje paket znanja iz knjiga. */
var Prijedlozi = (function (A, N) {
  'use strict';
  var DAN = 86400000;
  var VLADAR = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
  var ASPEKTI = [[0, 'konjunkcija', '☌'], [60, 'sekstil', '⚹'], [90, 'kvadrat', '□'], [120, 'trigon', '△'], [180, 'opozicija', '☍']];   // ključevi; tekstovi u I18n
  var t = I18n.t;

  function zbroj(n) { while (n > 9 && n !== 11 && n !== 22) n = String(n).split('').reduce(function (a, c) { return a + +c; }, 0); return n; }
  function osobnaGodina(r, g) { return zbroj(zbroj(r.d) + zbroj(r.m) + zbroj(g)); }
  function osobniMjesec(r, g, m) { return zbroj(osobnaGodina(r, g) + zbroj(m)); }

  // Samo potrebni planeti (bez kuća i asteroida); brzina iz razlike prema prethodnom uzorku.
  // Pluton je u astronomy-engine spor za računanje, a pomiče se oko 0,03° na dan: unaprijed se računa točno svaka 4 dana
  // preko cijelog razdoblja, a između se interpolira (glatko, bez lažnih postaja).
  function uzorkivac(ids, korak, od, do_) {
    var zadnji = {}, mreza = null, KORAK_P = 4 * DAN;
    if (ids.indexOf('pluto') >= 0) {
      mreza = [];
      for (var m = od - 2 * KORAK_P; m <= do_ + 2 * KORAK_P; m += KORAK_P) mreza.push(N.bodyLon('pluto', A.MakeTime(new Date(m))));
    }
    function pluton(ms) {
      var x = (ms - (od - 2 * KORAK_P)) / KORAK_P, i = Math.min(mreza.length - 2, Math.max(0, Math.floor(x))), d = razlika(mreza[i + 1], mreza[i]);
      return { lon: (mreza[i] + d * (x - i) + 360) % 360, speed: d / 4 };
    }
    return function (ms) {
      var t = A.MakeTime(new Date(ms)), o = {};
      ids.forEach(function (id) {
        if (id === 'pluto') { var pl = pluton(ms); o[id] = { id: id, lon: pl.lon, sign: Math.floor(pl.lon / 30), speed: pl.speed }; return; }
        var lon = N.bodyLon(id, t), prije = zadnji[id] == null ? N.bodyLon(id, A.MakeTime(new Date(ms - korak))) : zadnji[id];
        o[id] = { id: id, lon: lon, sign: Math.floor(lon / 30), speed: razlika(lon, prije) / (korak / DAN) };
        zadnji[id] = lon;
      });
      return o;
    };
  }

  // Bisekcija: trenutak u [a, b] gdje f mijenja predznak.
  function nula(f, a, b) {
    var fa = f(a);
    for (var i = 0; i < 40 && b - a > 60000; i++) { var m = (a + b) / 2, fm = f(m); if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m; }
    return (a + b) / 2;
  }
  function razlika(a, b) { var d = ((a - b) % 360 + 540) % 360 - 180; return d; }
  function kucaOd(lon, natal) { return natal && !natal.bezKuca ? N.houseOf(lon, natal.houses.cusps) : null; }
  function natalTocke(natal) {
    var o = {}; natal.points.forEach(function (p) { o[p.id] = p; });
    var ids = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    if (!natal.bezKuca) ids.push('asc', 'mc');
    return ids.map(function (id) { return o[id]; });
  }

  // Mijene između dva trenutka: mlađak, prva četvrt, uštap, zadnja četvrt.
  function mijene(od, do_, natal) {
    var out = [], kljucevi = { 0: 'mladak', 90: 'prva', 180: 'ustap', 270: 'zadnja' };
    [0, 90, 180, 270].forEach(function (kut) {
      var t = A.MakeTime(new Date(od));
      while (true) {
        var r = A.SearchMoonPhase(kut, t, 40); if (!r || r.date.getTime() > do_) break;
        var lon = A.EclipticGeoMoon(r).lon, znak = Math.floor(lon / 30);
        out.push({ vrsta: 'mijena', kut: kut, kljuc: kljucevi[kut], ms: r.date.getTime(), znak: znak, kuca: kucaOd(lon, natal) });
        t = r.AddDays(1);
      }
    });
    return out.sort(function (a, b) { return a.ms - b.ms; });
  }

  // Mjesečev povratak: Mjesec se vraća na natalni položaj (otprilike svakih 27,3 dana).
  function mjesecevPovratak(od, do_, natal, mj) {
    var cilj = natal.points.filter(function (p) { return p.id === 'moon'; })[0].lon, out = [];
    var f = function (ms) { return razlika(A.EclipticGeoMoon(A.MakeTime(new Date(ms))).lon, cilj); };
    for (var t = od; t < do_; t += DAN / 4) {
      var a = f(t), b = f(t + DAN / 4);
      if (a < 0 && b >= 0 && Math.abs(a - b) < 30) { var ms = nula(f, t, t + DAN / 4); out.push({ vrsta: 'povratak', ms: ms, asc: Math.floor(N.angles(A.MakeTime(new Date(ms)), mj.lat, mj.lon).asc / 30) }); }
    }
    return out;
  }

  // Dnevno uzorkovanje: ulasci u znakove, retrogradne postaje i točni tranziti na natalne točke.
  function kretanja(od, do_, natal, mj, planeti, tranzitPlaneti, korak) {
    korak = korak || DAN;
    var out = [], pret = null, tocke = natal ? natalTocke(natal) : [], minimumi = {};
    var ids = planeti.concat(tranzitPlaneti.filter(function (x) { return planeti.indexOf(x) < 0; })), polozaji = uzorkivac(ids, korak, od, do_);
    for (var t = od; t <= do_; t += korak) {
      var p = polozaji(t);
      if (pret) planeti.forEach(function (id) {
        var a = pret[id], b = p[id];
        if (a.sign !== b.sign) out.push({ vrsta: 'ulazak', ms: t, planet: id, znak: b.sign, retro: b.speed < 0 });
        if (id !== 'sun' && id !== 'moon' && (a.speed < 0) !== (b.speed < 0)) out.push({ vrsta: 'postaja', ms: t, planet: id, retro: b.speed < 0, znak: b.sign });
      });
      tranzitPlaneti.forEach(function (id) {
        tocke.forEach(function (n) {
          if (id === n.id && (id === 'sun' || id === 'mercury' || id === 'venus')) return;   // vlastiti povratci brzih planeta su česti
          ASPEKTI.forEach(function (as) {
            var k = id + '|' + n.id + '|' + as[0], orb = Math.abs(N.angDiff(p[id].lon, n.lon) - as[0]), m = minimumi[k];
            if (m && m.pad && orb > m.orb && m.orb < 1) out.push({ vrsta: 'tranzit', ms: m.ms, planet: id, natal: n.id, aspekt: as, kuca: n.house, orb: m.orb });
            minimumi[k] = { orb: orb, ms: t, pad: !m || orb < m.orb };
          });
        });
      });
      pret = p;
    }
    return out;
  }

  function pomrcine(od, do_, natal) {
    var out = [], t = A.MakeTime(new Date(od));
    for (var i = 0; i < 6; i++) { var l = A.SearchLunarEclipse(t.date); if (l.peak.date.getTime() > do_) break;
      var lon = A.EclipticGeoMoon(l.peak).lon; out.push({ vrsta: 'pomrcina', ms: l.peak.date.getTime(), ime: 'mjesec', vrstaP: l.kind, znak: Math.floor(lon / 30), kuca: kucaOd(lon, natal) }); t = l.peak.AddDays(10); }
    t = A.MakeTime(new Date(od));
    for (var j = 0; j < 6; j++) { var s = A.SearchGlobalSolarEclipse(t.date); if (s.peak.date.getTime() > do_) break;
      var lo = A.SunPosition(s.peak).elon; out.push({ vrsta: 'pomrcina', ms: s.peak.date.getTime(), ime: 'sunce', vrstaP: s.kind, znak: Math.floor(lo / 30), kuca: kucaOd(lo, natal) }); t = s.peak.AddDays(10); }
    return out.sort(function (a, b) { return a.ms - b.ms; });
  }

  // Sunčev povratak: Sunce na natalnom položaju, oko rođendana zadane godine.
  function suncevPovratak(natal, rod, godina, mj) {
    var cilj = natal.points.filter(function (p) { return p.id === 'sun'; })[0].lon;
    var f = function (ms) { return razlika(A.SunPosition(A.MakeTime(new Date(ms))).elon, cilj); };
    var sred = Date.UTC(godina, rod.m - 1, rod.d), ms = nula(f, sred - 3 * DAN, sred + 3 * DAN);
    var c = N.compute({ utcMs: ms, lat: mj.lat, lon: mj.lon }), sunce = c.points.filter(function (p) { return p.id === 'sun'; })[0];
    return { ms: ms, asc: Math.floor(c.houses.asc / 30), kucaSunca: sunce.house };
  }

  /* ---------- tekstovi (na trenutnom jeziku, I18n) ---------- */
  function opis(d) {
    var G = Nebo.glifZnaka;
    switch (d.vrsta) {
      case 'mijena':
        return { naslov: t('dog.mijena.naslov', { mijena: t('mijena.' + d.kljuc), znak: Nebo.znak(d.znak), glif: G(d.znak) }), tekst: t('dog.mijena.tekst', d) };
      case 'povratak':
        return { naslov: t('dog.povratak.naslov'), tekst: t('dog.povratak.tekst', { znak: Nebo.znak(d.asc), tema: I18n.niz('znakTema', d.asc) }) };
      case 'ulazak':
        return { naslov: t('dog.ulazak.naslov', { planet: d.planet, znak: d.znak, retro: d.retro, glif: G(d.znak) }), tekst: t('dog.ulazak.tekst', d) };
      case 'postaja':
        return { naslov: t('dog.postaja.naslov', d), tekst: t('dog.postaja.tekst', d) };
      case 'tranzit':
        var p = { planet: d.planet, natal: d.natal, aspekt: d.aspekt[1], glif: d.aspekt[2], kuca: d.kuca };
        return { naslov: t('dog.tranzit.naslov', p), tekst: t('dog.tranzit.tekst', p) };
      case 'pomrcina':
        return { naslov: t('dog.pomrcina.naslov', { ime: t('dog.pomrcina.' + d.ime), znak: Nebo.znak(d.znak) }), tekst: t('dog.pomrcina.tekst', d) };
    }
    return { naslov: '', tekst: '' };
  }
  function datumDug(ms) { return new Date(ms).toLocaleDateString(I18n.locale(), { day: 'numeric', month: 'long', year: 'numeric' }); }

  /* ---------- mjesec ---------- */
  function mjesec(profil, mj, sada) {
    sada = sada || new Date();
    var od = Date.UTC(sada.getFullYear(), sada.getMonth(), 1), do_ = Date.UTC(sada.getFullYear(), sada.getMonth() + 1, 1) - 1;
    var natal = Nebo.natalna(profil); if (natal && profil.rodenje.bezVremena) natal.bezKuca = true;
    var dog = mijene(od, do_, natal)
      .concat(natal ? mjesecevPovratak(od, do_, natal, mj) : [])
      .concat(kretanja(od, do_, natal, mj, ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'], natal ? ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] : []))
      .sort(function (a, b) { return a.ms - b.ms; });
    var mladak = dog.filter(function (d) { return d.kljuc === 'mladak'; })[0], ustap = dog.filter(function (d) { return d.kljuc === 'ustap'; })[0];
    var sazetak = [];
    if (profil && profil.rodenje) { var om = osobniMjesec(profil.rodenje, sada.getFullYear(), sada.getMonth() + 1); sazetak.push(t('mj.osobni', { n: om, tema: t('broj.' + om) })); }
    if (mladak) sazetak.push(t('mj.sjeme', mladak));
    if (ustap) sazetak.push(t('mj.vrhunac', ustap));
    return { od: od, do_: do_, sazetak: sazetak, dogadaji: dog.map(function (d) { var o = opis(d); o.ms = d.ms; o.vrsta = d.vrsta; return o; }) };
  }

  /* ---------- godina (od rođendana do rođendana) ---------- */
  function godina(profil, mj, sada) {
    sada = sada || new Date();
    if (!profil || !profil.rodenje) return null;
    var r = profil.rodenje, natal = Nebo.natalna(profil); if (!natal) return null;
    if (r.bezVremena) natal.bezKuca = true;
    var g = sada.getFullYear(), sr = suncevPovratak(natal, r, g, mj);
    if (sr.ms > sada.getTime()) { g -= 1; sr = suncevPovratak(natal, r, g, mj); }
    var sljedeci = suncevPovratak(natal, r, g + 1, mj), dob = g - r.g;
    var ascZnak = Math.floor(natal.houses.asc / 30), profKuca = dob % 12 + 1, profZnak = (ascZnak + dob) % 12, gospodar = VLADAR[profZnak];
    var og = osobnaGodina(r, sada.getFullYear());
    var dog = pomrcine(sr.ms, sljedeci.ms, natal)
      .concat(kretanja(sr.ms, sljedeci.ms, natal, mj, ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'], ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'], 2 * DAN))
      .sort(function (a, b) { return a.ms - b.ms; });
    var sazetak = [
      t('god.sr', { datum: datumDug(sr.ms), asc: sr.asc, glif: Nebo.glifZnaka(sr.asc), kuca: r.bezVremena ? null : sr.kucaSunca }),
      r.bezVremena ? '' : t('god.prof', { dob: dob, kuca: profKuca, znak: profZnak, gospodar: gospodar, glif: Nebo.glifPlaneta(gospodar) }),
      t('god.osobna', { n: og, tema: t('broj.' + og) }),
      typeof Kineski === 'undefined' ? '' : kineskaGodina(r, natal)
    ].filter(Boolean);
    return { od: sr.ms, do_: sljedeci.ms, sazetak: sazetak, gospodar: gospodar, dogadaji: dog.map(function (d) { var o = opis(d); o.ms = d.ms; o.vrsta = d.vrsta; o.gospodar = d.planet === gospodar; return o; }) };
  }

  // kineski sloj godine: kineska godina u tijeku i njezin odnos prema natalnoj godini, devet zvijezda
  function kineskaGodina(r, natal) {
    var mog = N.resolveLocal(r.g, r.m, r.d, r.bezVremena ? 12 : r.h, r.bezVremena ? 0 : r.min, 0, r.zona || 'Europe/Zagreb');
    var ks = Kineski.stupovi(r, mog[0].utcMs), sad = Kineski.godinaSada(new Date());
    var odnos = ['isto', 'susjed', 'susjed', 'kvadrat', 'trigon', 'susjed', 'opozicija', 'susjed', 'trigon', 'kvadrat', 'susjed', 'susjed'];   // razmak grana: 4 i 8 = san he, 6 = chong, 3 i 9 = napetost
    var razmak = ((sad.stup.grana - ks.godina.grana) % 12 + 12) % 12;
    return t('god.kineska', { znak: sad.stup.znak, zivotinja: t('kin.zivotinja.' + sad.stup.zivotinja), element: t('kin.el.' + sad.stup.element),
      natal: t('kin.zivotinja.' + ks.godina.zivotinja), odnos: t('god.kinOdnos.' + odnos[razmak]),
      zvijezda: sad.zvijezda + ' (' + t('kin.el.' + Kineski.ZVIJEZDE[sad.zvijezda]) + ')', natalZvijezda: ks.zvijezda + ' (' + t('kin.el.' + Kineski.ZVIJEZDE[ks.zvijezda]) + ')' });
  }

  /* ---------- kalendar (.ics) ---------- */
  function ics(dogadaji, naziv) {
    function dt(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); }
    function esc(s) { return String(s).replace(/<[^>]+>/g, '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }
    var l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Feniks Pi//fenikspi.com//HR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + esc(naziv)];
    dogadaji.forEach(function (d, i) {
      l.push('BEGIN:VEVENT', 'UID:' + Math.round(d.ms) + '-' + i + '@fenikspi.com', 'DTSTAMP:' + dt(Date.now()), 'DTSTART:' + dt(d.ms), 'DTEND:' + dt(d.ms + 3600000),
        'SUMMARY:' + esc(d.naslov.replace(/[︎]/g, '')), 'DESCRIPTION:' + esc(d.tekst), 'END:VEVENT');
    });
    l.push('END:VCALENDAR');
    return l.join('\r\n');
  }

  return { mjesec: mjesec, godina: godina, ics: ics, datumDug: datumDug };
})(Astronomy, Natal);
