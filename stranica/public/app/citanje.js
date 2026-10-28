/* Feniks π: natalna karta i duboko čitanje. Računa se na uređaju (core.js); tekst na jeziku korisnika (I18n, ključevi nat.*).
   Vraća HTML za prikaz i čisti tekst za kopiranje i dijeljenje. */
var Citanje = (function (N) {
  'use strict';
  var t = I18n.t;
  var PLANETI = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  var ELEMENT = ['vatra', 'zemlja', 'zrak', 'voda'];                 // Ovan vatra, Bik zemlja, Blizanci zrak, Rak voda …
  var KVALITETA = ['kardinalna', 'fiksna', 'promjenjiva'];
  var ASPEKT = { conj: 'konjunkcija', sextile: 'sekstil', square: 'kvadrat', trine: 'trigon', opp: 'opozicija' };
  var GLIF_ASP = { konjunkcija: '☌', sekstil: '⚹', kvadrat: '□', trigon: '△', opozicija: '☍' };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function zbroj(n) { while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = String(n).split('').reduce(function (a, c) { return a + +c; }, 0); return n; }
  function zivotniPut(r) { return zbroj(zbroj(r.d) + zbroj(r.m) + zbroj(r.g)); }

  // r: { g, m, d, h, min, lat, lon, zona, bezVremena, ime }
  function izracunaj(r) {
    var mog = N.resolveLocal(r.g, r.m, r.d, r.bezVremena ? 12 : r.h, r.bezVremena ? 0 : r.min, 0, r.zona);
    if (!mog.length) return null;
    var c = N.compute({ utcMs: mog[0].utcMs, lat: r.lat, lon: r.lon }), o = {};
    c.points.forEach(function (p) { o[p.id] = p; });
    var kuce = !r.bezVremena, tocke = PLANETI.map(function (id) { return o[id]; }).concat(kuce ? [o.asc, o.mc] : []);
    var aspekti = N.findAspects(tocke, { use: { quincunx: false, sesqui: false, semisquare: false, semisextile: false, quintile: false } });
    var konfig = N.findConfigurations(tocke, N.findAspects(tocke, {}));
    return { r: r, karta: c, o: o, kuce: kuce, aspekti: aspekti, konfig: konfig, utcMs: mog[0].utcMs };
  }

  function polozaj(p, kuce) {
    return Nebo.znak(p.sign) + ' ' + Math.floor(p.deg) + '°' + String(Math.floor((p.deg % 1) * 60)).padStart(2, '0') + '′' + (p.speed < 0 && !p.point ? ' ℞' : '') + (kuce && p.house && !p.angle ? ' · ' + t('nat.kucaBr', { n: p.house }) : '');
  }

  function procitaj(k) {
    var o = k.o, r = k.r, dijelovi = [];
    function dio(naslov, html) { dijelovi.push({ naslov: naslov, html: html }); }

    // 1. tri stupa
    var s = o.sun, m = o.moon;
    dio(t('nat.sunce.naslov', { znak: Nebo.znak(s.sign), glif: Nebo.glifZnaka(s.sign) }),
      '<p>' + I18n.niz('nat.sunceZnak', s.sign) + '</p>' + (k.kuce ? '<p>' + t('nat.uKuci', { planet: t('planet.sun'), n: s.house, tema: I18n.niz('kuce', s.house - 1) }) + '</p>' : ''));
    dio(t('nat.mjesec.naslov', { znak: Nebo.znak(m.sign), glif: Nebo.glifZnaka(m.sign) }),
      '<p>' + I18n.niz('nat.mjesecZnak', m.sign) + '</p>' + (k.kuce ? '<p>' + t('nat.uKuci', { planet: t('planet.moon'), n: m.house, tema: I18n.niz('kuce', m.house - 1) }) + '</p>' : ''));
    if (k.kuce) dio(t('nat.asc.naslov', { znak: Nebo.znak(o.asc.sign), glif: Nebo.glifZnaka(o.asc.sign) }), '<p>' + I18n.niz('nat.ascZnak', o.asc.sign) + '</p>');
    else dio(t('nat.asc.naslovBez'), '<p>' + t('nat.asc.bez') + '</p>');

    // 2. elementi i kvalitete (Sunce, Mjesec i ascendent vrijede dvostruko)
    var el = [0, 0, 0, 0], kv = [0, 0, 0];
    PLANETI.concat(k.kuce ? ['asc'] : []).forEach(function (id) {
      var w = id === 'sun' || id === 'moon' || id === 'asc' ? 2 : 1, z = o[id].sign; el[z % 4] += w; kv[z % 3] += w;
    });
    var e1 = el.indexOf(Math.max.apply(null, el)), e0 = el.indexOf(Math.min.apply(null, el)), q1 = kv.indexOf(Math.max.apply(null, kv));
    dio(t('nat.elementi.naslov'),
      '<p>' + ELEMENT.map(function (e, i) { return t('nat.el.' + e) + ' ' + el[i]; }).join(' · ') + '</p>' +
      '<p>' + t('nat.el.vlada', { el: t('nat.el.' + ELEMENT[e1]), opis: t('nat.elOpis.' + ELEMENT[e1]) }) + '</p>' +
      (el[e0] <= 1 ? '<p>' + t('nat.el.manjak', { el: t('nat.el.' + ELEMENT[e0]), opis: t('nat.elManjak.' + ELEMENT[e0]) }) + '</p>' : '') +
      '<p>' + t('nat.kv.vlada', { kv: t('nat.kv.' + KVALITETA[q1]), opis: t('nat.kvOpis.' + KVALITETA[q1]) }) + '</p>');

    // 3. najjači aspekti
    var glavni = k.aspekti.filter(function (a) { return ASPEKT[a.type]; }).slice(0, 6);
    if (glavni.length) dio(t('nat.aspekti.naslov'), '<ul>' + glavni.map(function (a) {
      var ime = ASPEKT[a.type];
      return '<li><b>' + esc(t('planet.' + a.a)) + ' ' + GLIF_ASP[ime] + ' ' + esc(t('planet.' + a.b)) + '</b> (' + t('aspekt.' + ime) + ', ' + a.orb.toFixed(1) + '°): ' +
        t('nat.aspekt', { a: t('nat.tema.' + a.a), b: t('nat.tema.' + a.b), zrcalo: t('nat.aspektZrcalo.' + ime) }) + '</li>';
    }).join('') + '</ul>');

    // 4. konfiguracije
    var kf = k.konfig.filter(function (x) { return ['stellium', 'grandTrine', 'tSquare', 'grandCross', 'yod', 'kite', 'rectangle'].indexOf(x.type) >= 0; });
    if (kf.length) dio(t('nat.konfig.naslov'), '<ul>' + kf.map(function (x) {
      return '<li><b>' + t('nat.konfig.' + x.type) + '</b>' + (x.type === 'stellium' ? ' (' + Nebo.znak(x.sign) + ')' : '') + ': ' +
        x.members.map(function (id) { return t('planet.' + id); }).join(', ') + '. ' + t('nat.konfigOpis.' + x.type) + '</li>';
    }).join('') + '</ul>');

    // 5. životni put
    var zp = zivotniPut(r);
    dio(t('nat.broj.naslov', { n: zp }), '<p>' + t('nat.broj.' + zp) + '</p>');

    // 6. kineski horoskop: četiri stupa, elementi, preklapanja i devetogodišnji ciklus (ako je učitan kineski.js)
    if (typeof Kineski !== 'undefined') {
      var ks = Kineski.stupovi(r, k.utcMs), kp = Kineski.preklapanja(ks, k.karta), ksad = Kineski.godinaSada(new Date());
      var Z = function (st) { return t('kin.zivotinja.' + st.zivotinja); }, E = function (e) { return t('kin.el.' + e); };
      var red = [['kin.godina', ks.godina], ['kin.mjesec', ks.mjesec], ['kin.dan', ks.dan], ['kin.sat', ks.sat]].filter(function (x) { return x[1]; });
      var nema = kp.nedostaje.map(E).join(', ');
      var osobna = zbroj(zbroj(r.d) + zbroj(r.m) + zbroj(new Date().getFullYear()));
      dio(t('kin.naslov', { element: E(ks.godina.element), zivotinja: Z(ks.godina), znak: ks.godina.znak }),
        '<p><b>' + t('kin.stupovi') + ':</b> ' + red.map(function (x) { return t(x[0]) + ' <span lang="zh">' + x[1].znak + '</span> (' + E(x[1].element) + ', ' + Z(x[1]) + ')'; }).join(' · ') + '</p>' +
        '<p>' + t('kin.ja', { element: E(ks.ja), yy: t(ks.dan.yang ? 'kin.yang' : 'kin.yin'), opis: t('kin.elOpis.' + ks.ja) }) + '</p>' +
        '<p>' + t('kin.elementi', { lista: Object.keys(ks.elementi).map(function (e) { return E(e) + ' ' + ks.elementi[e]; }).join(', '), jaci: E(kp.najjaciElement),
          nedostaje: nema ? t('kin.nedostaje', { lista: nema }) : '' }) + '</p>' +
        '<p>' + t('kin.preklapanje', { element: E(ks.ja), planet: t('planet.' + kp.planetJa), znak: kp.planetJaZnak != null ? t('kin.planetZnak', { znak: Nebo.znak(kp.planetJaZnak) }) : '',
          zivotinja: Z(ks.mjesec), sunce: Nebo.znak(kp.sunceZnak) }) + '</p>' +
        '<p>' + t('kin.zvijezde', { natal: ks.zvijezda + ' (' + E(Kineski.ZVIJEZDE[ks.zvijezda]) + ')', godina: ksad.godina, sada: ksad.zvijezda + ' (' + E(Kineski.ZVIJEZDE[ksad.zvijezda]) + ')', osobna: osobna }) + '</p>');
    }

    // 7. put i prepuštanje
    dio(t('nat.put.naslov'), '<p>' + t('nat.put', { sunce: I18n.niz('znakTema', s.sign), mjesec: I18n.niz('znakTema', m.sign),
      asc: k.kuce ? I18n.niz('znakTema', o.asc.sign) : null, el: t('nat.el.' + ELEMENT[e1]), broj: zp }) + '</p>');

    var tablica = PLANETI.concat(k.kuce ? ['asc', 'mc'] : []).map(function (id) {
      return { id: id, glif: Nebo.glifPlaneta(id), ime: t('planet.' + id), polozaj: polozaj(o[id], k.kuce) };
    });
    return { naslov: t('nat.naslov', { ime: r.ime || '' }), sazetak: t('nat.sazetak', { sunce: Nebo.znak(s.sign), mjesec: Nebo.znak(m.sign), asc: k.kuce ? Nebo.znak(o.asc.sign) : '?' }),
      tablica: tablica, dijelovi: dijelovi };
  }

  // Čisti tekst za kopiranje (bez HTML-a); podaci o rođenju samo ako korisnik to želi.
  function tekst(c, sPodacima, r) {
    var l = [c.naslov.trim(), c.sazetak, ''];
    if (sPodacima && r) l.push(t('nat.rodenTekst', { datum: r.d + '. ' + r.m + '. ' + r.g + '.', vrijeme: r.bezVremena ? '?' : String(r.h).padStart(2, '0') + ':' + String(r.min).padStart(2, '0'), mjesto: r.mjesto || '' }), '');
    c.tablica.forEach(function (x) { l.push(x.ime + ': ' + x.polozaj); });
    c.dijelovi.forEach(function (d) {
      l.push('', d.naslov.toUpperCase());
      var div = document.createElement('div'); div.innerHTML = d.html.replace(/<li>/g, '<li>• ').replace(/<\/(p|li)>/g, '\n');
      l.push(div.textContent.trim());
    });
    l.push('', '— Feniks π · https://fenikspi.com');
    return l.join('\n');
  }

  return { izracunaj: izracunaj, procitaj: procitaj, tekst: tekst, zivotniPut: zivotniPut };
})(Natal);
