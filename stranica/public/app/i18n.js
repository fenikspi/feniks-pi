/* Feniks π: jezici. Jezik se bira prema jeziku preglednika/sustava (bez lokacije i IP adrese) i može se promijeniti
   izbornikom; izbor se pamti samo u ovom pregledniku. Tekstovi su u app/jezici/<jezik>.js; vrijednost može biti
   tekst s {zamjenama}, niz ili funkcija (za gramatiku: padeže, rod). Srpska ćirilica nastaje iz latinice. */
var I18n = (function () {
  'use strict';
  var JEZICI = {
    hr: ['Hrvatski', 'hr-HR'], en: ['English', 'en-GB'], de: ['Deutsch', 'de-DE'], it: ['Italiano', 'it-IT'], es: ['Español', 'es-ES'],
    fr: ['Français', 'fr-FR'], sl: ['Slovenščina', 'sl-SI'], sr: ['Srpski (latinica)', 'sr-Latn-RS'], 'sr-Cyrl': ['Српски (ћирилица)', 'sr-Cyrl-RS'],
    ru: ['Русский', 'ru-RU'], uk: ['Українська', 'uk-UA']
  };
  var KLJUC = 'feniks-jezik', T = {}, izvedeni = { 'sr-Cyrl': 'sr' }, slusaci = [], trenutni = null;

  // Latinica → ćirilica (srpski); oznake <...> i {zamjene} ostaju netaknute.
  var LAT = { 'lj': 'љ', 'nj': 'њ', 'dž': 'џ', 'Lj': 'Љ', 'LJ': 'Љ', 'Nj': 'Њ', 'NJ': 'Њ', 'Dž': 'Џ', 'DŽ': 'Џ' };
  var SLOVA = 'abvgdđežzijklmnoprstćufhcčš', CIR = 'абвгдђежзијклмнопрстћуфхцчш';
  function cirilica(s) {
    return String(s).split(/(<[^>]*>|\{\w+\}|https?:\/\/\S+)/).map(function (dio, i) {
      if (i % 2) return dio;
      return dio.replace(/Lj|LJ|lj|Nj|NJ|nj|Dž|DŽ|dž|[a-zA-ZčćđšžČĆĐŠŽ]/g, function (z) {
        if (LAT[z]) return LAT[z];
        var m = z.toLowerCase(), k = SLOVA.indexOf(m); if (k < 0) return z;
        return z === m ? CIR[k] : CIR[k].toUpperCase();
      });
    }).join('');
  }

  function prepoznaj() {
    var izbor = null; try { izbor = localStorage.getItem(KLJUC); } catch (e) {}
    if (izbor && JEZICI[izbor]) return izbor;
    var lista = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    for (var i = 0; i < lista.length; i++) {
      var l = String(lista[i]), osn = l.split('-')[0].toLowerCase();
      if (osn === 'sr') return /latn/i.test(l) ? 'sr' : 'sr-Cyrl';
      if (osn === 'bs' || osn === 'cnr') return 'hr';
      if (JEZICI[osn]) return osn;
    }
    return 'en';
  }

  function dohvati(jezik, kljuc) {
    var izvor = izvedeni[jezik] || jezik, v = T[izvor] && T[izvor][kljuc];
    return v === undefined ? undefined : { v: v, cir: !!izvedeni[jezik] };
  }
  // t('kljuc', {a: 1}) → tekst; niz → niz; funkcija se poziva s parametrima i samim t().
  function t(kljuc, p) {
    // južnoslavenski jezici bez prijevoda nekog teksta padaju na hrvatski, ostali na engleski
    var juzni = trenutni === 'sr' || trenutni === 'sr-Cyrl' || trenutni === 'sl';
    var r = dohvati(trenutni, kljuc) || (juzni && dohvati('hr', kljuc)) || dohvati('en', kljuc) || dohvati('hr', kljuc);
    if (!r) return kljuc;
    var v = r.v;
    if (typeof v === 'function') v = v(p || {}, t);
    else if (typeof v === 'string') v = v.replace(/\{(\w+)\}/g, function (m, x) { return p && p[x] != null ? p[x] : m; });
    if (r.cir || izvedeni[trenutni]) v = Array.isArray(v) ? v.map(cirilica) : cirilica(v);
    return v;
  }
  function niz(kljuc, i) { var v = t(kljuc); return Array.isArray(v) ? v[i] : v; }

  // Statični tekstovi u HTML-u: data-i18n (tekst), data-i18n-html, data-i18n-ph (placeholder), data-i18n-aria, data-i18n-title.
  function prevedi(korijen) {
    var r = korijen || document;
    r.querySelectorAll('[data-i18n]').forEach(function (e) { e.textContent = t(e.dataset.i18n); });
    r.querySelectorAll('[data-i18n-html]').forEach(function (e) { e.innerHTML = t(e.dataset.i18nHtml); });
    r.querySelectorAll('[data-i18n-ph]').forEach(function (e) { e.placeholder = t(e.dataset.i18nPh); });
    r.querySelectorAll('[data-i18n-aria]').forEach(function (e) { e.setAttribute('aria-label', t(e.dataset.i18nAria)); });
    r.querySelectorAll('[data-i18n-title]').forEach(function (e) { e.title = t(e.dataset.i18nTitle); });
    document.documentElement.lang = trenutni === 'sr' ? 'sr-Latn' : trenutni;
  }

  function postavi(jezik, zapamti) {
    if (!JEZICI[jezik]) return;
    trenutni = jezik;
    if (zapamti) try { localStorage.setItem(KLJUC, jezik); } catch (e) {}
    prevedi();
    slusaci.forEach(function (f) { f(jezik); });
  }

  // Izbornik jezika: <select> s imenima na vlastitom jeziku.
  function izbornik(el) {
    el.innerHTML = Object.keys(JEZICI).map(function (k) { return '<option value="' + k + '"' + (k === trenutni ? ' selected' : '') + '>' + JEZICI[k][0] + '</option>'; }).join('');
    el.addEventListener('change', function () { postavi(el.value, true); });
    slusaci.push(function (j) { el.value = j; });
  }

  trenutni = prepoznaj();
  return {
    t: t, niz: niz, prevedi: prevedi, pismo: function (s) { return izvedeni[trenutni] ? cirilica(s) : s; }, postavi: postavi, izbornik: izbornik, JEZICI: JEZICI,
    dodaj: function (jezik, rjecnik) { T[jezik] = Object.assign(T[jezik] || {}, rjecnik); },
    jezik: function () { return trenutni; },
    locale: function () { return JEZICI[trenutni][1]; },
    promjena: function (f) { slusaci.push(f); }
  };
})();
