/* Feniks π: kineski horoskop. Četiri stupa sudbine (BaZi: godina, mjesec, dan, sat), pet elemenata, 60-godišnji ciklus
   i kinesko-japanskih devet zvijezda, te preklapanja sa zapadnom kartom. Računa se iz stvarnog položaja Sunca (astronomy-engine):
   - godina počinje Lichunom (Sunce na 315° ekliptičke dužine, oko 4. veljače), ne 1. siječnja ni kineskom Novom godinom;
   - mjeseci su 12 solarnih razdoblja po 30° od Lichuna (jieqi), pa se kineski mjesec preklapa sa zapadnim znakom pomaknutim za 15°;
   - dan po 60-dnevnom ciklusu iz julijanskog dana (2000-01-01 = 戊午); sat po dvosatnim granama (zi 23–01 …).
   Napomena: dan se mijenja u ponoć po lokalnom vremenu (neke škole mijenjaju u 23 h), sat po službenom lokalnom vremenu. */
var Kineski = (function (A) {
  'use strict';
  var STABLA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var GRANE = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var ZIVOTINJE = ['stakor', 'bivol', 'tigar', 'zec', 'zmaj', 'zmija', 'konj', 'koza', 'majmun', 'pijetao', 'pas', 'svinja'];
  var ELEMENTI = ['drvo', 'vatra', 'zemlja', 'metal', 'voda'];
  var ELEMENT_GRANE = ['voda', 'zemlja', 'drvo', 'drvo', 'zemlja', 'vatra', 'vatra', 'zemlja', 'metal', 'metal', 'zemlja', 'voda'];
  // klasično preklapanje: pet elemenata ↔ pet vidljivih planeta (Jupiter = Drvena zvijezda, Mars = Vatrena, Saturn = Zemljana, Venera = Metalna, Merkur = Vodena)
  var PLANET_ELEMENTA = { drvo: 'jupiter', vatra: 'mars', zemlja: 'saturn', metal: 'venus', voda: 'mercury' };
  var ZVIJEZDE = ['', '1 bijela voda', '2 crna zemlja', '3 zelena (jade) drvo', '4 zelena drvo', '5 žuta zemlja', '6 bijeli metal', '7 crveni metal', '8 bijela zemlja', '9 ljubičasta vatra'];

  function mod(a, n) { return ((a % n) + n) % n; }
  function duzinaSunca(ms) { return A.SunPosition(A.MakeTime(new Date(ms))).elon; }
  // kineska godina (prema Lichunu): godina rođenja ili ona prije, ako je rođenje prije Sunca na 315°
  function godinaLichun(ms, kalendarskaGodina) {
    var l = duzinaSunca(ms), mjesec = new Date(ms).getUTCMonth();
    return (mjesec <= 1 && l >= 270 && l < 315) ? kalendarskaGodina - 1 : kalendarskaGodina;
  }
  function stup(stablo, grana) {
    return { stablo: stablo, grana: grana, znak: STABLA[stablo] + GRANE[grana], element: ELEMENTI[Math.floor(stablo / 2)], yang: stablo % 2 === 0,
      zivotinja: ZIVOTINJE[grana], elementGrane: ELEMENT_GRANE[grana], ciklus: mod(6 * stablo - 5 * grana, 60) + 1 };   // redni broj u 60-ciklusu (1 = 甲子)
  }
  function jdn(g, m, d) { var a = Math.floor((14 - m) / 12), y = g + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045; }
  function devetZvijezda(godina) { var z = mod(11 - mod(godina, 9), 9); return z === 0 ? 9 : z; }

  // r: lokalni datum i sat rođenja { g, m, d, h, min, bezVremena } i trenutak u UTC (utcMs)
  function stupovi(r, utcMs) {
    var G = godinaLichun(utcMs, r.g), gs = mod(G - 4, 10), gg = mod(G - 4, 12);
    var l = duzinaSunca(utcMs), mj = Math.floor(mod(l - 315, 360) / 30);                      // 0 = 寅 (tigar), od Lichuna
    var ms = mod((gs % 5) * 2 + 2 + mj, 10), mg = mod(2 + mj, 12);
    var dan = mod(jdn(r.g, r.m, r.d) - 11, 60), ds = dan % 10, dg = dan % 12;
    var sat = null;
    if (!r.bezVremena) { var sg = Math.floor(mod(r.h + 1, 24) / 2); sat = stup(mod((ds % 5) * 2 + sg, 10), sg); }
    var s = { godina: stup(gs, gg), mjesec: stup(ms, mg), dan: stup(ds, dg), sat: sat, kineskaGodina: G, zvijezda: devetZvijezda(G) };
    // ravnoteža pet elemenata u osam znakova (stabla + glavni element grana)
    var br = { drvo: 0, vatra: 0, zemlja: 0, metal: 0, voda: 0 };
    ['godina', 'mjesec', 'dan', 'sat'].forEach(function (k) { if (s[k]) { br[s[k].element]++; br[s[k].elementGrane]++; } });
    s.elementi = br;
    s.ja = s.dan.element;                                                                    // „gospodar dana”: osoba sama u BaZiju
    return s;
  }

  // godina u tijeku: kineska životinja i element, devet zvijezda, i osobni devetogodišnji ciklus prema natalnoj zvijezdi
  function godinaSada(datum) {
    var G = godinaLichun(datum.getTime(), datum.getUTCFullYear());
    return { godina: G, stup: stup(mod(G - 4, 10), mod(G - 4, 12)), zvijezda: devetZvijezda(G) };
  }

  // preklapanja sa zapadnom kartom: element dana ↔ planet, kineski mjesec ↔ zapadni znak (pomak 15°), životinja godine ↔ znak iste grane
  function preklapanja(s, natal) {
    var o = {}; if (natal) natal.points.forEach(function (p) { o[p.id] = p; });
    var planetJa = PLANET_ELEMENTA[s.ja], sunce = o.sun;
    return {
      planetJa: planetJa, planetJaZnak: o[planetJa] ? o[planetJa].sign : null,
      sunceZnak: sunce ? sunce.sign : null, mjesecGrana: s.mjesec.grana,
      // grana 寅 (tigar) počinje na 315° = 15° Vodenjaka; zapadni znak u kojem kineski mjesec završava
      mjesecZnak: Math.floor(mod(315 + (s.mjesec.grana - 2) * 30 + 15, 360) / 30),
      najjaciElement: Object.keys(s.elementi).sort(function (a, b) { return s.elementi[b] - s.elementi[a]; })[0],
      nedostaje: Object.keys(s.elementi).filter(function (e) { return !s.elementi[e]; })
    };
  }

  return { stupovi: stupovi, godinaSada: godinaSada, preklapanja: preklapanja, devetZvijezda: devetZvijezda, ZVIJEZDE: ZVIJEZDE, PLANET_ELEMENTA: PLANET_ELEMENTA, ZIVOTINJE: ZIVOTINJE, ELEMENTI: ELEMENTI };
})(Astronomy);
