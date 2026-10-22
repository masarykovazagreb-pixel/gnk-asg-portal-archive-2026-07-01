/**
 * SCENA ZNANOSTI — kako znanost stvarno nastaje.
 *
 * Tema nije „novo otkriće“ nego proces: recenzija, preprint, ispravak,
 * reprodukcija. Tvrdnje o procesu su opće i provjerljive, a institucije i
 * časopisi su povezani na stvarne adrese.
 */
export default {
  sources: [
    { id: 'arxiv', name: 'arXiv', url: 'https://arxiv.org/', what: { hr: 'Najveći preprint poslužitelj; radovi prije recenzije, s jasnom oznakom da nisu recenzirani.', en: 'The largest preprint server; papers before review, clearly marked as not peer reviewed.' } },
    { id: 'nature', name: 'Nature', url: 'https://www.nature.com/', what: { hr: 'Časopis i objašnjenje vlastitog uredničkog postupka.', en: 'Journal and an explanation of its own editorial process.' } },
    { id: 'science', name: 'Science', url: 'https://www.science.org/', what: { hr: 'Časopis i politika ispravaka i povlačenja.', en: 'Journal and its corrections and retraction policy.' } },
    { id: 'retractionwatch', name: 'Retraction Watch', url: 'https://retractionwatch.com/', what: { hr: 'Baza povučenih radova i praćenje razloga povlačenja.', en: 'A database of retracted papers and the reasons behind retractions.' } },
    { id: 'pubpeer', name: 'PubPeer', url: 'https://pubpeer.com/', what: { hr: 'Javna rasprava o objavljenim radovima nakon publikacije.', en: 'Public post-publication discussion of published papers.' } },
    { id: 'doi', name: 'DOI Foundation', url: 'https://www.doi.org/', what: { hr: 'Trajni identifikator rada; veza koja ne ovisi o adresi časopisa.', en: 'A persistent identifier; a link that does not depend on the journal’s URL.' } },
    { id: 'hrzz', name: 'Hrvatska zaklada za znanost', url: 'https://hrzz.hr/', what: { hr: 'Nacionalno financiranje istraživačkih projekata i javni podaci o njima.', en: 'National research funding and public project information.' } },
  ],
  glossary: [
    { t: { hr: 'Recenzija (peer review)', en: 'Peer review' }, d: { hr: 'Postupak u kojem neovisni stručnjaci čitaju rad prije objave i predlažu izmjene ili odbijanje.', en: 'Independent experts read a paper before publication and recommend changes or rejection.' } },
    { t: { hr: 'Preprint', en: 'Preprint' }, d: { hr: 'Rad objavljen prije recenzije, obično na poslužitelju kao što je arXiv; nije dokaz da je provjeren.', en: 'A paper posted before review, usually on a server such as arXiv; it is not proof of verification.' } },
    { t: { hr: 'DOI', en: 'DOI' }, d: { hr: 'Trajni identifikator koji vodi na rad ili njegov zapis, neovisno o promjeni adrese.', en: 'A persistent identifier that leads to the paper or its record, independent of URL changes.' } },
    { t: { hr: 'Povlačenje (retraction)', en: 'Retraction' }, d: { hr: 'Izjava uredništva da rad više nije valjan; razlog može biti pogreška, prijevara ili nemogućnost reprodukcije.', en: 'An editorial statement that a paper no longer stands; the reason may be error, misconduct or non-reproducibility.' } },
    { t: { hr: 'Ispravak (correction)', en: 'Correction' }, d: { hr: 'Ispravak dijela rada koji ne ruši zaključak, ali mijenja podatak ili sliku.', en: 'A fix to part of a paper that does not destroy the conclusion but changes a figure or an image.' } },
    { t: { hr: 'Reprodukcija', en: 'Reproduction' }, d: { hr: 'Ponavljanje pokusa po opisu iz rada; uspjeh znači da rezultat nije slučajan.', en: 'Repeating an experiment from the paper’s description; success means the result is not accidental.' } },
    { t: { hr: 'Veličina uzorka', en: 'Sample size' }, d: { hr: 'Broj jedinica u istraživanju; mali uzorak daje veliku nesigurnost, bez obzira na rezultat.', en: 'The number of units in a study; a small sample carries large uncertainty, whatever the result.' } },
    { t: { hr: 'Sukob interesa', en: 'Conflict of interest' }, d: { hr: 'Financijska ili osobna veza autora s ishodom istraživanja; mora biti objavljena.', en: 'A financial or personal link between authors and the outcome; it must be declared.' } },
    { t: { hr: 'Slijepa provjera', en: 'Blinding' }, d: { hr: 'Postupak u kojem ispitanici ili istraživači ne znaju tko je u kojoj skupini.', en: 'A procedure where participants or researchers do not know who is in which group.' } },
    { t: { hr: 'Prethodna registracija', en: 'Preregistration' }, d: { hr: 'Javno zapisana hipoteza i plan analize prije prikupljanja podataka.', en: 'A publicly recorded hypothesis and analysis plan before data collection.' } },
  ],
  pages: {
    '': {
      nav: { hr: 'Početna', en: 'Home' },
      title: { hr: 'SCENA ZNANOSTI — kako znanost stvarno nastaje', en: 'SCENA ZNANOSTI — how science actually happens' },
      kicker: { hr: 'Neovisno izdanje · GNK ASG mreža', en: 'Independent edition · GNK ASG network' },
      lead: {
        hr: 'Znanost nije niz otkrića nego niz provjera. Ovaj desk prati proces: tko je rad recenzirao, je li objavljen prije recenzije, što je poslije ispravljeno i zašto se nešto povuklo. To je manje uzbudljivo od naslova — i mnogo korisnije.',
        en: 'Science is not a series of discoveries but a series of checks. This desk follows the process: who reviewed a paper, whether it was published before review, what was corrected afterwards, and why something was retracted. It is less exciting than headlines — and far more useful.',
      },
      sections: [
        {
          h: { hr: 'Naslov nije zaključak', en: 'A headline is not a conclusion' },
          p: {
            hr: [
              'Istraživanje na 12 ljudi i istraživanje na 12 000 ljudi mogu završiti istim naslovom. Razlika je u tome što se prvo ne može ponoviti, a drugo može — i zato je pitanje „na koliko ljudi“ prvo pitanje svakog ozbiljnog razgovora.',
              'Ovaj desk zato uz svaku temu objavljuje tri stvari: što je mjereno, na koliko ispitanika i gdje je rad objavljen. Ako nešto od toga nema, tema nije spremna.',
            ],
            en: [
              'A study of 12 people and a study of 12,000 can end with the same headline. The difference is that the first cannot be repeated, and the second can — which is why “how many people” is the first question of any serious conversation.',
              'So alongside every topic this desk publishes three things: what was measured, on how many participants, and where the paper appeared. If any of those is missing, the topic is not ready.',
            ],
          },
          list: {
            hr: ['Recenzija: što recenzent stvarno provjerava', 'Preprint: brzina bez provjere, i zašto je to korisno', 'Reprodukcija: najvažniji pokus je onaj koji ponavlja tuđi', 'Ispravci: kako izgleda kad znanost sama sebe popravi'],
            en: ['Peer review: what a reviewer actually checks', 'Preprints: speed without verification, and why that helps', 'Reproduction: the most important experiment repeats someone else’s', 'Corrections: what it looks like when science fixes itself'],
          },
        },
        {
          h: { hr: 'Dvije brzine, jedan cilj', en: 'Two speeds, one goal' },
          p: {
            hr: [
              'Preprint poslužitelji ubrzali su dijeljenje rezultata: rad može biti javan danas, a recenziran za nekoliko mjeseci. To je korisno za vrijeme krize i za suradnju, ali stvara i obvezu čitatelja da provjeri je li rad prošao recenziju.',
              'Zato na ovoj stranici preprint nikad nije označen kao „studija“ bez pridjeva. Razlika između „objavljeno“ i „recenzirano“ nije formalnost nego informacija.',
            ],
            en: [
              'Preprint servers sped up the sharing of results: a paper can be public today and reviewed in a few months. That helps in a crisis and in collaboration, but it also obliges the reader to check whether review happened.',
              'So on this site a preprint is never labelled a “study” without saying so. The difference between “published” and “peer reviewed” is not a formality but information.',
            ],
          },
        },
      ],
      faq: [
        { q: { hr: 'Znači li recenzija da je rad točan?', en: 'Does peer review mean a paper is correct?' }, a: { hr: 'Ne. Recenzija je provjera prije objave, ne garancija. Povučeni radovi često su prošli recenziju — zato je važno pratiti i što se događa nakon objave.', en: 'No. Review is a pre-publication check, not a guarantee. Retracted papers often passed review — which is why what happens after publication matters.' } },
        { q: { hr: 'Je li preprint loš?', en: 'Are preprints bad?' }, a: { hr: 'Nije. Preprint je brz i otvoren, ali nije provjeren. Koristan je kao izvor pitanja i kao rani uvid, a ne kao konačan dokaz.', en: 'No. A preprint is fast and open, but unverified. It is useful as a source of questions and an early look, not as final proof.' } },
      ],
      images: [0, 1, 2, 3],
    },
    recenzija: {
      slug: 'recenzija',
      nav: { hr: 'Recenzija', en: 'Peer review' },
      title: { hr: 'Što recenzent stvarno provjerava — i što ne', en: 'What a reviewer actually checks — and what they don’t' },
      kicker: { hr: 'Recenzija', en: 'Peer review' },
      lead: {
        hr: 'Recenzent ne ponavlja pokus. Čita metodu, provjerava logiku i pita je li zaključak veći od podataka. To je korisno, ali nije isto kao neovisna provjera.',
        en: 'A reviewer does not repeat the experiment. They read the method, check the logic and ask whether the conclusion is larger than the data. That helps, but it is not the same as independent verification.',
      },
      sections: [
        {
          h: { hr: 'Tri pitanja recenzije', en: 'Three review questions' },
          p: {
            hr: ['Je li uzorak dovoljan za tvrdnju? Je li analiza unaprijed planirana ili odabrana nakon rezultata? Može li neovisna skupina ponoviti postupak iz opisa? Ako na treće pitanje nema odgovora, rad je opis, ne dokaz.'],
            en: ['Is the sample sufficient for the claim? Was the analysis planned in advance or chosen after the results? Can an independent group repeat the procedure from the description? If the third has no answer, the paper is a description, not proof.'],
          },
        },
        {
          h: { hr: 'Anonimnost i njezine granice', en: 'Anonymity and its limits' },
          p: {
            hr: ['Dvostruko slijepa recenzija skriva autore od recenzenata i obrnuto. U malim područjima to je teško provesti jer se tema prepoznaje. Kad anonimnost padne, raste rizik od pristranosti prema poznatom imenu.'],
            en: ['Double-blind review hides authors from reviewers and vice versa. In small fields this is hard because the topic gives the author away. When anonymity fails, the risk of bias toward a known name rises.'],
          },
          list: {
            hr: ['Provjera metode i logike', 'Provjera je li analiza prethodno registrirana', 'Provjera sukoba interesa', 'Ne provjerava se ponavljanjem pokusa'],
            en: ['Check of method and logic', 'Check of whether the analysis was preregistered', 'Check of conflicts of interest', 'No repeat of the experiment'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Koliko recenzenata čita jedan rad?', en: 'How many reviewers read a paper?' }, a: { hr: 'Najčešće dva do tri, ali to nije pravilo i razlikuje se od časopisa do časopisa. Neki časopisi objavljuju imena recenzenata, neki ne.', en: 'Usually two or three, but that is not a rule and varies by journal. Some journals publish reviewer names, some do not.' } },
      ],
      images: [1, 4, 5],
    },
    preprinti: {
      slug: 'preprinti',
      nav: { hr: 'Preprinti', en: 'Preprints' },
      title: { hr: 'Preprint: brzina koja traži čitatelja koji misli', en: 'Preprints: speed that requires a thinking reader' },
      kicker: { hr: 'Preprinti', en: 'Preprints' },
      lead: {
        hr: 'Preprint je javni rad prije recenzije. Nije manje vrijedan — samo je manje provjeren. Razlika je u tome što uz njega čitatelj mora sam nositi dio provjere.',
        en: 'A preprint is a public paper before review. It is not less valuable — only less verified. The difference is that the reader must carry part of the checking.',
      },
      sections: [
        {
          h: { hr: 'Što preprint daje', en: 'What a preprint gives' },
          p: {
            hr: ['Brzinu, otvorenost i mogućnost da se pogreška nađe prije nego što uđe u udžbenik. arXiv je pokrenut 1991. i od tada je promijenio način na koji fizika i matematika komuniciraju.'],
            en: ['Speed, openness and the chance to find an error before it reaches a textbook. arXiv launched in 1991 and has since changed how physics and mathematics communicate.'],
          },
        },
        {
          h: { hr: 'Što preprint ne daje', en: 'What a preprint does not give' },
          p: {
            hr: ['Ne daje potvrdu da je rad prošao recenziju, ni da je podatke netko neovisno pogledao. Zato se u ovom desku preprint uvijek imenuje preprintom, a verzija koja je prošla recenziju navodi se odvojeno.'],
            en: ['It does not confirm review, nor that anyone independently examined the data. That is why this desk always calls a preprint a preprint, and cites the reviewed version separately.'],
          },
          list: {
            hr: ['Označi žanr: preprint ili recenzirani rad', 'Provjeri verziju i datum', 'Provjeri je li kasnije objavljen u časopisu', 'Nikad ne prenesi zaključak bez metode'],
            en: ['Label the genre: preprint or reviewed paper', 'Check the version and date', 'Check whether it later appeared in a journal', 'Never repeat a conclusion without the method'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Može li preprint biti opasan?', en: 'Can a preprint be dangerous?' }, a: { hr: 'Može ako se prenosi kao potvrđena činjenica. Sam rad nije opasan; opasna je oznaka koju mu čitatelj ili medij dodijeli.', en: 'It can if it is reported as confirmed fact. The paper itself is not dangerous; the label a reader or outlet attaches to it is.' } },
      ],
      images: [2, 3, 0],
    },
    reprodukcija: {
      slug: 'reprodukcija',
      nav: { hr: 'Reprodukcija', en: 'Reproduction' },
      title: { hr: 'Reprodukcija: najvažniji pokus je tuđi', en: 'Reproduction: the most important experiment is someone else’s' },
      kicker: { hr: 'Reprodukcija', en: 'Reproduction' },
      lead: {
        hr: 'Rezultat koji nitko ne može ponoviti nije rezultat nego događaj. Reprodukcija je zato najmanje atraktivan i najvažniji dio znanosti.',
        en: 'A result nobody can repeat is not a result but an event. Reproduction is therefore the least attractive and most important part of science.',
      },
      sections: [
        {
          h: { hr: 'Zašto pokušaji propadaju', en: 'Why replication attempts fail' },
          p: {
            hr: [
              'Razlozi su obično dosadni: premali uzorak, opis metode bez detalja, različiti instrumenti ili analiza koja je odabrana nakon što se vidio rezultat. Rjeđe je riječ o prijevari, a češće o nedovoljno zapisanom postupku.',
              'Zato dobra praksa traži prethodnu registraciju i objavu podataka. Nije riječ o birokraciji nego o tome da netko drugi može ponoviti ono što si napravio.',
            ],
            en: [
              'The reasons are usually boring: too small a sample, a method description missing detail, different instruments, or an analysis chosen after seeing the result. Fraud is rarer than an under-documented procedure.',
              'Good practice therefore asks for preregistration and data sharing. That is not bureaucracy; it is what lets someone else repeat what you did.',
            ],
          },
        },
        {
          h: { hr: 'Što čitatelj može provjeriti sam', en: 'What a reader can check alone' },
          p: {
            hr: ['Ima li rad DOI, je li naveden uzorak, postoji li odjeljak o ograničenjima i je li sukob interesa objavljen. To su četiri pitanja koja odvajaju ozbiljan izvor od dojma.'],
            en: ['Does the paper have a DOI, is the sample stated, is there a limitations section, and is a conflict of interest declared. Those four questions separate a serious source from an impression.'],
          },
          list: {
            hr: ['DOI i trajna adresa', 'Uzorak i razdoblje', 'Odjeljak o ograničenjima', 'Objavljeni podaci i kod, kad je moguće'],
            en: ['DOI and a persistent address', 'Sample and period', 'A limitations section', 'Shared data and code where possible'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Koliko je znanosti reproducirano?', en: 'How much of science has been reproduced?' }, a: { hr: 'Ne postoji jedinstvena brojka koja vrijedi za sve grane; procjene se razlikuju po području i metodologiji. Zato ovdje ne navodimo opći postotak, nego pojedinačne slučajeve s izvorom.', en: 'There is no single figure that holds across fields; estimates differ by area and method. That is why we cite individual cases with sources rather than a general percentage.' } },
      ],
      images: [3, 5, 1],
    },
    metodologija: {
      slug: 'metodologija',
      nav: { hr: 'Metodologija', en: 'Method' },
      title: { hr: 'Kako nastaje SCENA ZNANOSTI', en: 'How SCENA ZNANOSTI is made' },
      kicker: { hr: 'Metodologija', en: 'Method' },
      lead: {
        hr: 'Jedno pravilo: žanr se nikad ne skriva. Preprint je preprint, recenzirani rad je recenzirani rad, a priopćenje je priopćenje.',
        en: 'One rule: the genre is never hidden. A preprint is a preprint, a reviewed paper is a reviewed paper, and a press release is a press release.',
      },
      sections: [
        {
          h: { hr: 'Provjera prije objave', en: 'Checks before publishing' },
          p: {
            hr: ['Provjeravamo postoji li rad, je li prošao recenziju, koji je uzorak i je li kasnije ispravljan ili povučen. Ako je povučen, to je dio priče, ne detalj koji se briše.'],
            en: ['We check that the paper exists, whether it was reviewed, what the sample is, and whether it was later corrected or retracted. If it was retracted, that is part of the story, not a detail to erase.'],
          },
        },
        {
          h: { hr: 'Što ne radimo', en: 'What we do not do' },
          p: {
            hr: ['Ne prevodimo priopćenja kao rezultate, ne objavljujemo brojke bez izvora i ne koristimo riječ „dokazano“ za jedno istraživanje.'],
            en: ['We do not translate press releases as results, we do not publish numbers without a source, and we do not use the word “proven” for a single study.'],
          },
          list: {
            hr: ['Žanr uvijek naveden', 'Uzorak uvijek naveden', 'Povlačenja se ne brišu', 'Ispravci na istom mjestu'],
            en: ['Genre always stated', 'Sample always stated', 'Retractions are not erased', 'Corrections in the same place'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Pišete li o vlastitim preferencijama?', en: 'Do you write about your own preferences?' }, a: { hr: 'Ne. Desk prati postupak, ne zagovara smjer istraživanja.', en: 'No. The desk follows the process; it does not advocate a research direction.' } },
      ],
      images: [4, 2],
    },
  },
};
