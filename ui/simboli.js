/* Feniks Pi: žive oznake simbola koje uče s korisnikom.
   Svaki simbol (planet, znak, aspekt) prikazuje se kao <span class="sim" data-sim="...">.
   Hover/klik otvara karticu sa značenjem i stvarnom slikom; brojač pogleda u localStorage
   određuje kada se ime skriva i ostaje samo glif (način „prilagodljivo”). */
var Simboli = (function () {
  'use strict';
  var VS = '︎', SLIKE = '/feniks/assets/planeti/';
  var D = {
    sun:     { g: '☉', ime: 'Sunce', vrsta: 'planet', slika: 'sun.jpg', kw: 'volja, identitet, životna snaga', opis: 'Središte osobnosti: ono što svjesno želiš postati. Vlada Lavom.' },
    moon:    { g: '☽', ime: 'Mjesec', vrsta: 'planet', slika: 'moon.jpg', kw: 'osjećaji, potrebe, navike', opis: 'Unutarnji svijet, sigurnost, majka i dom. Vlada Rakom.' },
    mercury: { g: '☿', ime: 'Merkur', vrsta: 'planet', slika: 'mercury.jpg', kw: 'um, govor, učenje', opis: 'Kako misliš i razgovaraš. Vlada Blizancima i Djevicom.' },
    venus:   { g: '♀', ime: 'Venera', vrsta: 'planet', slika: 'venus.png', kw: 'ljubav, ljepota, vrijednosti', opis: 'Što voliš i kako se povezuješ. Vlada Bikom i Vagom.' },
    mars:    { g: '♂', ime: 'Mars', vrsta: 'planet', slika: 'mars.jpg', kw: 'energija, hrabrost, djelovanje', opis: 'Kako se boriš i ostvaruješ. Vlada Ovnom (i tradicionalno Škorpionom).' },
    jupiter: { g: '♃', ime: 'Jupiter', vrsta: 'planet', slika: 'jupiter.jpg', kw: 'rast, vjera, prilike', opis: 'Gdje se širiš i dobivaš. Vlada Strijelcem (i tradicionalno Ribama).' },
    saturn:  { g: '♄', ime: 'Saturn', vrsta: 'planet', slika: 'saturn.png', kw: 'struktura, odgovornost, vrijeme', opis: 'Granice, strpljenje i zrele lekcije. Vlada Jarcem (i tradicionalno Vodenjakom).' },
    uranus:  { g: '♅', ime: 'Uran', vrsta: 'planet', slika: 'uranus.jpg', kw: 'sloboda, promjena, buđenje', opis: 'Iznenađenja, originalnost, prekid s ukočenim. Vlada Vodenjakom.' },
    neptune: { g: '♆', ime: 'Neptun', vrsta: 'planet', slika: 'neptune.jpg', kw: 'mašta, intuicija, ideal', opis: 'Rastakanje granica, snovi, nadahnuće. Vlada Ribama.' },
    pluto:   { g: '♇', ime: 'Pluton', vrsta: 'planet', slika: 'pluto.jpg', kw: 'preobrazba, moć, obnova', opis: 'Smrt i ponovno rođenje u malom i velikom. Vlada Škorpionom.' },
    chiron:  { g: '⚷', ime: 'Hiron', vrsta: 'planet', slika: 'chiron.jpg', kw: 'rana i iscjeljenje', opis: 'Ranjeni iscjelitelj: gdje boli i gdje znaš pomoći. (Freska: Hiron poučava Ahileja.)' },
    ceres:   { g: '⚳', ime: 'Cerera', vrsta: 'planet', slika: 'ceres.jpg', kw: 'briga, hranjenje', opis: 'Kako pružaš i primaš njegu.' },
    vesta:   { g: '⚶', ime: 'Vesta', vrsta: 'planet', slika: 'vesta.jpg', kw: 'predanost, unutarnji plamen', opis: 'Čemu se posvećuješ kao svetom.' },
    pallas:  { g: '⚴', ime: 'Palada', vrsta: 'planet', kw: 'mudrost, strategija', opis: 'Prepoznavanje obrazaca i borba za pravdu.' },
    juno:    { g: '⚵', ime: 'Junona', vrsta: 'planet', kw: 'partnerstvo, obveza', opis: 'Što tražiš u trajnom odnosu.' },
    node:    { g: '☊', ime: 'Mjesečev čvor', vrsta: 'točka', kw: 'smjer razvoja', opis: 'Sjeverni čvor: prema čemu rasteš.' },
    lilith:  { g: '⚸', ime: 'Lilit', vrsta: 'točka', kw: 'potisnuto, neukroćeno', opis: 'Crni Mjesec: ono što nije priznato.' },
    asc:     { g: 'AC', ime: 'Ascendent', vrsta: 'točka', kw: 'nastup, tijelo', opis: 'Znak koji se rađao na istoku: kako te svijet prvo vidi.' },
    mc:      { g: 'MC', ime: 'Sredina neba', vrsta: 'točka', kw: 'poziv, ugled', opis: 'Najviša točka karte: zvanje i životni cilj.' },
    earth:   { g: '♁', ime: 'Zemlja', vrsta: 'planet', slika: 'earth.jpg', kw: 'mjesto s kojeg gledamo', opis: 'Geocentrična astrologija gleda nebo sa Zemlje.' },
    conj:    { g: '☌', ime: 'konjunkcija', vrsta: 'aspekt', kw: '0°, stapanje', opis: 'Dva planeta zajedno: snage se spajaju.' },
    opp:     { g: '☍', ime: 'opozicija', vrsta: 'aspekt', kw: '180°, suprotnost', opis: 'Napetost koja traži ravnotežu, često kroz druge ljude.' },
    square:  { g: '□', ime: 'kvadrat', vrsta: 'aspekt', kw: '90°, trenje', opis: 'Izazov koji tjera na djelovanje.' },
    trine:   { g: '△', ime: 'trigon', vrsta: 'aspekt', kw: '120°, lakoća', opis: 'Skladan protok, urođeni dar.' },
    sextile: { g: '⚹', ime: 'sekstil', vrsta: 'aspekt', kw: '60°, prilika', opis: 'Prilika koja daje plod kad je uhvatiš.' }
  };
  var ZN = [['aries', '♈', 'Ovan', 'vatra', 'kardinalni', 'Mars', 'hrabrost, početak'], ['taurus', '♉', 'Bik', 'zemlja', 'fiksni', 'Venera', 'sigurnost, osjetila'],
    ['gemini', '♊', 'Blizanci', 'zrak', 'promjenljivi', 'Merkur', 'znatiželja, razmjena'], ['cancer', '♋', 'Rak', 'voda', 'kardinalni', 'Mjesec', 'briga, dom'],
    ['leo', '♌', 'Lav', 'vatra', 'fiksni', 'Sunce', 'stvaralaštvo, srce'], ['virgo', '♍', 'Djevica', 'zemlja', 'promjenljivi', 'Merkur', 'red, usavršavanje'],
    ['libra', '♎', 'Vaga', 'zrak', 'kardinalni', 'Venera', 'odnosi, ravnoteža'], ['scorpio', '♏', 'Škorpion', 'voda', 'fiksni', 'Pluton i Mars', 'dubina, preobrazba'],
    ['sagittarius', '♐', 'Strijelac', 'vatra', 'promjenljivi', 'Jupiter', 'smisao, daljine'], ['capricorn', '♑', 'Jarac', 'zemlja', 'kardinalni', 'Saturn', 'ambicija, trajnost'],
    ['aquarius', '♒', 'Vodenjak', 'zrak', 'fiksni', 'Uran i Saturn', 'sloboda, zajednica'], ['pisces', '♓', 'Ribe', 'voda', 'promjenljivi', 'Neptun i Jupiter', 'suosjećanje, mašta']];
  ZN.forEach(function (z, i) { D[z[0]] = { g: z[1], ime: z[2], vrsta: 'znak', element: z[3], kvaliteta: z[4], kw: z[6], opis: z[2] + ': ' + z[3] + ', ' + z[4] + ' znak, vladar ' + z[5] + '.', indeks: i }; });
  var ZNAKOVI = ZN.map(function (z) { return z[0]; });

  /* ---------- učenje ---------- */
  var KLJUC = 'feniks-ucenje-v1', NAUCENO = 7;
  var st = { pogledi: {}, nacin: 'prilagodljivo' };
  try { st = Object.assign(st, JSON.parse(localStorage.getItem(KLJUC) || '{}')); } catch (e) {}
  function spremi() { try { localStorage.setItem(KLJUC, JSON.stringify(st)); } catch (e) {} }
  function pogledano(id) { st.pogledi[id] = (st.pogledi[id] || 0) + 1; spremi(); }
  function naucen(id) { return (st.pogledi[id] || 0) >= NAUCENO; }
  function postaviNacin(n) { st.nacin = n; spremi(); osvjezi(); }
  function napredak() {
    var ids = Object.keys(D), n = ids.filter(naucen).length;
    return { nauceno: n, ukupno: ids.length };
  }

  function glif(id) { var s = D[id]; return s ? (/^[A-Z]+$/.test(s.g) ? '<b class="sim-slova">' + s.g + '</b>' : s.g + VS) : ''; }
  function ime(id) { return D[id] ? D[id].ime : id; }
  // Oznaka: glif + ime; ime se skriva kad je simbol naučen (način „prilagodljivo”) ili uvijek (način „simboli”).
  function oznaka(id, opcije) {
    var s = D[id]; if (!s) return '';
    opcije = opcije || {};
    var skrij = st.nacin === 'simboli' || (st.nacin === 'prilagodljivo' && naucen(id) && !opcije.uvijekIme);
    return '<span class="sim" tabindex="0" data-sim="' + id + '"><span class="sim-g">' + glif(id) + '</span>' +
      '<span class="sim-ime"' + (skrij ? ' hidden' : '') + '>' + (opcije.ime || s.ime) + '</span></span>';
  }
  function slika(id, velicina, klasa) {
    var s = D[id]; if (!s || !s.slika) return '<span class="orb orb-glif ' + (klasa || '') + '" style="width:' + velicina + 'px;height:' + velicina + 'px;font-size:' + Math.round(velicina * .55) + 'px">' + glif(id) + '</span>';
    return '<img class="orb ' + (klasa || '') + '" src="' + SLIKE + s.slika + '" alt="' + s.ime + '" width="' + velicina + '" height="' + velicina + '" loading="lazy">';
  }
  function osvjezi() {
    document.querySelectorAll('.sim[data-sim]').forEach(function (el) {
      var id = el.dataset.sim, skrij = st.nacin === 'simboli' || (st.nacin === 'prilagodljivo' && naucen(id));
      var im = el.querySelector('.sim-ime'); if (im) im.hidden = skrij;
    });
  }

  /* ---------- kartica simbola ---------- */
  var kartica = null, aktivno = null;
  function prikazi(el) {
    var id = el.dataset.sim, s = D[id]; if (!s) return;
    if (!kartica) { kartica = document.createElement('div'); kartica.className = 'sim-kartica'; kartica.setAttribute('role', 'tooltip'); document.body.appendChild(kartica); }
    if (aktivno !== el) pogledano(id);
    aktivno = el;
    var n = st.pogledi[id] || 0, posto = Math.min(100, Math.round(n / NAUCENO * 100));
    kartica.innerHTML = '<div class="sk-glava">' + slika(id, 64) + '<div><div class="sk-glif">' + glif(id) + '</div><div class="sk-ime">' + s.ime + '</div><div class="sk-vrsta">' + s.vrsta + (s.element ? ' · ' + s.element : '') + '</div></div></div>' +
      '<div class="sk-kw">' + s.kw + '</div><div class="sk-opis">' + s.opis + '</div>' +
      '<div class="sk-ucenje"><span style="width:' + posto + '%"></span></div><div class="sk-mali">' + (n >= NAUCENO ? 'Naučeno: dalje se prikazuje samo glif.' : 'Učenje: ' + n + ' / ' + NAUCENO) + '</div>';
    var r = el.getBoundingClientRect(), w = 280;
    kartica.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    var gore = r.top > 260;
    kartica.style.top = (gore ? r.top - 8 : r.bottom + 8) + 'px';
    kartica.style.transform = gore ? 'translateY(-100%)' : 'none';
    kartica.hidden = false;
  }
  function sakrij() { if (kartica) kartica.hidden = true; aktivno = null; }
  document.addEventListener('mouseover', function (e) { var el = e.target.closest('.sim[data-sim]'); if (el) prikazi(el); else if (!e.target.closest('.sim-kartica')) sakrij(); });
  document.addEventListener('focusin', function (e) { var el = e.target.closest('.sim[data-sim]'); if (el) prikazi(el); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sakrij(); });

  /* ---------- simbol dana (za učenje) ---------- */
  function simbolDana(datum) {
    var ids = Object.keys(D).filter(function (k) { return k !== 'earth'; });
    var d = datum || new Date(), n = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
    // najprije oni koji još nisu naučeni
    var nenauceni = ids.filter(function (k) { return !naucen(k); });
    var izbor = nenauceni.length ? nenauceni : ids;
    return izbor[n % izbor.length];
  }

  return { D: D, ZNAKOVI: ZNAKOVI, oznaka: oznaka, glif: glif, ime: ime, slika: slika, osvjezi: osvjezi, postaviNacin: postaviNacin,
           nacin: function () { return st.nacin; }, napredak: napredak, simbolDana: simbolDana, pogledano: pogledano, naucen: naucen, VS: VS, SLIKE: SLIKE };
})();
