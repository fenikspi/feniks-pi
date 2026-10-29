/* Feniks π: računi i šifrirano usklađivanje (/api/racun/*).
   Poslužitelj nikad ne vidi lozinku ni ključ za šifriranje. Aplikacija iz lozinke na uređaju izvodi (PBKDF2 → HKDF)
   dva odvojena ključa: „provjera” (dokaz da znaš lozinku) i ključ koji otključava tvoj podatkovni ključ. Ovdje se čuvaju
   samo: korisničko ime kao HMAC-SHA256 s tajnim ključem RACUN_TAJNA (čitljivog popisa imena nema nigdje), sol, SHA-256
   sažetak provjere, omotani (šifrirani) podatkovni ključ, šifrirani podaci, njihova veličina i vrijeme. Sve je u zasebnoj
   bazi RACUNI (feniks-racuni), odvojeno od anonimnih obrazaca. Brisanje računa stvarno briše sve retke računa (GDPR čl. 17). */

const IME = /^[a-z0-9._-]{3,32}$/;
const B64 = /^[A-Za-z0-9_-]+$/;                     // base64url bez znaka =
const NAJVISE_PODATAKA = 2 * 1024 * 1024;           // šifrirani podaci jednog računa
const SESIJA_DANA = 30;
const PRAG_NEUSPJEHA = 10, ZAKLJUCAJ_MIN = 15;      // nakon 10 krivih lozinki s iste adrese prijave s nje se zaključaju do kraja 15-minutnog prozora
const PRAG_RACUNA = 100;                            // tek nakon 100 krivih lozinki ukupno (s bilo koje adrese) zaključa se i sam račun, na 15 minuta
const NOVIH_RACUNA_DNEVNO = 500;

const enc = new TextEncoder();
async function sha(s) { return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s))); }
function b64(u) { let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function nasumicno(n) { const u = new Uint8Array(n); crypto.getRandomValues(u); return b64(u); }
async function jednako(a, b) {
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  return crypto.subtle.timingSafeEqual(x, y);
}
function odg(d, status = 200) { return new Response(d === null ? null : JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
function b64polje(x, min, max) { return typeof x === 'string' && x.length >= min && x.length <= max && B64.test(x); }
function sada() { return new Date().toISOString(); }

// Za nepostojeće korisničko ime vraća se uvijek ista lažna sol, da se izvana ne može saznati koja imena postoje.
async function lazna(env, ime) { return (await sha('feniks-sol:' + env.RACUN_TAJNA + ':' + ime)).slice(0, 22); }
// korisničko ime u bazi: HMAC-SHA256(RACUN_TAJNA, ime); bez tajnog ključa iz baze se imena ne mogu pročitati ni pogađati
export async function hmac(env, s) {
  const k = await crypto.subtle.importKey('raw', enc.encode(env.RACUN_TAJNA), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(s))));
}
async function imeKljuc(env, ime) { return hmac(env, 'feniks-ime:' + ime); }

// Krive prijave broje se po izvoru, u tablici potrosnja: ključ je HMAC(RACUN_TAJNA, IP adresa + broj 15-minutnog prozora).
// Sirova adresa se ne sprema, zapis nije vezan uz račun, a ključevi iz različitih prozora ne mogu se povezati.
// Tko zna tuđe korisničko ime tako zaključava samo prijave sa svoje adrese, ne tuđi račun.
function prozor() { return Math.floor(Date.now() / (ZAKLJUCAJ_MIN * 6e4)); }
function oznakaProzora(p) { return 'prijava:' + String(p).padStart(10, '0') + ':'; }
async function izvorKljuc(env, req) {
  const p = prozor(), ip = req.headers.get('CF-Connecting-IP') || 'nepoznato';
  return oznakaProzora(p) + (await hmac(env, 'feniks-izvor:' + ip + ':' + p)).slice(0, 22);
}
async function izvorZakljucan(db, kljuc) {
  const r = await db.prepare('SELECT broj FROM potrosnja WHERE dan = ?').bind(kljuc).first();
  return r && r.broj >= PRAG_NEUSPJEHA ? new Date((prozor() + 1) * ZAKLJUCAJ_MIN * 6e4).toISOString() : null;
}
async function krivaPrijava(db, kljuc, r) {
  await db.prepare('INSERT INTO potrosnja (dan, broj) VALUES (?, 1) ON CONFLICT(dan) DO UPDATE SET broj = broj + 1 RETURNING broj').bind(kljuc).first();
  if (!r) return;
  const n = (r.neuspjeha || 0) + 1;
  await db.prepare('UPDATE racuni SET neuspjeha = ?, zakljucan_do = ? WHERE id = ?')
    .bind(n >= PRAG_RACUNA ? 0 : n, n >= PRAG_RACUNA ? new Date(Date.now() + ZAKLJUCAJ_MIN * 6e4).toISOString() : null, r.id).run();
}

async function sesija(req, env) {
  const m = /^Bearer\s+([A-Za-z0-9_-]{40,64})$/.exec(req.headers.get('Authorization') || '');
  if (!m) return null;
  const r = await env.RACUNI.prepare('SELECT s.racun_id AS id FROM sesije s JOIN racuni r ON r.id = s.racun_id WHERE s.token = ? AND s.istjece > ?')
    .bind(await sha(m[1]), sada()).first();
  return r ? { ...r, token: await sha(m[1]) } : null;
}
async function novaSesija(env, id) {
  const token = nasumicno(32), istjece = new Date(Date.now() + SESIJA_DANA * 864e5).toISOString();
  await env.RACUNI.prepare('INSERT INTO sesije (token, racun_id, istjece) VALUES (?, ?, ?)').bind(await sha(token), id, istjece).run();
  return { token, istjece };
}
// Tijelo zahtjeva čita se najviše do granice, i kad zaglavlje content-length nedostaje (chunked prijenos).
export async function tijelo(req, max) {
  if (Number(req.headers.get('content-length') || 0) > max) return null;
  if (!req.body) return '';
  const r = req.body.getReader(), dijelovi = []; let n = 0;
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    n += value.length;
    if (n > max) { await r.cancel(); return null; }
    dijelovi.push(value);
  }
  const sve = new Uint8Array(n); let i = 0;
  for (const d of dijelovi) { sve.set(d, i); i += d.length; }
  return new TextDecoder().decode(sve);
}
async function citaj(req, max = 8192) {
  const t = await tijelo(req, max);
  if (t === null) return null;
  try { return JSON.parse(t); } catch (e) { return null; }
}
function omotPolja(u) {   // omotani ključ: {iv, kljuc}, oboje base64url
  return u && b64polje(u.iv, 16, 16) && b64polje(u.kljuc, 40, 80);
}

