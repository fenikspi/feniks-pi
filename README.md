# Feniks π · Prirodna Inteligencija

Natalna karta, numerologija, **Dnevnik simbolizma i sinkroniciteta** te dnevne, mjesečne i godišnje preporuke
utemeljene na starim knjigama, kao pomoć da pronađeš svoj životni put i hodaš njime.

**Besplatno, bez reklama, bez praćenja.** Podaci ostaju na tvom uređaju.

- Web-aplikacija: <https://fenikspi.com/app/> (radi i bez interneta; na mobitelu „Dodaj na početni zaslon”)
- Stranica: <https://fenikspi.com>
- Pravila privatnosti: <https://fenikspi.com/privatnost> · Uvjeti korištenja: <https://fenikspi.com/uvjeti>

## Što je u repozitoriju

| Mapa | Sadržaj |
|---|---|
| `stranica/public/` | stranica fenikspi.com i web-aplikacija (`app/`): profil, dnevnik, nebo trenutka, prijedlozi |
| `ui/`, `main.js`, `preload.js` | aplikacija za računalo (Electron) sa živom pozadinom radne površine |
| `assets/` | znak, ikone, fotografije planeta (NASA, javno dobro) |
| `alati/` | izvoz slika, generator kamenih blokova i feniksa |
| `plan-platforme.md` | plan razvoja |

## Pokretanje

Web-aplikacija je obična statična stranica:

```sh
cd stranica/public && python3 -m http.server 8790
# otvori http://127.0.0.1:8790/app/
```

Objava na Cloudflare: `cd stranica && npx wrangler deploy`.

## Privatnost po dizajnu

Sve se računa na uređaju: položaji planeta (astronomy-engine), kuće po Placidusu s povijesnim vremenskim zonama,
tranziti, mijene, Sunčev i Mjesečev povratak, profekcije i pomrčine. Dnevnik se sprema u IndexedDB preglednika.
Simbolička mašina čitanja razvija se centralno i do korisnika stiže kao paket znanja, a podaci korisnika ne putuju do nje.

## Računi i usklađivanje (neobavezno)

Aplikacija radi bez računa. Tko želi iste podatke na više uređaja, otvori račun korisničkim imenom i lozinkom: svi se podaci
šifriraju **na uređaju** (PBKDF2 → HKDF → AES-256-GCM), poslužitelj dobiva samo šifrirani paket i nikad ne vidi lozinku,
ključ ni sadržaj. Korisničko ime čuva se samo kao HMAC; nema e-adrese ni telefona. Zaboravljena lozinka vraća se jedino
ključem za oporavak koji se prikaže jednom. Račun se može obrisati u aplikaciji (briše se sve).

## Dublje čitanje

Uz čitanje po pravilima moguće je zatražiti dublje čitanje koje piše Claude (Anthropic). Šalje se samo apstraktna karta
(znakovi, kuće, aspekti) i tekst čitanja po pravilima, bez imena, datuma i mjesta; ništa se ne sprema osim dnevnog brojača.

## Razvoj i testovi

```sh
cd stranica && npm install && npm test      # testovi poslužitelja (bez interneta, bez Claude API-ja)
```

Sigurnosna zaglavlja za statične datoteke su u `stranica/public/_headers`; pravila poslužitelja u `stranica/src/`.

## Licenca

Feniks π je slobodan softver pod licencom **GNU GPL-3.0** (vidi `LICENSE`): smiješ ga koristiti, proučavati, mijenjati i dijeliti,
ali svaka izmijenjena inačica koju dijeliš mora ostati slobodna i otvorena pod istom licencom.

## Zasluge

- [astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT), © Don Cross
- Linije i zvijezde zviježđa: [d3-celestial](https://github.com/ofrohn/d3-celestial) (BSD-3), © Olaf Frohn
- Putanje asteroida: JPL Horizons (NASA)
- Gradovi svijeta s koordinatama i vremenskim zonama: [GeoNames](https://www.geonames.org) (CC BY 4.0)
- Fotografije planeta: NASA, javno dobro (popis u `assets/planeti/zasluge.json`)
- Fontovi: Pinyon Script, Marcellus, Alegreya Sans, Noto Sans Glagolitic, Cormorant Garamond (SIL Open Font License)
- Feniks generiran lokalno modelom DreamShaper 8 (CreativeML OpenRAIL-M); gravura feniksa: British Museum, javno dobro

---

*English:* Feniks π is a free, ad-free, tracking-free astrology, numerology and symbol/synchronicity journal.
All calculations and personal data stay on the user's device.
