/* Feniks π: srpski (latinica, ekavica). Ćirilica nastaje automatski iz ovih tekstova (i18n.js).
   Funkcije služe za padeže i rod (s natalnim Merkurom, s natalnom Venerom, ulazi u Vagu, retrogradna Venera).
   U reči „konjunkcija" između n i j stoji nevidljivi znak (U+200C) da ćirilica ne bi dala „коњункција". */
(function () {
  var S_KIM = { sun: 'Suncem', moon: 'Mesecom', mercury: 'Merkurom', venus: 'Venerom', mars: 'Marsom', jupiter: 'Jupiterom', saturn: 'Saturnom',
    uranus: 'Uranom', neptune: 'Neptunom', pluto: 'Plutonom', node: 'Mesečevim čvorom', asc: 'Ascendentom', mc: 'Sredinom neba' };
  var U_ZNAK = ['Ovna', 'Bika', 'Blizance', 'Raka', 'Lava', 'Devicu', 'Vagu', 'Škorpiju', 'Strelca', 'Jarca', 'Vodoliju', 'Ribe'];
  var ASPEKT_U = { konjunkcija: 'u konjunkciji', sekstil: 'u sekstilu', kvadrat: 'u kvadratu', trigon: 'u trigonu', opozicija: 'u opoziciji' };
  var ZENSKI = { venus: 1, mc: 1 }, SREDNJI = { sun: 1 };
  function pridev(p, m, z, s) { return ZENSKI[p] ? z : SREDNJI[p] ? s : m; }
  function kuca(k, t) { return k ? ' u tvojoj ' + k + '. kući (' + t('kuce')[k - 1] + ')' : ''; }

  I18n.dodaj('sr', {
    /* --- podaci --- */
    znakovi: ['Ovan', 'Bik', 'Blizanci', 'Rak', 'Lav', 'Devica', 'Vaga', 'Škorpija', 'Strelac', 'Jarac', 'Vodolija', 'Ribe'],
    znakTema: ['hrabrost i početak', 'telo, zemlja i strpljenje', 'reč, susret i radoznalost', 'dom, majka i osećanja', 'srce, igra i stvaranje',
      'red, zdravlje i služenje', 'ravnoteža i odnosi', 'dubina, preobražaj i tajna', 'smisao, put i daljine', 'oblik, trajnost i odgovornost',
      'sloboda, zajednica i novo', 'snovi, saosećanje i predanost'],
    kuce: ['ja, telo i novi počeci', 'vrednosti, sredstva i osećaj sigurnosti', 'reč, učenje, braća i sestre i bliski putevi', 'dom, koreni i porodica',
      'stvaranje, ljubav, deca i radost', 'rad, zdravlje i svakodnevni red', 'partnerstva i bliski odnosi', 'preobražaj, dubina i zajednička dobra',
      'smisao, vera, učitelji i daleki putevi', 'poziv, ugled i put u svetu', 'prijatelji, zajednica i nade', 'tišina, snovi, skriveno i predanost'],
    'planet.sun': 'Sunce', 'planet.moon': 'Mesec', 'planet.mercury': 'Merkur', 'planet.venus': 'Venera', 'planet.mars': 'Mars', 'planet.jupiter': 'Jupiter',
    'planet.saturn': 'Saturn', 'planet.uranus': 'Uran', 'planet.neptune': 'Neptun', 'planet.pluto': 'Pluton', 'planet.node': 'Mesečev čvor',
    'planet.asc': 'Ascendent', 'planet.mc': 'Sredina neba',
    'tema.sun': 'svest, volju i životnu snagu', 'tema.moon': 'osećanja, potrebe i snove', 'tema.mercury': 'misli, reči i putovanja', 'tema.venus': 'ljubav, lepotu i vrednosti',
    'tema.mars': 'odlučnost, želju i delovanje', 'tema.jupiter': 'rast, veru i darove', 'tema.saturn': 'oblik, granice i zrelost', 'tema.uranus': 'buđenje, slobodu i iznenađenja',
    'tema.neptune': 'snove, maštu i rastakanje granica', 'tema.pluto': 'duboki preobražaj i snagu',
    'mijena.mladak': 'Mlad Mesec', 'mijena.mladi': 'Mladi Mesec raste', 'mijena.prva': 'Prva četvrt', 'mijena.raste': 'Mesec raste ka punom',
    'mijena.ustap': 'Pun Mesec', 'mijena.opada': 'Mesec opada', 'mijena.zadnja': 'Poslednja četvrt', 'mijena.stari': 'Stari Mesec',
    'savjet.mladak': 'Vreme semena. Ne moraš znati kuda vodi; dovoljno je tiho imenovati jednu želju i pustiti je.',
    'savjet.mladi': 'Ono što je posejano traži malo pažnje, ne napora. Prati šta te samo od sebe privlači.',
    'savjet.prva': 'Prvi otpor na putu. Posmatraj ga bez borbe: možda pokazuje gde treba da se prepustiš, a ne da guraš.',
    'savjet.raste': 'Stvari sazrevaju. Dopusti im vreme; doteraj samo ono što se samo nudi.',
    'savjet.ustap': 'Puna svetlost pokazuje ono što je bilo skriveno. Primeti šta ti se danas otkriva u snovima i susretima.',
    'savjet.opada': 'Vreme zahvalnosti i deljenja. Ono što ti je dato, pusti dalje.',
    'savjet.zadnja': 'Vreme otpuštanja. Ono što više ne nosi tvoj put može da ode bez žaljenja.',
    'savjet.stari': 'Tišina pre novog. Odmori se, sanjaj i zapisuj; odgovori dolaze u snu.',
    'kratko.mladak': 'Seme: tiho imenuj jednu nameru i pusti je.', 'kratko.prva': 'Prvi otpor; posmatraj ga bez borbe.',
    'kratko.ustap': 'Svetlost otkriva skriveno; primeti šta ti se pokazuje.', 'kratko.zadnja': 'Otpusti ono što više ne nosi tvoj put.',
    'aspekt.konjunkcija': 'konjunkcija', 'aspekt.sekstil': 'sekstil', 'aspekt.kvadrat': 'kvadrat', 'aspekt.trigon': 'trigon', 'aspekt.opozicija': 'opozicija',
    'zrcalo.konjunkcija': 'Novi početak u tom delu tebe.', 'zrcalo.sekstil': 'Mala vrata; dovoljno je da ih primetiš.', 'zrcalo.kvadrat': 'Napetost koja traži promenu, ne borbu.',
    'zrcalo.trigon': 'Tok je lak; prepusti mu se.', 'zrcalo.opozicija': 'Svet spolja odražava ono što je u tebi.',
    'sat.sun': 'jasnoću i lice okrenuto svetu', 'sat.moon': 'osećanja, snove i porodicu', 'sat.mercury': 'reči, pisanje i dogovore', 'sat.venus': 'lepotu, ljubav i pomirenje',
    'sat.mars': 'odlučnost i telo', 'sat.jupiter': 'širinu, učenje i darežljivost', 'sat.saturn': 'red, granice i strpljenje',
    'broj.1': 'početak', 'broj.2': 'saradnju i slušanje', 'broj.3': 'izražavanje', 'broj.4': 'temelje', 'broj.5': 'promenu', 'broj.6': 'brigu i dom',
    'broj.7': 'tišinu i unutrašnji uvid', 'broj.8': 'snagu i plod rada', 'broj.9': 'završetak i otpuštanje', 'broj.11': 'nadahnuće', 'broj.22': 'gradnju velikog',
    'vrsta.san': 'San', 'vrsta.znak': 'Znak', 'vrsta.susret': 'Susret', 'vrsta.sinkronicitet': 'Sinhronicitet', 'vrsta.misao': 'Misao',

    /* --- rečenice --- */
    'tranzit.kratko': function (p, t) { return t('planet.' + p.t) + ' ' + t('aspekt.' + p.aspekt) + ' ' + pridev(p.n, 'natalni ', 'natalna ', 'natalno ') + t('planet.' + p.n) + (p.kuca ? ' (' + p.kuca + '. kuća)' : ''); },
    'danas.mjesec': '<b>{mijena}</b> · Mesec u znaku {znak} {glif}, tema dana: {tema}. {savjet}',
    'danas.karta': '<b>Na tvojoj karti:</b> {tranzit} {glif}. {zrcalo}',
    'danas.nebo': '<b>Danas na nebu:</b> {lista}.',
    'danas.osobni': '<b>Lični dan {n}:</b> dan za {tema}.',
    'danas.sat': '<b>Planetarni sat {planet} {glif}:</b> sada je dobro vreme za {savjet}.',
    'danas.sink': '<b>Sinhronicitet:</b> simbol <i>{simbol}</i> javio se {n} puta za sedam dana. Prati ga: kuda te vodi?',
    'danas.vraca': '<b>Simbol koji se vraća:</b> <i>{simbol}</i> ({n} puta ovog meseca).',
    'danas.prazno': 'Kad zapisuješ snove i znakove, ovde će se pokazivati simboli koji se vraćaju i sinhroniciteti.',
    'dog.mijena.naslov': '{mijena} u znaku {znak} {glif}',
    'dog.mijena.tekst': function (p, t) { return 'Tema: ' + t('znakTema')[p.znak] + kuca(p.kuca, t) + '. ' + t('kratko.' + p.kljuc); },
    'dog.povratak.naslov': 'Mesečev povratak',
    'dog.povratak.tekst': 'Mesec se vraća na mesto gde je bio u trenutku tvog rođenja: nov emotivni krug od četiri nedelje. Ascendent povratka u znaku {znak} boji ga temom: {tema}.',
    'dog.ulazak.naslov': function (p, t) { return t('planet.' + p.planet) + (p.retro ? ' se vraća u ' : ' ulazi u ') + U_ZNAK[p.znak] + ' ' + p.glif; },
    'dog.ulazak.tekst': function (p, t) { return 'Za ' + t('tema.' + p.planet) + ' počinje vreme teme: ' + t('znakTema')[p.znak] + '.'; },
    'dog.postaja.naslov': function (p, t) { return t('planet.' + p.planet) + (p.retro ? ' postaje ' + pridev(p.planet, 'retrogradan', 'retrogradna', 'retrogradno') : ' ponovo ide napred') + ' (' + t('znakovi')[p.znak] + ')'; },
    'dog.postaja.tekst': function (p, t) { return p.retro ? 'Vreme je da ' + t('tema.' + p.planet) + ' okreneš ka unutra: ponovo promisli, ne žuri.' : 'Ono što je sazrevalo iznutra sada sme da se pokaže.'; },
    'dog.tranzit.naslov': function (p, t) { return t('planet.' + p.planet) + ' ' + t('aspekt.' + p.aspekt) + ' ' + pridev(p.natal, 'natalni ', 'natalna ', 'natalno ') + t('planet.' + p.natal) + ' ' + p.glif; },
    'dog.tranzit.tekst': function (p, t) {
      return pridev(p.planet, 'Tranzitni ', 'Tranzitna ', 'Tranzitno ') + t('planet.' + p.planet) + ' (' + t('tema.' + p.planet) + ') ' + ASPEKT_U[p.aspekt] + ' je s ' +
        (ZENSKI[p.natal] ? 'tvojom natalnom ' : 'tvojim natalnim ') + S_KIM[p.natal] + kuca(p.kuca, t) + '. ' + t('zrcalo.' + p.aspekt);
    },
    'dog.pomrcina.mjesec': 'Pomračenje Meseca', 'dog.pomrcina.sunce': 'Pomračenje Sunca',
    'dog.pomrcina.naslov': '{ime} u znaku {znak}',
    'dog.pomrcina.tekst': function (p, t) { return 'Pomračenja otvaraju i zatvaraju poglavlja' + kuca(p.kuca, t) + '. Ne treba ništa forsirati; prati šta se samo menja u oblasti: ' + t('znakTema')[p.znak] + '.'; },
    'mj.osobni': '<b>Lični mesec {n}:</b> mesec za {tema}.',
    'mj.sjeme': function (p, t) { return '<b>Seme meseca</b> pada u znak ' + t('znakovi')[p.znak] + (p.kuca ? ', u tvoju ' + p.kuca + '. kuću: ' + t('kuce')[p.kuca - 1] : ': ' + t('znakTema')[p.znak]) + '.'; },
    'mj.vrhunac': function (p, t) { return '<b>Vrhunac meseca</b> (pun Mesec) pada u znak ' + t('znakovi')[p.znak] + (p.kuca ? ', u tvoju ' + p.kuca + '. kuću: ' + t('kuce')[p.kuca - 1] : ': ' + t('znakTema')[p.znak]) + '.'; },
    'god.sr': function (p, t) { return '<b>Solarni povratak</b> ' + p.datum + ': ascendent godine u znaku ' + t('znakovi')[p.asc] + ' ' + p.glif + ' (' + t('znakTema')[p.asc] + ')' + (p.kuca ? '; Sunce godine sija u ' + p.kuca + '. kući: ' + t('kuce')[p.kuca - 1] : '') + '.'; },
    'god.prof': function (p, t) { return '<b>Profekcija:</b> u ' + (p.dob + 1) + '. godini života (' + p.dob + ' navršenih) aktivna je tvoja ' + p.kuca + '. kuća, ' + t('kuce')[p.kuca - 1] + ', u znaku ' + t('znakovi')[p.znak] + '. <b>Gospodar godine</b> je ' + t('planet.' + p.gospodar) + ' ' + p.glif + ': prati ' + (ZENSKI[p.gospodar] ? 'njene' : 'njegove') + ' tranzite, kroz njih ti godina govori.'; },
    'god.osobna': '<b>Lična godina {n}:</b> godina za {tema}.',
    "god.kineska": "<b>Kineska godina</b> {znak} ({element}, {zivotinja}); tvoj znak rođenja je {natal}: {odnos} Devet zvezda: godina zvezde {zvijezda}, tvoja zvezda rođenja {natalZvijezda}.",
    "god.kinOdnos.isto": "godina tvoje životinje, povratak na početak dvanaestogodišnjeg kruga.",
    "god.kinOdnos.susjed": "susedni znak, godina malih pomaka.",
    "god.kinOdnos.trigon": "skladan trougao (san he), godina podrške.",
    "god.kinOdnos.kvadrat": "napet odnos, godina trenja iz kojeg raste snaga.",
    "god.kinOdnos.opozicija": "suprotni znak (čung), godina promena i preokreta; ne forsiraj.",
    'god.naslov': 'Tvoja godina: {od} – {do}',

    /* --- interfejs --- */
    'ui.opis': 'Sve što ovde upišeš ostaje samo na ovom uređaju.',
    'ui.pozdrav': 'Dobro došli', 'ui.pozdravIme': 'Zdravo, {ime}',
    'nav.pocetna': 'Početna', 'nav.preuzmi': 'Preuzmi', 'nav.privatnost': 'Privatnost', 'nav.jezik': 'Jezik',
    'tab.danas': 'Danas', 'tab.mjesec': 'Mesec', 'tab.godina': 'Godina', 'tab.dnevnik': 'Dnevnik simbolike i sinhroniciteta', 'tab.profil': 'Profil',
    'danas.naslov': 'Preporuka dana', 'danas.neboSada': 'Nebo sada',
    'mj.naslov': 'Ovaj mesec', 'mj.racunam': 'Računam nebo meseca…', 'mj.donosi': 'Šta donosi', 'mj.bezProfila': 'Upiši datum rođenja u profil za lični mesec i kuće.',
    'god.naslovPrazan': 'Tvoja godina', 'god.racunam': 'Računam tvoju godinu…', 'god.trenuci': 'Veliki trenuci godine',
    'god.trenuciOpis': 'Pomračenja, ulasci i stanice sporih planeta i njihovi tačni tranziti na tvoju kartu. Istaknut je gospodar godine.',
    'god.bezProfila': 'Za tvoju godinu (solarni povratak, profekcija, lična godina) upiši datum, vreme i mesto rođenja u profil.',
    'ui.ics': 'Dodaj u kalendar (.ics)', 'ui.nemaDog': 'Do kraja perioda nema posebnih događaja.', 'ui.ranije': 'Ranije ({n})',
    'ics.mjesec': 'mesec', 'ics.godina': 'godina',
    'dn.novi': 'Novi zapis', 'dn.sto': 'Šta se dogodilo', 'dn.dodatni': 'Dodatni simboli (odvojeni zarezom)', 'dn.dodatniPh': 'npr. ključ, sova',
    'dn.zapis': 'Zapis', 'dn.zapisPh': 'Opiši san, znak ili susret svojim rečima…', 'dn.zapisi': 'Zapiši s nebom ovog trenutka',
    'dn.vrsta.sinkronicitet': 'Sinhronicitet (smislena slučajnost)',
    'dn.vracaju': 'Simboli koji se vraćaju', 'dn.vracajuOpis': 'Poslednjih 30 dana. Istaknuti su sinhroniciteti: simbol koji se javio tri ili više puta za sedam dana.',
    'dn.zapisiNaslov': 'Zapisi', 'dn.samo': 'Samo zapisi sa simbolom', 'dn.prikaziSve': 'prikaži sve',
    'dn.prepoznati': 'Prepoznati simboli:', 'dn.spremljeno': 'Zapisano, s nebom ovog trenutka.', 'dn.nemaSimbola': 'Još nema simbola. Zapiši prvi san ili znak.',
    'dn.prazan': 'Dnevnik je prazan.', 'dn.obrisi': 'Obriši zapis', 'dn.obrisiPitanje': 'Obrisati?', 'dn.mjesecU': 'Mesec u znaku {znak}', 'dn.sat': 'sat {planet}',
    'pr.naslov': 'Tvoj profil', 'pr.opis': 'Podaci o rođenju služe za tranzite na tvoju kartu i lični dan. Ostaju samo na ovom uređaju.',
    'pr.ime': 'Ime ili nadimak', 'pr.datum': 'Datum rođenja', 'pr.vrijeme': 'Vreme rođenja (ako znaš)', 'pr.mjesto': 'Mesto rođenja',
    'pr.zivi': 'Gde živiš (za nebo i planetarne sate)', 'pr.spremi': 'Sačuvaj', 'pr.spremljeno': 'Sačuvano na ovom uređaju.',
    'pr.podaci': 'Tvoji podaci', 'pr.podaciOpis': 'Izvezi sve kao tekst za rezervnu kopiju ili obriši sve s ovog uređaja.',
    'pr.izvezi': 'Izvezi sve podatke', 'pr.izvezeno': 'Kopiraj tekst i sačuvaj ga kao rezervnu kopiju.', 'pr.brisi': 'Obriši sve podatke s ovog uređaja',
    'pr.sigurno': 'Sigurno? Klikni još jednom', 'pr.izvozAria': 'Izvezeni podaci',
    'pr.doprinosNaslov': "Doprinos biblioteci simbola", 'pr.doprinos': "Doprinesi anonimne obrasce",
    'pr.doprinosSvrha': "Anonimni obrasci služe rastu i razvoju boljih, tačnijih i preciznijih čitanja, kako bi svako lakše pronašao svoj životni put i hodao njime.",
    'pr.doprinosOpis': "Podrazumevano isključeno. Kad uključiš, posle svakog zapisa šalje se samo apstraktni obrazac (simboli, Mesečev znak i mena, glavni tranzit), bez imena, datuma, mesta i teksta. Tako Feniks uči da tumači za sve. <a href=\"/privatnost.html#5-doprinos\">Više o tome</a>",
    'glazba.pusti': 'Pusti drevnu muziku', 'glazba.zaustavi': 'Zaustavi muziku', 'glazba.gumb': '♪ muzika', 'glazba.svira': '♪ muzika svira'
  });
})();
