/**
 * STEP BUDUĆNOSTI — ples, step i pokret kao tehnologija.
 *
 * Tema je pokret: sport, ozljede, snimanje pokreta i pozornica. Sve tvrdnje
 * su o postupku i pravilima (natjecanja, ocjenjivanje, mjerenje), a ne o
 * rekordima koje ne možemo provjeriti.
 */
export default {
  sources: [
    { id: 'wdsf', name: 'World DanceSport Federation', url: 'https://www.worlddancesport.org/', what: { hr: 'Svjetska federacija za plesni sport: pravila, kategorije i kalendar.', en: 'The world federation for DanceSport: rules, categories and calendar.' } },
    { id: 'olympics', name: 'Olympics.com', url: 'https://www.olympics.com/', what: { hr: 'Službeni program i rezultati Olimpijskih igara, uključujući breaking 2024.', en: 'The official Olympic programme and results, including breaking in 2024.' } },
    { id: 'iadms', name: 'IADMS', url: 'https://www.iadms.org/', what: { hr: 'Međunarodno udruženje za medicinu plesa: prevencija i obrazovanje.', en: 'International Association for Dance Medicine & Science: prevention and education.' } },
    { id: 'nature', name: 'Nature', url: 'https://www.nature.com/', what: { hr: 'Istraživanja o pokretu, biomehanici i snimanju kretanja.', en: 'Research on movement, biomechanics and motion capture.' } },
    { id: 'nist', name: 'NIST', url: 'https://www.nist.gov/', what: { hr: 'Mjeriteljski standardi koji stoje iza svakog mjerenja pokreta.', en: 'Measurement standards behind every movement measurement.' } },
  ],
  glossary: [
    { t: { hr: 'Step', en: 'Step' }, d: { hr: 'Plesni obrazac koji se sastoji od udaraca stopalom i ritmičkih prijelaza; u sportskom obliku ocjenjuje se tehnika i sinkronizacija.', en: 'A dance pattern built from foot strikes and rhythmic transitions; in its competitive form, technique and synchronisation are judged.' } },
    { t: { hr: 'Plesni sport', en: 'DanceSport' }, d: { hr: 'Natjecateljski ples pod pravilima svjetske federacije, s kategorijama i ocjenjivačkim panelima.', en: 'Competitive dance under world-federation rules, with categories and judging panels.' } },
    { t: { hr: 'Breaking', en: 'Breaking' }, d: { hr: 'Plesna forma koja je bila u programu Olimpijskih igara u Parizu 2024.', en: 'A dance form that was on the Olympic programme in Paris 2024.' } },
    { t: { hr: 'Snimanje pokreta (mocap)', en: 'Motion capture' }, d: { hr: 'Bilježenje položaja tijela u prostoru pomoću markera ili kamera bez markera.', en: 'Recording body positions in space using markers or markerless cameras.' } },
    { t: { hr: 'Biomehanika', en: 'Biomechanics' }, d: { hr: 'Mjerenje sila i kutova u pokretu; objašnjava zašto ista koreografija različito opterećuje tijelo.', en: 'Measuring forces and angles in movement; it explains why the same choreography loads bodies differently.' } },
    { t: { hr: 'Opterećenje', en: 'Load' }, d: { hr: 'Ukupna količina rada u vremenu; najčešći uzrok ozljede je skok opterećenja, ne pojedini pokret.', en: 'Total work over time; injury usually follows a jump in load, not a single movement.' } },
    { t: { hr: 'Zagrijavanje', en: 'Warm-up' }, d: { hr: 'Priprema koja podiže temperaturu i aktivira pokretne obrasce prije zahtjevnog dijela.', en: 'Preparation that raises temperature and activates movement patterns before the demanding part.' } },
    { t: { hr: 'Sinkronizacija', en: 'Synchronisation' }, d: { hr: 'Podudarnost pokreta u skupini; mjeri se vremenskom razlikom, ne dojmom.', en: 'How closely a group’s movements match; it is measured as timing difference, not impression.' } },
    { t: { hr: 'Propriocepcija', en: 'Proprioception' }, d: { hr: 'Osjet položaja tijela; trenira se i poboljšava ravnotežu.', en: 'The sense of body position; it can be trained and improves balance.' } },
    { t: { hr: 'RAS (return to sport)', en: 'Return to sport' }, d: { hr: 'Planiran povratak nakon ozljede, s kriterijima, a ne s datumom.', en: 'A planned return after injury, with criteria rather than a date.' } },
  ],
  pages: {
    '': {
      nav: { hr: 'Početna', en: 'Home' },
      title: { hr: 'STEP BUDUĆNOSTI — ples, pokret i tehnologija', en: 'STEP BUDUĆNOSTI — dance, movement and technology' },
      kicker: { hr: 'Neovisno izdanje · GNK ASG mreža', en: 'Independent edition · GNK ASG network' },
      lead: {
        hr: 'Ples je najstarija tehnologija pokreta i najmlađi olimpijski sport. Ovaj desk prati oboje: kako se pokret mjeri, kako se ocjenjuje, gdje nastaju ozljede i što pozornica traži od tijela.',
        en: 'Dance is the oldest movement technology and the youngest Olympic sport. This desk follows both: how movement is measured, how it is judged, where injuries happen and what the stage demands of a body.',
      },
      sections: [
        {
          h: { hr: 'Pokret je mjerljiv', en: 'Movement is measurable' },
          p: {
            hr: [
              'Kad plesač skoči, tijelo proizvodi sile koje se mogu izmjeriti. Kad skupina pleše isto, razlika u vremenu može se izraziti u stotinkama. To ne umanjuje umjetnost — objašnjava zašto je neka izvedba sigurnija od druge.',
              'Zato ovdje nema „osjećaja“ bez podatka: ako tvrdimo da je nešto bolje ili rizičnije, navodimo što je mjereno i kako.',
            ],
            en: [
              'When a dancer jumps, the body produces forces that can be measured. When a group dances the same phrase, the timing difference can be expressed in hundredths. This does not diminish art — it explains why one performance is safer than another.',
              'So there is no “feel” without data here: if we say something is better or riskier, we state what was measured and how.',
            ],
          },
          list: {
            hr: ['Sport: kako se ocjenjuje i što sudi panel', 'Tehnologija: mocap, nosivi senzori i video analiza', 'Ozljede: opterećenje, zagrijavanje i povratak', 'Pozornica: svjetlo, zvuk i prostor kao dio izvedbe'],
            en: ['Sport: how it is judged and what a panel decides', 'Technology: mocap, wearables and video analysis', 'Injury: load, warm-up and return', 'Stage: light, sound and space as part of the performance'],
          },
        },
        {
          h: { hr: 'Od dvorane do Olimpijskih igara', en: 'From the studio to the Olympics' },
          p: {
            hr: [
              'Plesni sport ima saveze, kategorije i ocjenjivačke panele, a breaking je 2024. ušao u olimpijski program. To je promijenilo vidljivost, ali i pritisak: priprema postaje periodizirana, a ozljede se prate kao u svakom drugom sportu.',
              'Ista logika vrijedi i za scene koje nisu olimpijske: kad izvedba traje svaku večer, tijelo treba plan, ne inspiraciju.',
            ],
            en: [
              'DanceSport has federations, categories and judging panels, and breaking entered the Olympic programme in 2024. That changed visibility but also pressure: preparation becomes periodised and injuries are tracked like in any other sport.',
              'The same logic holds for stages that are not Olympic: when a show runs every night, the body needs a plan, not inspiration.',
            ],
          },
        },
      ],
      faq: [
        { q: { hr: 'Je li breaking olimpijski sport?', en: 'Is breaking an Olympic sport?' }, a: { hr: 'Bio je u programu Olimpijskih igara u Parizu 2024. Program se mijenja od igara do igara, pa se status provjerava u službenim dokumentima, ne po sjećanju.', en: 'It was on the programme at Paris 2024. The programme changes between Games, so status is checked in official documents, not from memory.' } },
        { q: { hr: 'Zašto je opterećenje važnije od pojedinog pokreta?', en: 'Why does load matter more than a single movement?' }, a: { hr: 'Zato što ozljeda najčešće nastaje kad se količina ili intenzitet nagle povećaju. Isti pokret koji je siguran u utorak može biti rizičan u subotu nakon tri izvedbe.', en: 'Because injury usually follows a sudden rise in volume or intensity. The same movement that is safe on Tuesday can be risky on Saturday after three shows.' } },
      ],
      images: [0, 1, 2, 3],
    },
    sport: {
      slug: 'sport',
      nav: { hr: 'Sport', en: 'Sport' },
      title: { hr: 'Ples kao sport: panel, kategorije i ocjena', en: 'Dance as sport: panel, categories and score' },
      kicker: { hr: 'Sport', en: 'Sport' },
      lead: {
        hr: 'U sportskom plesu ne pobjeđuje onaj koga publika više voli, nego onaj koga panel ocijeni po objavljenim kriterijima. Ti kriteriji nisu tajna — samo ih rijetko čitamo.',
        en: 'In competitive dance the winner is not whoever the crowd loves more, but whoever the panel scores against published criteria. Those criteria are not secret — they are just rarely read.',
      },
      sections: [
        {
          h: { hr: 'Što panel gleda', en: 'What the panel looks at' },
          p: {
            hr: ['Tehnika, muzikalnost, koreografija i izvedba čine okvir ocjene. Svaki od tih elemenata ima podkriterije, a redoslijed i težina razlikuju se po disciplini i pravilniku natjecanja.'],
            en: ['Technique, musicality, choreography and performance form the scoring frame. Each has sub-criteria, and their order and weight differ by discipline and competition rules.'],
          },
        },
        {
          h: { hr: 'Zašto rezultat izgleda čudno', en: 'Why a result can look strange' },
          p: {
            hr: ['Kad više sudaca ocjenjuje isto, ukupni rezultat je raspodjela, ne jedna brojka. Zato je korisno gledati pojedinačne ocjene, a ne samo konačni poredak — i zato se u pravilnicima navodi kako se odbacuju ekstremi.'],
            en: ['When several judges score the same performance, the result is a distribution, not one number. That is why individual marks are worth looking at, not just the final ranking — and why rules state how extremes are dropped.'],
          },
          list: {
            hr: ['Tehnika: položaji, linije, kontrola', 'Muzikalnost: odnos prema ritmu i frazi', 'Koreografija: struktura i prostor', 'Izvedba: prisutnost i dosljednost'],
            en: ['Technique: positions, lines, control', 'Musicality: relationship to rhythm and phrase', 'Choreography: structure and use of space', 'Performance: presence and consistency'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Može li publika utjecati na ocjenu?', en: 'Can the audience influence the score?' }, a: { hr: 'Ne u pravilniku. Reakcija publike nije kriterij, iako može utjecati na dojam izvedbe.', en: 'Not under the rules. Audience reaction is not a criterion, though it can affect how a performance feels.' } },
      ],
      images: [1, 4, 5],
    },
    tehnologija: {
      slug: 'tehnologija',
      nav: { hr: 'Tehnologija', en: 'Technology' },
      title: { hr: 'Snimanje pokreta: od markera do kamere bez markera', en: 'Motion capture: from markers to markerless cameras' },
      kicker: { hr: 'Tehnologija', en: 'Technology' },
      lead: {
        hr: 'Ista tehnologija koja animira filmove služi i za analizu plesa: bilježi položaj zglobova, brzinu i putanju. Razlika je u tome što plesaču treba povratna informacija, a ne samo snimka.',
        en: 'The same technology that animates films also analyses dance: it records joint positions, speed and trajectory. The difference is that a dancer needs feedback, not just footage.',
      },
      sections: [
        {
          h: { hr: 'Tri načina mjerenja', en: 'Three ways to measure' },
          p: {
            hr: [
              'Optički sustavi s markerima daju najveću preciznost, ali traže studio i pripremu. Nosivi senzori rade u dvorani i na pozornici, ali nose pogrešku integracije. Video bez markera je najdostupniji i najmanje precizan.',
              'Za trenera je najvažnije što mjerenje mijenja: ako snimka ne dovede do promjene u treningu, bila je skupa zabava.',
            ],
            en: [
              'Optical marker systems give the highest precision but need a studio and preparation. Wearables work in the studio and on stage but carry integration error. Markerless video is the most accessible and the least precise.',
              'For a coach, what matters is what the measurement changes: if footage does not change training, it was expensive entertainment.',
            ],
          },
        },
        {
          h: { hr: 'Podaci bez konteksta ne znače ništa', en: 'Data without context means nothing' },
          p: {
            hr: ['Kut koljena ili brzina rotacije nisu dobri ili loši sami po sebi. Znače tek u odnosu na prethodno stanje istog plesača i na zahtjev koreografije.'],
            en: ['A knee angle or rotation speed is neither good nor bad on its own. It means something only relative to the same dancer’s previous state and the demands of the choreography.'],
          },
          list: {
            hr: ['Optički mocap: visoka preciznost, studijski uvjeti', 'Nosivi senzori: pokretljivost, niža preciznost', 'Video bez markera: dostupnost, najviše šuma', 'Sve tri metode traže isti referentni okvir'],
            en: ['Optical mocap: high precision, studio conditions', 'Wearables: mobility, lower precision', 'Markerless video: accessibility, most noise', 'All three need the same reference frame'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Može li telefon zamijeniti studio?', en: 'Can a phone replace a studio?' }, a: { hr: 'Za grubu procjenu može; za mjerenje koje ulazi u odluku o treningu ne. Razlika je u kalibraciji i ponovljivosti.', en: 'For a rough estimate yes; for a measurement that drives a training decision, no. The difference is calibration and repeatability.' } },
      ],
      images: [2, 3, 0],
    },
    ozljede: {
      slug: 'ozljede',
      nav: { hr: 'Ozljede', en: 'Injury' },
      title: { hr: 'Ozljede u plesu: opterećenje, zagrijavanje, povratak', en: 'Dance injuries: load, warm-up, return' },
      kicker: { hr: 'Ozljede', en: 'Injury' },
      lead: {
        hr: 'Plesači nisu manje izloženi od sportaša — samo se rjeđe prijavljuju. Stopalo, gležanj, kuk i donji dio leđa najčešća su mjesta, a najčešći uzrok je nagli skok opterećenja.',
        en: 'Dancers are not less exposed than athletes — they just report less. Foot, ankle, hip and lower back are the usual sites, and the usual cause is a sudden jump in load.',
      },
      sections: [
        {
          h: { hr: 'Plan prije sezone', en: 'A plan before the season' },
          p: {
            hr: ['Periodizacija nije rezervirana za momčadske sportove. Produkcija koja traje šest tjedana svaku večer traži drugačiju pripremu od studija tri puta tjedno, a prijelaz između njih je najrizičniji dio.'],
            en: ['Periodisation is not reserved for team sports. A six-week run of nightly shows needs different preparation from studio classes three times a week, and the transition between them is the riskiest part.'],
          },
        },
        {
          h: { hr: 'Povratak s kriterijima, ne s datumom', en: 'Return with criteria, not a date' },
          p: {
            hr: ['„Vraćam se u ponedjeljak“ nije plan. Plan ima kriterije: bez boli pri opterećenju, pun opseg pokreta, stabilnost na jednoj nozi i postupno vraćanje skoka.'],
            en: ['“I’m back on Monday” is not a plan. A plan has criteria: no pain under load, full range of motion, single-leg stability and a gradual return to jumping.'],
          },
          list: {
            hr: ['Zagrijavanje koje uključuje obrazac pokreta, ne samo istezanje', 'Tjedni porast opterećenja bez skokova', 'Prijava bolova bez straha od kazne', 'Povratak po kriterijima, uz liječnika kad je potrebno'],
            en: ['A warm-up that includes the movement pattern, not just stretching', 'Weekly load progression without spikes', 'Pain reporting without fear of punishment', 'Return by criteria, with a physician where needed'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Je li istezanje prevencija?', en: 'Is stretching prevention?' }, a: { hr: 'Nije samo po sebi. Prevencija je kombinacija opterećenja, jakosti, ravnoteže i odmora; istezanje je dio, ne cijela priča.', en: 'Not by itself. Prevention combines load, strength, balance and rest; stretching is a part, not the whole story.' } },
      ],
      images: [3, 5, 1],
    },
    metodologija: {
      slug: 'metodologija',
      nav: { hr: 'Metodologija', en: 'Method' },
      title: { hr: 'Kako nastaje STEP BUDUĆNOSTI', en: 'How STEP BUDUĆNOSTI is made' },
      kicker: { hr: 'Metodologija', en: 'Method' },
      lead: { hr: 'Mjerenje prije mišljenja: svaka tvrdnja o pokretu mora imati metodu, uzorak i izvor.', en: 'Measurement before opinion: every claim about movement needs a method, a sample and a source.' },
      sections: [
        {
          h: { hr: 'Provjera', en: 'Checks' },
          p: { hr: ['Pravila čitamo iz pravilnika saveza, a ne iz medijskih tekstova. Ozljede opisujemo kroz mehanizam i opterećenje, bez dijagnoza i bez savjeta koji zamjenjuje liječnika.'], en: ['Rules are read from federation rulebooks, not media reports. Injuries are described through mechanism and load, without diagnoses or advice that replaces a physician.'] },
        },
        {
          h: { hr: 'Što ne radimo', en: 'What we do not do' },
          p: { hr: ['Ne objavljujemo snimke maloljetnika bez privole, ne prenosimo „viralne“ ozljede i ne dajemo medicinske savjete.'], en: ['We do not publish footage of minors without consent, we do not repost “viral” injuries, and we do not give medical advice.'] },
          list: {
            hr: ['Pravilnik prije medijskog teksta', 'Bez dijagnoza bez liječnika', 'Bez snimki bez privole', 'Ispravci na istom mjestu'],
            en: ['Rulebook before media report', 'No diagnosis without a physician', 'No footage without consent', 'Corrections in the same place'],
          },
        },
      ],
      faq: [{ q: { hr: 'Dajete li savjete za trening?', en: 'Do you give training advice?' }, a: { hr: 'Ne. Opisujemo principe i pokazujemo izvore; individualni plan je posao trenera i liječnika.', en: 'No. We describe principles and point to sources; an individual plan is the job of a coach and a physician.' } }],
      images: [4, 2],
    },
  },
};
