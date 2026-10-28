/* Feniks π: helenistički sloj majstorskog horoskopa. Sve na istom tropskom zodijaku kao natalna karta (core.js):
   - sekta: dnevna karta ako je Sunce iznad obzora (kuće 7–12); svjetlo, dobročinitelj i zločinitelj sekte (Valens, Ptolemej);
   - 36 dekana (lica) po kaldejskom redu, od Marsa na 0° Ovna (Teukar, Ptolemej);
   - točke (klēroi): Sreća = Asc + Mjesec − Sunce danju (noću obrnuto), Duh obrnuto od Sreće (Valens II.3);
   - firdarija po Abu Ma'šaru: 75 godina, sedam planeta i čvorovi, svako razdoblje planeta u sedam jednakih podrazdoblja
     (noćni red stavlja čvorove na kraj; Bonatti ih stavlja iza Marsa);
   - zodijakalno otpuštanje (Valens IV): od znaka Duha, mala razdoblja vladara znakova (Jarac 27, Vodenjak 30),
     godina od 360 dana, druga razina u mjesecima od 30 dana, „otpuštanje veze” nakon dvanaest znakova; vrhunci su znakovi
     u kutovima (1., 4., 7., 10.) od znaka Sreće. */
var Helenisticki = (function () {
  'use strict';
  var KALDEJSKI = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];
  var VLADAR = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
  var MALE_GODINE = [15, 8, 20, 25, 19, 20, 8, 15, 12, 27, 30, 12];
  var FIRDARIJA = {
    dan: [['sun', 10], ['venus', 8], ['mercury', 13], ['moon', 9], ['saturn', 11], ['jupiter', 12], ['mars', 7], ['node', 3], ['southNode', 2]],
    noc: [['moon', 9], ['saturn', 11], ['jupiter', 12], ['mars', 7], ['sun', 10], ['venus', 8], ['mercury', 13], ['node', 3], ['southNode', 2]]
  };
  var GODINA = 365.2422 * 864e5, DAN = 864e5;

  function norm(x) { x %= 360; return x < 0 ? x + 360 : x; }

  // lice (dekan): 0–35 od 0° Ovna; vladar po kaldejskom redu počevši od Marsa
  function dekan(lon) { var i = Math.floor(norm(lon) / 10); return { broj: i % 3 + 1, znak: Math.floor(i / 3), vladar: KALDEJSKI[(i + 2) % 7] }; }

  function sekta(o) {
    var dan = o.sun.house >= 7;
    // zločinitelj sekte je ublažen; onaj protiv sekte je najteži planet karte
    return { dan: dan, svjetlo: dan ? 'sun' : 'moon', dobrocinitelj: dan ? 'jupiter' : 'venus', zlocinitelj: dan ? 'saturn' : 'mars',
      protivSekte: dan ? 'mars' : 'saturn' };
  }

  function tocke(o, dan) {
    var a = o.asc.lon, s = o.sun.lon, m = o.moon.lon;
    return { sreca: norm(dan ? a + m - s : a + s - m), duh: norm(dan ? a + s - m : a + m - s) };
  }

  // firdarija u trenutku `sadaMs`: glavno razdoblje i podrazdoblje
  function firdarija(rodMs, dan, sadaMs) {
    var red = FIRDARIJA[dan ? 'dan' : 'noc'], g = (sadaMs - rodMs) / GODINA, krug = Math.floor(g / 75), poc = krug * 75;
    for (var i = 0; i < red.length; i++) {
      var p = red[i][0], n = red[i][1];
      if (g < poc + n) {
        var r = { planet: p, odMs: rodMs + poc * GODINA, doMs: rodMs + (poc + n) * GODINA, pod: null };
        if (p !== 'node' && p !== 'southNode') {
          var k = Math.floor((g - poc) / (n / 7)), j = KALDEJSKI.indexOf(p);
          r.pod = { planet: KALDEJSKI[(j + k) % 7], odMs: rodMs + (poc + k * n / 7) * GODINA, doMs: rodMs + (poc + (k + 1) * n / 7) * GODINA };
        }
        return r;
      }
      poc += n;
    }
  }

  // zodijakalno otpuštanje od znaka `poc`: razdoblje 1. i 2. razine u trenutku `sadaMs`; vrhunac ako je znak u kutu od znaka Sreće
  function otpustanje(rodMs, poc, srecaZnak, sadaMs) {
    var dani = (sadaMs - rodMs) / DAN, z = poc, d = 0;
    while (d + MALE_GODINE[z] * 360 <= dani) { d += MALE_GODINE[z] * 360; z = (z + 1) % 12; }
    var L1 = { znak: z, odMs: rodMs + d * DAN, doMs: rodMs + (d + MALE_GODINE[z] * 360) * DAN };
    var z2 = z, d2 = d, n = 0, L2;
    while (true) {
      var trajanje = MALE_GODINE[z2] * 30;
      if (d2 + trajanje > dani) { L2 = { znak: z2, odMs: rodMs + d2 * DAN, doMs: rodMs + (d2 + trajanje) * DAN, otpustanjeVeze: n >= 12 }; break; }
      d2 += trajanje; n++;
      z2 = n === 12 ? (z + 6) % 12 : (z2 + 1) % 12;                 // otpuštanje veze: skok na znak nasuprot znaka 1. razine
    }
    function vrh(zn) { var k = (zn - srecaZnak + 12) % 12; return k % 3 === 0 ? k + 1 : 0; }   // 1, 4, 7 ili 10 (kuća od Sreće)
    L1.vrh = vrh(L1.znak); L2.vrh = vrh(L2.znak);
    return { L1: L1, L2: L2 };
  }

  // k: rezultat Citanje.izracunaj (o = točke po id-u, kuce = poznato vrijeme rođenja, utcMs)
  function izracunaj(k, sadaMs) {
    var o = k.o, h = { dekani: {} };
    ['sun', 'moon'].concat(k.kuce ? ['asc'] : []).forEach(function (id) { h.dekani[id] = dekan(o[id].lon); });
    if (!k.kuce) return h;                                           // bez vremena rođenja nema sekte, točaka ni razdoblja
    h.sekta = sekta(o);
    var t = tocke(o, h.sekta.dan);
    h.sreca = { lon: t.sreca, znak: Math.floor(t.sreca / 30), kuca: Natal.houseOf(t.sreca, k.karta.houses.cusps) };
    h.duh = { lon: t.duh, znak: Math.floor(t.duh / 30), kuca: Natal.houseOf(t.duh, k.karta.houses.cusps) };
    h.sreca.vladar = VLADAR[h.sreca.znak]; h.duh.vladar = VLADAR[h.duh.znak];
    h.firdarija = firdarija(k.utcMs, h.sekta.dan, sadaMs);
    h.otpustanje = otpustanje(k.utcMs, h.duh.znak, h.sreca.znak, sadaMs);
    return h;
  }

  return { izracunaj: izracunaj, dekan: dekan, sekta: sekta, tocke: tocke, firdarija: firdarija, otpustanje: otpustanje,
    VLADAR: VLADAR, MALE_GODINE: MALE_GODINE, KALDEJSKI: KALDEJSKI };
})();
