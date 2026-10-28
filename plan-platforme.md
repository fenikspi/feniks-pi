# Feniks π: plan platforme

Napisano 28. 10. 2026. Načela: besplatno, bez reklama, bez praćenja; podaci korisnika zadano samo na uređaju;
šifrirano usklađivanje i doprinos simboličkoj knjižnici samo uz izbor korisnika.

## Ključna ideja: mašina putuje do korisnika, podaci ne putuju do mašine

Simbolička mašina čitanja (obrasci iz knjiga, pravila tumačenja, citati) razvija se stalno, kod nas:
agent čitač (`~/Kosmogram/agent/citac.py`) čita knjige → `obrasci.db` → anonimni doprinosi korisnika (uz pristanak).

Iz toga se svaki dan izvozi **paket znanja**: verzionirana, potpisana JSON datoteka na
`feniksPi.com/znanje/` (npr. `znanje-2026.10.28.json` + potpis). Aplikacija ga sama preuzme, provjeri potpis
i čitanja slaže **na uređaju**: karta + tranziti + dnevnik simbolizma i sinkroniciteta korisnika + paket znanja → čitanje.
Mašina tako raste za sve korisnike, a ni jedan osobni podatak ne izlazi s uređaja.

Ako želimo tekst koji piše jezični model:
- računalo: lokalni model (Ollama), potpuno privatno;
- mobitel i web: korisnik može uključiti „ljepši tekst”; poslužitelju se šalje samo apstraktni obrazac
  (npr. „Saturn u 4. kući · Mjesec u Raku · simboli: voda, kuća”), bez imena, datuma, mjesta i teksta dnevnika.

## Svrha dnevnika

Dnevnik simbolizma i sinkroniciteta nije sam sebi svrha: on hrani **bolja čitanja** i **dnevne preporuke**,
kako bi korisnik pronašao svoj životni put i hodao njime, **kao odraz prepuštanja**. Preporuke ne naređuju,
nego zrcale: pokazuju što se u znakovima i u nebu ponavlja i kamo vodi tok, a korisnik bira hoće li mu se prepustiti.

## Dijelovi

| Dio | Što radi | Gdje se računa |
|---|---|---|
| Jezgra | natalna karta, tranziti, numerologija (postojeći `core.js`) | uređaj |
| Dnevnik simbolizma i sinkroniciteta | zapisi snova, susreta, znakova i smislenih slučajnosti; svaki zapis automatski pamti nebo trenutka (položaji planeta, Mjesečeva mijena, planetarni sat, tranziti na kartu); prepoznavanje simbola; praćenje ponavljanja i nakupina (isti simbol više puta u kratkom razdoblju = sinkronicitet); veza s čitanjima | uređaj (IndexedDB) |
| Prijedlozi **dnevni** | Mjesečeva mijena i znak, tranziti na kartu, planetarni sati, osobni dan, simbol dana iz dnevnika | uređaj |
| Prijedlozi **mjesečni** | Mjesečev povratak, mlađak i uštap u kućama, osobni mjesec, ponavljajući simboli mjeseca | uređaj |
| Prijedlozi **godišnji** | Sunčev povratak, profekcija, osobna godina, veliki tranziti (Saturn, Jupiter, čvorovi) | uređaj |
| Paket znanja | obrasci simbolike i citati iz knjiga, svaki dan nova inačica | poslužitelj → uređaj |
| Računi | korisničko ime + lozinka ili ključ za prijavu (passkey); bez e-adrese i mobitela | Cloudflare Worker + D1 |
| Usklađivanje | šifrirano na uređaju (AES-256-GCM), poslužitelj čuva samo šifrirane zapise | Cloudflare R2/D1 |
| Doprinos obrazaca | anonimni obrasci, bez veze s računom (pristanak, zadano isključen) | Cloudflare D1 → `obrasci.db` |

## Kalendar i e-pošta, prema korisnikovom pružatelju

Korisnik u postavkama bira **izvor** i **što** se šalje (dnevno / mjesečno / godišnje, samo naslov ili cijeli tekst).

**Kalendar**
1. *Dodaj u kalendar* (.ics): radi sa svakim kalendarom (Google, Outlook, Apple, Thunderbird), ništa ne prolazi kroz nas.
2. *Izravno povezivanje* s uređaja: Google Calendar, Microsoft Outlook (Graph), CalDAV (Apple iCloud, Nextcloud, Proton…).
   Aplikacija sama upisuje događaje (mijene, povratke, važne tranzite, podsjetnike za dnevnik); pristupni ključ ostaje na uređaju.

**E-pošta**
1. *Samo podsjetnik*: „Tvoje dnevno čitanje je spremno”, bez sadržaja. Poslužitelj zna samo e-adresu i vrijeme slanja.
2. *Cijelo čitanje e-poštom*: samo na izričit izbor; tada tekst nužno prolazi kroz poslužitelj za slanje
   (ne sprema se), što je jasno napisano u postavci i Pravilima privatnosti.
3. *Iz vlastitog sandučića*: na računalu aplikacija može slati preko korisnikovog vlastitog računa (Gmail, Outlook, SMTP),
   bez našeg poslužitelja.

**Obavijesti** na uređaju (lokalne obavijesti) rade uvijek, bez ikakvog poslužitelja.

## Jedan kod za sve uređaje

Web-aplikacija (PWA, radi bez interneta) je osnova. Isti kod pakira se u:
- **Electron**: Linux (AppImage, .deb), Windows (.exe, gradi se i s Linuxa), macOS (.dmg, treba Mac ili GitHub Actions);
- **Android**: Capacitor → .apk na GitHubu i na F-Droidu (bez Googleovih usluga; obavijesti lokalne ili UnifiedPush);
- **iPhone/iPad**: web-aplikacija („Dodaj na početni zaslon”), bez App Storea i bez naknade.

## Redoslijed izrade

1. **Web-aplikacija i dnevnik simbolizma i sinkroniciteta**: profili, karta, dnevnik, lokalna pohrana, rad bez interneta.
2. **Dnevni, mjesečni i godišnji prijedlozi** s paketom znanja (prvi izvoz iz `obrasci.db`) i lokalnim obavijestima.
3. **Kalendar**: .ics, zatim izravno Google, Outlook i CalDAV.
4. **Računi i šifrirano usklađivanje** (lozinka, passkey, ključ za oporavak).
5. **E-pošta**: podsjetnik, zatim puno čitanje uz izbor.
6. **Paketi za preuzimanje**: Linux, Windows, Android/F-Droid, macOS; GitHub repozitorij s izvornim kodom.
7. **Doprinos obrazaca** i dnevno objavljivanje paketa znanja.

## Što treba od vlasnika projekta

- e-adresa za kontakt (Pravila privatnosti i Uvjeti korištenja);
- GitHub račun (za izvorni kod, preuzimanja, F-Droid i gradnju za macOS); git: `sudo apt install git`;
- za izravni Google/Outlook kalendar: registracija aplikacije kod Googlea i Microsofta (besplatno, prijava vlasnika);
- za slanje e-pošte: odabir usluge za slanje (cijena i besplatna kvota provjeriti pri odabiru).
