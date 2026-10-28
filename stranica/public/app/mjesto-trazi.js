/* Feniks π: traženje mjesta rođenja bilo gdje na svijetu. Baza gradova (GeoNames, CC BY 4.0, 70 000 mjesta s 5000+
   stanovnika) učitava se s naše domene tek pri prvom upisu; traži se u pregledniku, upisano mjesto ne odlazi nikamo.
   Odabirom se dobivaju koordinate i vremenska zona. Uporaba: MjestoTrazi.spoji(input, function (m) { ... m.lat, m.lon, m.zona, m.ime }) */
var MjestoTrazi = (function () {
  'use strict';
  var baza = null, indeks = null;
  function ascii(s) { return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase(); }
  function ucitaj() {
    if (!baza) baza = fetch('/app/svijet.json').then(function (r) { return r.json(); }).then(function (d) {
      indeks = d.mjesta.map(function (r) { return { r: r, k: [ascii(r[0])].concat(r[6] ? r[6].split(',').map(ascii) : []) }; });
      return d;
    });
    return baza;
  }
  // zemlje koje imaju prednost prema jeziku korisnika (i regiji preglednika, npr. en-AU → AU)
  var BLIZU = { hr: ['HR', 'BA', 'RS', 'SI', 'ME', 'AT', 'DE'], sr: ['RS', 'BA', 'ME', 'HR', 'MK'], 'sr-Cyrl': ['RS', 'BA', 'ME', 'HR', 'MK'], sl: ['SI', 'HR', 'AT', 'IT'],
    de: ['DE', 'AT', 'CH'], it: ['IT', 'CH', 'SM'], es: ['ES', 'MX', 'AR', 'CO'], fr: ['FR', 'BE', 'CH', 'CA'], ru: ['RU', 'BY', 'KZ', 'UA'], uk: ['UA'], en: ['GB', 'US', 'IE', 'CA', 'AU'] };
  function blizu() {
    var j = typeof I18n !== 'undefined' ? I18n.jezik() : 'hr', l = (BLIZU[j] || []).slice(), nl = (navigator.language || '').split('-');
    // regija preglednika vrijedi samo ako je jezik preglednika isti kao odabrani (npr. en-AU uz engleski)
    if (nl[1] && nl[0] === j.split('-')[0] && l.indexOf(nl[1].toUpperCase()) < 0) l.unshift(nl[1].toUpperCase());
    return l;
  }
  // do 3 prijedloga: početak imena (na bilo kojem jeziku i pismu), bliže zemlje prve, zatim veći gradovi; bez duplikata
  function trazi(upit) {
    var q = ascii(upit.trim()); if (q.length < 2) return [];
    var kand = [], b = blizu();
    for (var i = 0; i < indeks.length && kand.length < 80; i++) {
      var x = indeks[i], pogodak = 0;
      for (var j = 0; j < x.k.length; j++) {
        if (x.k[j].indexOf(q) === 0) { pogodak = j === 0 ? 1 : 2; break; }
        if (!pogodak && x.k[j].indexOf(' ' + q) >= 0) pogodak = 3;
      }
      if (pogodak) kand.push({ r: x.r, p: pogodak, z: b.indexOf(x.r[1]), red: i });
    }
    // poredak: pravi početak imena prije pogotka usred riječi, zatim bliže zemlje (redom popisa), zatim veći gradovi
    kand.sort(function (a, c) { return ((a.p === 3) - (c.p === 3)) || ((a.z < 0 ? 99 : a.z) - (c.z < 0 ? 99 : c.z)) || (a.p - c.p) || (a.red - c.red); });
    var out = [], vid = {};
    for (var k = 0; k < kand.length && out.length < 3; k++) { var key = kand[k].r[0] + '|' + kand[k].r[1]; if (!vid[key]) { vid[key] = 1; out.push(kand[k].r); } }
    return out;
  }
  // ime zemlje na jeziku korisnika (Intl), inače englesko iz GeoNamesa
  function zemlja(kod, zemlje) {
    try { return new Intl.DisplayNames([typeof I18n !== 'undefined' ? I18n.locale() : 'hr'], { type: 'region' }).of(kod) || zemlje[kod] || kod; } catch (e) { return zemlje[kod] || kod; }
  }
  function spoji(input, odabrano) {
    var lista = document.createElement('ul'); lista.className = 'mjesto-lista'; lista.hidden = true; lista.setAttribute('role', 'listbox');
    input.setAttribute('autocomplete', 'off'); input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'false');
    input.parentNode.style.position = 'relative'; input.parentNode.appendChild(lista);
    var zemlje = {}, aktivni = -1, rez = [];
    function prikazi() {
      lista.innerHTML = rez.map(function (r, i) {
        return '<li role="option" data-i="' + i + '"' + (i === aktivni ? ' aria-selected="true"' : '') + '>' + r[0].replace(/[<&]/g, '') +
          '<span>' + zemlja(r[1], zemlje) + ' · ' + r[2].toFixed(2) + ', ' + r[3].toFixed(2) + '</span></li>';
      }).join('');
      lista.hidden = !rez.length; input.setAttribute('aria-expanded', rez.length ? 'true' : 'false');
    }
    function izaberi(i) {
      var r = rez[i]; if (!r) return;
      input.value = r[0] + ', ' + zemlja(r[1], zemlje);
      rez = []; prikazi();
      odabrano({ ime: r[0], zemlja: zemlja(r[1], zemlje), lat: r[2], lon: r[3], zona: r[4] });
    }
    input.addEventListener('focus', function () { ucitaj().then(function (d) { zemlje = d.zemlje; }); });
    input.addEventListener('input', function () { ucitaj().then(function (d) { zemlje = d.zemlje; rez = trazi(input.value); aktivni = -1; prikazi(); }); });
    input.addEventListener('keydown', function (e) {
      if (lista.hidden) return;
      if (e.key === 'ArrowDown') { aktivni = Math.min(rez.length - 1, aktivni + 1); prikazi(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { aktivni = Math.max(0, aktivni - 1); prikazi(); e.preventDefault(); }
      else if (e.key === 'Enter') { izaberi(aktivni < 0 ? 0 : aktivni); e.preventDefault(); }
      else if (e.key === 'Escape') { rez = []; prikazi(); }
    });
    lista.addEventListener('mousedown', function (e) { var li = e.target.closest('li'); if (li) { e.preventDefault(); izaberi(+li.dataset.i); } });
    input.addEventListener('blur', function () { setTimeout(function () { rez = []; prikazi(); }, 150); });
  }
  var css = document.createElement('style');
  css.textContent = '.mjesto-lista{position:absolute;left:0;right:0;top:100%;z-index:30;list-style:none;margin:4px 0 0;padding:4px;background:#0b0f22;border:1px solid rgba(232,162,58,.35);border-radius:10px;max-height:300px;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,.5)}' +
    '.mjesto-lista li{padding:7px 10px;border-radius:7px;cursor:pointer;color:#efe7d6;display:flex;justify-content:space-between;gap:10px}' +
    '.mjesto-lista li span{color:#a49e8e;font-size:.85em;white-space:nowrap}.mjesto-lista li:hover,.mjesto-lista li[aria-selected=true]{background:rgba(240,192,90,.14)}';
  document.head.appendChild(css);
  return { spoji: spoji, ucitaj: ucitaj };
})();
