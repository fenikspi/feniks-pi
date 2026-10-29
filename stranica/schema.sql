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
