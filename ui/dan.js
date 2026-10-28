/* Feniks π: dnevna mudrost, zajednička za aplikaciju i pozadinu.
   Poruka dana (planet vladar dana), Sunce i zlatni sati, planetarni sati (kaldejski red),
   Mjesečev dan s Hesiodovim savjetima, tranziti sa stvarnim slikama planeta. */
var FeniksDan = (function () {
'use strict';
var S = Simboli, VS = S.VS;
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
var VLADAR = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
var DAN = {
  sun: ['Dan Sunca', 'Dan za svjetlo i izražavanje. Ono što radiš danas neka nosi tvoj potpis.', 'Učini jednu stvar samo zato što te veseli.'],
  moon: ['Dan Mjeseca', 'Dan osjećaja, doma i bliskih ljudi. Tijelo i raspoloženje govore glasnije nego inače.', 'Odvoji vrijeme za dom ili nekoga bliskog.'],
  mars: ['Dan Marsa', 'Dan djelovanja i hrabrosti. Energija traži smjer, inače postaje nestrpljenje.', 'Kreni u ono što odgađaš, makar prvim korakom.'],
  mercury: ['Dan Merkura', 'Dan riječi, učenja i razmjene. Misli se brzo vežu jedna uz drugu.', 'Zapiši ideju ili razgovaraj o nečemu što ti je važno.'],
  jupiter: ['Dan Jupitera', 'Dan širenja i povjerenja. Pogled seže dalje od svakodnevice.', 'Planiraj dugoročno ili nekome velikodušno pomozi.'],
  venus: ['Dan Venere', 'Dan ljepote, odnosa i užitka. Što god radiš, radi to s ljubavlju.', 'Počasti sebe ili nekoga lijepim trenutkom.'],
  saturn: ['Dan Saturna', 'Dan reda, strpljenja i obveza. Što se danas posloži, dugo traje.', 'Dovrši nešto započeto, bez žurbe.']
};

/* ---------- Sunce, zlatni sati i planetarni sati ---------- */
// Kaldejski red (od najsporijeg): Saturn, Jupiter, Mars, Sunce, Venera, Merkur, Mjesec.
// Prvi sat dana od izlaska Sunca pripada vladaru dana; dnevni i noćni sati su dvanaestine luka.
var KALDEJSKI = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];
var SAT_SAVJET = {
  saturn: 'sat Saturna: red, strpljiv rad, dovršavanje i odricanje; tradicija ne savjetuje početke.',
  jupiter: 'sat Jupitera: molbe, učenje, velikodušnost, sve što treba rasti i dobiti blagoslov.',
  mars: 'sat Marsa: hrabrost i tjelesni napor; tradicija savjetuje izbjegavati svađe i ugovore.',
  sun: 'sat Sunca: nastup, razgovor s autoritetom, sve što treba biti viđeno.',
  venus: 'sat Venere: ljubav, prijateljstvo, umjetnost, ljepota i pomirenje.',
  mercury: 'sat Merkura: pisanje, učenje, trgovina, putovanje i poruke.',
  moon: 'sat Mjeseca: dom, briga o tijelu, putovanja po vodi, snovi i intuicija.'
};
function hm(t) { return t ? t.date.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' }) : '—'; }
function sunce(dom) {
  dom = dom || {}; var lat = dom.lokacija_lat != null ? dom.lokacija_lat : 45.815, lon = dom.lokacija_lon != null ? dom.lokacija_lon : 15.982;
  var obs = new Astronomy.Observer(lat, lon, dom.lokacija_visina || 150);
  var sad = new Date(), pon = new Date(sad); pon.setHours(0, 0, 0, 0);
  var izlazak = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, pon, 1), zalazak = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, pon, 1);
  if (!izlazak || !zalazak) { return '<div class="mali">Na ovoj širini Sunce danas ne izlazi ili ne zalazi.</div>'; }
  var zlJ = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, +1, izlazak, 1, 6), zlV = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, -1, izlazak, 1, 6);
  var podne = Astronomy.SearchHourAngle(Astronomy.Body.Sun, obs, 0, pon, +1);
  // planetarni sat
  var juceZal = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, new Date(pon.getTime() - 864e5), 1);
  var sutraIzl = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, new Date(pon.getTime() + 864e5), 1);
  var t = sad.getTime(), pocetak, kraj, dnevni, dan = sad.getDay();
  if (t < izlazak.date.getTime()) { pocetak = juceZal.date.getTime(); kraj = izlazak.date.getTime(); dnevni = false; dan = (dan + 6) % 7; }
  else if (t < zalazak.date.getTime()) { pocetak = izlazak.date.getTime(); kraj = zalazak.date.getTime(); dnevni = true; }
  else { pocetak = zalazak.date.getTime(); kraj = sutraIzl.date.getTime(); dnevni = false; }
  var duz = (kraj - pocetak) / 12, n = Math.min(11, Math.floor((t - pocetak) / duz));
  var prvi = KALDEJSKI.indexOf(VLADAR[dan]), redni = (dnevni ? 0 : 12) + n, vladar = KALDEJSKI[(prvi + redni) % 7];
  var doSata = new Date(pocetak + (n + 1) * duz), sljedeci = KALDEJSKI[(prvi + redni + 1) % 7];
  var u = function (a, b) { return t >= a.date.getTime() && t <= b.date.getTime(); };
  var zlatno = (zlJ && u(izlazak, zlJ)) || (zlV && u(zlV, zalazak));
  return '<div class="mali" style="margin:-2px 0 4px">' + esc(dom.lokacija_ime || 'Zagreb') + '</div><div class="tr">' + S.slika('sun', 34) + '<div class="tekst">izlazak <b>' + hm(izlazak) + '</b> · podne ' + hm(podne && podne.time) + ' · zalazak <b>' + hm(zalazak) + '</b>' +
    '<div class="mali">zlatni sat: jutro ' + hm(izlazak) + '–' + hm(zlJ) + ', večer ' + hm(zlV) + '–' + hm(zalazak) + (zlatno ? ' · <span style="color:var(--gold)">sada je zlatni sat</span>' : '') + '</div></div></div>' +
    '<div class="tr">' + S.slika(vladar, 34) + '<div class="tekst">Sada je ' + (dnevni ? (n + 1) + '. dnevni' : (n + 1) + '. noćni') + ' ' + S.oznaka(vladar, { ime: 'sat ' + ({ sun: 'Sunca', moon: 'Mjeseca', mercury: 'Merkura', venus: 'Venere', mars: 'Marsa', jupiter: 'Jupitera', saturn: 'Saturna' })[vladar] }) + ' do ' + doSata.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' }) +
    '<div class="mali">' + SAT_SAVJET[vladar].charAt(0).toUpperCase() + SAT_SAVJET[vladar].slice(1) + ' Zatim ' + S.ime(sljedeci) + '.</div></div></div>';
}

