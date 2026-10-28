/* Feniks π: kolovrat od starohrvatskog troprutastog pletera u zlatu.
   Rub kruga je pletenica od tri pruta; osam krakova (također pleter) izlazi iz ruba prema središtu i
   izdužuje se koliko ima praznog prostora (do feniksa, natpisa i kocki). Kolovrat se vrti danju posolon,
   noću obrnuto; dok se vrti, krakovi se produljuju i skraćuju prema slobodnom prostoru.
   Uporaba: Pleter.pokreni(platno, { prazno: function (x, y) { return jeLiSlobodno; }, mirno: false, dan: function () { return true; } }) */
var Pleter = (function () {
  'use strict';
  var TAU = Math.PI * 2, C = 1000;

  // Pletenica od tri pruta duž crte (niz točaka). Vraća prutove kao nizove točaka s dubinom (z) za preklapanje.
  function pletenica(tocke, amp, valna, pocetnaFaza) {
    var s = 0, duz = [0];
    for (var i = 1; i < tocke.length; i++) { s += Math.hypot(tocke[i][0] - tocke[i - 1][0], tocke[i][1] - tocke[i - 1][1]); duz.push(s); }
    var prutovi = [[], [], []];
    for (var j = 0; j < tocke.length; j++) {
      var a = tocke[Math.max(0, j - 1)], b = tocke[Math.min(tocke.length - 1, j + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
      var nx = -ty / l, ny = tx / l, A = typeof amp === 'function' ? amp(j / (tocke.length - 1)) : amp;
      for (var p = 0; p < 3; p++) {
        var f = TAU * duz[j] / valna + (pocetnaFaza || 0) + p * TAU / 3;
        prutovi[p].push([tocke[j][0] + nx * A * Math.sin(f), tocke[j][1] + ny * A * Math.sin(f), Math.cos(f)]);
      }
    }
    return prutovi;
  }

  function crtajPrut(x, pts, od, do_, sir, rub) {
    x.beginPath(); x.moveTo(pts[od][0], pts[od][1]);
    for (var i = od + 1; i <= do_; i++) x.lineTo(pts[i][0], pts[i][1]);
    if (rub) { x.strokeStyle = '#2a1606'; x.lineWidth = sir + 6; x.stroke(); }
    x.strokeStyle = x.__zlato; x.lineWidth = sir; x.stroke();
    x.strokeStyle = 'rgba(255,244,200,.55)'; x.lineWidth = Math.max(1.2, sir * .22); x.stroke();          // sjaj po sredini pruta
  }

  // Cijeli prutovi, pa na svakom križanju gornji prut ponovno preko donjega (preko-ispod kao u kamenu).
  function crtajPletenicu(x, prutovi, sir) {
    var n = prutovi[0].length;
    prutovi.forEach(function (pts) { crtajPrut(x, pts, 0, n - 1, sir, true); });
    for (var i = 1; i < n; i++) for (var a = 0; a < 3; a++) for (var b = a + 1; b < 3; b++) {
      var P = prutovi[a], Q = prutovi[b];
      var d0 = (P[i - 1][0] - Q[i - 1][0]) * (P[i - 1][0] - Q[i - 1][0]) + (P[i - 1][1] - Q[i - 1][1]) * (P[i - 1][1] - Q[i - 1][1]);
      var d1 = (P[i][0] - Q[i][0]) * (P[i][0] - Q[i][0]) + (P[i][1] - Q[i][1]) * (P[i][1] - Q[i][1]);
      var dPrev = i > 1 ? (P[i - 2][0] - Q[i - 2][0]) * (P[i - 2][0] - Q[i - 2][0]) + (P[i - 2][1] - Q[i - 2][1]) * (P[i - 2][1] - Q[i - 2][1]) : Infinity;
      if (!(d0 < dPrev && d0 <= d1)) continue;                 // najbliže točke = križanje
      var gore = P[i - 1][2] >= Q[i - 1][2] ? P : Q, k = 5, od = Math.max(0, i - 1 - k), do_ = Math.min(n - 1, i - 1 + k);
      crtajPrut(x, gore, od + 1, do_ - 1, sir, true);
      crtajPrut(x, gore, od, do_, sir, false);                 // zlato malo dulje od ruba prekriva rubne crtice
    }
  }

  function zlato(x) { var g = x.createLinearGradient(0, 0, 2000, 2000); g.addColorStop(0, '#fbe08a'); g.addColorStop(.5, '#d9a23e'); g.addColorStop(1, '#a86c1c'); x.__zlato = g; }

  function prsten() {
    var o = document.createElement('canvas'); o.width = o.height = 2000; var x = o.getContext('2d'); zlato(x);
    x.lineCap = 'round'; x.lineJoin = 'round';
    var t = []; for (var i = 0; i <= 720; i++) { var a = i / 720 * TAU; t.push([C + Math.cos(a) * 938, C + Math.sin(a) * 938]); }
    x.strokeStyle = 'rgba(217,162,62,.75)'; x.lineWidth = 3;
    [[896], [980]].forEach(function (r) { x.beginPath(); x.arc(C, C, r[0], 0, TAU); x.stroke(); });
    // valna duljina tako da se pletenica točno zatvori u krug
    var opseg = TAU * 938, valova = Math.round(opseg / 150);
    crtajPletenicu(x, pletenica(t, 26, opseg / valova, 0), 11);
    return o;
  }

  // Krak raste od ruba prema središtu duž blagog zavoja i staje čim naiđe na feniksa, natpis ili kocke.
  function putanjaKraka(kut, smjer, prazno) {
    var t = [], r0 = 900, savij = 0.20 * smjer, kraj = r0;
    for (var r = r0; r > 360; r -= 6) {
      var u = (r0 - r) / 520, a = kut + savij * u * u, px = C + Math.cos(a) * r, py = C + Math.sin(a) * r;
      var ui = (r0 - (r - 34)) / 520, ai = kut + savij * ui * ui;                       // malo dalje prema unutra kao razmak
      if (!prazno(C + Math.cos(ai) * (r - 34), C + Math.sin(ai) * (r - 34))) break;
      kraj = r;
    }
    return kraj;
  }
  function krak(x, kut, rUnutra, smjer, savijanje, debljina, vanjski) {
    var t = [], r0 = vanjski || 900, savij = (savijanje || 0.20) * smjer, sir = debljina || 8;
    if (r0 - rUnutra < 24) return;
    var n = Math.max(8, Math.round((r0 - rUnutra) / 6)), raspon = Math.max(520, r0 - rUnutra);
    for (var i = 0; i <= n; i++) {
      var r = r0 - (r0 - rUnutra) * i / n, u = (r0 - r) / raspon, a = kut + savij * (savijanje ? Math.pow(u, .55) : u * u);   // puni kolovrat: zavoj u vanjskom, vidljivom dijelu
      t.push([C + Math.cos(a) * r, C + Math.sin(a) * r]);
    }
    crtajPletenicu(x, pletenica(t, function (u) { return (sir + 5) * Math.min(1, u * 6) * Math.min(1, (1 - u) * 6) + 1; }, 70 + sir * 2, 0), sir);
    var kraj = t[t.length - 1];                              // zlatni čvorić na vrhu kraka
    x.beginPath(); x.arc(kraj[0], kraj[1], 10, 0, TAU); x.fillStyle = '#2a1606'; x.fill();
    x.beginPath(); x.arc(kraj[0], kraj[1], 7, 0, TAU); x.fillStyle = x.__zlato; x.fill();
  }

  // Klasični kolovrat (kao na izvezenom uzorku): ravan krak od središta prema rubu, pa kuka uz rub u smjeru vrtnje.
  function krakKlasicni(x, kut, smjer, op) {
    var rU = op.unutra || 40, rS = op.zbica || 820, rK = op.kuka || 905, luk = (op.lukKuke || 42) * Math.PI / 180 * smjer, sir = op.debljina || 14, t = [];
    for (var r = rU; r <= rS; r += 6) t.push([C + Math.cos(kut) * r, C + Math.sin(kut) * r]);
    // zaobljeni lom: iz žbice prema rubu i u smjeru vrtnje
    for (var i = 1; i <= 10; i++) {
      var u = i / 10, r2 = rS + (rK - rS) * Math.sin(u * Math.PI / 2), a2 = kut + luk * 0.12 * u * u;
      t.push([C + Math.cos(a2) * r2, C + Math.sin(a2) * r2]);
    }
    // kuka uz rub
    var n = Math.max(12, Math.round(Math.abs(luk) * rK / 6));
    for (var j = 1; j <= n; j++) { var a3 = kut + luk * (0.12 + 0.88 * j / n); t.push([C + Math.cos(a3) * rK, C + Math.sin(a3) * rK]); }
    var N = t.length, kraj = t[N - 1];
    crtajPletenicu(x, pletenica(t, function (u) { return (sir + 6) * Math.min(1, u * 14) * Math.min(1, (1 - u) * 5) + 1.5; }, 66 + sir * 2, 0), sir);
    x.beginPath(); x.arc(kraj[0], kraj[1], sir * .8, 0, TAU); x.fillStyle = '#2a1606'; x.fill();     // šiljasti završetak kuke
    x.beginPath(); x.arc(kraj[0], kraj[1], sir * .55, 0, TAU); x.fillStyle = x.__zlato; x.fill();
  }

  function pokreni(platno, op) {
    var x = platno.getContext('2d'); zlato(x); x.lineCap = 'round'; x.lineJoin = 'round';
    var obrub = op.bezPrstena ? null : prsten(), pomak = 0, zadnje = 0, duljine = [];
    function crtaj(t) {
      var smjer = op.dan() ? 1 : -1;
      if (!op.mirno && zadnje) pomak += smjer * (t - zadnje) / 120000 * TAU;   // jedan krug u dvije minute
      zadnje = t;
      x.clearRect(0, 0, 2000, 2000);
      if (!op.bezPrstena) { x.save(); x.translate(C, C); x.rotate(pomak); x.drawImage(obrub, -C, -C); x.restore(); }
      for (var a = 0; a < 8; a++) {
        var kut = -Math.PI / 2 + a * TAU / 8 + pomak;
        if (op.oblik === 'klasicni') { krakKlasicni(x, kut, op.kuke || smjer, op); continue; }   // kuke: -1 lijevi (ženski), 1 desni
        if (op.puni) { krak(x, kut, op.unutra || 70, smjer, op.savij || 0.62, op.debljina || 10, op.vanjski); continue; }        // puni kolovrat u pozadini: krakovi od ruba do središta
        var cilj = putanjaKraka(kut, smjer, op.prazno);
        duljine[a] = duljine[a] == null || op.mirno ? cilj : duljine[a] + (cilj - duljine[a]) * 0.25;   // glatko izduživanje i skraćivanje
        krak(x, kut, duljine[a], smjer);
      }
      if (op.poslije) op.poslije(x);                       // npr. prozirnost uz feniksa
    }
    if (op.mirno) crtaj(0);
    else (function petlja(t) { crtaj(t); setTimeout(function () { requestAnimationFrame(petlja); }, 50); })(performance.now());
  }

  return { pokreni: pokreni };
})();
