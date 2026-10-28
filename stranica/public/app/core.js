/* Natal chart core: geocentric, tropical (true equinox of date), Placidus houses.
   Needs the global `Astronomy` (astronomy-engine). Pure functions, no DOM. */
var Natal = (function (A) {
  'use strict';
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function norm(x) { x %= 360; return x < 0 ? x + 360 : x; }
  function sind(x) { return Math.sin(x * D2R); }
  function cosd(x) { return Math.cos(x * D2R); }
  function tand(x) { return Math.tan(x * D2R); }
  function atan2d(y, x) { return Math.atan2(y, x) * R2D; }
  function asind(x) { return Math.asin(x) * R2D; }
  function angDiff(a, b) { var d = Math.abs(norm(a) - norm(b)); return d > 180 ? 360 - d : d; }
  function signedDiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }

  /* ---------- time zones (IANA history via Intl) ---------- */
  var fmtCache = {};
  function tzFormatter(tz) {
    if (!fmtCache[tz]) {
      fmtCache[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', era: 'short'
      });
    }
    return fmtCache[tz];
  }
  // Offset (minutes east of UTC) of zone `tz` at UTC instant `ms`.
  function tzOffsetMin(tz, ms) {
    var p = {}, parts = tzFormatter(tz).formatToParts(new Date(ms));
    for (var i = 0; i < parts.length; i++) p[parts[i].type] = parts[i].value;
    var y = +p.year; if (p.era === 'BC' || p.era === 'B') y = 1 - y;
    var d = new Date(0); d.setUTCFullYear(y, +p.month - 1, +p.day); d.setUTCHours(+p.hour, +p.minute, +p.second, 0);
    return Math.round((d.getTime() - Math.floor(ms / 1000) * 1000) / 60000);
  }
  function wallAsUtcMs(y, mo, d, h, mi, s) {
    var t = new Date(0); t.setUTCFullYear(y, mo - 1, d); t.setUTCHours(h, mi, s || 0, 0); return t.getTime();
  }
  /* Resolve a local wall time in zone tz. Returns every UTC instant that shows that wall time:
     0 candidates = skipped hour (clocks moved forward), 2 = repeated hour (clocks moved back). */
  function resolveLocal(y, mo, d, h, mi, s, tz) {
    var wall = wallAsUtcMs(y, mo, d, h, mi, s), seen = {}, out = [];
    [-36, -12, 0, 12, 36].forEach(function (hrs) {
      var off = tzOffsetMin(tz, wall + hrs * 3600000);
      if (seen[off]) return; seen[off] = 1;
      var utc = wall - off * 60000;
      if (tzOffsetMin(tz, utc) === off) out.push({ utcMs: utc, offsetMin: off });
    });
    out.sort(function (a, b) { return a.utcMs - b.utcMs; });
    return out;
  }
  // Standard (winter) offset of a zone around a date: the smaller of mid-January and mid-July offsets.
  function standardOffsetMin(tz, y) {
    var a = tzOffsetMin(tz, wallAsUtcMs(y, 1, 15, 12, 0)), b = tzOffsetMin(tz, wallAsUtcMs(y, 7, 15, 12, 0));
    return Math.min(a, b);
  }
  function isLmtOffset(off) { return off % 15 !== 0; }
  // Is daylight saving in force at this instant? Uses the zone's own name for the period
  // (catches year-round war time such as 1941-42), else compares with nearby winters.
  var nameFmtCache = {};
  function isDst(tz, utcMs) {
    if (!nameFmtCache[tz]) nameFmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'long' });
    var parts = nameFmtCache[tz].formatToParts(new Date(utcMs)), name = '';
    parts.forEach(function (p) { if (p.type === 'timeZoneName') name = p.value; });
    if (/summer|daylight/i.test(name)) return true;
    if (/standard/i.test(name)) return false;
    var off = tzOffsetMin(tz, utcMs), y = new Date(utcMs).getUTCFullYear(), base = Infinity;
    for (var k = -6; k <= 6; k++) base = Math.min(base, tzOffsetMin(tz, wallAsUtcMs(y + k, 1, 15, 12, 0)));
    return off > base;
  }

  /* ---------- bodies ---------- */
  var BODIES = [
    { id: 'sun', b: 'Sun' }, { id: 'moon', b: 'Moon' }, { id: 'mercury', b: 'Mercury' }, { id: 'venus', b: 'Venus' },
    { id: 'mars', b: 'Mars' }, { id: 'jupiter', b: 'Jupiter' }, { id: 'saturn', b: 'Saturn' },
    { id: 'uranus', b: 'Uranus' }, { id: 'neptune', b: 'Neptune' }, { id: 'pluto', b: 'Pluto' }
  ];
  function centuries(t) { return t.tt / 36525; }
  function bodyLon(id, t) {
    if (id === 'sun') return A.SunPosition(t).elon;
    if (id === 'moon') return A.EclipticGeoMoon(t).lon;
    var T = centuries(t);
    if (id === 'node') // mean lunar node (Meeus 47.7)
      return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000);
    if (id === 'lilith') // mean lunar apogee = mean perigee + 180 (Meeus 47.7)
      return norm(83.3532465 + 4069.0137287 * T - 0.0103200 * T * T - T * T * T / 80053 + T * T * T * T / 18999000 + 180);
    if (ASTEROIDS.indexOf(id) >= 0) return asteroidLon(id, t);
    var name = BODIES.filter(function (x) { return x.id === id; })[0].b;
    return A.Ecliptic(A.GeoVector(A.Body[name], t, true)).elon;
  }
  /* ---------- asteroids & Chiron: JPL Horizons heliocentric ICRF vectors (1800-2100), cubic interpolation ---------- */
  var astCache = {};
  function astTable(id) {
    if (astCache[id]) return astCache[id];
    var src = (typeof ASTEROID_DATA !== 'undefined') && ASTEROID_DATA[id];
    if (!src) return null;
    function dec(s) {
      var d = s.split(','), a = new Float64Array(d.length), v = +d[0], dv = +d[1];
      a[0] = v; if (d.length > 1) { v += dv; a[1] = v; }
      for (var i = 2; i < d.length; i++) { dv += +d[i]; v += dv; a[i] = v; }
      return a;
    }
    return (astCache[id] = { jd0: src.jd0, step: src.step, n: src.n, c: [dec(src.x), dec(src.y), dec(src.z)] });
  }
  function astHelio(T, jd) { // AU, ICRF/EQJ
    var f = (jd - T.jd0) / T.step, i = Math.floor(f) - 1;
    if (i < 0 || i + 3 >= T.n) return null;
    var u = f - (i + 1), w = [-u * (u - 1) * (u - 2) / 6, (u + 1) * (u - 1) * (u - 2) / 2, -(u + 1) * u * (u - 2) / 2, (u + 1) * u * (u - 1) / 6];
    return T.c.map(function (a) { return (w[0] * a[i] + w[1] * a[i + 1] + w[2] * a[i + 2] + w[3] * a[i + 3]) * 1e-7; });
  }
  function asteroidLon(id, t) {
    var T = astTable(id); if (!T) return null;
    var tau = 0, g = null;
    for (var k = 0; k < 3; k++) { // light-time; P(t-τ) - E(t-τ) also folds in annual aberration
      var tt = t.AddDays(-tau), p = astHelio(T, tt.tt + 2451545.0); if (!p) return null;
      var e = A.HelioVector(A.Body.Earth, tt);
      g = [p[0] - e.x, p[1] - e.y, p[2] - e.z];
      tau = Math.sqrt(g[0] * g[0] + g[1] * g[1] + g[2] * g[2]) / 173.1446327;
    }
    return A.Ecliptic(new A.Vector(g[0], g[1], g[2], t)).elon;
  }
  var ASTEROIDS = ['chiron', 'ceres', 'pallas', 'juno', 'vesta', 'lilith1181'];

  function bodyState(id, t) {
    var lon = bodyLon(id, t);
    var speed = signedDiff(bodyLon(id, t.AddDays(0.5)), bodyLon(id, t.AddDays(-0.5))); // deg/day
    return { id: id, lon: norm(lon), speed: speed, retro: speed < 0 };
  }

  /* ---------- houses ---------- */
  function angles(t, latDeg, lonDeg) {
    var eps = A.e_tilt(t).tobl;                 // true obliquity of date
    var ramc = norm(A.SiderealTime(t) * 15 + lonDeg); // apparent sidereal time
    var mc = norm(atan2d(sind(ramc), cosd(ramc) * cosd(eps)));
    var asc = norm(atan2d(cosd(ramc), -(sind(ramc) * cosd(eps) + tand(latDeg) * sind(eps))));
    return { eps: eps, ramc: ramc, mc: mc, asc: asc };
  }
  function lonFromRa(ra, eps) { return norm(atan2d(sind(ra), cosd(ra) * cosd(eps))); }
  // Placidus intermediate cusp: fraction f of the diurnal (above) or nocturnal (below) semi-arc.
  function placidusCusp(ramc, eps, lat, f, above) {
    var lam = above ? lonFromRa(ramc + 90 * f, eps) : lonFromRa(ramc + 180 - 90 * f, eps);
    for (var i = 0; i < 60; i++) {
      var dec = asind(sind(eps) * sind(lam));
      var x = tand(lat) * tand(dec);
      if (Math.abs(x) >= 1) return null;
      var ad = asind(x);
      var ra = above ? ramc + f * (90 + ad) : ramc + 180 - f * (90 - ad);
      var nl = lonFromRa(ra, eps);
      if (angDiff(nl, lam) < 1e-7) { lam = nl; break; }
      lam = nl;
    }
    return lam;
  }
  function houses(t, lat, lon) {
    var a = angles(t, lat, lon), c = new Array(13), system = 'Placidus';
    c[1] = a.asc; c[10] = a.mc; c[7] = norm(a.asc + 180); c[4] = norm(a.mc + 180);
    var c11 = placidusCusp(a.ramc, a.eps, lat, 1 / 3, true), c12 = placidusCusp(a.ramc, a.eps, lat, 2 / 3, true);
    var c3 = placidusCusp(a.ramc, a.eps, lat, 1 / 3, false), c2 = placidusCusp(a.ramc, a.eps, lat, 2 / 3, false);
    if (c11 === null || c12 === null || c2 === null || c3 === null) {
      // Polar latitudes: Placidus is undefined, fall back to Porphyry (trisected quadrants).
      system = 'Porfirije';
      var q1 = norm(c[1] - c[10]), q2 = norm(c[4] - c[1]);
      c11 = norm(c[10] + q1 / 3); c12 = norm(c[10] + 2 * q1 / 3);
      c2 = norm(c[1] + q2 / 3); c3 = norm(c[1] + 2 * q2 / 3);
    }
    c[11] = c11; c[12] = c12; c[2] = c2; c[3] = c3;
    c[5] = norm(c11 + 180); c[6] = norm(c12 + 180); c[8] = norm(c2 + 180); c[9] = norm(c3 + 180);
    return { cusps: c, system: system, asc: a.asc, mc: a.mc, ramc: a.ramc, eps: a.eps };
  }
  function houseOf(lon, cusps) {
    for (var h = 1; h <= 12; h++) {
      var a = cusps[h], b = cusps[h % 12 + 1];
      if (norm(lon - a) < norm(b - a)) return h;
    }
    return 12;
  }

  /* ---------- aspects ---------- */
  var ASPECTS = [
    { id: 'conj', angle: 0, orb: 8, kind: 'neutral' },
    { id: 'opp', angle: 180, orb: 8, kind: 'tense' },
    { id: 'trine', angle: 120, orb: 8, kind: 'soft' },
    { id: 'square', angle: 90, orb: 7, kind: 'tense' },
    { id: 'sextile', angle: 60, orb: 6, kind: 'soft' },
    { id: 'quincunx', angle: 150, orb: 3, kind: 'minor' },
    { id: 'sesqui', angle: 135, orb: 2, kind: 'minor' },
    { id: 'semisquare', angle: 45, orb: 2, kind: 'minor' },
    { id: 'semisextile', angle: 30, orb: 2, kind: 'minor' },
    { id: 'quintile', angle: 72, orb: 2, kind: 'minor' }
  ];
  function findAspects(points, opts) {
    opts = opts || {};
    var lumBonus = opts.lumBonus == null ? 2 : opts.lumBonus, orbs = opts.orbs || {}, use = opts.use || {};
    var out = [];
    for (var i = 0; i < points.length; i++) for (var j = i + 1; j < points.length; j++) {
      var p = points[i], q = points[j];
      if (p.noAspects || q.noAspects) continue;
      if ((p.id === 'node' && q.id === 'lilith') || (p.id === 'lilith' && q.id === 'node')) continue;
      var sep = angDiff(p.lon, q.lon);
      var best = null;
      ASPECTS.forEach(function (a) {
        if (use[a.id] === false) return;
        var orb = (orbs[a.id] != null ? orbs[a.id] : a.orb);
        if (p.luminary || q.luminary) orb += (a.kind === 'minor' ? lumBonus / 2 : lumBonus);
        if (p.point || q.point) orb = Math.min(orb, a.kind === 'minor' ? 1 : 5);
        if (p.asteroid || q.asteroid) {
          var chi = (p.id === 'chiron' || q.id === 'chiron') && !((p.asteroid && p.id !== 'chiron') || (q.asteroid && q.id !== 'chiron'));
          orb = Math.min(orb, a.kind === 'minor' ? 1 : (chi ? 5 : 3));
        }
        var dev = Math.abs(sep - a.angle);
        if (dev <= orb && (!best || dev < best.dev)) best = { asp: a, dev: dev, orb: orb };
      });
      if (!best) continue;
      // Applying if the separation is moving toward the exact angle.
      var dt = 0.01, sp = (p.speed || 0), sq = (q.speed || 0);
      var sep2 = angDiff(p.lon + sp * dt, q.lon + sq * dt);
      var applying = Math.abs(sep2 - best.asp.angle) < best.dev;
      out.push({ a: p.id, b: q.id, type: best.asp.id, kind: best.asp.kind, angle: best.asp.angle,
                 orb: best.dev, maxOrb: best.orb, applying: applying, exact: best.dev < 1 });
    }
    out.sort(function (x, y) { return x.orb - y.orb; });
    return out;
  }

  /* ---------- configurations (Summa: stelijum, veliki trigon, T-kvadrat, veliki kvadrat, jod, zmaj, pravougaonik) ---------- */
  function findConfigurations(points, aspects) {
    var planets = points.filter(function (p) { return !p.point && !p.asteroid; });
    var idx = {}; planets.forEach(function (p) { idx[p.id] = 1; });
    var A2 = {};
    aspects.forEach(function (x) {
      if (!idx[x.a] || !idx[x.b]) return;
      A2[x.a + '|' + x.b] = x.type; A2[x.b + '|' + x.a] = x.type;
    });
    function is(a, b, t) { return A2[a + '|' + b] === t; }
    var ids = planets.map(function (p) { return p.id; }), out = [], seen = {};
    function add(type, members) {
      var key = type + ':' + members.slice().sort().join(',');
      if (seen[key]) return; seen[key] = 1; out.push({ type: type, members: members });
    }
    var n = ids.length, a, b, c, d;
    for (a = 0; a < n; a++) for (b = 0; b < n; b++) for (c = 0; c < n; c++) {
      if (a === b || b === c || a === c) continue;
      var x = ids[a], y = ids[b], z = ids[c];
      if (a < b && b < c && is(x, y, 'trine') && is(y, z, 'trine') && is(x, z, 'trine')) add('grandTrine', [x, y, z]);
      if (b < c && is(y, z, 'opp') && is(x, y, 'square') && is(x, z, 'square')) add('tSquare', [x, y, z]); // x = apex
      if (b < c && is(y, z, 'sextile') && is(x, y, 'quincunx') && is(x, z, 'quincunx')) add('yod', [x, y, z]); // x = apex
    }
    out.filter(function (o) { return o.type === 'grandTrine'; }).forEach(function (gt) {
      ids.forEach(function (k) {
        if (gt.members.indexOf(k) >= 0) return;
        gt.members.forEach(function (m) {
          var others = gt.members.filter(function (o) { return o !== m; });
          if (is(k, m, 'opp') && is(k, others[0], 'sextile') && is(k, others[1], 'sextile')) add('kite', gt.members.concat([k]));
        });
      });
    });
    for (a = 0; a < n; a++) for (b = a + 1; b < n; b++) for (c = b + 1; c < n; c++) for (d = c + 1; d < n; d++) {
      var q = [ids[a], ids[b], ids[c], ids[d]];
      var opp = [], sq = 0, tr = 0, sx = 0;
      for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) {
        var t = A2[q[i] + '|' + q[j]];
        if (t === 'opp') opp.push([q[i], q[j]]); else if (t === 'square') sq++; else if (t === 'trine') tr++; else if (t === 'sextile') sx++;
      }
      if (opp.length === 2 && sq === 4) add('grandCross', q);
      if (opp.length === 2 && tr === 2 && sx === 2) add('rectangle', q);
    }
    // Stellium: 3+ planets in one sign, or a chain of 3+ conjunctions.
    var bySign = {};
    planets.forEach(function (p) { var s = Math.floor(p.lon / 30); (bySign[s] = bySign[s] || []).push(p.id); });
    Object.keys(bySign).forEach(function (s) { if (bySign[s].length >= 3) out.push({ type: 'stellium', members: bySign[s], sign: +s }); });
    return out;
  }

  /* ---------- main ---------- */
  function compute(input) {
    // input: { utcMs, lat, lon }
    var t = A.MakeTime(new Date(input.utcMs));
    var H = houses(t, input.lat, input.lon);
    var pts = BODIES.map(function (x) { var s = bodyState(x.id, t); s.luminary = (x.id === 'sun' || x.id === 'moon'); return s; });
    var node = bodyState('node', t); node.point = true; node.retro = true;
    var lil = bodyState('lilith', t); lil.point = true;
    pts.push(node, lil);
    ASTEROIDS.forEach(function (id) {
      if (asteroidLon(id, t.AddDays(-0.5)) === null || asteroidLon(id, t.AddDays(0.5)) === null) return; // outside 1800-2100
      var s = bodyState(id, t); s.asteroid = true; pts.push(s);
    });
    pts.push({ id: 'asc', lon: H.asc, speed: 360, point: true, angle: true });
    pts.push({ id: 'mc', lon: H.mc, speed: 360, point: true, angle: true });
    pts.forEach(function (p) { p.sign = Math.floor(p.lon / 30); p.deg = p.lon - p.sign * 30; p.house = houseOf(p.lon, H.cusps); });
    return { time: t, jd: t.ut + 2451545.0, houses: H, points: pts };
  }

  return {
    norm: norm, angDiff: angDiff, resolveLocal: resolveLocal, tzOffsetMin: tzOffsetMin, standardOffsetMin: standardOffsetMin,
    isLmtOffset: isLmtOffset, isDst: isDst, compute: compute, findAspects: findAspects, findConfigurations: findConfigurations,
    houseOf: houseOf, ASPECTS: ASPECTS, angles: angles, houses: houses, bodyState: bodyState, bodyLon: function (id, t) { return norm(bodyLon(id, t)); }
  };
})(Astronomy);
