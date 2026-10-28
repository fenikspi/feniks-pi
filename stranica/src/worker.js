/* Feniks π: poslužitelj stranice. Statične datoteke poslužuje Cloudflare (assets); ovdje je samo prijem anonimnih
   simboličkih obrazaca, koje aplikacija šalje isključivo ako je korisnik uključio „Doprinesi anonimne obrasce”.
   Prima se samo strogo provjeren apstraktni obrazac; ne sprema se IP adresa, vrijeme ni ikakav tekst korisnika. */
const PLANETI = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'asc', 'mc'];
const ASPEKTI = ['konjunkcija', 'sekstil', 'kvadrat', 'trigon', 'opozicija'];
const VRSTE = ['san', 'znak', 'susret', 'sinkronicitet', 'misao'];
const MIJENE = ['mladak', 'mladi', 'prva', 'raste', 'ustap', 'opada', 'zadnja', 'stari'];

function cijeli(x, od, do_) { return Number.isInteger(x) && x >= od && x <= do_ ? x : null; }

// Iz primljenog JSON-a uzima samo poznata polja i dopuštene vrijednosti; sve ostalo odbacuje.
function provjeri(u, simboli) {
  if (!u || typeof u !== 'object') return null;
  const s = Array.isArray(u.simboli) ? u.simboli.filter((x) => typeof x === 'string' && simboli.has(x)).slice(0, 12) : [];
  if (!s.length) return null;
  const o = { v: 1, simboli: [...new Set(s)] };
  if (VRSTE.includes(u.vrsta)) o.vrsta = u.vrsta;
  if (u.mjesec && typeof u.mjesec === 'object') {
    const z = cijeli(u.mjesec.znak, 0, 11);
    if (z !== null) o.mjesec = { znak: z, mijena: MIJENE.includes(u.mjesec.mijena) ? u.mjesec.mijena : null };
  }
  const t = u.tranzit;
  if (t && PLANETI.includes(t.t) && PLANETI.includes(t.n) && ASPEKTI.includes(t.aspekt)) o.tranzit = { t: t.t, aspekt: t.aspekt, n: t.n, kuca: cijeli(t.kuca, 1, 12) };
  return o;
}

let SIMBOLI = null;
async function simboli(env, req) {
  if (SIMBOLI) return SIMBOLI;
  const r = await env.ASSETS.fetch(new URL('/app/simboli.js', req.url));
  const m = (await r.text()).match(/var RIJECI = (\[[^\]]*\]);/);
  SIMBOLI = new Set(m ? JSON.parse(m[1]) : []);
  return SIMBOLI;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/api/obrazac') {
      if (req.method !== 'POST') return new Response('', { status: 405, headers: { Allow: 'POST' } });
      if (Number(req.headers.get('content-length') || 0) > 4096) return new Response('', { status: 413 });
      let u = null; try { u = await req.json(); } catch (e) { return new Response('', { status: 400 }); }
      const o = provjeri(u, await simboli(env, req));
      if (!o) return new Response('', { status: 422 });
      await env.OBRASCI.prepare('INSERT INTO obrasci (dan, obrazac) VALUES (?, ?)').bind(new Date().toISOString().slice(0, 10), JSON.stringify(o)).run();
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    }
    return env.ASSETS.fetch(req);
  }
};
