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

## Temeljno načelo izračuna

Uvijek polazimo od **tropskog (platonskog) natalnog izračuna**: početak zodijaka je proljetna ravnodnevica, trenutak kad Sunce
prelazi nebeski ekvator (0° Ovna). Datum se pomiče (19.–21. ožujka), ali je točka uvijek ista. Sve ostalo gradi se na tome:
kuće po Placidusu, tranziti i ciklusi, a i kineski kalendar, čiji su solarni termini (jieqi) koraci od 15° iste tropske Sunčeve
dužine (Lichun 315°, Chunfen 0°). Sideričke veličine (npr. 28 lunarnih kuća) samo se preračunavaju i prikazuju uz tropski temelj.

**Pet elemenata:** vatra, zemlja, zrak, voda i **eter** (Platonov dodekaedar, cjelina neba; vedska akaša). Most sustava: vedski
nositelji (Parašara): vatra Sunce i Mars, zemlja Merkur, voda Mjesec i Venera, zrak Saturn, eter Jupiter; kineskih pet elemenata
preko planeta (drvo Jupiter, vatra Mars, zemlja Saturn, metal Venera, voda Merkur).

## Majstorski horoskop: sustavi po prioritetu

**Brojčani kostur koji sve povezuje:** nije dovoljno da je sustav tropski; sustavi i obrasci spajaju se po zajedničkoj brojčanoj
simbolici, a sustav ima to veći prioritet što više tog kostura dijeli:
- **12 + 1**: dvanaest oko jednog središta (12 znakova i 12 kuća oko Sunca i čovjeka; 12 ploha Platonova dodekaedra i cjelina neba;
  12 kineskih životinja i godina koja ih nosi; 13. lunacija u godini);
- **5 elemenata**: vatra, zemlja, zrak, voda i eter (zapad), pet kineskih elemenata, pet vedskih (bhute), most po planetu;
- **9 godina**: numerološka osobna godina, kinesko-japanskih devet zvijezda, i ostali devetostruki ciklusi koje nađemo.
- **Priroda, životinje i vez**: simbolika biljaka, životinja i godišnjih doba te ornamenti narodnog veza (sunce, rozeta, drvo
  života, ptica, kolovrat, pletenica) kao zapisani simboli koji se vežu uz isti simbol u svim tradicijama.

Dodajemo svaki horoskopski sustav koji pronađemo, redom: **najbliži** (računa se iz istog neba i iste tropske točke ili se točno
preračunava) i **najpouzdaniji** (stari, provjerljivi izvori). Svaki novi sloj spaja se s ostalima preko preklapanja (planeti,
elementi, ciklusi), a Rade iz knjiga gradi obrasce za njega.

| # | Sustav | Blizina | Pouzdanost | Stanje |
|---|---|---|---|---|
| 1 | Zapadni tropski (Placidus), tranziti, povratci, profekcije | temelj | antika do danas | **gotovo** |
| 2 | Pitagorejska numerologija | isti datum | antička tradicija | **gotovo** |
| 3 | Kineski: četiri stupa, pet elemenata, devet zvijezda | ista tropska Sunčeva dužina | klasični izvori | **gotovo** |
| 4 | Pet elemenata s eterom (Platon, vedska akaša) | most sustava | Timej, Parašara | **gotovo** |
| 5 | Helenistički slojevi: dekani (36 lica), Točka sreće i druge točke, sekta (dan/noć), firdarija, zodijakalno otpuštanje | isti tropski zodijak | Valens, Ptolemej, Abu Ma'šar | sljedeće |
| 6 | Vedski (džjotiš): 27 nakšatri, vimšotari daše (120 g.), varge | siderički, točno preračunavanje (ajanamša) | Parašara, Varahamihira | zatim |
| 7 | Kineski dodatno: Zi Wei Dou Shu (12 palača ↔ kuće), 28 lunarnih kuća (xiu) | lunarni / siderički | klasični izvori | zatim |
| 8 | Arapske lunarne kuće (28 manazil) i arapske točke | tropski / siderički | Abu Ma'šar, Al-Biruni | zatim |
| 9 | Majanski tzolk'in (260 dana) i dugo brojanje | kalendarski, korelacija GMT | natpisi, kodeksi | zatim |
| — | Moderni „keltski”, „slavenski” i slični horoskopi bez starih izvora | — | novijeg postanka | samo kao simbolika, jasno označeno |

## Mreža simbola (obavezno)

Sve tradicije povezuju se preko zajedničkih simbola. Agent čitač iz svake knjige izvlači obrasce; `~/Kosmogram/biblioteka/mreza_simbola.py`
u njima prepoznaje simbole, planete i znakove (hr/en/de/ru) i za svaki simbol bilježi u kojim se tradicijama javlja, s kojim značenjima
i koji ga simboli prate. Mreža se obnavlja nakon svakog čitanja i hrani duboko čitanje: simbol iz korisnikova dnevnika tumači se kroz
njegovu kartu i kroz sve tradicije u kojima se javlja (npr. zmija: gnoza, Veles, Kundalini, Jungov uroboros, Saturn u Škorpionu).
Gnosticizam i astralna tema su srodne teme (uspon duše kroz sfere).

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
