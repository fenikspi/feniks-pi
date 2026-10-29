-- Feniks π: anonimni simbolički obrasci (doprinos uz pristanak). Bez ikakve veze s korisnikom:
-- nema IP adrese, računa, imena, datuma rođenja ni teksta; samo dan primitka i apstraktni obrazac.
CREATE TABLE IF NOT EXISTS obrasci (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dan TEXT NOT NULL,          -- datum primitka (YYYY-MM-DD), bez vremena
  obrazac TEXT NOT NULL       -- JSON: simboli, vrsta zapisa, Mjesečev znak i mijena, glavni tranzit
);
CREATE INDEX IF NOT EXISTS obrasci_dan ON obrasci(dan);

-- Dnevni brojači: dublja čitanja (ključ = datum) i anonimni obrasci (ključ = 'obrazac:' + datum). Samo datum i broj, ništa o korisniku.
CREATE TABLE IF NOT EXISTS potrosnja (
  dan TEXT PRIMARY KEY,       -- YYYY-MM-DD
  broj INTEGER NOT NULL
);

-- Računi (neobavezno): korisničko ime, sol i SHA-256 sažetak provjere izvedene iz lozinke NA UREĐAJU.
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
