/* Feniks π: nebo trenutka. Za bilo koji trenutak i mjesto: položaji planeta u znakovima, Mjesečeva mijena,
   planetarni sat i, ako postoji profil, tranziti na natalnu kartu. Sve se računa na uređaju (astronomy-engine, core.js). */
var Nebo = (function (A, N) {
  'use strict';
  var GLIFOVI = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  // imena planeta i znakova dolaze iz jezika (I18n); ovdje samo glifovi
  var PLANETI = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', node: '☊', asc: 'AC', mc: 'MC' };
  var VS = '︎';
  // Kaldejski red za planetarne sate i vladar dana (nedjelja = Sunce …)
  var KALDEJSKI = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];
  var VLADAR_DANA = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  var ASPEKTI = [[0, 'konjunkcija', '☌'], [60, 'sekstil', '⚹'], [90, 'kvadrat', '□'], [120, 'trigon', '△'], [180, 'opozicija', '☍']];   // ključevi aspekata (prijevod u I18n)

  function mijena(datum) {
    var k = A.MoonPhase(datum);                                  // 0 mlađak, 90 prva četvrt, 180 uštap, 270 zadnja četvrt
    var kljuc = k < 22.5 || k >= 337.5 ? 'mladak' : k < 67.5 ? 'mladi' : k < 112.5 ? 'prva' : k < 157.5 ? 'raste'
      : k < 202.5 ? 'ustap' : k < 247.5 ? 'opada' : k < 292.5 ? 'zadnja' : 'stari';
    return { kut: Math.round(k), kljuc: kljuc, raste: k < 180, osvijetljeno: Math.round(A.Illumination(A.Body.Moon, datum).phase_fraction * 100) };
  }

  // Planetarni sat: dan od izlaska do zalaska Sunca i noć do sljedećeg izlaska, svaki podijeljen na 12 jednakih sati.
  function planetarniSat(datum, lat, lon) {
    var obs = new A.Observer(lat, lon, 0);
    try {
      var izlazak = A.SearchRiseSet(A.Body.Sun, obs, +1, A.MakeTime(new Date(datum.getTime() - 86400000)), 2);
      while (true) { var sljedeci = A.SearchRiseSet(A.Body.Sun, obs, +1, izlazak.AddDays(0.01), 2); if (sljedeci.date > datum) break; izlazak = sljedeci; }
      var zalazak = A.SearchRiseSet(A.Body.Sun, obs, -1, izlazak, 1), sutra = A.SearchRiseSet(A.Body.Sun, obs, +1, zalazak, 1);
      var danju = datum < zalazak.date, od = danju ? izlazak.date : zalazak.date, do_ = danju ? zalazak.date : sutra.date;
      var sat = Math.floor((datum - od) / ((do_ - od) / 12)), danUTjednu = izlazak.date.getDay();
      var prvi = KALDEJSKI.indexOf(VLADAR_DANA[danUTjednu]), redni = (danju ? 0 : 12) + sat;
      var vladar = KALDEJSKI[(prvi + redni) % 7];
      return { vladar: vladar, glif: PLANETI[vladar] + '︎', danju: danju, redni: sat + 1, izlazak: izlazak.date, zalazak: zalazak.date };
    } catch (e) { return null; }
  }

  function natalna(profil) {
    if (!profil || !profil.rodenje) return null;
    var r = profil.rodenje, mog = N.resolveLocal(r.g, r.m, r.d, r.h, r.min, 0, r.zona || 'Europe/Zagreb', r.lon);
    if (!mog.length) return null;
    return N.compute({ utcMs: mog[0].utcMs, lat: r.lat, lon: r.lon });
  }

  // Tranziti sporijih i osobnih planeta na natalne točke, uzak orbis.
  function tranziti(sada, natal) {
    if (!natal) return [];
    var tr = sada.points.filter(function (p) { return PLANETI[p.id] && !p.angle && p.id !== 'node'; });
    var na = natal.points.filter(function (p) { return PLANETI[p.id] && p.id !== 'node'; }), out = [];
    tr.forEach(function (t) {
      var orbis = t.id === 'moon' ? 3 : t.id === 'sun' || t.id === 'mercury' || t.id === 'venus' || t.id === 'mars' ? 2 : 1.5;
      na.forEach(function (n) {
        var r = N.angDiff(t.lon, n.lon);
        ASPEKTI.forEach(function (a) {
          var o = Math.abs(r - a[0]);
          if (o <= orbis) out.push({ t: t.id, n: n.id, aspekt: a[1], glif: a[2], orbis: Math.round(o * 10) / 10, kuca: n.house || null });
        });
      });
    });
    return out.sort(function (a, b) { return a.orbis - b.orbis; });
  }

  // Sažetak neba trenutka koji se sprema uz zapis u dnevnik.
  function trenutak(datum, mjesto, profil) {
    var sada = N.compute({ utcMs: datum.getTime(), lat: mjesto.lat, lon: mjesto.lon }), nat = natalna(profil);
    var polozaji = sada.points.filter(function (p) { return PLANETI[p.id] && !p.angle; }).map(function (p) {
      return { id: p.id, znak: p.sign, stupanj: Math.floor(p.deg), retro: p.speed < 0 && p.id !== 'node' };
    });
    return {
      vrijeme: datum.toISOString(), polozaji: polozaji, mijena: mijena(datum), sat: planetarniSat(datum, mjesto.lat, mjesto.lon),
      tranziti: tranziti(sada, nat).slice(0, 8).map(function (t) { return { glif: t.glif, orbis: t.orbis, t: t.t, n: t.n, aspekt: t.aspekt, kuca: t.kuca }; })
    };
  }

  function znak(i) { return I18n.niz('znakovi', i); }
  function glifZnaka(i) { return GLIFOVI[i] + VS; }
  function planet(id) { return I18n.t('planet.' + id); }
  function glifPlaneta(id) { return PLANETI[id] ? PLANETI[id] + (PLANETI[id].length === 1 ? VS : '') : ''; }
  // Ime mijene i kratki opis tranzita na trenutnom jeziku (i za starije zapise koji su čuvali hrvatski naziv).
  var STARE = { 'Mlađak': 'mladak', 'Mladi Mjesec raste': 'mladi', 'Prva četvrt': 'prva', 'Mjesec raste prema uštapu': 'raste', 'Uštap': 'ustap', 'Mjesec se smanjuje': 'opada', 'Zadnja četvrt': 'zadnja', 'Stari Mjesec': 'stari' };
  function imeMijene(m) { return I18n.t('mijena.' + (m.kljuc || STARE[m.ime] || 'mladak')); }
  function tranzitTekst(tr) { return I18n.t('tranzit.kratko', tr); }
  return { trenutak: trenutak, mijena: mijena, planetarniSat: planetarniSat, natalna: natalna, tranziti: tranziti, znak: znak, glifZnaka: glifZnaka, planet: planet,
    glifPlaneta: glifPlaneta, imeMijene: imeMijene, tranzitTekst: tranzitTekst };
})(Astronomy, Natal);
