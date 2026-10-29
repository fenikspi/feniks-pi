/* Feniks π: drevna glazba u pozadini, skladana uživo u pregledniku (Web Audio), nikad dvaput ista.
   U duhu slavenske obredne glazbe: bordun kolo-lire (D i A), okvirni bubanj u ritmu srca, frula u doričkoj ljestvici
   s dahom i vibratom, povremeno drombulja. Pokreće se gumbom ♪ (preglednici ne puštaju zvuk bez dodira);
   izbor se pamti samo u ovom pregledniku. Ništa se ne učitava izvana. */
(function () {
  'use strict';
  var KLJUC = 'feniks-glazba', ctx = null, glavni = null, svira = false, satovi = [];
  var D = 146.83;                                               // D3
  var LJESTVICA = [0, 2, 3, 5, 7, 9, 10, 12, 14, 15];           // dorički: D E F G A H C D E F

  function hz(korak) { return D * Math.pow(2, korak / 12); }
  function nasumce(a, b) { return a + Math.random() * (b - a); }

  // jeka: šum koji se gasi oko 3 s, kao kamena dvorana
  function jeka() {
    var n = ctx.sampleRate * 3.2, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var k = 0; k < 2; k++) { var d = b.getChannelData(k); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
    var c = ctx.createConvolver(); c.buffer = b; return c;
  }

  function bordun(izlaz) {
    var filtar = ctx.createBiquadFilter(); filtar.type = 'lowpass'; filtar.frequency.value = 520; filtar.Q.value = 2;
    var lfo = ctx.createOscillator(), dub = ctx.createGain(); lfo.frequency.value = 0.07; dub.gain.value = 180;
    lfo.connect(dub); dub.connect(filtar.frequency); lfo.start();
    var g = ctx.createGain(); g.gain.value = 0.11; filtar.connect(g); g.connect(izlaz);
    [[D / 2, -4], [D / 2, 5], [D * 0.75, 0], [D, 3]].forEach(function (p, i) {       // D2 dvaput (malo razgođeno), A2, D3
      var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = p[0]; o.detune.value = p[1];
      var og = ctx.createGain(); og.gain.value = i === 3 ? 0.35 : 0.6; o.connect(og); og.connect(filtar); o.start();
    });
  }

  function udarac(izlaz, t, jacina) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.35);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55 * jacina, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g); g.connect(izlaz); o.start(t); o.stop(t + 1);
    // koža bubnja: kratki prigušeni šum
    var n = ctx.createBufferSource(), b = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    n.buffer = b; var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    var ng = ctx.createGain(); ng.gain.value = 0.12 * jacina; n.connect(f); f.connect(ng); ng.connect(izlaz); n.start(t);
  }
  function bubanj(izlaz) {                                       // srce: DUM … dum-dum, oko 64 otkucaja u minuti
    var korak = 60 / 64, sljedeci = ctx.currentTime + 0.5;
    satovi.push(setInterval(function () {
      while (sljedeci < ctx.currentTime + 1.2) {
        udarac(izlaz, sljedeci, 1);
        if (Math.random() < 0.55) udarac(izlaz, sljedeci + korak * 0.5, 0.45);
        sljedeci += korak * 2;
      }
    }, 300));
  }

  function ton(izlaz, t, f, trajanje) {                          // frula: trokut + sinus, dah, vibrato koji kasni
    var g = ctx.createGain(), o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), vib = ctx.createOscillator(), vd = ctx.createGain();
    o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = f; o2.frequency.value = f * 2;
    vib.frequency.value = 5.2; vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(f * 0.012, t + trajanje * 0.6);
    vib.connect(vd); vd.connect(o1.frequency); vd.connect(o2.frequency);
    var g2 = ctx.createGain(); g2.gain.value = 0.18; o2.connect(g2); g2.connect(g); o1.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.09);
    g.gain.setValueAtTime(0.16, t + trajanje * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + trajanje);
    var dah = ctx.createBufferSource(), b = ctx.createBuffer(1, ctx.sampleRate * trajanje, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    dah.buffer = b; var bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = f * 2; bf.Q.value = 3;
    var dg = ctx.createGain(); dg.gain.value = 0.035; dah.connect(bf); bf.connect(dg); dg.connect(g);
    g.connect(izlaz);
    [o1, o2, vib, dah].forEach(function (x) { x.start(t); x.stop(t + trajanje + 0.05); });
  }
  function frula(izlaz) {                                        // fraze od 3 do 7 tonova pa tišina; melodija luta i vraća se na D
    var poz = 4, kraj = ctx.currentTime + 4;
    function fraza() {
      var t = Math.max(kraj, ctx.currentTime + 0.2), n = Math.floor(nasumce(3, 8));
      for (var i = 0; i < n; i++) {
        poz = Math.max(0, Math.min(LJESTVICA.length - 1, poz + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
        if (i === n - 1) poz = Math.random() < 0.6 ? 0 : 4;      // kadenca na D ili A
        var tr = i === n - 1 ? nasumce(1.6, 2.6) : [0.47, 0.47, 0.94, 0.7][Math.floor(Math.random() * 4)];
        ton(izlaz, t, hz(LJESTVICA[poz] + 12), tr); t += tr;
      }
      kraj = t + nasumce(3, 8);
      satovi.push(setTimeout(fraza, (kraj - ctx.currentTime - 1) * 1000));
    }
    satovi.push(setTimeout(fraza, 3500));
  }

  function drombulja(izlaz) {                                    // rijetko: zvonki ton s pomičnim „samoglasnikom”
    function jednom() {
      var t = ctx.currentTime + 0.1, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = D / 2; f.type = 'bandpass'; f.Q.value = 9;
      f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1500, t + 0.6); f.frequency.linearRampToValueAtTime(700, t + 1.4);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      o.connect(f); f.connect(g); g.connect(izlaz); o.start(t); o.stop(t + 1.9);
      satovi.push(setTimeout(jednom, nasumce(25, 55) * 1000));
    }
    satovi.push(setTimeout(jednom, nasumce(15, 30) * 1000));
  }

  function pokreni() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      glavni = ctx.createGain(); glavni.gain.value = 0.0001; glavni.connect(ctx.destination);
      var suho = ctx.createGain(), mokro = ctx.createGain(), j = jeka();
      suho.gain.value = 0.7; mokro.gain.value = 0.55; suho.connect(glavni); j.connect(mokro); mokro.connect(glavni);
      var ulaz = ctx.createGain(); ulaz.connect(suho); ulaz.connect(j);
      bordun(ulaz); bubanj(ulaz); frula(ulaz); drombulja(ulaz);
    }
    ctx.resume();
    glavni.gain.cancelScheduledValues(ctx.currentTime);
    glavni.gain.setTargetAtTime(0.5, ctx.currentTime, 1.5);                 // lagano se pojačava
    svira = true; osvjezi(); spremi('1');
  }
  function zaustavi() {
    if (!ctx) return;
    glavni.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
    setTimeout(function () { if (!svira) ctx.suspend(); }, 2000);
    svira = false; osvjezi(); spremi('0');
  }
  function spremi(v) { try { localStorage.setItem(KLJUC, v); } catch (e) {} }
  function procitaj() { try { return localStorage.getItem(KLJUC); } catch (e) { return null; } }

  var gumb = document.createElement('button');
  gumb.type = 'button'; gumb.className = 'feniks-glazba';
  // tekst na jeziku aplikacije ako postoji I18n (web-aplikacija), inače hrvatski (stranica)
  function rijec(k, hr) { return window.I18n ? I18n.t(k) : hr; }
  function osvjezi() {
    gumb.setAttribute('aria-pressed', svira ? 'true' : 'false');
    gumb.setAttribute('aria-label', svira ? rijec('glazba.zaustavi', 'Zaustavi glazbu') : rijec('glazba.pusti', 'Pusti drevnu glazbu'));
    gumb.title = gumb.getAttribute('aria-label');
    // na uskom zaslonu samo ♪ (puni naziv ostaje u aria-label), da gumb ne prekriva sadržaj
    gumb.textContent = usko && usko.matches ? '♪' : svira ? rijec('glazba.svira', '♪ glazba svira') : rijec('glazba.gumb', '♪ glazba');
  }
  var usko = window.matchMedia ? matchMedia('(max-width: 600px)') : null;
  if (usko && usko.addEventListener) usko.addEventListener('change', function () { osvjezi(); });
  if (window.I18n) I18n.promjena(function () { osvjezi(); });
  gumb.addEventListener('click', function () { svira ? zaustavi() : pokreni(); });
  var css = document.createElement('style');
  css.textContent = '.feniks-glazba{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:50;' +
    'background:rgba(0,0,0,.6);color:#f0c05a;border:1px solid rgba(240,192,90,.55);border-radius:99px;padding:8px 14px;font:500 .9rem "Alegreya Sans",system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(6px)}' +
    '.feniks-glazba[aria-pressed="true"]{background:rgba(240,192,90,.15);box-shadow:0 0 16px rgba(240,160,60,.35)}' +
    '@media (max-width:600px){.feniks-glazba{width:42px;height:42px;padding:0;font-size:1.15rem;line-height:1}}';
  document.head.appendChild(css);
  osvjezi(); document.body.appendChild(gumb);

  // ako je posjetitelj prije uključio glazbu, nastavlja se na prvi dodir stranice
  if (procitaj() === '1') {
    var jednom = function (e) { if (e.target === gumb) return; removeEventListener('pointerdown', jednom); removeEventListener('keydown', jednom); if (!svira) pokreni(); };
    addEventListener('pointerdown', jednom); addEventListener('keydown', jednom);
  }
})();
