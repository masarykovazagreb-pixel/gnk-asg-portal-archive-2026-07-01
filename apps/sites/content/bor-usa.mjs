/**
 * BOR USA — borilački sport u Sjedinjenim Državama.
 *
 * Sadržaj je pisan tako da ne ovisi o vijestima: pravila, regulativa i način
 * čitanja borbe ne mijenjaju se svaki dan. Sve što je brojka (težinske
 * kategorije, trajanje rundi) je dio objavljenih pravila i stoji uz izvor.
 * Nema izmišljenih statistika, rekorda ni najava.
 */
export default {
  sources: [
    { id: 'abc', name: 'Association of Boxing Commissions and Combative Sports', url: 'https://www.abcboxing.com/', what: { hr: 'Krovno udruženje državnih komisija; objavljuje objedinjena pravila MMA-a.', en: 'The umbrella body of state commissions; publishes the Unified Rules of MMA.' } },
    { id: 'nsac', name: 'Nevada State Athletic Commission', url: 'https://nsac.nv.gov/', what: { hr: 'Jedna od najaktivnijih državnih komisija; javno objavljuje odluke i suspenzije.', en: 'One of the most active state commissions; publishes decisions and suspensions.' } },
    { id: 'csac', name: 'California State Athletic Commission', url: 'https://www.dca.ca.gov/csac/', what: { hr: 'Kalifornijska komisija: pravilnici, medicinski pregledi i procedure licenciranja.', en: 'California’s commission: rules, medical screening and licensing procedure.' } },
    { id: 'ufc', name: 'UFC', url: 'https://www.ufc.com/', what: { hr: 'Najveći promotor; objavljuje karte borbi i službene rezultate.', en: 'The largest promoter; publishes fight cards and official results.' } },
    { id: 'wada', name: 'World Anti-Doping Agency', url: 'https://www.wada-ama.org/', what: { hr: 'Svjetski antidopinški standardi na koje se pozivaju programi u borilačkim sportovima.', en: 'World anti-doping standards referenced by combat-sport programmes.' } },
    { id: 'boxing', name: 'The Ring', url: 'https://www.ringtv.com/', what: { hr: 'Stručno izvještavanje i povijest boksačkih kategorija.', en: 'Specialist reporting and the history of boxing divisions.' } },
  ],
  glossary: [
    { t: { hr: 'Borba (fight)', en: 'Fight' }, d: { hr: 'Jedan dvoboj u karti; ima vlastiti broj rundi, težinsku kategoriju i pravila.', en: 'One bout on a card; it has its own number of rounds, weight class and ruleset.' } },
    { t: { hr: 'Karta (fight card)', en: 'Fight card' }, d: { hr: 'Popis svih borbi jedne priredbe, od glavne do uvodnih.', en: 'The list of every bout on an event, from main event to prelims.' } },
    { t: { hr: 'Vaganje (weigh-in)', en: 'Weigh-in' }, d: { hr: 'Službeno mjerenje težine; borac koji ne uđe u limit gubi dio honorara ili borbu.', en: 'The official weight check; missing the limit costs part of the purse or the bout.' } },
    { t: { hr: 'Catchweight', en: 'Catchweight' }, d: { hr: 'Dogovorena težina između dvije kategorije, kad se borci ne mogu sresti u istoj.', en: 'An agreed weight between two divisions when the fighters cannot meet in one.' } },
    { t: { hr: 'Bez pobjednika (no contest)', en: 'No contest' }, d: { hr: 'Borba se poništava zbog prekršaja ili ozljede bez krivnje; ne upisuje se pobjeda.', en: 'The bout is voided for a foul or an accidental injury; no win is recorded.' } },
    { t: { hr: 'Medicinska suspenzija', en: 'Medical suspension' }, d: { hr: 'Obvezni odmor nakon težeg udarca ili ozljede; određuje ga liječnik komisije.', en: 'A mandatory layoff after a heavy knockout or injury, set by the commission’s physician.' } },
    { t: { hr: 'Komisija', en: 'Commission' }, d: { hr: 'Državno tijelo koje licencira borce, promotore i suce te sankcionira priredbu.', en: 'The state body that licenses fighters, promoters and referees, and sanctions the event.' } },
    { t: { hr: 'Objedinjena pravila', en: 'Unified Rules' }, d: { hr: 'Skup pravila MMA-a koje su države preuzele, uz lokalne izmjene.', en: 'The MMA ruleset adopted by states, with local amendments.' } },
    { t: { hr: 'Honorar (purse)', en: 'Purse' }, d: { hr: 'Novac za borbu, često podijeljen na zajamčeni i pobjednički dio.', en: 'The money for a bout, often split into guaranteed and win money.' } },
    { t: { hr: 'Kontrola težine', en: 'Weight management' }, d: { hr: 'Planiranje kategorije i rehidracije; reguliraju ga komisije, ne promotor.', en: 'Planning the division and rehydration; regulated by commissions, not the promoter.' } },
  ],
  pages: {
    '': {
      nav: { hr: 'Početna', en: 'Home' },
      title: { hr: 'BOR USA — borilački sport u Americi bez šuma', en: 'BOR USA — combat sports in America, without the noise' },
      kicker: { hr: 'Neovisno izdanje · GNK ASG mreža', en: 'Independent edition · GNK ASG network' },
      lead: {
        hr: 'Boks i MMA u Sjedinjenim Državama ne vodi jedna organizacija, nego pedesetak državnih komisija. Tko to razumije, razumije i zašto se ista borba u dvije države sudi drukčije — i zašto je najvažnija osoba u dvorani često liječnik, a ne promoter.',
        en: 'Boxing and MMA in the United States are not run by one organisation but by some fifty state commissions. Understand that and you understand why the same bout is judged differently in two states — and why the most important person in the arena is often the physician, not the promoter.',
      },
      sections: [
        {
          h: { hr: 'Zašto ovaj desk postoji', en: 'Why this desk exists' },
          p: {
            hr: [
              'Veliki mediji pišu o rezultatu i o zaradi. Gotovo nitko ne piše o tome tko je borbu odobrio, po kojim pravilima, koliko je trajala medicinska suspenzija i je li borac uopće imao valjanu licenciju. To su činjenice koje se mogu provjeriti, a upravo one objašnjavaju zašto neka karijera stane.',
              'Zato BOR USA ne donosi najave i ne prenosi glasine. Donosi pravila, postupke i izvore — i onda pokazuje kako se pojedina borba čita kroz njih.',
            ],
            en: [
              'Big outlets cover the result and the money. Almost nobody covers who sanctioned the bout, under which rules, how long the medical suspension lasted, or whether the fighter even held a valid licence. Those are checkable facts — and they explain why a career stops.',
              'So BOR USA carries no announcements and no rumours. It carries rules, procedure and sources — and then shows how a single bout reads through them.',
            ],
          },
          list: {
            hr: ['Tko odobrava priredbu i tko licencira borca', 'Što znači objedinjena pravila i gdje se razlikuju', 'Kako se čita karta: glavna borba, uvodne, pravila po borbi', 'Što medicinska suspenzija znači za sljedeći nastup'],
            en: ['Who sanctions an event and who licenses a fighter', 'What the Unified Rules mean and where they differ', 'How to read a card: main event, prelims, rules per bout', 'What a medical suspension means for the next bout'],
          },
        },
        {
          h: { hr: 'Jedna borba, tri odluke', en: 'One bout, three decisions' },
          p: {
            hr: [
              'Prije nego što se dvoje ljudi popnu u kavez, netko mora izdati licenciju borcima, netko mora odobriti priredbu i netko mora potvrditi da su medicinski pregledi obavljeni. U SAD-u to su u pravilu državne atletske komisije, a ne savez na nacionalnoj razini.',
              'Zato se događa da isti borac u jednoj državi bude suspendiran, a u drugoj nastupi — ako ga druga komisija licencira po svojim pravilima. To nije skandal nego posljedica ustroja; i zato je pitanje „po čijim pravilima“ uvijek prvo pitanje.',
            ],
            en: [
              'Before two people step into a cage, someone must license the fighters, someone must sanction the event and someone must confirm the medicals were done. In the US that is normally the state athletic commission, not a national federation.',
              'That is why the same fighter can be suspended in one state and compete in another, if the second commission licenses him under its rules. It is not a scandal but a consequence of the structure — which is why “under whose rules” is always the first question.',
            ],
          },
        },
      ],
      faq: [
        { q: { hr: 'Postoji li savez koji upravlja MMA-om u SAD-u?', en: 'Is there a federation that governs MMA in the US?' }, a: { hr: 'Ne. MMA reguliraju državne komisije, a objedinjena pravila objavljuje udruženje komisija. Promotori su privatne tvrtke koje traže odobrenje u svakoj državi u kojoj održavaju priredbu.', en: 'No. MMA is regulated by state commissions, and the unified rules are published by their association. Promoters are private companies that need approval in each state where they stage an event.' } },
        { q: { hr: 'Zašto je težina važnija od imena?', en: 'Why does weight matter more than names?' }, a: { hr: 'Zato što kategorija određuje pravila, broj rundi i medicinske uvjete. Borac koji ne uđe u limit gubi dio honorara ili cijelu borbu — bez obzira na to koliko je poznat.', en: 'Because the division sets the ruleset, the number of rounds and the medical requirements. A fighter who misses the limit loses part of the purse or the whole bout, however famous he is.' } },
      ],
      images: [0, 1, 2, 3],
    },
    regulativa: {
      slug: 'regulativa',
      nav: { hr: 'Regulativa', en: 'Regulation' },
      title: { hr: 'Tko odobrava borbu: karta američkih komisija', en: 'Who sanctions a fight: mapping US commissions' },
      kicker: { hr: 'Regulativa', en: 'Regulation' },
      lead: {
        hr: 'U SAD-u nema jednog regulatora borilačkih sportova. Postoji pedesetak komisija, jedno udruženje koje objavljuje objedinjena pravila i savezna tijela koja ulaze u igru samo kod antidopinga i prijevara. To je cijela arhitektura.',
        en: 'There is no single regulator of combat sports in the US. There are some fifty commissions, one association that publishes the Unified Rules, and federal bodies that only get involved in anti-doping and fraud. That is the whole architecture.',
      },
      sections: [
        {
          h: { hr: 'Država, ne savez', en: 'State, not federation' },
          p: {
            hr: [
              'Komisija izdaje licencije borcima, sucima, liječnicima i promoterima, odobrava priredbu i može je zaustaviti. Njezine odluke obično su javne: suspenzije, novčane kazne i medicinski status objavljuju se na webu ili u zapisnicima sjednica.',
              'Udruženje komisija (ABC) nema izvršnu vlast. Ono piše predložak pravila koje svaka država može preuzeti, izmijeniti ili ne preuzeti. Zato „objedinjena pravila“ nisu zakon nego standard koji većina država primjenjuje.',
            ],
            en: [
              'A commission issues licences to fighters, referees, physicians and promoters, sanctions the event and can stop it. Its decisions are usually public: suspensions, fines and medical status appear on its site or in meeting minutes.',
              'The commissions’ association (ABC) holds no executive power. It drafts model rules that each state may adopt, amend or ignore. “Unified Rules” are therefore not a law but a standard most states apply.',
            ],
          },
        },
        {
          h: { hr: 'Što provjeriti prije priredbe', en: 'What to check before an event' },
          p: {
            hr: ['Redoslijed je uvijek isti i nikad nije senzacionalan: tko je odobrio, po kojim pravilima, s kojim medicinskim uvjetima i s kojim licencijama. Kad to znaš, rezultat prestaje biti misterij.'],
            en: ['The order is always the same and never sensational: who sanctioned it, under which rules, with which medical conditions and which licences. Once you know that, the result stops being a mystery.'],
          },
          list: {
            hr: ['Naziv komisije i broj odobrenja priredbe', 'Pravila po borbi (runde, težine, dopušteni udarci)', 'Medicinske provjere prije i poslije borbe', 'Javno objavljena suspenzija nakon priredbe'],
            en: ['The commission’s name and the event sanction number', 'Rules per bout (rounds, weights, permitted strikes)', 'Medical checks before and after the bout', 'The publicly posted post-event suspension'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Može li borac nastupiti dok je suspendiran?', en: 'Can a fighter compete while suspended?' }, a: { hr: 'U državi koja ga je suspendirala ne može. U drugoj državi može ako mu ta komisija izda licenciju — i upravo zato postoje nacionalni registri suspenzija koje komisije međusobno provjeravaju.', en: 'Not in the state that suspended him. He can in another state if that commission licenses him — which is why national suspension registries exist and commissions check them.' } },
        { q: { hr: 'Je li ABC regulator?', en: 'Is the ABC a regulator?' }, a: { hr: 'Nije. To je udruženje državnih komisija koje objavljuje predložak pravila i preporuke; svaka država sama odlučuje hoće li ih primijeniti.', en: 'No. It is an association of state commissions that publishes model rules and recommendations; each state decides whether to apply them.' } },
      ],
      images: [1, 3, 4],
    },
    sigurnost: {
      slug: 'sigurnost',
      nav: { hr: 'Sigurnost', en: 'Safety' },
      title: { hr: 'Sigurnost u borilačkom sportu: liječnik, težina, suspenzija', en: 'Safety in combat sports: the physician, the weight, the suspension' },
      kicker: { hr: 'Sigurnost', en: 'Safety' },
      lead: {
        hr: 'Najveći rizik u borilačkim sportovima nije jedan udarac, nego naglo skidanje težine, nedovoljna pauza između borbi i odluka da se nastavi kad se ne bi smjelo. Sve tri stvari su regulirane — i sve tri se mogu provjeriti.',
        en: 'The biggest risk in combat sports is not a single strike but rapid weight cutting, too short a gap between bouts, and the decision to continue when one should not. All three are regulated — and all three can be checked.',
      },
      sections: [
        {
          h: { hr: 'Težina je medicinsko, ne marketinško pitanje', en: 'Weight is a medical question, not a marketing one' },
          p: {
            hr: [
              'Borac se važe dan prije borbe, a u kavez ulazi nakon rehidracije. Kad je razlika između ta dva trenutka prevelika, nastaju problemi koje komisije pokušavaju ograničiti pravilima o kontroli težine i dodatnim mjerenjima na dan borbe.',
              'Zato je pitanje „u kojoj kategoriji“ uvijek i pitanje „kako je borac ušao u tu kategoriju“. Karta koja to ignorira opisuje samo dio priče.',
            ],
            en: [
              'A fighter weighs in the day before and steps into the cage after rehydrating. When the gap between those two moments is too large, problems follow — which is why commissions try to limit it with weight-management rules and additional fight-day checks.',
              'So “which division” is always also “how did the fighter get into that division”. A card that ignores this tells only part of the story.',
            ],
          },
        },
        {
          h: { hr: 'Pauza nije kazna', en: 'The layoff is not a punishment' },
          p: {
            hr: ['Medicinska suspenzija je uputa liječnika, ne odluka promotora. Traje od nekoliko dana do nekoliko mjeseci, ovisi o vrsti ozljede i o tome je li borba prekinuta zbog udarca u glavu. Suspenziju izdaje komisija i ona je javna.'],
            en: ['A medical suspension is a physician’s instruction, not a promoter’s decision. It runs from days to months, depending on the injury and on whether the bout was stopped because of a head strike. The commission issues it and it is public.'],
          },
          list: {
            hr: ['Pregled prije licenciranja (vid, srce, neurološki status)', 'Pregled na dan priredbe i nakon borbe', 'Obvezna pauza nakon nokauta ili tehničkog nokauta', 'Zabrana nastupa dok traje suspenzija u matičnoj državi'],
            en: ['Pre-licence screening (vision, cardiac, neurological status)', 'Fight-day and post-bout examination', 'Mandatory layoff after a knockout or technical knockout', 'No competition while a suspension is active in the licensing state'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Je li nokaut automatska suspenzija?', en: 'Is a knockout an automatic suspension?' }, a: { hr: 'U pravilu jest, ali trajanje određuje liječnik komisije i ono se razlikuje od države do države. Zato se suspenzije provjeravaju u registru, a ne po sjećanju.', en: 'As a rule yes, but the length is set by the commission’s physician and differs by state. That is why suspensions are checked in the registry, not from memory.' } },
        { q: { hr: 'Tko plaća liječnika na priredbi?', en: 'Who pays the ringside physician?' }, a: { hr: 'Promotor, ali liječnik radi po pravilima komisije. Ta razlika — tko plaća i po čijim pravilima radi — je razlog zašto su komisije, a ne promotori, te koje potvrđuju sposobnost za borbu.', en: 'The promoter pays, but the physician works under the commission’s rules. That split — who pays and under whose rules — is why commissions, not promoters, confirm fitness to fight.' } },
      ],
      images: [2, 4, 5],
    },
    karta: {
      slug: 'karta',
      nav: { hr: 'Karta borbe', en: 'Fight card' },
      title: { hr: 'Kako se čita karta borbe, redom', en: 'How to read a fight card, in order' },
      kicker: { hr: 'Karta', en: 'Fight card' },
      lead: {
        hr: 'Karta nije popis imena. To je niz ugovora u kojima su zapisani kategorija, broj rundi, pravila i rok za vaganje. Kad to znaš čitati, možeš procijeniti priredbu prije prve runde.',
        en: 'A card is not a list of names. It is a series of contracts stating the division, the number of rounds, the ruleset and the weigh-in deadline. Read that and you can judge an event before the first round.',
      },
      sections: [
        {
          h: { hr: 'Pet stvari koje karta mora reći', en: 'Five things a card must state' },
          p: {
            hr: ['Dobra karta navodi kategoriju, broj rundi, pravila, datum vaganja i ime komisije. Loša karta navodi samo imena i nadimke. Razlika nije estetska: bez tih pet podataka ne možeš znati je li borba uopće legalna u toj državi.'],
            en: ['A good card states the division, the number of rounds, the ruleset, the weigh-in date and the commission. A bad card states only names and nicknames. The difference is not aesthetic: without those five facts you cannot know whether the bout is even legal in that state.'],
          },
        },
        {
          h: { hr: 'Težinske kategorije po objedinjenim pravilima', en: 'Weight classes under the Unified Rules' },
          p: {
            hr: ['Objedinjena pravila MMA-a definiraju osam muških kategorija; ženske su u praksi četiri. Brojka je granica, ne prosjek — borac mora biti na njoj ili ispod nje u trenutku vaganja.'],
            en: ['The Unified Rules of MMA define eight men’s divisions; in practice there are four women’s divisions. The number is a limit, not an average — a fighter must be at or below it at the weigh-in.'],
          },
          list: {
            hr: ['Muha 57 kg · Bantam 61 kg · Perolaka 66 kg · Laka 70 kg', 'Velter 77 kg · Srednja 84 kg · Poluteška 93 kg · Teška 120 kg', 'Žene: slam 52 kg · muha 57 kg · bantam 61 kg · perolaka 66 kg'],
            en: ['Fly 125 lb · Bantam 135 lb · Feather 145 lb · Light 155 lb', 'Welter 170 lb · Middle 185 lb · Light heavy 205 lb · Heavy 265 lb', 'Women: strawweight 115 lb · fly 125 lb · bantam 135 lb · feather 145 lb'],
          },
        },
        {
          h: { hr: 'Što karta ne kaže', en: 'What the card does not say' },
          p: {
            hr: ['Karta ne kaže koliko je borac zaradio, kakav mu je ugovor ni koliko je težine skinuo. To se ne objavljuje uvijek, a kad se objavi, dolazi iz komisije ili iz sudskih dokumenata — ne iz promotorovog priopćenja.'],
            en: ['The card does not say what a fighter earned, what the contract says, or how much weight was cut. That is not always published, and when it is, it comes from a commission or court documents — not from a promoter’s release.'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Zašto glavna borba ima pet rundi?', en: 'Why does the main event have five rounds?' }, a: { hr: 'Zato što je tako ugovoreno i odobreno. Pravila dopuštaju pet rundi za glavnu borbu, ali svaka borba na karti može imati vlastiti broj rundi — i to mora biti navedeno.', en: 'Because that is what was contracted and sanctioned. The rules allow five rounds for a main event, but each bout can have its own number — and it must be stated.' } },
        { q: { hr: 'Što znači „catchweight“?', en: 'What does “catchweight” mean?' }, a: { hr: 'Dogovorenu težinu između dvije kategorije. Borba tada nije u standardnoj kategoriji i to mora biti jasno naznačeno na karti i u odobrenju.', en: 'An agreed weight between two divisions. The bout is then not in a standard division, and that must be clear on the card and in the sanction.' } },
      ],
      images: [3, 5, 0],
    },
    metodologija: {
      slug: 'metodologija',
      nav: { hr: 'Metodologija', en: 'Method' },
      title: { hr: 'Kako nastaje BOR USA', en: 'How BOR USA is made' },
      kicker: { hr: 'Metodologija', en: 'Method' },
      lead: {
        hr: 'Tri pravila: nema brojke bez izvora, nema tvrdnje o pojedincu bez dokumenta i nema najave koja se ne može provjeriti. Ostalo je uređivanje.',
        en: 'Three rules: no figure without a source, no claim about a person without a document, and no announcement that cannot be checked. The rest is editing.',
      },
      sections: [
        {
          h: { hr: 'Izvori i redoslijed', en: 'Sources and order' },
          p: {
            hr: ['Primarni izvor je uvijek dokument: pravilo, odluka komisije, licencija, zapisnik ili službeni rezultat. Medijski tekst koristimo kao put do dokumenta, ne kao dokaz. Kad dokument ne postoji, to izričito pišemo.'],
            en: ['The primary source is always a document: a rule, a commission decision, a licence, minutes or an official result. We use media coverage as a route to the document, not as proof. When no document exists, we say so.'],
          },
        },
        {
          h: { hr: 'Što ne radimo', en: 'What we do not do' },
          p: {
            hr: ['Ne objavljujemo glasine o borbama, ne prenosimo tuđe rekorde bez provjere i ne pišemo o zdravstvenom stanju borca izvan onoga što je komisija javno objavila.'],
            en: ['We do not publish fight rumours, we do not repeat records unchecked, and we do not write about a fighter’s health beyond what the commission has made public.'],
          },
          list: {
            hr: ['Bez najava borbi koje nisu ugovorene', 'Bez medicinskih detalja izvan javnih odluka', 'Bez brojke bez datuma i izvora', 'Ispravak se objavljuje na istom mjestu gdje je pogreška'],
            en: ['No announcements of unconfirmed bouts', 'No medical detail beyond public decisions', 'No figure without a date and a source', 'A correction is published where the error was'],
          },
        },
      ],
      faq: [
        { q: { hr: 'Objavljujete li predikcije?', en: 'Do you publish predictions?' }, a: { hr: 'Ne. Predikcija nije provjerljiva činjenica. Objavljujemo ono što se može provjeriti prije i poslije borbe.', en: 'No. A prediction is not a checkable fact. We publish what can be checked before and after the bout.' } },
      ],
      images: [4, 1],
    },
  },
};
