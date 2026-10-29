-- Feniks π: baza feniks-racuni (binding RACUNI), odvojena od anonimnih obrazaca (feniks-obrasci).

-- Računi (neobavezno), baza feniks-racuni: korisničko ime samo kao HMAC (tajni ključ RACUN_TAJNA), sol i SHA-256 sažetak provjere izvedene iz lozinke NA UREĐAJU.
-- Lozinka i ključ za šifriranje nikad ne dolaze na poslužitelj. omot = podatkovni ključ šifriran ključem iz lozinke,
-- omot_oporavka = isti ključ šifriran ključem za oporavak. Nema e-adrese ni broja mobitela.
CREATE TABLE IF NOT EXISTS racuni (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  korisnik TEXT NOT NULL UNIQUE,
  sol TEXT NOT NULL,
  provjera TEXT NOT NULL,
  provjera_oporavka TEXT NOT NULL,
  omot TEXT NOT NULL,
  omot_oporavka TEXT NOT NULL,
  stvoren TEXT NOT NULL,
  zadnja_prijava TEXT,
  neuspjeha INTEGER NOT NULL DEFAULT 0,
  zakljucan_do TEXT
);
-- Prijave: čuva se samo SHA-256 sažetak tokena i datum isteka.
CREATE TABLE IF NOT EXISTS sesije (
  token TEXT PRIMARY KEY,
  racun_id INTEGER NOT NULL,
  istjece TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sesije_racun ON sesije(racun_id);
-- Šifrirani podaci računa (AES-256-GCM na uređaju); poslužitelj vidi samo veličinu i vrijeme promjene.
CREATE TABLE IF NOT EXISTS podaci (
  racun_id INTEGER PRIMARY KEY,
  verzija INTEGER NOT NULL,
  podaci TEXT NOT NULL,
  velicina INTEGER NOT NULL,
  promijenjeno TEXT NOT NULL
);

-- Dnevni brojač novih računa (granica): samo datum i broj.
CREATE TABLE IF NOT EXISTS potrosnja (
  dan TEXT PRIMARY KEY,
  broj INTEGER NOT NULL
);
