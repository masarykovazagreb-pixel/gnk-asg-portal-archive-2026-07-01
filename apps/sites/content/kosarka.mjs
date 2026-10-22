/**
 * KOŠARKA 360 — košarka bez šuma.
 *
 * Pravila i mjere su objavljeni podaci (FIBA i NBA), pa stoje uz izvor.
 * Nema izmišljenih statistika, nema „najbolji ikad“ tvrdnji i nema prenosa
 * glasina o transferima.
 */
export default {
  sources: [
    { id: 'nba', name: 'NBA', url: 'https://www.nba.com/', what: { hr: 'Službena pravila, raspored i statistika lige.', en: 'Official rules, schedule and league statistics.' } },
    { id: 'fiba', name: 'FIBA', url: 'https://www.fiba.basketball/', what: { hr: 'Svjetska pravila igre, kalendar natjecanja i propisi.', en: 'World rules of the game, competition calendar and regulations.' } },
    { id: 'el', name: 'EuroLeague Basketball', url: 'https://www.euroleaguebasketball.net/', what: { hr: 'Klupsko natjecanje i njegov format.', en: 'Club competition and its format.' } },
    { id: 'aba', name: 'ABA Liga', url: 'https://aba-liga.com/', what: { hr: 'Regionalna liga: klubovi iz nekoliko zemalja u jednom sustavu.', en: 'The regional league: clubs from several countries in one system.' } },
    { id: 'hks', name: 'Hrvatski košarkaški savez', url: 'https://www.hks-cbf.hr/', what: { hr: 'Nacionalni savez: ligaški sustav i registracija klubova.', en: 'The national federation: league system and club registration.' } },
  ],
  glossary: [
    { t: { hr: 'Regularna sezona', en: 'Regular season' }, d: { hr: 'Dio sezone u kojem se skupljaju pobjede i porazi prije doigravanja.', en: 'The part of the season that accumulates wins and losses before the playoffs.' } },
    { t: { hr: 'Doigravanje (playoffs)', en: 'Playoffs' }, d: { hr: 'Eliminacijski dio; serija se igra na određeni broj pobjeda.', en: 'The elimination stage; a series is played to a set number of wins.' } },
    { t: { hr: 'Play-in', en: 'Play-in' }, d: { hr: 'Dodatni krug koji odlučuje posljednje sudionike doigravanja.', en: 'An extra round deciding the last playoff places.' } },
    { t: { hr: 'Posjed (possession)', en: 'Possession' }, d: { hr: 'Jedan napad, od osvajanja lopte do šuta ili izgubljene lopte.', en: 'One attack, from gaining the ball to a shot or a turnover.' } },
    { t: { hr: 'Efikasnost šuta', en: 'Shooting efficiency' }, d: { hr: 'Koliko se poena dobije po pokušaju; bolja mjera od samog postotka.', en: 'Points per attempt; a better measure than raw percentage.' } },
    { t: { hr: 'Tempo', en: 'Pace' }, d: { hr: 'Broj posjeda u utakmici; objašnjava zašto su neke brojke veće bez bolje igre.', en: 'Possessions per game; it explains why some numbers are higher without better play.' } },
    { t: { hr: 'Napad s pet igrača izvan linije', en: 'Five-out offence' }, d: { hr: 'Postavka u kojoj svi igrači prijete šutem, pa je reket prazan.', en: 'A setup where all five players threaten the shot, leaving the paint open.' } },
    { t: { hr: 'Rotacija', en: 'Rotation' }, d: { hr: 'Popis igrača koji stvarno igraju i raspored njihovih minuta.', en: 'The list of players who actually play and how their minutes are distributed.' } },
    { t: { hr: 'Handoff', en: 'Handoff' }, d: { hr: 'Dodavanje iz ruke u ruku uz blok; najčešći obrazac suvremenog napada.', en: 'A hand-to-hand pass with a screen; the most common modern offensive pattern.' } },
    { t: { hr: 'Kucanje (dunk)', en: 'Dunk' }, d: { hr: 'Ubacivanje lopte kroz obruč odozgo; u pravilima nije poseban poen, vrijedi dva.', en: 'Putting the ball through the rim from above; no special value, it counts two.' } },
  ],
  pages: {
    '': {
      nav: { hr: 'Početna', en: 'Home' },
      title: { hr: 'KOŠARKA 360 — kako se čita sezona, liga i brojka', en: 'KOŠARKA 360 — how to read a season, a league and a number' },
      kicker: { hr: 'Neovisno izdanje · GNK ASG mreža', en: 'Independent edition · GNK ASG network' },
      lead: {
        hr: 'Košarka se prati kao rezultat, a razumije kao sustav: pravila, raspored, tempo i prostor. Ovaj desk ne prenosi glasine o transferima. Objašnjava zašto se nešto dogodilo — i pokazuje gdje se to može provjeriti.',
        en: 'Basketball is followed as a result but understood as a system: rules, schedule, pace and space. This desk does not carry transfer rumours. It explains why something happened — and shows where it can be checked.',
      },
      sections: [
        {
          h: { hr: 'Tri razine istog pitanja', en: 'Three levels of the same question' },
          p: {
            hr: [
              'Utakmicu možeš čitati kao priču, kao niz brojki ili kao sustav pravila. Prva razina je zabavna, druga je točna, treća objašnjava. Na ovom desku sve tri stoje zajedno: prije svake analize piše što je mjereno i pod kojim pravilima.',
              'To je razlika između „igrao je dobro“ i „imao je 12 poena na 8 šuteva uz dva skoka u napadu“. Prva rečenica nije provjerljiva, druga jest.',
            ],
            en: [
              'You can read a game as a story, as a set of numbers, or as a system of rules. The first is fun, the second is precise, the third explains. Here all three sit together: before any analysis we state what was measured and under which rules.',
              'That is the difference between “he played well” and “he scored 12 on 8 shots with two offensive rebounds”. The first sentence cannot be checked, the second can.',
            ],
          },
          list: {
            hr: ['Pravila: FIBA i NBA nisu isti sport po mjerama', 'Raspored: što znači 82 utakmice i zašto putovanje mijenja brojke', 'Prostor: zašto pet šutera mijenja reket', 'Brojka: što mjeri efikasnost, a što tempo'],
            en: ['Rules: FIBA and the NBA are not the same sport by measurement', 'Schedule: what 82 games mean and why travel changes numbers', 'Space: why five shooters change the paint', 'Numbers: what efficiency measures, and what pace does'],
          },
        },
        {
          h: { hr: 'Zašto regionalna liga nije mala', en: 'Why the regional league is not small' },
          p: {
            hr: [
              'ABA liga spaja klubove iz nekoliko zemalja u jedan sustav natjecanja. Za igrača to znači drukčiji ritam: manje utakmica, više putovanja autobusom, drukčija publika i drukčiji pritisak nego u ligi s bogatim televizijskim ugovorom.',
              'Zato usporedba igrača između liga bez konteksta (minute, tempo, uloga) nije usporedba. To nije stav nego metodologija.',
            ],
            en: [
              'The ABA League joins clubs from several countries into one competition. For a player that means a different rhythm: fewer games, more bus travel, a different crowd and a different pressure than in a league with a rich television deal.',
              'So comparing players across leagues without context (minutes, pace, role) is not a comparison. That is not an opinion, it is method.',
            ],
          },
        },
      ],
      faq: [
        { q: { hr: 'Zašto FIBA i NBA imaju različite mjere?', en: 'Why do FIBA and the NBA use different measurements?' }, a: { hr: 'Zato što su pravila nastala odvojeno. FIBA igra na terenu 28 × 15 metara uz liniju od 6,75 m; NBA na 28,65 × 15,24 m uz liniju od 7,24 m. Igra traje 4 × 10 minuta u FIBA-i i 4 × 12 u NBA-u.', en: 'Because the rulesets grew up separately. FIBA plays on a 28 × 15 m court with a 6.75 m line; the NBA on 28.65 × 15.24 m with a 7.24 m line. Games last 4 × 10 minutes in FIBA and 4 × 12 in the NBA.' } },
        { q: { hr: 'Je li 82 utakmice pravilo?', en: 'Is 82 games a rule?' }, a: { hr: 'To je standardni format NBA regularne sezone. Skraćene sezone postoje i tada se brojke po utakmici ne mogu uspoređivati sa sezonama od 82 utakmice bez napomene.', en: 'It is the standard NBA regular-season format. Shortened seasons exist, and per-game numbers cannot be compared with 82-game seasons without saying so.' } },
      ],
      images: [0, 1, 2, 3],
    },
    sezona: {
      slug: 'sezona',
      nav: { hr: 'Sezona', en: 'Season' },
      title: { hr: 'Kako se čita NBA sezona: raspored, umor, doigravanje', en: 'How to read an NBA season: schedule, fatigue, playoffs' },
      kicker: { hr: 'Sezona', en: 'Season' },
      lead: {
        hr: 'Sezona nije jedna tablica. To je 82 utakmice raspoređene preko sedam mjeseci, s putovanjima, pauzama i različitim motivima u svakom dijelu kalendara.',
        en: 'A season is not one table. It is 82 games spread over seven months, with travel, breaks and different motives in every part of the calendar.',
      },
      sections: [
        {
          h: { hr: 'Tablica ne mjeri isto u studenom i u ožujku', en: 'The table does not measure the same thing in November and March' },
          p: {
            hr: [
              'U prvom dijelu sezone momčadi isprobavaju postave i raspodjelu minuta; u drugom se brojke stabiliziraju, a u trećem dio momčadi svjesno odmara igrače. Zato omjer pobjeda i poraza treba čitati zajedno s kalendarom.',
              'Utakmica na drugom kraju zemlje, drugu noć zaredom, nije ista utakmica. To nije izlika nego varijabla koju ozbiljne analize uključuju.',
            ],
            en: [
              'Early on, teams test line-ups and minute distribution; in the middle the numbers settle; late in the season some teams deliberately rest players. So the win-loss record must be read with the calendar.',
              'A game across the country, on the second night of a back-to-back, is not the same game. That is not an excuse but a variable serious analysis includes.',
            ],
          },
        },
        {
          h: { hr: 'Doigravanje je drugi sport', en: 'The playoffs are a different sport' },
          p: {
            hr: ['U seriji se igra na četiri pobjede, pa se ista momčad sreće više puta i protivnik uči navike. Zato se u doigravanju smanjuje broj igrača u rotaciji, a pojedinačne utakmice postaju sporije i fizički tvrđe.'],
            en: ['A series is won by four victories, so the same teams meet repeatedly and the opponent learns habits. That is why rotations shorten in the playoffs and individual games become slower and more physical.'],
          },
          list: {
            hr: ['Serija se igra na četiri pobjede', 'Rotacija se skraćuje, minuti se povećavaju', 'Tempo pada, broj posjeda se smanjuje', 'Prednost domaćeg terena vrijedi samo u sedmoj utakmici'],
            en: ['A series is won by four wins', 'Rotations shorten, minutes rise', 'Pace falls, possessions drop', 'Home-court advantage matters fully only in game seven'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Što je play-in?', en: 'What is the play-in?' }, a: { hr: 'Dodatni krug momčadi koje su završile ispod izravnih mjesta za doigravanje; pobjednici ulaze u glavni ždrijeb. Format i broj momčadi mijenjali su se kroz sezone.', en: 'An extra round for teams that finished below the direct playoff places; the winners enter the main bracket. The format and number of teams have changed across seasons.' } },
        { q: { hr: 'Zašto se minuti igrača razlikuju od utakmice do utakmice?', en: 'Why do player minutes differ from game to game?' }, a: { hr: 'Zbog ozljeda, umora, taktičkog plana i rezultata. Prosjek minuta bez raspodjele krije upravo ono što je zanimljivo: kada igrač igra i protiv koga.', en: 'Injuries, fatigue, game plan and the score. An average minute count hides exactly what matters: when a player plays, and against whom.' } },
      ],
      images: [1, 4, 5],
    },
    europa: {
      slug: 'europa',
      nav: { hr: 'Europa', en: 'Europe' },
      title: { hr: 'Europska košarka: drukčija pravila, drukčiji ritam', en: 'European basketball: different rules, different rhythm' },
      kicker: { hr: 'Europa', en: 'Europe' },
      lead: {
        hr: 'Europska košarka nije „NBA s manje poena“. Igra se po FIBA pravilima, na manjem terenu, s kraćom utakmicom i drukčijim odnosom prema prostoru.',
        en: 'European basketball is not “the NBA with fewer points”. It is played under FIBA rules, on a smaller court, with a shorter game and a different relationship to space.',
      },
      sections: [
        {
          h: { hr: 'Mjere koje mijenjaju igru', en: 'Measurements that change the game' },
          p: {
            hr: ['Teren od 28 × 15 metara, linija od 6,75 metara i utakmica od 40 minuta stvaraju gušći prostor. Manje je vremena za izolacije, više za kretnje bez lopte i za brzu cirkulaciju.'],
            en: ['A 28 × 15 m court, a 6.75 m line and a 40-minute game create a denser space. There is less time for isolations and more for off-ball movement and quick ball circulation.'],
          },
        },
        {
          h: { hr: 'Regionalna liga kao odskočna daska', en: 'The regional league as a springboard' },
          p: {
            hr: ['ABA liga i nacionalna prvenstva nisu isto natjecanje, ali se preklapaju u kalendaru. Klub koji igra oba natjecanja ima manje vremena za trening, a više utakmica — što mijenja razvoj mladih igrača.'],
            en: ['The ABA League and national championships are not the same competition but overlap in the calendar. A club in both has less training time and more games — which changes how young players develop.'],
          },
          list: {
            hr: ['FIBA teren: 28 × 15 m', 'FIBA linija za tri: 6,75 m (6,60 m u kutovima)', 'FIBA utakmica: 4 × 10 minuta', 'ABA liga: klubovi iz više zemalja u jednom sustavu'],
            en: ['FIBA court: 28 × 15 m', 'FIBA three-point line: 6.75 m (6.60 m in the corners)', 'FIBA game: 4 × 10 minutes', 'ABA League: clubs from several countries in one system'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Igra li se u Europi po NBA pravilima?', en: 'Is European basketball played under NBA rules?' }, a: { hr: 'Ne. Europska klupska i reprezentativna natjecanja igraju se po FIBA pravilima; razlike uključuju dimenzije terena, liniju za tri poena i trajanje utakmice.', en: 'No. European club and national-team competitions are played under FIBA rules; differences include court dimensions, the three-point line and game length.' } },
      ],
      images: [2, 3, 0],
    },
    brojke: {
      slug: 'brojke',
      nav: { hr: 'Brojke', en: 'Numbers' },
      title: { hr: 'Koje brojke u košarci stvarno nešto mjere', en: 'Which basketball numbers actually measure something' },
      kicker: { hr: 'Brojke', en: 'Numbers' },
      lead: {
        hr: 'Postotak šuta bez broja pokušaja ne znači ništa. Poeni bez posjeda također. Brojka ima smisla samo kad znaš nazivnik.',
        en: 'A shooting percentage without attempts means nothing. Points without possessions, the same. A number only makes sense when you know its denominator.',
      },
      sections: [
        {
          h: { hr: 'Nazivnik je sve', en: 'The denominator is everything' },
          p: {
            hr: [
              'Dva igrača s istim brojem poena nisu ista stvar ako je jedan šutirao 20 puta, a drugi 9. Zato se efikasnost mjeri po pokušaju, a momčadska uspješnost po posjedu.',
              'Tempo objašnjava zašto momčad s više poena nije nužno bolja: brža igra daje više posjeda, a time i više poena — i protivniku.',
            ],
            en: [
              'Two players with the same points are not the same if one took 20 shots and the other 9. That is why efficiency is measured per attempt, and team performance per possession.',
              'Pace explains why a higher-scoring team is not necessarily better: a faster game gives more possessions, and therefore more points — for the opponent too.',
            ],
          },
        },
        {
          h: { hr: 'Što se ne mjeri', en: 'What does not get measured' },
          p: {
            hr: ['Prostor koji igrač stvara bez lopte, kvaliteta blokade i pravovremenost dodavanja ne ulaze u osnovnu statistiku. Zato su snimke i dalje važnije od tablice — tablica je početak, ne kraj.'],
            en: ['The space a player creates without the ball, screen quality and the timing of a pass do not appear in the box score. That is why film still matters more than the table — the table is the start, not the end.'],
          },
          list: {
            hr: ['Poeni po pokušaju šuta', 'Poeni po posjedu (ofenzivna efikasnost)', 'Broj posjeda (tempo)', 'Postotak slobodnih bacanja uz broj iznuđenih prekršaja'],
            en: ['Points per shot attempt', 'Points per possession (offensive efficiency)', 'Possessions (pace)', 'Free-throw percentage alongside fouls drawn'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Zašto se usporedbe između liga ne mogu raditi bez konteksta?', en: 'Why can’t leagues be compared without context?' }, a: { hr: 'Zato što se razlikuju tempo, trajanje utakmice, pravila i uloga igrača. Ista brojka u dvije lige može značiti dvije različite stvari.', en: 'Because pace, game length, rules and player role differ. The same number in two leagues can mean two different things.' } },
      ],
      images: [4, 5, 1],
    },
    metodologija: {
      slug: 'metodologija',
      nav: { hr: 'Metodologija', en: 'Method' },
      title: { hr: 'Kako nastaje KOŠARKA 360', en: 'How KOŠARKA 360 is made' },
      kicker: { hr: 'Metodologija', en: 'Method' },
      lead: {
        hr: 'Bez glasina o transferima, bez „najbolji ikad“ i bez brojke koja nema izvor i razdoblje na koje se odnosi.',
        en: 'No transfer rumours, no “greatest ever”, and no number without a source and the period it covers.',
      },
      sections: [
        {
          h: { hr: 'Tri provjere prije objave', en: 'Three checks before publishing' },
          p: {
            hr: ['Prvo: je li brojka iz službene statistike ili iz interpretacije. Drugo: pokriva li razdoblje koje tvrdnja spominje. Treće: bi li se tvrdnja raspala ako se promijeni jedna utakmica. Ako bi, nije zaključak nego dojam.'],
            en: ['First: is the number from official statistics or from an interpretation. Second: does it cover the period the claim mentions. Third: would the claim collapse if one game changed. If so, it is an impression, not a conclusion.'],
          },
        },
        {
          h: { hr: 'Što ne radimo', en: 'What we do not do' },
          p: {
            hr: ['Ne objavljujemo neslužbene informacije o transferima, ne prenosimo tvrdnje navijačkih računa i ne uspoređujemo igrače iz različitih razdoblja bez napomene o pravilima i tempu.'],
            en: ['We do not publish unofficial transfer information, we do not repeat claims from fan accounts, and we do not compare players from different eras without noting rules and pace.'],
          },
          list: {
            hr: ['Službena statistika prije svega', 'Razdoblje uvijek navedeno', 'Usporedbe samo uz kontekst', 'Ispravci na istom mjestu'],
            en: ['Official statistics first', 'The period always stated', 'Comparisons only with context', 'Corrections in the same place'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Objavljujete li prognoze utakmica?', en: 'Do you publish game predictions?' }, a: { hr: 'Ne. Prognoza nije provjerljiva. Objavljujemo ono što se može provjeriti prije i poslije utakmice.', en: 'No. A prediction is not checkable. We publish what can be checked before and after a game.' } },
      ],
      images: [5, 0],
    },
  },
};