/* ---------- Mjesečev dan prema Hesiodu (Poslovi i dani, 765–828) ---------- */
var HESIOD = {
  1: 'Prvi dan je sveti dan.', 4: 'Četvrti dan je sveti dan.', 7: 'Sedmi je sveti dan: na njega je Leta rodila Apolona.',
  8: 'Osmi i deveti dan rastućeg Mjeseca dobri su za ljudski rad.', 9: 'Osmi i deveti dan rastućeg Mjeseca dobri su za ljudski rad.',
  11: 'Jedanaesti i dvanaesti su izvrsni za žetvu i striženje.', 12: 'Dvanaesti je bolji od jedanaestog: tad se postavlja tkalački stan i započinje rad.',
  13: 'Trinaesti dan rastućeg Mjeseca ne valja za sjetvu, ali je najbolji za sadnju.', 30: 'Trideseti je najbolji za pregled rada i podjelu zaliha.'
};
var MIJENA_SAVJET = [
  // granice su iste kao u nazivima mijena (svaka mijena ±22,5° oko svoje točke)
  [22.5, 'Mlađak: vrijeme tihog početka i namjere. Tradicija sije sjeme dok svjetlo tek raste.'],
  [157.5, 'Rastući Mjesec: što započneš i gradiš sada, raste sa svjetlom.'],
  [202.5, 'Uštap: vrhunac i ispunjenje; vidi se ono što je skriveno. Dovrši, slavi, zahvali.'],
  [337.5, 'Opadajući Mjesec: otpuštanje, čišćenje i završavanje; manje počinji, više zatvaraj.'],
  [360, 'Mlađak se približava: odmor i povlačenje prije novog ciklusa.']];
function mjesecevDan(nat) {
  var mj = K.mjesec(Date.now(), nat), dan = Math.floor(mj.elongacija / 12.1907) + 1;
  var savjet = MIJENA_SAVJET.filter(function (x) { return mj.elongacija < x[0]; })[0][1];
  return '<div class="tr">' + S.slika('moon', 34) + '<div class="tekst"><b>' + dan + '. Mjesečev dan</b> · ' + esc(mj.faza) + ' u ' + S.oznaka(S.ZNAKOVI[K.ZNAK.indexOf(mj.znak)], { ime: mj.znak_lok }) +
    '<div class="mali">' + savjet + '</div>' + (HESIOD[dan] ? '<div class="mali" style="margin-top:4px">Hesiod: „' + HESIOD[dan] + '” <i>(Poslovi i dani)</i></div>' : '') + '</div></div>';
}