export async function racun(req, env, put) {
  const izvor = req.headers.get('Origin');
  if (izvor && !/^https:\/\/(www\.)?fenikspi\.com$/i.test(izvor) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(izvor)) return odg({ greska: 'izvor' }, 403);
  if (!env.RACUN_TAJNA || !env.RACUNI) return odg({ greska: 'nije postavljeno' }, 503);
  const M = req.method, db = env.RACUNI;

  // sol za prijavu (postoji li ime, ne otkriva se)
  if (put === 'sol' && M === 'GET') {
    const ime = String(new URL(req.url).searchParams.get('korisnik') || '').toLowerCase();
    if (!IME.test(ime)) return odg({ greska: 'ime' }, 400);
    const r = await db.prepare('SELECT sol FROM racuni WHERE korisnik = ?').bind(await imeKljuc(env, ime)).first();
    return odg({ sol: r ? r.sol : await lazna(env, ime) });
  }

  // novi račun
  if (put === 'novi' && M === 'POST') {
    const u = await citaj(req);
    if (!u || !IME.test(u.korisnik || '') || !b64polje(u.sol, 22, 22) || !b64polje(u.provjera, 43, 43) || !b64polje(u.provjeraOporavka, 43, 43)
      || !omotPolja(u.omot) || !omotPolja(u.omotOporavka)) return odg({ greska: 'neispravno' }, 400);
    const dan = sada().slice(0, 10);
    const { broj } = await db.prepare('INSERT INTO potrosnja (dan, broj) VALUES (?, 1) ON CONFLICT(dan) DO UPDATE SET broj = broj + 1 RETURNING broj').bind('racun:' + dan).first();
    if (broj > NOVIH_RACUNA_DNEVNO) return odg({ greska: 'dnevna granica' }, 429);
    try {
      const r = await db.prepare(`INSERT INTO racuni (korisnik, sol, provjera, provjera_oporavka, omot, omot_oporavka, stvoren, zadnja_prijava, neuspjeha)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0) RETURNING id`).bind(await imeKljuc(env, u.korisnik), u.sol, await sha(u.provjera), await sha(u.provjeraOporavka),
        JSON.stringify(u.omot), JSON.stringify(u.omotOporavka), sada(), sada()).first();
      return odg({ ...(await novaSesija(env, r.id)), korisnik: u.korisnik }, 201);
    } catch (e) {
      if (/UNIQUE/i.test(String(e))) return odg({ greska: 'zauzeto' }, 409);
      throw e;
    }
  }

  // prijava (lozinkom ili ključem za oporavak)
  if ((put === 'prijava' || put === 'oporavak') && M === 'POST') {
    const u = await citaj(req);
    if (!u || !IME.test(u.korisnik || '') || !b64polje(u.provjera, 43, 43)) return odg({ greska: 'neispravno' }, 400);
    const izvorPrijave = await izvorKljuc(env, req), doIzvora = await izvorZakljucan(db, izvorPrijave);
    if (doIzvora) return odg({ greska: 'zaključano', do: doIzvora }, 429);
    const r = await db.prepare('SELECT * FROM racuni WHERE korisnik = ?').bind(await imeKljuc(env, u.korisnik)).first();
    if (r && r.zakljucan_do && r.zakljucan_do > sada()) return odg({ greska: 'zaključano', do: r.zakljucan_do }, 429);
    const ok = r && await jednako(await sha(u.provjera), put === 'prijava' ? r.provjera : r.provjera_oporavka);
    if (!ok) {
      await krivaPrijava(db, izvorPrijave, r);
      return odg({ greska: 'pogrešno' }, 401);   // isti odgovor za krivo ime i krivu lozinku
    }
    if (put === 'oporavak') {
      // nova lozinka: nova sol, nova provjera i podatkovni ključ ponovno omotan novom lozinkom (sve izračunato na uređaju)
      if (!b64polje(u.novaSol, 22, 22) || !b64polje(u.novaProvjera, 43, 43) || !omotPolja(u.noviOmot)) return odg({ greska: 'neispravno' }, 400);
      await db.prepare('UPDATE racuni SET sol = ?, provjera = ?, omot = ?, neuspjeha = 0, zakljucan_do = NULL WHERE id = ?')
        .bind(u.novaSol, await sha(u.novaProvjera), JSON.stringify(u.noviOmot), r.id).run();
      await db.prepare('DELETE FROM sesije WHERE racun_id = ?').bind(r.id).run();   // stare prijave na drugim uređajima prestaju vrijediti
      return odg({ ...(await novaSesija(env, r.id)), korisnik: u.korisnik, omot: u.noviOmot });
    }
    await db.prepare('UPDATE racuni SET neuspjeha = 0, zakljucan_do = NULL, zadnja_prijava = ? WHERE id = ?').bind(sada(), r.id).run();
    return odg({ ...(await novaSesija(env, r.id)), korisnik: u.korisnik, omot: JSON.parse(r.omot) });
  }

  // oporavak treba omot oporavka prije nego što korisnik dokaže ključ: daje se samo uz provjeru oporavka (vidi gore),
  // pa ga aplikacija dobiva ovim zahtjevom, koji također traži dokaz ključa za oporavak
  if (put === 'omot-oporavka' && M === 'POST') {
    const u = await citaj(req);
    if (!u || !IME.test(u.korisnik || '') || !b64polje(u.provjera, 43, 43)) return odg({ greska: 'neispravno' }, 400);
    const izvorPrijave = await izvorKljuc(env, req), doIzvora = await izvorZakljucan(db, izvorPrijave);
    if (doIzvora) return odg({ greska: 'zaključano', do: doIzvora }, 429);
    const r = await db.prepare('SELECT * FROM racuni WHERE korisnik = ?').bind(await imeKljuc(env, u.korisnik)).first();
    if (r && r.zakljucan_do && r.zakljucan_do > sada()) return odg({ greska: 'zaključano', do: r.zakljucan_do }, 429);
    if (!r || !(await jednako(await sha(u.provjera), r.provjera_oporavka))) { await krivaPrijava(db, izvorPrijave, r); return odg({ greska: 'pogrešno' }, 401); }
    return odg({ omotOporavka: JSON.parse(r.omot_oporavka) });
  }

  const s = await sesija(req, env);
  if (!s) return odg({ greska: 'prijava' }, 401);

  if (put === 'podaci' && M === 'GET') {
    const r = await db.prepare('SELECT verzija, podaci, promijenjeno FROM podaci WHERE racun_id = ?').bind(s.id).first();
    return odg(r ? { verzija: r.verzija, podaci: JSON.parse(r.podaci), promijenjeno: r.promijenjeno } : { verzija: 0, podaci: null });
  }
  if (put === 'podaci' && M === 'PUT') {
    const u = await citaj(req, NAJVISE_PODATAKA + 4096);
    if (!u || !Number.isInteger(u.verzija) || !u.podaci || !b64polje(u.podaci.iv, 16, 16) || typeof u.podaci.sifrirano !== 'string'
      || !B64.test(u.podaci.sifrirano) || u.podaci.sifrirano.length > NAJVISE_PODATAKA) return odg({ greska: 'neispravno' }, 400);
    const tekst = JSON.stringify({ iv: u.podaci.iv, sifrirano: u.podaci.sifrirano });
    const r = await db.prepare(`INSERT INTO podaci (racun_id, verzija, podaci, velicina, promijenjeno) VALUES (?1, 1, ?2, ?3, ?4)
      ON CONFLICT(racun_id) DO UPDATE SET verzija = verzija + 1, podaci = ?2, velicina = ?3, promijenjeno = ?4 WHERE verzija = ?5 RETURNING verzija`)
      .bind(s.id, tekst, tekst.length, sada(), u.verzija).first();
    if (!r) return odg({ greska: 'sukob' }, 409);     // netko je u međuvremenu spremio noviju verziju: aplikacija spaja i pokušava ponovno
    return odg({ verzija: r.verzija });
  }
  if (put === 'sesija' && M === 'DELETE') {
    await db.prepare('DELETE FROM sesije WHERE token = ?').bind(s.token).run();
    return odg(null, 204);
  }
  if (put === '' && M === 'DELETE') {
    // brisanje računa: traži i lozinku (provjeru), ne samo prijavu
    const u = await citaj(req);
    const r = await db.prepare('SELECT provjera FROM racuni WHERE id = ?').bind(s.id).first();
    if (!u || !b64polje(u.provjera, 43, 43) || !r || !(await jednako(await sha(u.provjera), r.provjera))) return odg({ greska: 'pogrešno' }, 401);
    await db.batch([
      db.prepare('DELETE FROM podaci WHERE racun_id = ?').bind(s.id),
      db.prepare('DELETE FROM sesije WHERE racun_id = ?').bind(s.id),
      db.prepare('DELETE FROM racuni WHERE id = ?').bind(s.id),
    ]);
    return odg(null, 204);
  }
  return odg({ greska: 'nepoznato' }, 404);
}

// Svakodnevno čišćenje (Cloudflare cron, vidi wrangler.toml): istekle prijave, brojači krivih prijava iz prošlih
// 15-minutnih prozora i računi bez prijave dulje od 3 godine, zajedno s njihovim šifriranim podacima (Pravila privatnosti, odjeljak 8).
export async function ocisti(env) {
  const db = env.RACUNI, sad = sada(), granica = new Date(Date.now() - 3 * 365.25 * 864e5).toISOString();
  await db.batch([
    db.prepare('DELETE FROM sesije WHERE istjece < ?').bind(sad),
    db.prepare("DELETE FROM potrosnja WHERE dan LIKE 'prijava:%' AND dan < ?").bind(oznakaProzora(prozor())),
    db.prepare('DELETE FROM podaci WHERE racun_id IN (SELECT id FROM racuni WHERE COALESCE(zadnja_prijava, stvoren) < ?)').bind(granica),
    db.prepare('DELETE FROM sesije WHERE racun_id IN (SELECT id FROM racuni WHERE COALESCE(zadnja_prijava, stvoren) < ?)').bind(granica),
    db.prepare('DELETE FROM racuni WHERE COALESCE(zadnja_prijava, stvoren) < ?').bind(granica),
  ]);
}
