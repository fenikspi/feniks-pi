/* Feniks π: interaktivni znak (i znak čekanja uz miš). Najjednostavnije: crna podloga, zlatni krug, a unutra se slovo po slovo
   ispisuje „Feniks π” glagoljicom (Ⱇ Ⰵ Ⱀ Ⰻ Ⰽ Ⱄ π); između svaka dva slova javlja se simbol, naizmjence astrološki znak pa
   zviježđe životinje (zodijačke i totemske, u krug), dok se ne potroše svi astrološki znakovi, pa ispočetka.
   Svaki lik se mjeri i smješta točno u sredinu kruga, iste veličine.
   Uporaba: FeniksLogo.postavi(element, { velicina: 320, tekst: true, interaktivno: true }) */
var FeniksLogo = (function () {
  'use strict';
  var VS = '︎', NS = 'http://www.w3.org/2000/svg', brojac = 0;
  var SIMBOLI = [
    ['☉', 'Sunce'], ['☽', 'Mjesec'], ['☿', 'Merkur'], ['♀', 'Venera'], ['♂', 'Mars'], ['♃', 'Jupiter'],
    ['♄', 'Saturn'], ['♅', 'Uran'], ['♆', 'Neptun'], ['♇', 'Pluton'], ['⚷', 'Hiron'], ['☊', 'Mjesečev čvor'],
    ['♈', 'Ovan'], ['♉', 'Bik'], ['♊', 'Blizanci'], ['♋', 'Rak'], ['♌', 'Lav'], ['♍', 'Djevica'],
    ['♎', 'Vaga'], ['♏', 'Škorpion'], ['♐', 'Strijelac'], ['♑', 'Jarac'], ['♒', 'Vodenjak'], ['♓', 'Ribe']];

  var SLOVA = [['Ⱇ', 'Ⱇ · fert (F)'], ['Ⰵ', 'Ⰵ · jest (E)'], ['Ⱀ', 'Ⱀ · naš (N)'], ['Ⰻ', 'Ⰻ · iže (I)'], ['Ⰽ', 'Ⰽ · kako (K)'], ['Ⱄ', 'Ⱄ · slovo (S)'], ['π', 'π · 3,14159…']];

  /* ---------- životinje sa zvjezdanog neba ---------- */
  // Zviježđa životinja: sedam zodijačkih (Ovan, Bik, Rak, Lav, Škorpion, Jarac, Ribe) i totemske koje imaju zviježđe
  // (Vrana, Orao, Veliki medvjed, Vuk, Zmaj). Stvarni položaji zvijezda i linije zviježđa iz d3-celestial (BSD, © Olaf Frohn),
  // projicirano kao na nebu (istok lijevo, sjever gore); veličina zvijezde prema sjaju.
  var ZIVOTINJE = [
    ['ovan', 'Ovan · zviježđe', { nebo: true, crte: ['M50.0 67.9 L124.7 100.1 L147.6 120.4 L150.0 132.1'], tocke: [[50.0, 67.9, 2.5], [124.7, 100.1, 3.5], [147.6, 120.4, 3.1], [150.0, 132.1, 2.3]] }],
    ['bik', 'Bik · zviježđe', { nebo: true, crte: ['M50.0 77.6 L96.2 95.7 L101.5 97.8 L108.0 98.6 L105.7 92.7 L101.7 87.6 L61.0 54.1 M108.0 98.6 L122.2 108.1 L148.0 116.0 L120.6 128.1 M148.0 116.0 L150.0 118.1 L141.7 145.9'], tocke: [[50.0, 77.6, 2.9], [96.2, 95.7, 4.2], [101.5, 97.8, 2.6], [108.0, 98.6, 2.4], [105.7, 92.7, 2.3], [101.7, 87.6, 2.5], [61.0, 54.1, 3.7], [122.2, 108.1, 2.6], [148.0, 116.0, 2.4], [120.6, 128.1, 2.3], [150.0, 118.1, 2.5], [141.7, 145.9, 2.0]] }],
    ['rak', 'Rak · zviježđe', { nebo: true, crte: ['M73.5 136.4 L90.9 104.5 L92.6 87.7 L88.8 50.0 M90.9 104.5 L126.5 150.0'], tocke: [[73.5, 136.4, 2.0], [90.9, 104.5, 2.2], [92.6, 87.7, 1.8], [88.8, 50.0, 2.2], [126.5, 150.0, 2.5]] }],
    ['lav', 'Lav · zviježđe', { nebo: true, crte: ['M133.7 123.8 L134.1 107.7 L123.9 97.7 L81.4 94.2 L50.0 112.3 L80.2 111.4 L133.7 123.8 M123.9 97.7 L126.2 85.7 L144.2 76.2 L150.0 83.4'], tocke: [[133.7, 123.8, 3.9], [134.1, 107.7, 2.5], [123.9, 97.7, 3.5], [81.4, 94.2, 3.1], [50.0, 112.3, 3.4], [80.2, 111.4, 2.6], [126.2, 85.7, 2.6], [144.2, 76.2, 2.3], [150.0, 83.4, 2.9]] }],
    ['skorpion', 'Škorpion · zviježđe', { nebo: true, crte: ['M147.2 77.9 L147.4 62.7 L143.5 50.0 M147.4 62.7 L126.0 74.2 L118.0 77.5 L111.8 84.8 L99.0 110.1 L97.7 125.8 L95.9 144.1 L82.4 148.7 L62.6 150.0 L52.6 139.1 L56.2 133.7 L62.6 124.4'], tocke: [[147.2, 77.9, 2.9], [147.4, 62.7, 3.3], [143.5, 50.0, 3.1], [126.0, 74.2, 2.9], [118.0, 77.5, 4.1], [111.8, 84.8, 3.0], [99.0, 110.1, 3.3], [97.7, 125.8, 2.8], [95.9, 144.1, 2.4], [82.4, 148.7, 2.6], [62.6, 150.0, 3.6], [52.6, 139.1, 2.9], [56.2, 133.7, 3.2], [62.6, 124.4, 3.7]] }],
    ['jarac', 'Jarac · zviježđe', { nebo: true, crte: ['M150.0 67.4 L145.6 77.8 L136.3 91.4 L117.0 125.1 L111.0 132.6 L74.1 112.6 L50.0 84.8 L58.0 86.9 L78.0 86.8 L95.9 88.2 L150.0 67.4'], tocke: [[150.0, 67.4, 2.0], [145.6, 77.8, 2.8], [136.3, 91.4, 1.8], [117.0, 125.1, 2.1], [111.0, 132.6, 2.1], [74.1, 112.6, 2.3], [50.0, 84.8, 2.9], [58.0, 86.9, 2.4], [78.0, 86.8, 2.0], [95.9, 88.2, 2.1]] }],
    ['ribe', 'Ribe · zviježđe', { nebo: true, crte: ['M79.5 81.0 L80.9 68.0 L76.8 74.5 L79.5 81.0 L80.4 89.1 L69.3 101.0 L60.9 114.2 L50.0 128.3 L55.3 127.5 L62.7 122.4 L69.2 121.2 L78.4 118.3 L84.2 117.7 L91.7 118.5 L117.9 119.9 L128.6 122.3 L135.3 120.5 L139.8 122.6 L142.0 127.3 L136.5 132.0 L127.8 130.8 L125.2 127.1 L128.6 122.3 M142.0 127.3 L150.0 125.9'], tocke: [[79.5, 81.0, 1.8], [80.9, 68.0, 1.9], [76.8, 74.5, 1.8], [80.4, 89.1, 1.8], [69.3, 101.0, 2.4], [60.9, 114.2, 2.0], [50.0, 128.3, 2.3], [55.3, 127.5, 1.8], [62.7, 122.4, 1.9], [69.2, 121.2, 1.8], [78.4, 118.3, 1.8], [84.2, 117.7, 2.0], [91.7, 118.5, 1.9], [117.9, 119.9, 2.2], [128.6, 122.3, 2.1], [135.3, 120.5, 2.0], [139.8, 122.6, 1.8], [142.0, 127.3, 2.4], [136.5, 132.0, 1.8], [127.8, 130.8, 1.9], [125.2, 127.1, 1.8], [150.0, 125.9, 1.9]] }],
    ['vrana', 'Vrana · zviježđe', { nebo: true, crte: ['M136.1 150.0 L131.7 124.2 L116.0 62.3 L75.0 50.0 L63.9 134.2 L131.7 124.2'], tocke: [[136.1, 150.0, 2.2], [131.7, 124.2, 2.8], [116.0, 62.3, 3.1], [75.0, 50.0, 2.9], [63.9, 134.2, 3.1]] }],
    ['orao', 'Orao · zviježđe', { nebo: true, crte: ['M90.2 68.0 L84.3 77.2 L78.3 90.1 L56.8 128.1 L81.9 118.4 L117.2 107.3 L143.0 50.0 L84.3 77.2 L117.2 107.3 L143.2 150.0'], tocke: [[90.2, 68.0, 3.0], [84.3, 77.2, 4.3], [78.3, 90.1, 2.4], [56.8, 128.1, 2.7], [81.9, 118.4, 2.3], [117.2, 107.3, 2.6], [143.0, 50.0, 2.9], [143.2, 150.0, 2.6]] }],
    ['medvjed', 'Veliki medvjed · zviježđe', { nebo: true, crte: ['M86.3 79.0 L106.7 72.1 L107.1 83.4 L91.1 87.4 L86.3 79.0 L74.5 77.3 L64.6 75.0 L50.0 81.3 M91.1 87.4 L91.5 100.0 L99.0 133.2 L98.9 137.0 M91.5 100.0 L104.0 108.1 L122.5 113.8 M104.0 108.1 L124.2 110.5 M106.7 72.1 L128.6 65.6 L145.5 63.0 L126.1 75.4 L107.1 83.4 M107.1 83.4 L128.3 85.7 L135.7 88.9 L150.0 92.2 M149.2 94.6 L135.7 88.9'], tocke: [[86.3, 79.0, 2.6], [106.7, 72.1, 3.6], [107.1, 83.4, 3.3], [91.1, 87.4, 3.2], [74.5, 77.3, 3.7], [64.6, 75.0, 3.4], [50.0, 81.3, 3.6], [91.5, 100.0, 2.4], [99.0, 133.2, 2.5], [98.9, 137.0, 2.3], [104.0, 108.1, 2.8], [122.5, 113.8, 2.8], [124.2, 110.5, 2.6], [128.6, 65.6, 2.4], [145.5, 63.0, 2.6], [126.1, 75.4, 2.3], [128.3, 85.7, 1.8], [135.7, 88.9, 2.7], [150.0, 92.2, 2.8], [149.2, 94.6, 2.5]] }],
    ['vuk', 'Vuk · zviježđe', { nebo: true, crte: ['M73.9 50.0 L86.7 53.8 L106.6 63.7 L106.5 87.4 L128.7 102.1 L142.0 127.0 L112.8 150.0 L108.3 126.5 L104.8 109.2 L92.5 90.2 L65.8 76.6 L58.0 68.6 M106.5 87.4 L92.5 90.2'], tocke: [[73.9, 50.0, 2.2], [86.7, 53.8, 1.8], [106.6, 63.7, 2.5], [106.5, 87.4, 2.7], [128.7, 102.1, 3.1], [142.0, 127.0, 3.3], [112.8, 150.0, 2.6], [108.3, 126.5, 2.0], [104.8, 109.2, 2.6], [92.5, 90.2, 3.0], [65.8, 76.6, 2.6], [58.0, 68.6, 2.1]] }],
    ['zmaj', 'Zmaj · zviježđe', { nebo: true, crte: ['M68.4 135.0 L64.1 150.0 L75.8 149.2 L75.8 140.9 L68.4 135.0 L54.5 98.6 L70.2 94.4 L85.5 112.3 L100.0 122.7 L109.2 129.2 L121.7 124.0 L137.1 96.9 L141.3 66.4 L149.1 50.0 M70.2 94.4 L71.3 90.7 M54.5 98.6 L50.9 87.4'], tocke: [[68.4, 135.0, 2.4], [64.1, 150.0, 3.3], [75.8, 149.2, 3.0], [75.8, 140.9, 1.8], [54.5, 98.6, 2.8], [70.2, 94.4, 2.1], [85.5, 112.3, 2.7], [100.0, 122.7, 3.0], [109.2, 129.2, 2.2], [121.7, 124.0, 2.7], [137.1, 96.9, 2.4], [141.3, 66.4, 2.3], [149.1, 50.0, 2.3], [71.3, 90.7, 2.5], [50.9, 87.4, 2.3]] }]
  ];

  function el(tag, at, roditelj) {
    var e = document.createElementNS(NS, tag);
    for (var k in at) e.setAttribute(k, at[k]);
    if (roditelj) roditelj.appendChild(e);
    return e;
  }

  // Lik od putanja: zlatne plohe, zlatne crte, zlatne točke i crni detalji usred zlata.
  function crtez(sred, oblik, zlato) {
    var g = el('g', { class: 'fl-lik', opacity: 0 }, sred), u = el('g', {}, g);
    (oblik.puno || []).forEach(function (d) { el('path', { d: d, fill: zlato }, u); });
    (oblik.crte || []).forEach(function (d) { el('path', { d: d, fill: 'none', stroke: zlato, 'stroke-width': oblik.nebo ? 1.5 : 4.2, opacity: oblik.nebo ? .6 : 1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, u); });
    (oblik.tocke || []).forEach(function (c) { el('circle', { cx: c[0], cy: c[1], r: c[2], fill: zlato }, u); });
    (oblik.crno || []).forEach(function (d) {
      var zatvoreno = /Z$/.test(d);
      el('path', zatvoreno ? { d: d, fill: '#000' } : { d: d, fill: 'none', stroke: '#000', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, u);
    });
    return g;
  }

  // Smjesti sadržaj lika (prvo dijete) u sredinu kruga i ujednači veličinu: najveća mjera obrisa = mjera.
  // Crteži se mjere preko getBBox; tekst preko stvarnog obrisa znaka na platnu (getBBox teksta daje cijeli redak fonta).
  var platno = document.createElement('canvas').getContext('2d');
  function obris(u) {
    if (u.tagName !== 'text') return u.getBBox();
    platno.font = '100px ' + u.getAttribute('font-family');
    var m = platno.measureText(u.textContent);
    return { x: -m.actualBoundingBoxLeft, y: -m.actualBoundingBoxAscent, width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
  }
  function centriraj(lik, mjera) {
    var u = lik.firstChild; u.removeAttribute('transform');
    try {
      var b = obris(u); if (!b.width || !b.height) return;
      var s = mjera / Math.max(b.width, b.height);
      u.setAttribute('transform', 'translate(100 100) scale(' + s.toFixed(4) + ') translate(' + (-(b.x + b.width / 2)).toFixed(2) + ' ' + (-(b.y + b.height / 2)).toFixed(2) + ')');
    } catch (e) {}
  }

  function postavi(kontejner, opcije) {
    var o = Object.assign({ velicina: 300, tekst: true, interaktivno: true, korak: 2600 }, opcije || {});
    var id = 'fl' + (++brojac), mirno = matchMedia('(prefers-reduced-motion: reduce)').matches, zlato = 'url(#' + id + 'z)';
    kontejner.classList.add('feniks-logo');
    kontejner.innerHTML = '';
    var svg = el('svg', { viewBox: '0 0 200 200', width: o.velicina, height: o.velicina, role: 'img', 'aria-label': 'Feniks π' }, kontejner);
    el('defs', {}, svg).innerHTML =
      '<linearGradient id="' + id + 'z" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#f0c05a"/><stop offset="1" stop-color="#b9741e"/></linearGradient>' +
      '<filter id="' + id + 's" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feColorMatrix in="b" values="1 0 0 0 0  0 .7 0 0 0  0 0 .25 0 0  0 0 0 .55 0" result="t"/><feMerge><feMergeNode in="t"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';

    el('rect', { width: 200, height: 200, rx: 18, fill: '#000' }, svg);
    var g = el('g', { filter: 'url(#' + id + 's)' }, svg);
    el('circle', { cx: 100, cy: 100, r: 90, fill: 'none', stroke: zlato, 'stroke-width': 5 }, g);
    var sred = el('g', {}, g);

    // likovi: životinje (putanje) i dva teksta za slova i simbole, naizmjence, da se uvijek lijepo pretapaju
    var likovi = {};
    ZIVOTINJE.forEach(function (z) { likovi[z[0]] = crtez(sred, z[2], zlato); });
    var tekstovi = [0, 1].map(function () {
      var gl = el('g', { class: 'fl-lik', opacity: 0 }, sred);
      el('text', { x: 0, y: 0, fill: zlato, 'font-size': 100 }, gl);
      return gl;
    }), t = 0;

    var natpis = null;
    if (o.tekst) {
      natpis = document.createElement('div');
      natpis.className = 'fl-natpis';
      natpis.innerHTML = '<div class="fl-ime">Feniks π</div><div class="fl-pod">Prirodna Inteligencija</div><div class="fl-trenutno" aria-live="polite"></div>';
      kontejner.appendChild(natpis);
    }

    // niz: slovo, astrološki simbol, slovo, životinja, slovo, sljedeći astrološki … dok se ne potroše astrološki simboli
    var niz = [], k = 0, pauza = false, timer = null;
    for (var n = 0; n < SIMBOLI.length * 2; n++) {
      var sl = SLOVA[n % SLOVA.length], z = ZIVOTINJE[((n - 1) / 2) % ZIVOTINJE.length];
      niz.push({ znak: sl[0], ime: sl[1], glag: sl[0] !== 'π' });
      niz.push(n % 2 ? { lik: z[0], ime: z[1] } : { znak: SIMBOLI[n / 2][0], ime: SIMBOLI[n / 2][1], simbol: true });
    }
    function prikazi() {
      var s = niz[k % niz.length];
      for (var ime in likovi) {
        likovi[ime].classList.toggle('fl-vidi', s.lik === ime);
        if (s.lik === ime) centriraj(likovi[ime], 98);
      }
      tekstovi.forEach(function (gl) { gl.classList.remove('fl-vidi'); });
      if (s.znak) {
        t = 1 - t;
        var gl = tekstovi[t], tx = gl.firstChild;
        tx.textContent = s.simbol ? s.znak + VS : s.znak;
        tx.setAttribute('font-family', s.glag ? '"Noto Sans Glagolitic", serif' : s.simbol ? '"Noto Sans Symbols", "DejaVu Sans", "Segoe UI Symbol", serif' : '"Cormorant Garamond", "Marcellus", Georgia, serif');
        if (s.glag) tx.setAttribute('lang', 'cu-Glag'); else tx.removeAttribute('lang');
        centriraj(gl, s.simbol ? 84 : 88);
        gl.classList.add('fl-vidi');
      }
      svg.setAttribute('aria-label', 'Feniks π · ' + s.ime);
      if (natpis) natpis.querySelector('.fl-trenutno').textContent = pauza ? s.ime : '';
    }
    function dalje() { k++; prikazi(); }
    function kreni() { clearInterval(timer); if (!mirno) timer = setInterval(function () { if (!pauza) dalje(); }, o.korak); }
    prikazi(); kreni();
    if (document.fonts) document.fonts.ready.then(prikazi);       // ponovno izmjeri kad se učitaju fontovi
    if (o.interaktivno) {
      svg.style.cursor = 'pointer';
      svg.addEventListener('mouseenter', function () { pauza = true; prikazi(); });
      svg.addEventListener('mouseleave', function () { pauza = false; prikazi(); });
      svg.addEventListener('click', dalje);
    }
    return { dalje: dalje, svg: svg, idi: function (n) { k = n; prikazi(); }, duljina: niz.length };
  }

  // stilovi (jednom)
  var css = document.createElement('style');
  css.textContent =
    '.feniks-logo{display:inline-grid;justify-items:center;gap:6px;color:#e9b44c}' +
    '.feniks-logo svg{display:block;max-width:100%;height:auto}' +
    '.fl-lik{transform-origin:100px 100px;transform:scale(.85);transition:opacity .6s ease,transform .6s ease}' +
    '.fl-lik.fl-vidi{opacity:1;transform:scale(1)}' +
    '.fl-natpis{text-align:center;line-height:1.1}' +
    '.fl-ime{font:400 2.4em "Pinyon Script",cursive;background:linear-gradient(#fff0b8,#f0c05a 45%,#b9741e);-webkit-background-clip:text;background-clip:text;color:transparent}' +
    '.fl-pod{font:500 .62em "Alegreya Sans",sans-serif;letter-spacing:.34em;text-transform:uppercase;color:#c9973a;margin-top:6px}' +
    '.fl-trenutno{font:.7em "Alegreya Sans",sans-serif;letter-spacing:.12em;color:#a49e8e;min-height:1.2em;margin-top:4px}' +
    '@media (prefers-reduced-motion: reduce){.fl-lik{transition:none}}';
  document.head.appendChild(css);

  return { postavi: postavi, SIMBOLI: SIMBOLI, ZIVOTINJE: ZIVOTINJE };
})();
