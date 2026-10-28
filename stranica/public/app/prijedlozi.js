/* Feniks π: mjesečni i godišnji prijedlozi. Sve se računa na uređaju iz natalne karte i neba (core.js, astronomy-engine).
   Mjesec: mijene i kuće u kojima padaju, Mjesečev povratak, ulasci planeta u znakove, retrogradne postaje, točni tranziti.
   Godina (od rođendana do rođendana): Sunčev povratak, profekcija i gospodar godine, pomrčine, veliki tranziti.
   Tekstovi su zrcalo puta, ne zapovijed; kasnije ih dopunjuje paket znanja iz knjiga. */
var Prijedlozi = (function (A, N) {
  'use strict';
  var DAN = 86400000;
  var KUCE = ['ja, tijelo i novi počeci', 'vrijednosti, sredstva i osjećaj sigurnosti', 'riječ, učenje, braća i bliski putevi', 'dom, korijeni i obitelj',
    'stvaranje, ljubav, djeca i radost', 'rad, zdravlje i svakodnevni red', 'partnerstva i bliski odnosi', 'preobrazba, dubina i zajednička dobra',
    'smisao, vjera, učitelji i daleki putevi', 'poziv, ugled i put u svijetu', 'prijatelji, zajednica i nade', 'tišina, snovi, skriveno i predanje'];
  var ZNAK_TEMA = ['hrabrost i početak', 'tijelo, zemlja i strpljenje', 'riječ, susret i radoznalost', 'dom, majka i osjećaji', 'srce, igra i stvaranje',
    'red, zdravlje i služenje', 'ravnoteža i odnosi', 'dubina, preobrazba i tajna', 'smisao, put i daljine', 'oblik, trajnost i odgovornost',
    'sloboda, zajednica i novo', 'snovi, suosjećanje i predanje'];
  var VLADAR = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
  var PLANET_TEMA = { sun: 'svijest, volju i životnu snagu', moon: 'osjećaje, potrebe i snove', mercury: 'misli, riječi i putovanja', venus: 'ljubav, ljepotu i vrijednosti',
    mars: 'odlučnost, želju i djelovanje', jupiter: 'rast, vjeru i darove', saturn: 'oblik, granice i zrelost', uranus: 'buđenje, slobodu i iznenađenja',
    neptune: 'snove, maštu i rastapanje granica', pluto: 'duboku preobrazbu i snagu', asc: 'način na koji ulaziš u svijet', mc: 'poziv i put u svijetu' };
  var ASPEKTI = [[0, 'konjunkcija', '☌', 'stapa se s'], [60, 'sekstil', '⚹', 'otvara vrata prema'], [90, 'kvadrat', '□', 'izaziva'], [120, 'trigon', '△', 'teče skladno s'], [180, 'opozicija', '☍', 'zrcali']];
  var ASPEKT_U = { konjunkcija: 'u konjunkciji', sekstil: 'u sekstilu', kvadrat: 'u kvadratu', trigon: 'u trigonu', opozicija: 'u opoziciji' };
  var S_KIM = { sun: 'Suncem', moon: 'Mjesecom', mercury: 'Merkurom', venus: 'Venerom', mars: 'Marsom', jupiter: 'Jupiterom', saturn: 'Saturnom', asc: 'Ascendentom', mc: 'Sredinom neba' };
  var ZENSKI = { venus: 1 };
  var ASPEKT_ZRCALO = { konjunkcija: 'Novi početak u tom dijelu tebe.', sekstil: 'Mala vrata; dovoljno ih je primijetiti.', kvadrat: 'Napetost koja traži promjenu, ne borbu.',
    trigon: 'Tok je lagan; prepusti mu se.', opozicija: 'Svijet izvana zrcali ono što je u tebi.' };
  var BROJ_TEMA = { 1: 'početak', 2: 'suradnju i slušanje', 3: 'izražavanje', 4: 'temelje', 5: 'promjenu', 6: 'brigu i dom', 7: 'tišinu i unutarnji uvid',
    8: 'snagu i plod rada', 9: 'završetak i otpuštanje', 11: 'nadahnuće', 22: 'gradnju velikoga' };

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
    var out = [], imena = { 0: 'Mlađak', 90: 'Prva četvrt', 180: 'Uštap', 270: 'Zadnja četvrt' };
    [0, 90, 180, 270].forEach(function (kut) {
      var t = A.MakeTime(new Date(od));
      while (true) {
        var r = A.SearchMoonPhase(kut, t, 40); if (!r || r.date.getTime() > do_) break;
        var lon = A.EclipticGeoMoon(r).lon, znak = Math.floor(lon / 30);
        out.push({ vrsta: 'mijena', kut: kut, ime: imena[kut], ms: r.date.getTime(), znak: znak, kuca: kucaOd(lon, natal) });
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
      var lon = A.EclipticGeoMoon(l.peak).lon; out.push({ vrsta: 'pomrcina', ms: l.peak.date.getTime(), ime: 'Pomrčina Mjeseca', vrstaP: l.kind, znak: Math.floor(lon / 30), kuca: kucaOd(lon, natal) }); t = l.peak.AddDays(10); }
    t = A.MakeTime(new Date(od));
    for (var j = 0; j < 6; j++) { var s = A.SearchGlobalSolarEclipse(t.date); if (s.peak.date.getTime() > do_) break;
      var lo = A.SunPosition(s.peak).elon; out.push({ vrsta: 'pomrcina', ms: s.peak.date.getTime(), ime: 'Pomrčina Sunca', vrstaP: s.kind, znak: Math.floor(lo / 30), kuca: kucaOd(lo, natal) }); t = s.peak.AddDays(10); }
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

  /* ---------- tekstovi ---------- */
  function uZnak(i) { var z = Nebo.znak(i); return /a$/.test(z) ? z.slice(0, -1) + 'u' : z; }
  function kucaTekst(k) { return k ? ' u tvojoj ' + k + '. kući (' + KUCE[k - 1] + ')' : ''; }
  function opis(d) {
    var P = Nebo.planet, Z = Nebo.znak;
    switch (d.vrsta) {
      case 'mijena':
        var mz = { 'Mlađak': 'Sjeme: tiho imenuj jednu namjeru i pusti je.', 'Prva četvrt': 'Prvi otpor; promotri ga bez borbe.',
          'Uštap': 'Svjetlost otkriva skriveno; primijeti što ti se pokazuje.', 'Zadnja četvrt': 'Otpusti ono što više ne nosi tvoj put.' }[d.ime];
        return { naslov: d.ime + ' u znaku ' + Z(d.znak) + ' ' + Nebo.glifZnaka(d.znak), tekst: 'Tema: ' + ZNAK_TEMA[d.znak] + kucaTekst(d.kuca) + '. ' + mz };
      case 'povratak':
        return { naslov: 'Mjesečev povratak', tekst: 'Mjesec se vraća na mjesto gdje je bio kad si se rodio: nov osjećajni krug od četiri tjedna. Ascendent povratka u znaku ' + Z(d.asc) + ' boji ga temom: ' + ZNAK_TEMA[d.asc] + '.' };
      case 'ulazak':
        return { naslov: P(d.planet) + (d.retro ? ' se vraća u ' : ' ulazi u ') + uZnak(d.znak) + ' ' + Nebo.glifZnaka(d.znak), tekst: 'Za ' + PLANET_TEMA[d.planet] + ' počinje vrijeme teme: ' + ZNAK_TEMA[d.znak] + '.' };
      case 'postaja':
        return { naslov: P(d.planet) + (d.retro ? (ZENSKI[d.planet] ? ' postaje retrogradna' : ' postaje retrogradan') : ' ponovno ide naprijed') + ' (' + Z(d.znak) + ')',
          tekst: d.retro ? 'Vrijeme da se ' + PLANET_TEMA[d.planet] + ' okrene prema unutra: ponovno promisli, ne žuri.' : 'Ono što je sazrijevalo iznutra sada se smije pokazati.' };
      case 'tranzit':
        return { naslov: P(d.planet) + ' ' + d.aspekt[1] + ' natalni ' + P(d.natal) + ' ' + d.aspekt[2],
          tekst: (ZENSKI[d.planet] ? 'Tranzitna ' : 'Tranzitni ') + P(d.planet) + ' (' + PLANET_TEMA[d.planet] + ') ' + ASPEKT_U[d.aspekt[1]] + ' je s tvojim natalnim ' + S_KIM[d.natal] + kucaTekst(d.kuca) + '. ' + ASPEKT_ZRCALO[d.aspekt[1]] };
      case 'pomrcina':
        return { naslov: d.ime + ' u znaku ' + Z(d.znak), tekst: 'Pomrčine otvaraju i zatvaraju poglavlja' + kucaTekst(d.kuca) + '. Ne treba ništa forsirati; prati što se samo mijenja oko ' + ZNAK_TEMA[d.znak] + '.' };
    }
    return { naslov: '', tekst: '' };
  }

  /* ---------- mjesec ---------- */
  function mjesec(profil, mj, sada) {
    sada = sada || new Date();
    var od = Date.UTC(sada.getFullYear(), sada.getMonth(), 1), do_ = Date.UTC(sada.getFullYear(), sada.getMonth() + 1, 1) - 1;
    var natal = Nebo.natalna(profil); if (natal && profil.rodenje.bezVremena) natal.bezKuca = true;
    var dog = mijene(od, do_, natal)
      .concat(natal ? mjesecevPovratak(od, do_, natal, mj) : [])
      .concat(kretanja(od, do_, natal, mj, ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'], natal ? ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] : []))
      .sort(function (a, b) { return a.ms - b.ms; });
    var mladak = dog.filter(function (d) { return d.ime === 'Mlađak'; })[0], ustap = dog.filter(function (d) { return d.ime === 'Uštap'; })[0];
    var sazetak = [];
    if (profil && profil.rodenje) sazetak.push('<b>Osobni mjesec ' + osobniMjesec(profil.rodenje, sada.getFullYear(), sada.getMonth() + 1) + ':</b> mjesec za ' + BROJ_TEMA[osobniMjesec(profil.rodenje, sada.getFullYear(), sada.getMonth() + 1)] + '.');
    if (mladak) sazetak.push('<b>Sjeme mjeseca</b> pada u znak ' + Nebo.znak(mladak.znak) + (mladak.kuca ? ', u tvoju ' + mladak.kuca + '. kuću: ' + KUCE[mladak.kuca - 1] : ': ' + ZNAK_TEMA[mladak.znak]) + '.');
    if (ustap) sazetak.push('<b>Vrhunac mjeseca</b> (uštap) pada u znak ' + Nebo.znak(ustap.znak) + (ustap.kuca ? ', u tvoju ' + ustap.kuca + '. kuću: ' + KUCE[ustap.kuca - 1] : ': ' + ZNAK_TEMA[ustap.znak]) + '.');
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
      '<b>Sunčev povratak</b> ' + new Date(sr.ms).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' }) + ': ascendent godine u znaku ' + Nebo.znak(sr.asc) + ' ' + Nebo.glifZnaka(sr.asc) +
        ' (' + ZNAK_TEMA[sr.asc] + ')' + (sr.kucaSunca ? '; Sunce godine sja u ' + sr.kucaSunca + '. kući: ' + KUCE[sr.kucaSunca - 1] : '') + '.',
      r.bezVremena ? '' : '<b>Profekcija:</b> u ' + (dob + 1) + '. godini života (' + dob + ' navršenih) aktivna je tvoja ' + profKuca + '. kuća, ' + KUCE[profKuca - 1] +
        ', u znaku ' + Nebo.znak(profZnak) + '. <b>Gospodar godine</b> je ' + Nebo.planet(gospodar) + ' ' + Nebo.glifPlaneta(gospodar) + ': prati njegove tranzite, kroz njih ti godina govori.',
      '<b>Osobna godina ' + og + ':</b> godina za ' + BROJ_TEMA[og] + '.'
    ].filter(Boolean);
    return { od: sr.ms, do_: sljedeci.ms, sazetak: sazetak, gospodar: gospodar, dogadaji: dog.map(function (d) { var o = opis(d); o.ms = d.ms; o.vrsta = d.vrsta; o.gospodar = d.planet === gospodar; return o; }) };
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

  return { mjesec: mjesec, godina: godina, ics: ics, KUCE: KUCE };
})(Astronomy, Natal);
