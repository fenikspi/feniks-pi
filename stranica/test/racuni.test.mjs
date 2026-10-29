// Testovi zaključavanja prijave (B9, izvještaj br. 18): krive lozinke broje se po izvoru (HMAC IP adrese), pa netko
// tko zna tuđe korisničko ime ne može zaključati tuđi račun. Bez interneta, s lažnom D1 bazom koja pamti stanje.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { ocisti } from '../src/racuni.js';

// timingSafeEqual postoji samo u Cloudflare Workersima; u Nodeu ga zamjenjuje obična usporedba (samo za test)
if (!crypto.subtle.timingSafeEqual) crypto.subtle.timingSafeEqual = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const enc = new TextEncoder();
const b64 = (u) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha = async (s) => b64(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))));
const PROVJERA = 'A'.repeat(43), KRIVA = 'B'.repeat(43);

// lažna D1 baza feniks-racuni: jedan račun (svako ime ga nalazi), brojači u potrosnja, popis izvršenih upita
async function baza() {
  const racun = { id: 1, sol: 'x'.repeat(22), provjera: await sha(PROVJERA), provjera_oporavka: await sha(PROVJERA), omot: '{}', omot_oporavka: '{}', neuspjeha: 0, zakljucan_do: null };
  const potrosnja = {}, upiti = [];
  const stmt = (sql, a) => ({
    async first() {
      upiti.push(sql);
      if (/^SELECT broj FROM potrosnja/.test(sql)) return a[0] in potrosnja ? { broj: potrosnja[a[0]] } : null;
      if (/^INSERT INTO potrosnja/.test(sql)) { potrosnja[a[0]] = (potrosnja[a[0]] || 0) + 1; return { broj: potrosnja[a[0]] }; }
      if (/^SELECT \* FROM racuni/.test(sql)) return { ...racun };
      return null;
    },
    async run() {
      upiti.push(sql);
      if (/^UPDATE racuni SET neuspjeha = \?, zakljucan_do = \?/.test(sql)) { racun.neuspjeha = a[0]; racun.zakljucan_do = a[1]; }
      if (/^UPDATE racuni SET neuspjeha = 0, zakljucan_do = NULL/.test(sql)) { racun.neuspjeha = 0; racun.zakljucan_do = null; }
      if (/^INSERT INTO sesije/.test(sql)) return { success: true };
      return { success: true };
    },
  });
  return {
    prepare: (sql) => ({ bind: (...a) => ({ ...stmt(sql, a), sql, a }) }),
    async batch(s) { for (const x of s) { upiti.push(x.sql); if (/DELETE FROM potrosnja/.test(x.sql)) for (const k of Object.keys(potrosnja)) if (k.startsWith('prijava:') && k < x.a[0]) delete potrosnja[k]; } return []; },
    racun, potrosnja, upiti,
  };
}
const U = 'https://fenikspi.com';
const prijava = (provjera, ip) => new Request(U + '/api/racun/prijava', { method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: U, 'CF-Connecting-IP': ip }, body: JSON.stringify({ korisnik: 'marija', provjera }) });
const env = (RACUNI) => ({ RACUNI, RACUN_TAJNA: 'proba' });

test('10 krivih lozinki s jedne adrese zaključa samo tu adresu, ne račun', async () => {
  const db = await baza(), e = env(db);
  for (let i = 0; i < 10; i++) assert.equal((await worker.fetch(prijava(KRIVA, '203.0.113.7'), e)).status, 401);
  const r = await worker.fetch(prijava(PROVJERA, '203.0.113.7'), e);
  assert.equal(r.status, 429);                                          // napadačeva adresa je zaključana, i s točnom lozinkom
  assert.ok((await r.json()).do > new Date().toISOString());
  assert.equal(db.racun.zakljucan_do, null);                            // račun nije zaključan
  assert.equal((await worker.fetch(prijava(PROVJERA, '198.51.100.2'), e)).status, 200);   // vlasnik se prijavi s druge adrese
});

test('IP adresa se ne sprema: ključ brojača je HMAC, bez adrese i bez računa', async () => {
  const db = await baza();
  await worker.fetch(prijava(KRIVA, '203.0.113.7'), env(db));
  const kljucevi = Object.keys(db.potrosnja);
  assert.equal(kljucevi.length, 1);
  assert.match(kljucevi[0], /^prijava:\d{10}:[A-Za-z0-9_-]{22}$/);
  assert.ok(!kljucevi[0].includes('203.0.113'));
});

test('račun se zaključa tek nakon 100 krivih lozinki ukupno (pogađanje s mnogo adresa)', async () => {
  const db = await baza(), e = env(db);
  for (let i = 0; i < 99; i++) await worker.fetch(prijava(KRIVA, '10.0.' + Math.floor(i / 9) + '.' + i), e);
  assert.equal(db.racun.zakljucan_do, null);
  await worker.fetch(prijava(KRIVA, '10.9.9.9'), e);
  assert.ok(db.racun.zakljucan_do > new Date().toISOString());
  assert.equal((await worker.fetch(prijava(PROVJERA, '198.51.100.2'), e)).status, 429);
});

test('uspješna prijava poništi brojač računa', async () => {
  const db = await baza(), e = env(db);
  for (let i = 0; i < 5; i++) await worker.fetch(prijava(KRIVA, '203.0.113.7'), e);
  assert.equal(db.racun.neuspjeha, 5);
  assert.equal((await worker.fetch(prijava(PROVJERA, '203.0.113.7'), e)).status, 200);
  assert.equal(db.racun.neuspjeha, 0);
});

test('omot oporavka: krivi ključ za oporavak broji se isto kao kriva lozinka', async () => {
  const db = await baza(), e = env(db);
  const zahtjev = (provjera) => new Request(U + '/api/racun/omot-oporavka', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: U, 'CF-Connecting-IP': '203.0.113.7' }, body: JSON.stringify({ korisnik: 'marija', provjera }) });
  for (let i = 0; i < 10; i++) assert.equal((await worker.fetch(zahtjev(KRIVA), e)).status, 401);
  assert.equal((await worker.fetch(zahtjev(PROVJERA), e)).status, 429);
});

test('dnevno čišćenje briše brojače iz prošlih prozora, a dnevne brojače računa ne dira', async () => {
  const db = await baza();
  db.potrosnja['prijava:0000000001:stari'] = 3;
  db.potrosnja['racun:2026-10-29'] = 7;
  await worker.fetch(prijava(KRIVA, '203.0.113.7'), env(db));
  await ocisti(env(db));
  const k = Object.keys(db.potrosnja);
  assert.ok(!k.includes('prijava:0000000001:stari'));
  assert.ok(k.includes('racun:2026-10-29'));
  assert.equal(k.filter((x) => x.startsWith('prijava:')).length, 1);    // brojač iz tekućeg prozora ostaje
});
