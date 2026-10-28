/* Feniks π: rječnik simbola i prepoznavanje osnovnog oblika riječi iz slobodnog teksta (zmiju → zmija, vukove → vuk).
   Prijenos iz Kosmogram/app/simboli.py. */
var Simboli = (function () {
  'use strict';
  var RIJECI = ["anđeo", "bijeg", "bijela", "bijeli", "bijelo", "bik", "brdo", "breza", "brod", "bubanj", "crkva", "crna", "crni", "crno", "crvena", "crveni", "crveno", "cvijet", "demon", "dijete", "dim", "drvo", "duga", "duh", "feniks", "gavran", "golub", "grom", "hram", "hrast", "jaje", "jarac", "jednorog", "jelen", "jezero", "kalež", "kamen", "kiša", "ključ", "knjiga", "konj", "kornjača", "kosa", "kralj", "kraljica", "krava", "kristal", "križ", "krug", "kruh", "kruna", "krv", "kuća", "labirint", "lav", "leptir", "let", "lipa", "lisica", "ljubičasta", "lotos", "majka", "mač", "mačka", "med", "medvjed", "miš", "mjesec", "more", "most", "munja", "nebo", "noć", "nož", "ogledalo", "oko", "oluja", "orao", "otac", "ovan", "pad", "pas", "pauk", "pjesma", "plamen", "planina", "plava", "plavi", "plavo", "ples", "potjera", "prsten", "ptica", "put", "pčela", "raskrižje", "riba", "rijeka", "rođenje", "ruka", "ruža", "san", "sjena", "smrt", "sol", "sova", "spirala", "srce", "srebro", "starac", "starica", "stepenice", "sunce", "toranj", "vatra", "vino", "vjenčanje", "vjetar", "vještica", "voda", "vrana", "vrata", "vuk", "zec", "zelena", "zeleni", "zeleno", "zemlja", "zlato", "zmaj", "zmija", "zora", "zrak", "zubi", "zvijezda", "čaša", "šaman", "špilja", "šuma", "žaba", "željezo", "žuta", "žuti", "žuto"];
  var NASTAVCI = ["ama", "ima", "ovi", "ove", "ova", "evi", "eve", "eva", "om", "em", "oj", "ju", "u", "e", "a", "i", "o"];
  // Riječi koje u običnom tekstu češće znače nešto drugo (oko = prijedlog…): samo ako ih korisnik sam označi.
  var NE_AUTOMATSKI = ["duh", "kraj", "let", "med", "oko", "pad", "put", "san", "sol"];
  var skup = {}, poOsnovi = {};
  function osnova(w) { return w.length > 3 && 'aeiou'.indexOf(w[w.length - 1]) >= 0 ? w.slice(0, -1) : w; }
  RIJECI.forEach(function (k) { skup[k] = 1; if (k.indexOf(' ') < 0 && !poOsnovi[osnova(k)]) poOsnovi[osnova(k)] = k; });
  function lema(rijec, automatski) {
    var w = rijec.toLowerCase();
    if (skup[w]) return automatski && NE_AUTOMATSKI.indexOf(w) >= 0 ? null : w;
    for (var i = 0; i < NASTAVCI.length; i++) {
      var n = NASTAVCI[i];
      if (w.slice(-n.length) === n && w.length - n.length >= 3) {
        var o = w.slice(0, -n.length), k = poOsnovi[o];
        if (!k && /[czs]$/.test(o)) k = poOsnovi[o.slice(0, -1) + { c: 'k', z: 'g', s: 'h' }[o.slice(-1)]];   // sibilarizacija: rijeci → rijeka, nozi → noga
        if (k && !(automatski && NE_AUTOMATSKI.indexOf(k) >= 0)) return k;
      }
    }
    return null;
  }
  // Svi simboli u tekstu, svaki jednom, redom pojavljivanja.
  function uTekstu(tekst) {
    var out = [], vidjeno = {};
    (tekst.toLowerCase().match(/[a-zčćđšž]+/g) || []).forEach(function (w) { var k = lema(w, true); if (k && !vidjeno[k]) { vidjeno[k] = 1; out.push(k); } });
    return out;
  }
  return { lema: lema, uTekstu: uTekstu, RIJECI: RIJECI };
})();
