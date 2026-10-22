/**
 * ZDRAVLJE 360 — javno zdravlje bez čuda.
 *
 * Desk opisuje prevenciju, san, kretanje i čitanje studija. Ne daje
 * dijagnoze, ne propisuje terapiju i ne obećava produženje života. Brojke
 * su iz objavljenih smjernica (WHO, CDC, NHS) i uvijek stoje uz izvor.
 */
export default {
  sources: [
    { id: 'who', name: 'World Health Organization', url: 'https://www.who.int/', what: { hr: 'Smjernice o tjelesnoj aktivnosti, prehrani i prevenciji.', en: 'Guidelines on physical activity, nutrition and prevention.' } },
    { id: 'cdc', name: 'CDC', url: 'https://www.cdc.gov/', what: { hr: 'Javnozdravstveni podaci i preporuke za odrasle i djecu.', en: 'Public-health data and recommendations for adults and children.' } },
    { id: 'nih', name: 'NIH', url: 'https://www.nih.gov/', what: { hr: 'Istraživanja i objašnjenja medicinskih studija.', en: 'Research and plain-language explanations of medical studies.' } },
    { id: 'nhs', name: 'NHS', url: 'https://www.nhs.uk/', what: { hr: 'Praktične smjernice za pacijente, uredno datirane.', en: 'Practical patient guidance, clearly dated.' } },
    { id: 'cochrane', name: 'Cochrane', url: 'https://www.cochranelibrary.com/', what: { hr: 'Sustavni pregledi koji sažimaju više studija o istoj temi.', en: 'Systematic reviews that summarise multiple studies on one question.' } },
  ],
  glossary: [
    { t: { hr: 'Prevencija', en: 'Prevention' }, d: { hr: 'Mjere koje smanjuju rizik od bolesti prije nego se pojavi.', en: 'Measures that lower disease risk before it appears.' } },
    { t: { hr: 'Probir (screening)', en: 'Screening' }, d: { hr: 'Testiranje ljudi bez simptoma radi ranog otkrivanja; korisno samo kad rano otkrivanje mijenja ishod.', en: 'Testing people without symptoms for early detection; useful only when early detection changes the outcome.' } },
    { t: { hr: 'Relativni rizik', en: 'Relative risk' }, d: { hr: 'Koliko se rizik mijenja u odnosu na osnovni; bez osnovnog rizika brojka zavarava.', en: 'How risk changes against the baseline; without the baseline the figure misleads.' } },
    { t: { hr: 'Apsolutni rizik', en: 'Absolute risk' }, d: { hr: 'Koliko se ljudi od sto stvarno pogodi; najkorisnija brojka u razgovoru o koristi.', en: 'How many people in a hundred are actually affected; the most useful figure in a benefit conversation.' } },
    { t: { hr: 'Placebo', en: 'Placebo' }, d: { hr: 'Kontrolna intervencija bez aktivne tvari; služi da se razlikuje učinak od očekivanja.', en: 'A control intervention without active ingredient; it separates effect from expectation.' } },
    { t: { hr: 'Randomizacija', en: 'Randomisation' }, d: { hr: 'Slučajna raspodjela u skupine; smanjuje pristranost pri odabiru.', en: 'Random allocation to groups; it reduces selection bias.' } },
    { t: { hr: 'Smjernica', en: 'Guideline' }, d: { hr: 'Preporuka utemeljena na pregledu dokaza, s razinom pouzdanosti.', en: 'A recommendation based on a review of evidence, with a certainty level.' } },
    { t: { hr: 'Komorbiditet', en: 'Comorbidity' }, d: { hr: 'Druga bolest koja postoji uz glavnu i mijenja rizik i liječenje.', en: 'Another condition present alongside the main one, changing risk and treatment.' } },
    { t: { hr: 'Zdravstvena pismenost', en: 'Health literacy' }, d: { hr: 'Sposobnost pronaći, razumjeti i primijeniti zdravstvenu informaciju.', en: 'The ability to find, understand and apply health information.' } },
    { t: { hr: 'Broj potrebnih liječenja (NNT)', en: 'Number needed to treat' }, d: { hr: 'Koliko ljudi treba primiti intervenciju da jedan ima korist.', en: 'How many people must receive an intervention for one to benefit.' } },
  ],
  pages: {
    '': {
      nav: { hr: 'Početna', en: 'Home' },
      title: { hr: 'ZDRAVLJE 360 — prevencija, san i kako se čita studija', en: 'ZDRAVLJE 360 — prevention, sleep and how to read a study' },
      kicker: { hr: 'Neovisno izdanje · GNK ASG mreža', en: 'Independent edition · GNK ASG network' },
      lead: {
        hr: 'Zdravlje se prodaje u tabletama i obećanjima, a najveći dio ishoda određuju dosadne stvari: kretanje, san, prehrana, cijepljenje i redovita provjera. Ovaj desk piše o njima — bez čuda i bez dijagnoza.',
        en: 'Health is sold in pills and promises, while most outcomes are shaped by boring things: movement, sleep, food, vaccination and regular checks. This desk writes about those — without miracles and without diagnoses.',
      },
      sections: [
        {
          h: { hr: 'Što stvarno mijenja ishod', en: 'What actually changes the outcome' },
          p: {
            hr: [
              'Smjernice se ne mijenjaju zato što je netko objavio viralni post. Mijenjaju se kad se pregledom više studija pokaže da korist nadmašuje rizik. Zato je pitanje „prema kojoj smjernici“ važnije od pitanja „je li zdravo“.',
              'Ovaj desk ne odgovara na pitanje „što ja trebam“ — na to odgovara liječnik koji zna povijest bolesti. Odgovara na pitanje „što dokazi kažu o populaciji“ i pokazuje gdje se to može provjeriti.',
            ],
            en: [
              'Guidelines do not change because someone posted something viral. They change when a review of several studies shows benefit outweighs risk. That is why “according to which guideline” matters more than “is it healthy”.',
              'This desk does not answer “what should I do” — that is for a physician who knows the history. It answers “what does the evidence say about a population” and shows where to check it.',
            ],
          },
          list: {
            hr: ['Prevencija: što se doista preventivno pokazalo', 'San: koliko i zašto, bez tableta za spavanje', 'Kretanje: smjernice izražene u minutama', 'Studije: relativni i apsolutni rizik na istom mjestu'],
            en: ['Prevention: what has actually been shown to prevent', 'Sleep: how much and why, without sleeping pills', 'Movement: guidelines expressed in minutes', 'Studies: relative and absolute risk side by side'],
          },
        },
        {
          h: { hr: 'Granica ovog deska', en: 'The limit of this desk' },
          p: {
            hr: [
              'Ništa na ovoj stranici nije medicinski savjet i ništa ne zamjenjuje pregled. Kad opisujemo simptom, opisujemo ga zato što je javnozdravstveno važan, a ne zato da bi ga čitatelj sam dijagnosticirao.',
              'Ako tekst zvuči kao da obećava izlječenje, tekst je pogrešan — i ispravlja se.',
            ],
            en: [
              'Nothing on this site is medical advice and nothing replaces an examination. When we describe a symptom, we do it because it matters for public health, not so a reader can self-diagnose.',
              'If a text sounds as if it promises a cure, the text is wrong — and gets corrected.',
            ],
          },
        },
      ],
      faq: [
        { q: { hr: 'Koliko tjelesne aktivnosti preporučuje WHO?', en: 'How much physical activity does the WHO recommend?' }, a: { hr: 'Za odrasle 150–300 minuta umjerene aktivnosti tjedno ili 75–150 minuta intenzivne, uz vježbe snage dva puta tjedno. To je populacijska smjernica, ne individualni recept.', en: 'For adults, 150–300 minutes of moderate activity a week or 75–150 of vigorous, plus strength work twice a week. That is a population guideline, not an individual prescription.' } },
        { q: { hr: 'Je li ovo medicinski savjet?', en: 'Is this medical advice?' }, a: { hr: 'Nije. Desk objašnjava javnozdravstvene smjernice i način čitanja studija. Odluke o vlastitom zdravlju donose se s liječnikom.', en: 'No. The desk explains public-health guidance and how to read studies. Decisions about your own health belong with a physician.' } },
      ],
      images: [0, 1, 2, 3],
    },
    prevencija: {
      slug: 'prevencija',
      nav: { hr: 'Prevencija', en: 'Prevention' },
      title: { hr: 'Prevencija: što se doista pokazalo, a što se samo prodaje', en: 'Prevention: what has been shown, and what is only sold' },
      kicker: { hr: 'Prevencija', en: 'Prevention' },
      lead: {
        hr: 'Prevencija nije isto što i kontrola. Neke mjere smanjuju rizik dokazano, neke samo otkrivaju rizik, a neke se prodaju kao prevencija bez ijednog ozbiljnog pregleda.',
        en: 'Prevention is not the same as testing. Some measures lower risk demonstrably, some only reveal it, and some are sold as prevention with no serious review behind them.',
      },
      sections: [
        {
          h: { hr: 'Tri razine', en: 'Three levels' },
          p: {
            hr: ['Primarna prevencija sprječava nastanak bolesti (cijepljenje, prestanak pušenja, kretanje). Sekundarna rano otkriva (probir). Tercijarna smanjuje posljedice nakon bolesti. Svaka razina ima svoju cijenu i svoj rizik.'],
            en: ['Primary prevention stops disease from occurring (vaccination, stopping smoking, movement). Secondary detects it early (screening). Tertiary reduces consequences after illness. Each level has its own cost and its own risk.'],
          },
        },
        {
          h: { hr: 'Probir nije obavezan za sve', en: 'Screening is not for everyone' },
          p: {
            hr: ['Test koji otkrije nešto što nikad ne bi naškodilo vodi u dodatne pretrage i liječenje bez koristi. Zato se probir preporučuje po dobi i riziku, a ne „za svaki slučaj“.'],
            en: ['A test that finds something that would never have caused harm leads to further tests and treatment without benefit. That is why screening is recommended by age and risk, not “just in case”.'],
          },
          list: {
            hr: ['Cijepljenje prema kalendaru', 'Prestanak pušenja kao najveća pojedinačna mjera', 'Krvni tlak i šećer kao rani pokazatelji', 'Probir po dobi i riziku, ne po strahu'],
            en: ['Vaccination on schedule', 'Stopping smoking as the single largest measure', 'Blood pressure and glucose as early markers', 'Screening by age and risk, not by fear'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Znači li probir uvijek produženje života?', en: 'Does screening always extend life?' }, a: { hr: 'Ne. Korist ovisi o tome mijenja li rano otkrivanje ishod. Za neke vrste raka mijenja, za neke ne — zato se preporuke razlikuju po dobi i riziku.', en: 'No. Benefit depends on whether early detection changes the outcome. For some cancers it does, for some it does not — which is why recommendations differ by age and risk.' } },
      ],
      images: [1, 4, 5],
    },
    san: {
      slug: 'san',
      nav: { hr: 'San', en: 'Sleep' },
      title: { hr: 'San: koliko, zašto i što ga kvari', en: 'Sleep: how much, why, and what breaks it' },
      kicker: { hr: 'San', en: 'Sleep' },
      lead: {
        hr: 'San nije pasivno vrijeme. To je dio dana u kojem se pamćenje konsolidira, hormoni usklađuju, a krvni tlak spušta. Nedostatak se ne nadoknađuje kavom.',
        en: 'Sleep is not passive time. It is the part of the day when memory consolidates, hormones align and blood pressure drops. Shortage is not compensated with coffee.',
      },
      sections: [
        {
          h: { hr: 'Raspon, ne brojka', en: 'A range, not a single number' },
          p: {
            hr: ['Za odrasle se najčešće navodi 7–9 sati, ali potreba se razlikuje. Važnija od pojedinačne noći je dosljednost: isto vrijeme buđenja i redovit ritam znače više od savršenog broja sati.'],
            en: ['Adults are usually advised 7–9 hours, but need varies. Consistency matters more than a single night: the same wake time and a regular rhythm mean more than a perfect hour count.'],
          },
        },
        {
          h: { hr: 'Što pomaže, a što ne', en: 'What helps and what does not' },
          p: {
            hr: ['Redovito buđenje, dnevno svjetlo ujutro i mrak navečer pomažu više od dodataka prehrani. Alkohol uspavljuje, ali razbija drugu polovicu noći; ekran u krevetu odgađa uspavljivanje.'],
            en: ['A regular wake time, morning daylight and evening darkness help more than supplements. Alcohol sedates but fragments the second half of the night; a screen in bed delays sleep onset.'],
          },
          list: {
            hr: ['Isto vrijeme buđenja, i vikendom', 'Dnevno svjetlo u prvom satu dana', 'Bez kofeina šest sati prije sna', 'Ako hrčete i danju ste pospani — razgovor s liječnikom'],
            en: ['The same wake time, weekends included', 'Daylight in the first hour of the day', 'No caffeine within six hours of sleep', 'If you snore and are sleepy by day — talk to a doctor'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Je li osam sati pravilo?', en: 'Is eight hours a rule?' }, a: { hr: 'Nije. Raspon za odrasle je obično 7–9 sati, a pojedinačna potreba varira. Kronično spavanje ispod šest sati povezuje se s većim rizikom, ali to nije dijagnoza.', en: 'No. The adult range is usually 7–9 hours and individual need varies. Chronic sleep under six hours is associated with higher risk, but that is not a diagnosis.' } },
        { q: { hr: 'Pomažu li tablete za spavanje?', en: 'Do sleeping pills help?' }, a: { hr: 'Mogu kratkoročno pomoći, ali nisu rješenje za kroničnu nesanicu i imaju nuspojave. O njima odlučuje liječnik, ne desk.', en: 'They can help short term but are not a solution for chronic insomnia and carry side effects. A physician decides, not a desk.' } },
      ],
      images: [2, 3, 0],
    },
    studija: {
      slug: 'studija',
      nav: { hr: 'Studija', en: 'Study' },
      title: { hr: 'Kako pročitati medicinsku studiju u pet minuta', en: 'How to read a medical study in five minutes' },
      kicker: { hr: 'Studija', en: 'Study' },
      lead: {
        hr: 'Većina zdravstvenih naslova dolazi iz priopćenja, ne iz rada. Pet pitanja dovoljno je da razlikuješ jedno od drugog.',
        en: 'Most health headlines come from press releases, not from papers. Five questions are enough to tell the difference.',
      },
      sections: [
        {
          h: { hr: 'Pet pitanja', en: 'Five questions' },
          p: {
            hr: [
              'Koliko je ljudi sudjelovalo? Je li studija randomizirana? Što je bila kontrolna skupina? Koliki je apsolutni, a ne samo relativni rizik? Je li rad recenziran i gdje je objavljen?',
              'Ako na tri od pet nema odgovora, naslov je jači od dokaza. To je pravilo koje vrijedi i za ovu stranicu.',
            ],
            en: [
              'How many people took part? Was it randomised? What was the control group? What is the absolute, not just relative, risk? Was the paper reviewed, and where did it appear?',
              'If three of five have no answer, the headline is stronger than the evidence. That rule applies to this site too.',
            ],
          },
        },
        {
          h: { hr: 'Relativno i apsolutno', en: 'Relative and absolute' },
          p: {
            hr: ['„Smanjuje rizik za 50 %“ znači malo ako je osnovni rizik 2 na 10 000. Ista rečenica znači mnogo ako je osnovni rizik 2 na 10. Zato se u ovom desku relativne brojke nikad ne objavljuju bez osnovice.'],
            en: ['“Cuts risk by 50%” means little if the baseline is 2 in 10,000. The same sentence means a lot if the baseline is 2 in 10. That is why relative figures here never appear without the baseline.'],
          },
          list: {
            hr: ['Uzorak i trajanje', 'Kontrolna skupina i randomizacija', 'Apsolutni rizik uz relativni', 'Recenzija i mjesto objave', 'Sukob interesa i izvor financiranja'],
            en: ['Sample and duration', 'Control group and randomisation', 'Absolute risk alongside relative', 'Review and place of publication', 'Conflict of interest and funding'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Je li studija na miševima vijest za ljude?', en: 'Is a mouse study news for humans?' }, a: { hr: 'Može biti zanimljiva, ali nije dokaz za ljude. U ovom desku se takva studija označava kao pretklinička, bez iznimke.', en: 'It can be interesting but is not proof for humans. Here such a study is labelled preclinical, without exception.' } },
      ],
      images: [3, 5, 1],
    },
    metodologija: {
      slug: 'metodologija',
      nav: { hr: 'Metodologija', en: 'Method' },
      title: { hr: 'Kako nastaje ZDRAVLJE 360', en: 'How ZDRAVLJE 360 is made' },
      kicker: { hr: 'Metodologija', en: 'Method' },
      lead: { hr: 'Smjernica prije mišljenja, apsolutni rizik prije relativnog i liječnik prije svakog savjeta.', en: 'Guideline before opinion, absolute risk before relative, and a physician before any advice.' },
      sections: [
        {
          h: { hr: 'Provjera', en: 'Checks' },
          p: { hr: ['Brojke dolaze iz smjernica i pregleda, ne iz pojedinačnih studija bez konteksta. Kad se smjernice razlikuju, to pišemo — jer razlika je informacija.'], en: ['Figures come from guidelines and reviews, not from single studies without context. When guidelines differ, we say so — the difference is information.'] },
        },
        {
          h: { hr: 'Što ne radimo', en: 'What we do not do' },
          p: { hr: ['Ne dijagnosticiramo, ne preporučujemo terapiju, ne prodajemo dodatke prehrani i ne objavljujemo priče o izlječenju bez dokumentacije.'], en: ['We do not diagnose, recommend treatment, sell supplements, or publish recovery stories without documentation.'] },
          list: {
            hr: ['Smjernica prije pojedinačne studije', 'Apsolutni rizik uvijek uz relativni', 'Bez dijagnoza i terapije', 'Ispravci na istom mjestu'],
            en: ['Guideline before a single study', 'Absolute risk always with relative', 'No diagnoses or treatment', 'Corrections in the same place'],
          },
        },
      ],
      faq: [{ q: { hr: 'Zašto nema imena pacijenata?', en: 'Why no patient names?' }, a: { hr: 'Zato što zdravstveni podatak pripada osobi, ne mediju. Pišemo o populaciji i postupcima, ne o pojedinačnim slučajevima bez privole.', en: 'Because health data belongs to the person, not the outlet. We write about populations and procedures, not individual cases without consent.' } }],
      images: [4, 2],
    },
  },
};
