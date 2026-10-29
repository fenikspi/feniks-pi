// Testovi poslužitelja stranice: bez interneta, bez Claude API-ja, s lažnom D1 bazom. Pokretanje: npm test (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/worker.js';
import { tijelo } from '../src/racuni.js';

const SIMBOLI = readFileSync(new URL('../public/app/simboli.js', import.meta.url), 'utf8');
function d1() {
  const brojaci = {};
  const stmt = (sql, a) => ({
    async first() {
      if (/INSERT INTO potrosnja/.test(sql)) { brojaci[a[0]] = (brojaci[a[0]] || 0) + 1; return { broj: brojaci[a[0]] }; }
      return null;                                   // nepostojeći račun, nepostojeća sesija
    },
    async run() { return { success: true }; },
    async all() { return { results: [] }; },
  });
  return { prepare: (sql) => ({ bind: (...a) => stmt(sql, a) }), async batch() { return []; }, brojaci };
}
const env = (extra) => ({ ASSETS: { async fetch() { return new Response(SIMBOLI); } }, OBRASCI: d1(), RACUNI: d1(), RACUN_TAJNA: 'proba', ...extra });
const U = 'https://fenikspi.com';
const post = (put, body, h) => new Request(U + put, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: U, ...h }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const OBRAZAC = { simboli: ['zmija', 'voda'], vrsta: 'san', mjesec: { znak: 3, mijena: 'ustap' }, tranzit: { t: 'saturn', aspekt: 'kvadrat', n: 'sun', kuca: 7 } };

// prvi test: popis simbola se pamti u modulu, pa se kvar provjerava prije prvog uspješnog učitavanja
test('obrazac: prazan popis simbola → 503 (kvar se vidi)', async () => {
  const e = env({ ASSETS: { async fetch() { return new Response('nema popisa'); } } });
  assert.equal((await worker.fetch(post('/api/obrazac', OBRAZAC), e)).status, 503);
});
test('obrazac: ispravan → 204 bez CORS zaglavlja', async () => {
  const r = await worker.fetch(post('/api/obrazac', OBRAZAC), env());
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
});
test('obrazac: nepoznati simboli → 422, GET → 405, tuđi Origin → 403, neispravan JSON → 400', async () => {
  assert.equal((await worker.fetch(post('/api/obrazac', { simboli: ['nepostoji'] }), env())).status, 422);
  assert.equal((await worker.fetch(new Request(U + '/api/obrazac'), env())).status, 405);
  assert.equal((await worker.fetch(post('/api/obrazac', OBRAZAC, { Origin: 'https://zlo.example' }), env())).status, 403);
  assert.equal((await worker.fetch(post('/api/obrazac', '{neispravno'), env())).status, 400);
});
test('obrazac: dnevna granica → 429', async () => {
  const e = env(); e.OBRASCI.brojaci['obrazac:' + new Date().toISOString().slice(0, 10)] = 2000;
  assert.equal((await worker.fetch(post('/api/obrazac', OBRAZAC), e)).status, 429);
});
test('duboko: bez ključa 503, tuđi Origin 403, neispravno tijelo 400/422', async () => {
  const DUBOKO = { jezik: 'hr', polozaji: [{ ime: 'Sunce', polozaj: 'Lav 12°' }], dijelovi: [{ naslov: 'a', tekst: 'b' }] };
  assert.equal((await worker.fetch(post('/api/duboko', DUBOKO), env())).status, 503);
  assert.equal((await worker.fetch(post('/api/duboko', DUBOKO, { Origin: 'https://zlo.example' }), env({ ANTHROPIC_API_KEY: 'x' }))).status, 403);
  assert.equal((await worker.fetch(post('/api/duboko', '{x'), env({ ANTHROPIC_API_KEY: 'x' }))).status, 400);
  assert.equal((await worker.fetch(post('/api/duboko', { jezik: 'xx' }), env({ ANTHROPIC_API_KEY: 'x' }))).status, 422);
});
test('duboko: JSON odgovori nose nosniff', async () => {
  const r = await worker.fetch(post('/api/duboko', {}), env());
  assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
});
test('racun: sol za nepostojeće ime je uvijek ista (ne otkriva postoji li račun)', async () => {
  const e = env();
  const a = await (await worker.fetch(new Request(U + '/api/racun/sol?korisnik=netko'), e)).json();
  const b = await (await worker.fetch(new Request(U + '/api/racun/sol?korisnik=netko'), e)).json();
  assert.equal(a.sol, b.sol); assert.equal(a.sol.length, 22);
  assert.equal((await worker.fetch(new Request(U + '/api/racun/sol?korisnik=A!'), e)).status, 400);
});
test('racun: neispravan novi račun 400, podaci bez prijave 401, bez tajne 503', async () => {
  assert.equal((await worker.fetch(post('/api/racun/novi', { korisnik: 'marija', sol: 'kratko' }), env())).status, 400);
  assert.equal((await worker.fetch(new Request(U + '/api/racun/podaci'), env())).status, 401);
  assert.equal((await worker.fetch(new Request(U + '/api/racun/podaci'), env({ RACUN_TAJNA: '' }))).status, 503);
});
test('tijelo: granica vrijedi i bez content-length', async () => {
  const velik = new Request(U + '/x', { method: 'POST', body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array(5000)); c.close(); } }), duplex: 'half' });
  assert.equal(await tijelo(velik, 4096), null);
  assert.equal(await tijelo(new Request(U + '/x', { method: 'POST', body: 'abc' }), 4096), 'abc');
});
test('_headers: sigurnosna zaglavlja za statične datoteke postoje', () => {
  const h = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  for (const z of ['Strict-Transport-Security', 'Content-Security-Policy', 'X-Content-Type-Options: nosniff', 'Referrer-Policy', 'Permissions-Policy', "frame-ancestors 'none'"]) assert.ok(h.includes(z), z);
});
test('sw.js: prijevodi karte su u popisu za rad bez interneta', () => {
  const sw = readFileSync(new URL('../public/app/sw.js', import.meta.url), 'utf8');
  for (const j of ['hr', 'en', 'de', 'it', 'es', 'fr', 'sl', 'sr', 'ru', 'uk']) assert.ok(sw.includes("'jezici/karta-" + j + ".js'"), j);
  assert.ok(sw.includes("feniks-app-14"));
});