/* ---------- poruka dana ---------- */
function poruka(tr, num) {
  var v = VLADAR[new Date().getDay()], d = DAN[v], t0 = tr[0];
  var html = S.slika(v, 92) + '<div><div class="oznaka">Poruka dana</div><h2>' + d[0] + '</h2><p>' + d[1] + '</p>';
  if (t0) {
    var meko = t0.asp === 'trine' || t0.asp === 'sextile';
    html += '<p>' + S.oznaka(t0.t) + ' ' + S.oznaka(t0.asp) + ' ' + S.oznaka(t0.n) +
      ': ' + esc(t0.smisao.charAt(0).toLowerCase() + t0.smisao.slice(1)) + '</p>';
  }
  var pr = [d[2]];
  if (t0) pr.push(t0.asp === 'conj' ? 'Pazi gdje se danas sve slijeva u jednu točku: tamo je snaga dana.' : (t0.asp === 'trine' || t0.asp === 'sextile') ? 'Iskoristi lakoću dana: ono što teče, pusti da teče.' : 'Uspori prije odluke. Trenje danas pokazuje gdje treba promjena.');
  if (num && num.znacenja && num.znacenja.osobni_dan) pr.push('Broj ' + num.osobni_dan + ' (' + num.znacenja.osobni_dan[0].toLowerCase() + '): ' + num.znacenja.osobni_dan[1] + '.');
  html += '<ul class="prijedlozi">' + pr.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
  return html;
}


function tranziti(tr) {
  return tr.length ? tr.map(function (t) {
    return '<div class="tr">' + S.slika(t.t, 34) + '<div class="tekst">' + S.oznaka(t.t) + ' ' + S.oznaka(t.asp) + ' ' + S.oznaka(t.n, { ime: 'natalni ' + S.ime(t.n) }) +
      '<div class="mali">orbis ' + t.orb + '°' + (t.applying ? ' · jača' : ' · slabi') + (t.retro ? ' · retrogradno' : '') + '</div><div class="mali">' + esc(t.smisao) + '</div></div></div>';
  }).join('') : '<div class="mali">Za tranzite upiši datum, vrijeme i mjesto rođenja.</div>';
}
// Obogaćivanje teksta čitanja: imena planeta i znakova postaju žive oznake (u bilo kojem padežu).
var OBLICI = [
  ['sun', 'Sunc(?:e|a|u|em)'], ['moon', 'Mjesec(?:a|u|om)?'], ['mercury', 'Merkur(?:a|u|om)?'], ['venus', 'Vener(?:a|e|i|u|om)'], ['mars', 'Mars(?:a|u|om)?'],
  ['jupiter', 'Jupiter(?:a|u|om)?'], ['saturn', 'Saturn(?:a|u|om)?'], ['uranus', 'Uran(?:a|u|om)?'], ['neptune', 'Neptun(?:a|u|om)?'], ['pluto', 'Pluton(?:a|u|om)?'],
  ['chiron', 'Hiron(?:a|u|om)?'], ['asc', 'Ascendent(?:a|u|om)?'], ['node', 'Sjeverni čvor|Mjesečev(?:og|om)? čvor(?:a|u|om)?'], ['aries', 'Ov(?:an|na|nu|nom)'], ['taurus', 'Bik(?:a|u|om)?'], ['gemini', 'Blizan(?:ci|aca|cima)'], ['cancer', 'Rak(?:a|u|om)?'],
  ['leo', 'Lav(?:a|u|om)?'], ['virgo', 'Djevic(?:a|e|i|u|om)'], ['libra', 'Vag(?:a|e|i|u|om)'], ['scorpio', 'Škorpion(?:a|u|om)?'], ['sagittarius', 'Strijel(?:ac|ca|cu|cem)'],
  ['capricorn', 'Jar(?:ac|ca|cu|cem)'], ['aquarius', 'Vodenja(?:k|ka|ku|kom)'], ['pisces', 'Rib(?:e|a|ama)']];
var RE = new RegExp('(^|[^\\wčćđšžČĆĐŠŽ])(' + OBLICI.map(function (o) { return o[1]; }).join('|') + ')(?![\\wčćđšžČĆĐŠŽ])', 'g');
function obogati(html) {
  return html.split(/(<[^>]+>)/).map(function (dio) {
    if (dio.charAt(0) === '<') return dio;
    return dio.replace(RE, function (m, pre, rijec) {
      for (var i = 0; i < OBLICI.length; i++) if (new RegExp('^(?:' + OBLICI[i][1] + ')$').test(rijec)) return pre + S.oznaka(OBLICI[i][0], { ime: rijec, uvijekIme: true });
      return m;
    });
  }).join('');
}
// Naslovima čitanja koji spominju planet dodaje njegovu fotografiju.
function slikeUNaslove(korijen) {
  korijen.querySelectorAll('h3, h4, h5').forEach(function (h) {
    var s = h.querySelector('.sim[data-sim]'); if (!s || h.querySelector('.orb')) return;
    var id = s.dataset.sim; if (!S.D[id] || !S.D[id].slika) return;
    h.insertAdjacentHTML('afterbegin', S.slika(id, 30) + ' ');
  });
}
return { VLADAR: VLADAR, DAN: DAN, poruka: poruka, sunce: sunce, mjesecevDan: mjesecevDan, tranziti: tranziti, obogati: obogati, slikeUNaslove: slikeUNaslove };
})();
