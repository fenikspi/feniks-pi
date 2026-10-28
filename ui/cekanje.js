/* Feniks π: znak čekanja. Dok se nešto učitava ili čeka odgovor, uz pokazivač miša vrti se
   interaktivni logo (feniks → π → astrološki simbol …). Sam se uključuje oko svakog K.api poziva. */
var FeniksCekanje = (function () {
  'use strict';
  var el = null, aktivno = 0, mx = innerWidth / 2, my = innerHeight / 2, odgoda = null;
  addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; if (el && !el.hidden) mjesto(); }, { passive: true });
  function stvori() {
    el = document.createElement('div');
    el.className = 'feniks-cekanje'; el.setAttribute('role', 'status'); el.setAttribute('aria-label', 'Učitavam…'); el.hidden = true;
    document.body.appendChild(el);
    FeniksLogo.postavi(el, { velicina: 54, tekst: false, interaktivno: false, korak: 650 });
  }
  function mjesto() {
    var x = Math.min(innerWidth - 66, mx + 16), y = Math.min(innerHeight - 66, my + 16);
    el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }
  function pocni() {
    if (++aktivno > 1) return;
    clearTimeout(odgoda);
    odgoda = setTimeout(function () { if (!el) stvori(); mjesto(); el.hidden = false; document.documentElement.classList.add('feniks-ceka'); }, 250);
  }
  function zavrsi() {
    aktivno = Math.max(0, aktivno - 1); if (aktivno) return;
    clearTimeout(odgoda); if (el) el.hidden = true; document.documentElement.classList.remove('feniks-ceka');
  }
  var css = document.createElement('style');
  css.textContent = '.feniks-cekanje{position:fixed;left:0;top:0;z-index:1000;pointer-events:none;border-radius:12px;overflow:hidden;box-shadow:0 0 22px rgba(255,150,40,.45)}' +
    '.feniks-cekanje[hidden]{display:none}html.feniks-ceka,html.feniks-ceka *{cursor:progress}';
  document.head.appendChild(css);
  if (window.K && K.api) { var izvorni = K.api; K.api = function (put, opcije) { pocni(); return izvorni(put, opcije).finally(zavrsi); }; }
  return { pocni: pocni, zavrsi: zavrsi };
})();
