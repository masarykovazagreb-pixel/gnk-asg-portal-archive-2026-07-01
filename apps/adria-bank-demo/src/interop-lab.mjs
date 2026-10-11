const DEMO = true;

export const INTEROP_IDEAS = [
  { id: 'consent-cockpit', hr: 'Jedinstveni centar privola', en: 'Universal consent cockpit', detailHr: 'Jedno mjesto za pregled, ograničavanje i opoziv dozvola za bankovne podatke.', detailEn: 'One place to inspect, scope and revoke permissions for bank data.' },
  { id: 'all-bank-view', hr: 'Pregled svih banaka', en: 'All-bank financial view', detailHr: 'Ujednačeni prikaz računa i transakcija iz više izvora, bez miješanja pravnog statusa pružatelja.', detailEn: 'Normalize account and transaction views across sources without hiding provider legal status.' },
  { id: 'identity-fingerprint', hr: 'Kartica identiteta računa', en: 'Account protection fingerprint', detailHr: 'Uz svaki račun prikazati ugovornu instituciju i vrstu zaštite sredstava.', detailEn: 'Show the contracting institution and funds-protection type beside each account.' },
  { id: 'beneficiary-guard', hr: 'Zaštita primatelja', en: 'Beneficiary mismatch guard', detailHr: 'Upozoriti na nepodudaranje imena i formata primatelja prije slanja naloga.', detailEn: 'Flag a name/format mismatch before a payment instruction is sent.' },
  { id: 'route-optimizer', hr: 'Optimizator međubankovne rute', en: 'Cross-bank route optimizer', detailHr: 'Usporediti trošak, brzinu, raspoloživost i rizik neuspjeha pojedine rute.', detailEn: 'Compare a route’s cost, speed, availability and failure risk.' },
  { id: 'fx-total-cost', hr: 'Usporedba ukupnog FX troška', en: 'FX total-cost comparator', detailHr: 'U prikazu razdvojiti tečaj, maržu, naknadu i procijenjeni trošak posrednika.', detailEn: 'Separate rate, spread, fee and estimated intermediary costs.' },
  { id: 'cashflow-radar', hr: 'Radar novčanog toka', en: 'Cash-flow radar', detailHr: 'Privatni ili poslovni pregled priljeva i odlijeva uz korisničku kontrolu izvora.', detailEn: 'Personal or business inflow/outflow view with user-controlled data sources.' },
  { id: 'duplicate-scan', hr: 'Otkrivanje duplikata', en: 'Duplicate transaction scan', detailHr: 'Uočiti moguće dvostruke naplate preko uvezenih izvoda.', detailEn: 'Spot possible duplicate charges across imported statements.' },
  { id: 'eudi-credential', hr: 'Novčanik vjerodajnica', en: 'Selective credential wallet', detailHr: 'Dijeliti samo potreban atribut identiteta, uz izričitu privolu i zakonsku osnovu.', detailEn: 'Share only a needed identity attribute with explicit consent and a valid legal basis.' },
  { id: 'connector-resilience', hr: 'Otpornost konektora', en: 'Connector resilience mesh', detailHr: 'Nadzirati svježinu podataka i sigurno prijeći na rezervni izvor.', detailEn: 'Monitor data freshness and fail over safely to a backup source.' },
  { id: 'multi-venue-router', hr: 'Pametno usmjeravanje naloga', en: 'Multi-venue smart order routing', detailHr: 'U sandboxu usporediti cijenu, likvidnost, naknadu i očekivano klizanje.', detailEn: 'Compare price, liquidity, fees and expected slippage in a sandbox.' },
  { id: 'slippage-budget', hr: 'Proračun klizanja cijene', en: 'Slippage budget', detailHr: 'Prikazati raspon izvršenja i ograničenje veličine naloga prije potvrde.', detailEn: 'Preview an execution range and order-size cap before confirmation.' },
  { id: 'price-alerts', hr: 'Uvjetna upozorenja', en: 'Conditional market alerts', detailHr: 'Pokrenuti lokalno upozorenje na unaprijed zadanu cijenu bez predaje naloga.', detailEn: 'Trigger a local threshold alert without submitting an order.' },
  { id: 'reconciliation', hr: 'Usklađenje mjenjačnica', en: 'Exchange reconciliation', detailHr: 'Usporediti vlastite zapise s izvodom platforme i izdvojiti razlike.', detailEn: 'Compare internal records with a venue statement and isolate discrepancies.' },
  { id: 'custody-diversification', hr: 'Raspodjela rizika skrbništva', en: 'Custody concentration map', detailHr: 'Prikazati izloženost po drugoj ugovornoj strani, bez tvrdnje o dokazima pričuve.', detailEn: 'Visualize counterparty concentration without implying proof of reserves.' },
  { id: 'stablecoin-stress', hr: 'Stresni test stablecoina', en: 'Stablecoin stress board', detailHr: 'Modelirati odstupanje tečaja, likvidnosti i mogućnosti otkupa.', detailEn: 'Model a price deviation, liquidity shock and redemption scenario.' },
  { id: 'bridge-risk', hr: 'Procjena rizika mosta', en: 'Cross-chain bridge risk lab', detailHr: 'Vježbati prekid, kašnjenje i rizik pametnog ugovora bez stvarne mreže.', detailEn: 'Rehearse outage, delay and contract-risk scenarios without a live chain.' },
  { id: 'travel-rule', hr: 'Vježba podataka o prijenosu', en: 'Travel-rule review rehearsal', detailHr: 'Provjeriti nedostaju li fiksni sintetički podaci i treba li ljudska eskalacija.', detailEn: 'Check fixed synthetic transfer fields and whether human escalation is needed.' },
  { id: 'fee-tax-export', hr: 'Izvoz naknada i poreznih lotova', en: 'Fee and tax-lot export', detailHr: 'Izvesti transparentne troškove i sintetičke porezne lotove za stručnu provjeru.', detailEn: 'Export transparent fees and synthetic tax lots for professional review.' },
  { id: 'incident-room', hr: 'Kontrolna soba incidenta', en: 'Emergency incident room', detailHr: 'Jednim lokalnim prekidačem zaustaviti sve demonstracijske konektore i upozoriti tim.', detailEn: 'Use one local switch to pause demo connectors and alert the team.' }
];

export const INTEROP_FEATURES = [
  { id: 'consent-audit', idea: 'consent-cockpit', hr: 'Provjeri privole i opsege', en: 'Audit consent scopes', descriptionHr: 'Broji aktivne dozvole i potvrđuje da su sve samo za čitanje.', descriptionEn: 'Count active grants and verify every scope is read-only.' },
  { id: 'aggregate-balances', idea: 'all-bank-view', hr: 'Agregiraj sintetičke račune', en: 'Aggregate demo balances', descriptionHr: 'Zbroji EUR/USD salda dostupna u aktivnim lokalnim adapterima.', descriptionEn: 'Sum EUR/USD sample balances in enabled local adapters.' },
  { id: 'protection-map', idea: 'identity-fingerprint', hr: 'Prikaži karticu zaštite', en: 'Show protection fingerprint', descriptionHr: 'Razlikuje bankovni depozit, e-novac i platnu uslugu u edukativnom prikazu.', descriptionEn: 'Distinguish deposit, e-money and payment-service labels for education.' },
  { id: 'beneficiary-check', idea: 'beneficiary-guard', hr: 'Provjeri primatelja (demo)', en: 'Check beneficiary (demo)', descriptionHr: 'Pokreće samo lokalni primjer podudaranja/nepodudaranja; ne traži stvarni račun.', descriptionEn: 'Runs a local match/mismatch example; it never looks up a real account.' },
  { id: 'bank-route', idea: 'route-optimizer', hr: 'Usporedi bankovne rute', en: 'Compare bank routes', descriptionHr: 'Rangiraj fiktivne rute prema procijenjenoj naknadi i kašnjenju.', descriptionEn: 'Rank fictional routes by illustrative fee and latency.' },
  { id: 'fx-cost', idea: 'fx-total-cost', hr: 'Izračunaj ukupni FX trošak', en: 'Compare total FX cost', descriptionHr: 'Odvoji demo maržu i naknadu od prikazanog uzorka tečaja.', descriptionEn: 'Separate illustrative spread and fee from a sample reference rate.' },
  { id: 'cashflow-forecast', idea: 'cashflow-radar', hr: 'Izradi lokalnu prognozu', en: 'Build local cash-flow preview', descriptionHr: 'Izračunava jednostavnu prognozu iz nekoliko fiktivnih stavki.', descriptionEn: 'Builds a simple forecast from a few fictional entries.' },
  { id: 'duplicate-detect', idea: 'duplicate-scan', hr: 'Skeniraj duple stavke', en: 'Scan duplicate entries', descriptionHr: 'Označava jedan unaprijed pripremljen duplikat u sintetičkom feedu.', descriptionEn: 'Flags a seeded duplicate in the synthetic feed.' },
  { id: 'identity-minimization', idea: 'eudi-credential', hr: 'Pregledaj minimalne atribute', en: 'Review minimal attributes', descriptionHr: 'Prikazuje primjer dijeljenja samo dobi i države; ne koristi pravi identitet.', descriptionEn: 'Previews sharing age/country only; it does not use a real identity.' },
  { id: 'connector-health', idea: 'connector-resilience', hr: 'Testiraj zdravlje konektora', en: 'Check connector health', descriptionHr: 'Označi zastarjele lokalne snimke i predlaže rezervni adapter.', descriptionEn: 'Flags stale local snapshots and suggests a backup adapter.' },
  { id: 'venue-best-price', idea: 'multi-venue-router', hr: 'Usporedi sintetičke knjige', en: 'Compare demo order books', descriptionHr: 'Uspoređuje fiksne BTC/EUR ponude; nijedna cijena nije živa.', descriptionEn: 'Compares fixed BTC/EUR fixtures; no price is live.' },
  { id: 'slippage', idea: 'slippage-budget', hr: 'Procijeni klizanje', en: 'Preview slippage', descriptionHr: 'Izračunava ilustrativno klizanje na plitkoj sintetičkoj knjizi.', descriptionEn: 'Estimates illustrative slippage on a shallow synthetic book.' },
  { id: 'limit-alert', idea: 'price-alerts', hr: 'Postavi lokalni cjenovni alarm', en: 'Set a local price alert', descriptionHr: 'Zapisuje prag upozorenja; ne predaje nalog ni obavijest platformi.', descriptionEn: 'Stores a threshold alert; it submits nothing to a venue.' },
  { id: 'venue-reconcile', idea: 'reconciliation', hr: 'Uskladi demo stanje', en: 'Reconcile demo balances', descriptionHr: 'Uspoređuje fiktivnu knjigu i pokazuje unaprijed zadano odstupanje.', descriptionEn: 'Compares fictional ledgers and displays a seeded discrepancy.' },
  { id: 'counterparty-exposure', idea: 'custody-diversification', hr: 'Prikaži koncentraciju', en: 'Map counterparty exposure', descriptionHr: 'Prikazuje sintetičku izloženost po demonstracijskim platformama.', descriptionEn: 'Visualizes synthetic exposure across demo venues.' },
  { id: 'stablecoin-stress', idea: 'stablecoin-stress', hr: 'Pokreni stresni scenarij', en: 'Run stablecoin stress case', descriptionHr: 'Modelira fiktivni pad vrijednosti i mogući gubitak.', descriptionEn: 'Models a fictional depeg and potential loss.' },
  { id: 'bridge-risk', idea: 'bridge-risk', hr: 'Procijeni most (demo)', en: 'Score bridge risk (demo)', descriptionHr: 'Izračunava rizik iz zadanih scenarija prekida i kašnjenja.', descriptionEn: 'Scores seeded outage and delay scenarios.' },
  { id: 'travel-rule', idea: 'travel-rule', hr: 'Pregledaj sintetički prijenos', en: 'Review sample transfer fields', descriptionHr: 'Provjerava fiksna polja i usmjerava primjer na ljudski pregled.', descriptionEn: 'Checks fixed fields and routes the example to human review.' },
  { id: 'audit-export', idea: 'fee-tax-export', hr: 'Izvezi laboratorijski zapis', en: 'Export lab audit trail', descriptionHr: 'Preuzima JSON s oznakom demo i bez podataka izvan lokalnog sandboxa.', descriptionEn: 'Downloads a branded JSON log with no data from outside the sandbox.' },
  { id: 'kill-switch', idea: 'incident-room', hr: 'Prekidač zaustavljanja', en: 'Emergency kill switch', descriptionHr: 'Pauzira ili vraća samo lokalne simulacijske adaptere.', descriptionEn: 'Pauses or restores only local simulation adapters.' }
];

export const INTEROP_SYSTEMS = [
  { id: 'croatia', name: 'Adria Bank Croatia', country: 'Hrvatska / Croatia', city: 'Zagreb', flag: '🇭🇷', currency: 'EUR', timezone: 'Europe/Zagreb', cryptoPair: 'BTC/EUR', fxPair: 'USD/EUR', fxRate: 0.92, cutoffLocal: '15:00 demo cutoff', reserveCents: 24_800_000, cashOutCents: 8_700_000, noteHr: 'Hrvatski demo-profil', noteEn: 'Croatia demo profile' },
  { id: 'singapore', name: 'Adria Bank Singapore', country: 'Singapore', city: 'Singapore', flag: '🇸🇬', currency: 'SGD', timezone: 'Asia/Singapore', cryptoPair: 'BTC/SGD', fxPair: 'USD/SGD', fxRate: 1.35, cutoffLocal: '16:00 demo cutoff', reserveCents: 62_000_000, cashOutCents: 21_500_000, noteHr: 'Singapurski demo-profil', noteEn: 'Singapore demo profile' },
  { id: 'egypt', name: 'Adria Bank Egypt', country: 'Egypt / Egipat', city: 'Cairo / Kairo', flag: '🇪🇬', currency: 'EGP', timezone: 'Africa/Cairo', cryptoPair: 'BTC/EGP', fxPair: 'USD/EGP', fxRate: 48.2, cutoffLocal: '14:00 demo cutoff', reserveCents: 91_000_000, cashOutCents: 34_000_000, noteHr: 'Egipatski demo-profil', noteEn: 'Egypt demo profile' }
].map(system => ({ ...system, demoOnly: true, fictionalSystem: true, authorizedBank: false, externalConnections: false }));

const ADDITIONAL_IDEAS = [
  { id: 'scope-expiry-monitor', hr: 'Radar isteka privola', en: 'Consent expiry radar', detailHr: 'Prikazuje ogledne privole koje istječu i potrebnu lokalnu reviziju.', detailEn: 'Shows sample permissions nearing expiry for local review.', category: 'controls' },
  { id: 'revocation-impact', hr: 'Pregled učinka opoziva', en: 'Consent revocation impact preview', detailHr: 'Prije opoziva objašnjava koje bi se ogledne usluge zaustavile.', detailEn: 'Previews which sample services would stop after a revocation.', category: 'controls' },
  { id: 'statement-normalizer', hr: 'Studio za standardizaciju izvoda', en: 'Statement normalization studio', detailHr: 'Pretvara fiksna ogledna polja u jedan zajednički format zapisa.', detailEn: 'Maps fixed sample statement fields into one canonical format.', category: 'banking' },
  { id: 'data-quality-gate', hr: 'Kontrolna vrata kvalitete podataka', en: 'Financial data quality gate', detailHr: 'Provjerava sintetičke zapise na nedostajuće iznose, valute i datume.', detailEn: 'Checks synthetic rows for missing amounts, currencies and dates.', category: 'operations' },
  { id: 'transaction-categorizer', hr: 'Pametne kategorije transakcija', en: 'Transaction categorization workbench', detailHr: 'Razvrstava fiksne ogledne stavke uz objašnjiv razlog.', detailEn: 'Classifies fixed sample entries and shows a reason for each.', category: 'banking' },
  { id: 'recurring-patterns', hr: 'Radar ponavljajućih plaćanja', en: 'Recurring payment pattern radar', detailHr: 'Otkriva ogledne ritmove pretplata bez otkazivanja naloga.', detailEn: 'Finds sample subscription patterns without cancelling anything.', category: 'banking' },
  { id: 'cash-buffer-planner', hr: 'Planer novčane pričuve', en: 'Cash reserve buffer planner', detailHr: 'Uspoređuje fiktivnu pričuvu s korisnički postavljenim minimalnim pragom.', detailEn: 'Compares a fictional reserve with a user-selected floor.', category: 'banking' },
  { id: 'liquidity-ladder', hr: 'Ljestvica likvidnosti', en: 'Liquidity ladder', detailHr: 'Raspoređuje fiksne ogledne priljeve i odljeve po vremenskim horizontima.', detailEn: 'Buckets fixed sample inflows and outflows by time horizon.', category: 'banking' },
  { id: 'fee-anomaly-scout', hr: 'Detektor odstupanja naknada', en: 'Fee anomaly scout', detailHr: 'Izdvaja sintetičke naknade koje odskaču od oglednog raspona.', detailEn: 'Flags synthetic fees outside an illustrative range.', category: 'controls' },
  { id: 'cutoff-calendar', hr: 'Kalendar lokalnih rokova', en: 'Local cut-off calendar', detailHr: 'Prikazuje fiksni ogledni rok prema odabranom demo-sustavu i zoni.', detailEn: 'Displays a fixed illustrative cut-off for the selected demo system.', category: 'operations' },
  { id: 'batch-quality', hr: 'Provjera serije primatelja', en: 'Payee batch quality check', detailHr: 'Provjerava sintetičku seriju primatelja prije bilo kakvog izvoza.', detailEn: 'Validates a synthetic payee batch before any export.', category: 'payments' },
  { id: 'fx-stress-planner', hr: 'Planer FX stresnih scenarija', en: 'FX stress and hedge planner', detailHr: 'Uspoređuje fiksni valutni šok; ne postavlja zaštitu ni nalog.', detailEn: 'Compares a fixed currency shock without placing a hedge or order.', category: 'banking' },
  { id: 'cross-border-cost', hr: 'Transparentni prekogranični trošak', en: 'Cross-border cost breakdown', detailHr: 'Raščlanjuje oglednu naknadu, posrednika i konverziju valute.', detailEn: 'Breaks down sample fees, intermediary cost and currency conversion.', category: 'payments' },
  { id: 'cash-concentration', hr: 'Planer koncentracije gotovine', en: 'Cash concentration planner', detailHr: 'Predlaže fiktivnu internu raspodjelu bez izrade naloga.', detailEn: 'Suggests a fictional internal allocation without creating instructions.', category: 'banking' },
  { id: 'nostro-reconciliation', hr: 'Usklađenje nostro računa', en: 'Nostro reconciliation rehearsal', detailHr: 'Uspoređuje sintetički bankovni zapis i fiksni ogledni izvod.', detailEn: 'Compares a synthetic bank record with a fixed sample statement.', category: 'operations' },
  { id: 'protection-explainer', hr: 'Objašnjenje vrste zaštite sredstava', en: 'Funds protection explainer', detailHr: 'Edukativno razlikuje depozit, e-novac i platni saldo bez tvrdnje o pokriću.', detailEn: 'Explains deposit, e-money and payment balances without a coverage claim.', category: 'controls' },
  { id: 'dispute-lifecycle', hr: 'Vježba životnog ciklusa spora', en: 'Dispute lifecycle studio', detailHr: 'Prolazi fiktivni spor kroz lokalne korake zaprimanja i pregleda.', detailEn: 'Walks a fictional dispute through local intake and review stages.', category: 'operations' },
  { id: 'chargeback-checklist', hr: 'Kontrolni popis prigovora', en: 'Chargeback evidence checklist', detailHr: 'Provjerava potpunost sintetičkih dokaza bez mreže kartičnog prihvata.', detailEn: 'Checks synthetic evidence completeness without a card network.', category: 'operations' },
  { id: 'fraud-tabletop', hr: 'Vježba odgovora na prijevaru', en: 'Fraud response tabletop', detailHr: 'Simulira fiksni incident i lokalni slijed odgovora; nema detekcije stvarne prijevare.', detailEn: 'Rehearses a fixed incident and local response steps, not real fraud detection.', category: 'controls' },
  { id: 'aml-queue-priority', hr: 'Prioritizacija AML reda', en: 'AML queue prioritizer', detailHr: 'Rangira samo fiktivne primjere; ne nadzire stvarne transakcije niti donosi odluke.', detailEn: 'Ranks fictional examples only; it neither monitors nor decides real cases.', category: 'controls' },
  { id: 'sanctions-escalation', hr: 'Vježba eskalacije sankcija', en: 'Sanctions escalation rehearsal', detailHr: 'Vježba fiksnu granu eskalacije bez provjere sankcijskih lista.', detailEn: 'Rehearses a fixed escalation branch without checking sanctions lists.', category: 'controls' },
  { id: 'pep-coaching', hr: 'Vodič za PEP pregled', en: 'PEP review coaching', detailHr: 'Prikazuje sintetički kontrolni popis; ne radi PEP provjeru.', detailEn: 'Shows a synthetic checklist; it does not screen for PEPs.', category: 'controls' },
  { id: 'maker-checker-map', hr: 'Mapa maker-checker koraka', en: 'Maker-checker workflow map', detailHr: 'Vizualizira razdvajanje uloga u fiksnom oglednom postupku.', detailEn: 'Visualizes role separation in a fixed sample workflow.', category: 'operations' },
  { id: 'audit-evidence-pack', hr: 'Paket oglednih dokaza revizije', en: 'Audit evidence pack builder', detailHr: 'Sastavlja lokalni popis oglednih događaja s oznakom DEMO.', detailEn: 'Builds a local index of sample events with a DEMO label.', category: 'operations' },
  { id: 'portability-kit', hr: 'Komplet prenosivosti podataka', en: 'Data portability kit', detailHr: 'Provjerava izvoz fiktivnih podataka bez uključivanja stvarnih klijenata.', detailEn: 'Validates a fictional-data export without including real customers.', category: 'operations' },
  { id: 'session-hygiene', hr: 'Higijena oglednih sesija', en: 'Session hygiene rehearsal', detailHr: 'Pregledava fiksne demo-sesije i prikazuje lokalno istjecanje.', detailEn: 'Reviews fixed demo sessions and previews local expiry.', category: 'controls' },
  { id: 'passkey-readiness', hr: 'Procjena spremnosti za passkey', en: 'Passkey readiness checklist', detailHr: 'Pokazuje lokalnu kontrolnu listu bez kreiranja ili čitanja vjerodajnica.', detailEn: 'Shows a local checklist without creating or reading credentials.', category: 'controls' },
  { id: 'crypto-withdrawal-preflight', hr: 'Predprovjera kripto isplate', en: 'Crypto withdrawal preflight', detailHr: 'Provjerava samo format sintetičkog primjera; ništa se ne emitira.', detailEn: 'Checks only a synthetic format example; nothing is broadcast.', category: 'crypto' },
  { id: 'wallet-format-lab', hr: 'Laboratorij formata adrese', en: 'Wallet address format lab', detailHr: 'Vježba oblik adrese bez traženja salda ili blockchain zapisa.', detailEn: 'Tests address shape without looking up balances or chain records.', category: 'crypto' },
  { id: 'custody-allocation', hr: 'Planer raspodjele skrbništva', en: 'Custody allocation planner', detailHr: 'Raspoređuje fiktivne iznose među oglednim pružateljima skrbništva.', detailEn: 'Allocates fictional amounts among sample custody providers.', category: 'crypto' }
];

const ADDITIONAL_FEATURES = [
  { id: 'scope-expiry', idea: 'scope-expiry-monitor', hr: 'Provjeri istek oglednih privola', en: 'Check sample consent expiry', category: 'controls' },
  { id: 'revocation-preview', idea: 'revocation-impact', hr: 'Pregledaj učinak opoziva', en: 'Preview revocation impact', category: 'controls' },
  { id: 'statement-normalizer', idea: 'statement-normalizer', hr: 'Normaliziraj ogledni izvod', en: 'Normalize a sample statement', category: 'banking' },
  { id: 'data-quality-gate', idea: 'data-quality-gate', hr: 'Pokreni vrata kvalitete podataka', en: 'Run the data quality gate', category: 'operations' },
  { id: 'transaction-categorizer', idea: 'transaction-categorizer', hr: 'Kategoriziraj ogledne transakcije', en: 'Categorize sample transactions', category: 'banking' },
  { id: 'recurring-patterns', idea: 'recurring-patterns', hr: 'Otkrij ponavljajuće uzorke', en: 'Detect recurring patterns', category: 'banking' },
  { id: 'cash-buffer', idea: 'cash-buffer-planner', hr: 'Izračunaj novčanu pričuvu', en: 'Calculate a sample cash buffer', category: 'banking' },
  { id: 'liquidity-ladder', idea: 'liquidity-ladder', hr: 'Izradi ljestvicu likvidnosti', en: 'Build a liquidity ladder', category: 'banking' },
  { id: 'fee-anomaly', idea: 'fee-anomaly-scout', hr: 'Označi odstupanja naknada', en: 'Flag sample fee outliers', category: 'controls' },
  { id: 'cutoff-calendar', idea: 'cutoff-calendar', hr: 'Otvori demo kalendar rokova', en: 'Preview the local cut-off calendar', category: 'operations' },
  { id: 'batch-quality', idea: 'batch-quality', hr: 'Provjeri seriju primatelja', en: 'Validate the payee batch', category: 'payments' },
  { id: 'fx-stress', idea: 'fx-stress-planner', hr: 'Pokreni FX stresni test', en: 'Run an FX stress preview', category: 'banking' },
  { id: 'cross-border-cost', idea: 'cross-border-cost', hr: 'Raščlani prekogranične troškove', en: 'Break down cross-border costs', category: 'payments' },
  { id: 'cash-concentration', idea: 'cash-concentration', hr: 'Izradi plan koncentracije gotovine', en: 'Preview cash concentration', category: 'banking' },
  { id: 'nostro-reconciliation', idea: 'nostro-reconciliation', hr: 'Uskladi ogledni nostro zapis', en: 'Reconcile the sample nostro record', category: 'operations' },
  { id: 'protection-explainer', idea: 'protection-explainer', hr: 'Objasni vrste zaštite', en: 'Explain funds protection types', category: 'controls' },
  { id: 'dispute-lifecycle', idea: 'dispute-lifecycle', hr: 'Provedi ogledni spor kroz faze', en: 'Advance the sample dispute', category: 'operations' },
  { id: 'chargeback-checklist', idea: 'chargeback-checklist', hr: 'Provjeri popis dokaza', en: 'Check sample dispute evidence', category: 'operations' },
  { id: 'fraud-tabletop', idea: 'fraud-tabletop', hr: 'Pokreni vježbu incidenta', en: 'Run the fraud tabletop', category: 'controls' },
  { id: 'aml-priority', idea: 'aml-queue-priority', hr: 'Poredaj AML ogledne slučajeve', en: 'Prioritize sample AML cases', category: 'controls' },
  { id: 'sanctions-rehearsal', idea: 'sanctions-escalation', hr: 'Vježbaj eskalaciju', en: 'Rehearse an escalation', category: 'controls' },
  { id: 'pep-coaching', idea: 'pep-coaching', hr: 'Otvori PEP ogledni popis', en: 'Review the PEP sample checklist', category: 'controls' },
  { id: 'maker-checker-map', idea: 'maker-checker-map', hr: 'Prikaži maker-checker matricu', en: 'Show the maker-checker matrix', category: 'operations' },
  { id: 'audit-evidence-pack', idea: 'audit-evidence-pack', hr: 'Sastavi paket oglednih dokaza', en: 'Build a sample evidence pack', category: 'operations' },
  { id: 'portability-kit', idea: 'portability-kit', hr: 'Provjeri komplet za izvoz', en: 'Validate a data portability kit', category: 'operations' },
  { id: 'session-hygiene', idea: 'session-hygiene', hr: 'Pregledaj demo-sesije', en: 'Review fictional sessions', category: 'controls' },
  { id: 'passkey-readiness', idea: 'passkey-readiness', hr: 'Procijeni passkey spremnost', en: 'Check passkey readiness', category: 'controls' },
  { id: 'crypto-preflight', idea: 'crypto-withdrawal-preflight', hr: 'Pokreni predprovjeru kripta', en: 'Run crypto withdrawal preflight', category: 'crypto' },
  { id: 'wallet-format', idea: 'wallet-format-lab', hr: 'Provjeri format demo-adrese', en: 'Check a demo address format', category: 'crypto' },
  { id: 'custody-allocation', idea: 'custody-allocation', hr: 'Izračunaj raspodjelu skrbništva', en: 'Calculate sample custody allocation', category: 'crypto' }
];

INTEROP_IDEAS.push(...ADDITIONAL_IDEAS);
INTEROP_FEATURES.push(...ADDITIONAL_FEATURES);
const LEGACY_CATEGORIES = {
  'consent-audit': 'controls', 'aggregate-balances': 'banking', 'protection-map': 'controls',
  'beneficiary-check': 'payments', 'bank-route': 'payments', 'fx-cost': 'payments',
  'cashflow-forecast': 'banking', 'duplicate-detect': 'controls', 'identity-minimization': 'controls',
  'connector-health': 'operations', 'venue-best-price': 'crypto', slippage: 'crypto',
  'limit-alert': 'crypto', 'venue-reconcile': 'crypto', 'counterparty-exposure': 'crypto',
  'stablecoin-stress': 'crypto', 'bridge-risk': 'crypto', 'travel-rule': 'controls',
  'audit-export': 'operations', 'kill-switch': 'operations'
};
for (const feature of INTEROP_FEATURES) {
  feature.category ||= LEGACY_CATEGORIES[feature.id] || 'banking';
  const idea = INTEROP_IDEAS.find(item => item.id === feature.idea);
  if (idea) {
    idea.category ||= feature.category;
    if (feature.descriptionHr) idea.detailHr ||= feature.descriptionHr;
    if (feature.descriptionEn) idea.detailEn ||= feature.descriptionEn;
  }
}
for (const feature of ADDITIONAL_FEATURES) {
  const idea = ADDITIONAL_IDEAS.find(item => item.id === feature.idea);
  feature.descriptionHr = idea.detailHr;
  feature.descriptionEn = idea.detailEn;
}

const INTEROP_CONTENT_TRANSLATIONS = {
  de: {
    ideas: {
      'consent-cockpit': ['Zentrale Einwilligungsübersicht', 'Bankdatenfreigaben prüfen, begrenzen und widerrufen.'],
      'all-bank-view': ['Finanzübersicht über alle Banken', 'Konten und Umsätze mehrerer Anbieter einheitlich anzeigen.'],
      'identity-fingerprint': ['Schutzprofil des Kontos', 'Vertragspartner und Art des Schutzes je Konto anzeigen.'],
      'beneficiary-guard': ['Empfänger-Abgleichschutz', 'Namens- oder Formatabweichungen vor einer Anweisung markieren.'],
      'route-optimizer': ['Optimierer für Bankrouten', 'Kosten, Tempo, Verfügbarkeit und Ausfallrisiko vergleichen.'],
      'fx-total-cost': ['FX-Gesamtkostenvergleich', 'Kurs, Aufschlag, Gebühr und Intermediärkosten getrennt ausweisen.'],
      'cashflow-radar': ['Cashflow-Radar', 'Ein- und Ausgänge aus nutzerkontrollierten Quellen überwachen.'],
      'duplicate-scan': ['Transaktionsduplikate erkennen', 'Mögliche Doppelbelastungen in importierten Auszügen markieren.'],
      'eudi-credential': ['Selektiver Berechtigungs-Wallet', 'Nur benötigte Identitätsmerkmale mit Einwilligung teilen.'],
      'connector-resilience': ['Ausfallsicheres Connector-Netz', 'Datenalter prüfen und sicher auf eine Ersatzquelle umschalten.'],
      'multi-venue-router': ['Intelligentes Routing über Börsen', 'Preis, Liquidität, Gebühr und Slippage vergleichen.'],
      'slippage-budget': ['Slippage-Budget', 'Ausführungsspanne und Größenlimit vor Bestätigung anzeigen.'],
      'price-alerts': ['Bedingte Marktalarme', 'Lokale Preisschwellen melden, ohne eine Order auszuführen.'],
      reconciliation: ['Börsenabgleich', 'Interne Aufzeichnungen mit Plattformauszügen vergleichen.'],
      'custody-diversification': ['Verwahrungskonzentrationskarte', 'Synthetische Gegenparteikonzentration visualisieren.'],
      'stablecoin-stress': ['Stablecoin-Stresstest', 'Preisabweichung, Liquidität und Rücktausch modellieren.'],
      'bridge-risk': ['Cross-Chain-Bridge-Risikolabor', 'Ausfall, Verzögerung und Contract-Risiken ohne Live-Chain üben.'],
      'travel-rule': ['Travel-Rule-Prüfung', 'Fehlende Übertragungsfelder erkennen und manuell eskalieren.'],
      'fee-tax-export': ['Gebühren- und Steuerlot-Export', 'Kosten und synthetische Steuer-Lots zur Prüfung exportieren.'],
      'incident-room': ['Notfall-Leitstelle', 'Demo-Adapter lokal anhalten und das Team alarmieren.']
    },
    features: {
      'consent-audit': ['Einwilligungsbereiche prüfen', 'Aktive Leserechte zählen; Schreib- und Zahlungsrechte ausschließen.'],
      'aggregate-balances': ['Beispielsalden aggregieren', 'Aktive lokale EUR- und USD-Fixtures summieren.'],
      'protection-map': ['Schutzprofil anzeigen', 'Einlage, E-Geld und Zahlungsdienst getrennt kennzeichnen.'],
      'beneficiary-check': ['Empfänger prüfen (Demo)', 'Fiktiven Namensabgleich ausführen, ohne Kontosuche.'],
      'bank-route': ['Bankrouten vergleichen', 'Fiktive Routen nach Beispielgebühr und Verzögerung ordnen.'],
      'fx-cost': ['FX-Gesamtkosten vergleichen', 'Beispielaufschlag und Gebühr vom Referenzkurs trennen.'],
      'cashflow-forecast': ['Lokale Cashflow-Vorschau', 'Einfache Prognose aus fiktiven Positionen berechnen.'],
      'duplicate-detect': ['Doppelte Einträge suchen', 'Ein vorbereitetes Duplikat im synthetischen Feed markieren.'],
      'identity-minimization': ['Minimale Identitätsmerkmale prüfen', 'Nur Alters- und Länderbeispiel anzeigen; keine Identität nutzen.'],
      'connector-health': ['Connector-Zustand prüfen', 'Veraltete lokale Snapshots markieren und Ersatz nennen.'],
      'venue-best-price': ['Beispielorderbücher vergleichen', 'Feste BTC/EUR-Angebote vergleichen; kein Preis ist live.'],
      slippage: ['Slippage vorschauen', 'Preiswirkung anhand eines flachen Beispielorderbuchs schätzen.'],
      'limit-alert': ['Lokalen Preisalarm setzen', 'Schwelle lokal speichern; keine Plattformnachricht oder Order senden.'],
      'venue-reconcile': ['Demo-Salden abgleichen', 'Fiktive Bücher vergleichen und eine Abweichung markieren.'],
      'counterparty-exposure': ['Gegenparteirisiko abbilden', 'Synthetische Verteilung ohne Solvenz- oder Reserveaussage anzeigen.'],
      'stablecoin-stress': ['Stablecoin-Stressfall testen', 'Einen fiktiven Kursverlust als Szenario berechnen.'],
      'bridge-risk': ['Bridge-Risiko bewerten (Demo)', 'Feste Ausfall- und Verzögerungsszenarien bewerten.'],
      'travel-rule': ['Beispieltransfer prüfen', 'Feste Felder prüfen und an menschliche Prüfung verweisen.'],
      'audit-export': ['Laborprotokoll exportieren', 'Markiertes JSON nur mit synthetischen Daten herunterladen.'],
      'kill-switch': ['Not-Aus-Schalter', 'Nur lokale Simulationsadapter anhalten oder wiederherstellen.']
    }
  },
  fr: {
    ideas: {
      'consent-cockpit': ['Centre de gestion des consentements', 'Examiner, limiter et révoquer les autorisations sur les données bancaires.'],
      'all-bank-view': ['Vue financière multi-banques', 'Unifier les comptes et opérations de plusieurs sources.'],
      'identity-fingerprint': ['Profil de protection du compte', 'Afficher le prestataire contractuel et le type de protection des fonds.'],
      'beneficiary-guard': ['Protection contre les écarts de bénéficiaire', 'Signaler un écart de nom ou de format avant instruction.'],
      'route-optimizer': ['Optimisation des routes bancaires', 'Comparer coût, délai, disponibilité et risque d’échec.'],
      'fx-total-cost': ['Comparateur du coût FX total', 'Distinguer taux, marge, frais et coûts d’intermédiaire estimés.'],
      'cashflow-radar': ['Radar de trésorerie', 'Suivre les flux issus de sources contrôlées par l’utilisateur.'],
      'duplicate-scan': ['Détection des doublons', 'Repérer d’éventuels débits en double dans les relevés importés.'],
      'eudi-credential': ['Portefeuille d’attributs sélectifs', 'Partager uniquement l’attribut requis avec consentement valable.'],
      'connector-resilience': ['Résilience des connecteurs', 'Surveiller la fraîcheur et basculer vers une source de secours.'],
      'multi-venue-router': ['Routage intelligent multi-plateformes', 'Comparer prix, liquidité, frais et glissement estimé.'],
      'slippage-budget': ['Budget de glissement', 'Prévisualiser la fourchette et la taille maximale avant confirmation.'],
      'price-alerts': ['Alertes de marché conditionnelles', 'Déclencher une alerte locale sans passer d’ordre.'],
      reconciliation: ['Rapprochement des plateformes', 'Comparer les registres internes aux relevés des plateformes.'],
      'custody-diversification': ['Carte de concentration de conservation', 'Visualiser la concentration synthétique des contreparties.'],
      'stablecoin-stress': ['Tableau de stress des stablecoins', 'Modéliser décrochage, liquidité et possibilité de rachat.'],
      'bridge-risk': ['Laboratoire de risque de pont inter-chaînes', 'Exercer les scénarios de panne et de délai sans réseau actif.'],
      'travel-rule': ['Exercice de revue Travel Rule', 'Repérer les champs manquants et prévoir une revue humaine.'],
      'fee-tax-export': ['Export des frais et lots fiscaux', 'Exporter les coûts et lots fiscaux synthétiques pour examen.'],
      'incident-room': ['Salle de crise', 'Suspendre localement les adaptateurs de démo et alerter l’équipe.']
    },
    features: {
      'consent-audit': ['Auditer les autorisations', 'Compter les droits de lecture et vérifier l’absence d’écriture.'],
      'aggregate-balances': ['Agrégater les soldes de démo', 'Additionner les soldes EUR/USD des adaptateurs locaux actifs.'],
      'protection-map': ['Afficher le profil de protection', 'Distinguer dépôt, monnaie électronique et service de paiement.'],
      'beneficiary-check': ['Vérifier le bénéficiaire (démo)', 'Exécuter un exemple de nom sans recherche de compte.'],
      'bank-route': ['Comparer les routes bancaires', 'Classer les routes fictives par frais et délai indicatifs.'],
      'fx-cost': ['Comparer le coût FX total', 'Séparer marge et frais du taux de référence d’exemple.'],
      'cashflow-forecast': ['Prévision locale de trésorerie', 'Calculer une prévision simple à partir de données fictives.'],
      'duplicate-detect': ['Scanner les doublons', 'Signaler un doublon préparé dans le flux synthétique.'],
      'identity-minimization': ['Revoir les attributs minimaux', 'Illustrer âge et pays sans utiliser d’identité réelle.'],
      'connector-health': ['Vérifier la santé des connecteurs', 'Repérer les instantanés anciens et suggérer un secours.'],
      'venue-best-price': ['Comparer les carnets de démo', 'Comparer des offres BTC/EUR fixes, jamais en temps réel.'],
      slippage: ['Prévisualiser le glissement', 'Estimer l’impact sur un carnet synthétique peu profond.'],
      'limit-alert': ['Créer une alerte locale', 'Enregistrer un seuil sans notification externe ni ordre.'],
      'venue-reconcile': ['Rapprocher les soldes de démo', 'Comparer des registres fictifs et signaler un écart.'],
      'counterparty-exposure': ['Cartographier l’exposition', 'Afficher une répartition fictive sans conclure à la solvabilité.'],
      'stablecoin-stress': ['Lancer un stress stablecoin', 'Modéliser une baisse fictive, pas une prévision.'],
      'bridge-risk': ['Noter le risque de pont (démo)', 'Évaluer des scénarios fixes de panne et de délai.'],
      'travel-rule': ['Examiner les champs de transfert', 'Vérifier les champs fixes et orienter vers une revue humaine.'],
      'audit-export': ['Exporter le journal du labo', 'Télécharger un JSON marqué avec des données synthétiques.'],
      'kill-switch': ['Arrêt d’urgence', 'Suspendre ou restaurer uniquement les adaptateurs locaux.']
    }
  },
  es: {
    ideas: {
      'consent-cockpit': ['Panel central de consentimientos', 'Revisar, limitar y revocar permisos sobre datos bancarios.'],
      'all-bank-view': ['Vista financiera de todos los bancos', 'Unificar cuentas y movimientos de varias fuentes.'],
      'identity-fingerprint': ['Ficha de protección de la cuenta', 'Mostrar entidad contractual y tipo de protección de fondos.'],
      'beneficiary-guard': ['Protección ante discrepancias del beneficiario', 'Marcar diferencias de nombre o formato antes de instruir.'],
      'route-optimizer': ['Optimizador de rutas bancarias', 'Comparar coste, velocidad, disponibilidad y riesgo de fallo.'],
      'fx-total-cost': ['Comparador del coste total de divisa', 'Separar tipo, margen, comisión y coste de intermediarios.'],
      'cashflow-radar': ['Radar de flujo de caja', 'Supervisar entradas y salidas desde fuentes controladas por el usuario.'],
      'duplicate-scan': ['Detección de transacciones duplicadas', 'Señalar posibles cargos repetidos en extractos importados.'],
      'eudi-credential': ['Billetera de credenciales selectivas', 'Compartir solo el atributo necesario con consentimiento válido.'],
      'connector-resilience': ['Red resiliente de conectores', 'Vigilar la antigüedad y cambiar a una fuente de respaldo.'],
      'multi-venue-router': ['Enrutamiento inteligente entre plataformas', 'Comparar precio, liquidez, comisión y deslizamiento estimado.'],
      'slippage-budget': ['Presupuesto de deslizamiento', 'Prever rango y tamaño máximo antes de confirmar.'],
      'price-alerts': ['Alertas condicionales de mercado', 'Generar una alerta local sin enviar una orden.'],
      reconciliation: ['Conciliación de exchanges', 'Comparar registros internos con extractos de plataformas.'],
      'custody-diversification': ['Mapa de concentración de custodia', 'Visualizar concentración sintética por contraparte.'],
      'stablecoin-stress': ['Panel de estrés de stablecoins', 'Modelar desviación de precio, liquidez y reembolso.'],
      'bridge-risk': ['Laboratorio de riesgo de puentes', 'Practicar fallos y retrasos sin una cadena activa.'],
      'travel-rule': ['Ensayo de revisión Travel Rule', 'Detectar campos ausentes y derivar a revisión humana.'],
      'fee-tax-export': ['Exportación de comisiones y lotes fiscales', 'Exportar costes y lotes fiscales sintéticos para revisión.'],
      'incident-room': ['Sala de incidentes', 'Pausar adaptadores demo locales y alertar al equipo.']
    },
    features: {
      'consent-audit': ['Auditar permisos de consentimiento', 'Contar permisos de lectura y confirmar que no hay escritura.'],
      'aggregate-balances': ['Agregar saldos de demo', 'Sumar muestras EUR/USD de adaptadores locales activos.'],
      'protection-map': ['Mostrar ficha de protección', 'Distinguir depósito, dinero electrónico y servicio de pago.'],
      'beneficiary-check': ['Comprobar beneficiario (demo)', 'Ejecutar un ejemplo de nombre sin buscar una cuenta.'],
      'bank-route': ['Comparar rutas bancarias', 'Ordenar rutas ficticias por coste y demora indicativos.'],
      'fx-cost': ['Comparar coste total de divisa', 'Separar margen y comisión del tipo de referencia de muestra.'],
      'cashflow-forecast': ['Previsión local de flujo de caja', 'Calcular una previsión simple con datos ficticios.'],
      'duplicate-detect': ['Buscar entradas duplicadas', 'Marcar un duplicado preparado en el flujo sintético.'],
      'identity-minimization': ['Revisar atributos mínimos', 'Mostrar edad y país de ejemplo sin usar identidad real.'],
      'connector-health': ['Revisar salud de conectores', 'Marcar muestras antiguas y sugerir una alternativa.'],
      'venue-best-price': ['Comparar libros de órdenes demo', 'Comparar ofertas BTC/EUR fijas, ninguna es en vivo.'],
      slippage: ['Prever deslizamiento', 'Estimar impacto en un libro sintético de poca profundidad.'],
      'limit-alert': ['Crear alerta local de precio', 'Guardar un umbral sin avisos externos ni órdenes.'],
      'venue-reconcile': ['Conciliar saldos demo', 'Comparar libros ficticios y señalar una diferencia.'],
      'counterparty-exposure': ['Mapear exposición de contraparte', 'Mostrar reparto sintético sin conclusión de solvencia.'],
      'stablecoin-stress': ['Probar estrés de stablecoin', 'Modelar una caída ficticia, no una previsión.'],
      'bridge-risk': ['Puntuar riesgo de puente (demo)', 'Evaluar escenarios fijos de fallo y demora.'],
      'travel-rule': ['Revisar campos de transferencia', 'Validar campos fijos y derivar a revisión humana.'],
      'audit-export': ['Exportar registro del laboratorio', 'Descargar JSON marcado con datos sintéticos únicamente.'],
      'kill-switch': ['Interruptor de emergencia', 'Pausar o restaurar solo adaptadores de simulación locales.']
    }
  },
  ar: {
    ideas: {
      'consent-cockpit': ['مركز موحد للموافقات', 'مراجعة أذونات بيانات البنوك وتحديدها وإلغاؤها.'],
      'all-bank-view': ['عرض مالي لجميع البنوك', 'توحيد عرض الحسابات والمعاملات من مصادر متعددة.'],
      'identity-fingerprint': ['بطاقة حماية الحساب', 'إظهار المؤسسة المتعاقد معها ونوع حماية الأموال.'],
      'beneficiary-guard': ['حماية من اختلاف المستفيد', 'التنبيه لاختلاف الاسم أو التنسيق قبل إعداد التعليمات.'],
      'route-optimizer': ['محسن المسارات بين البنوك', 'مقارنة التكلفة والسرعة والتوافر ومخاطر الفشل.'],
      'fx-total-cost': ['مقارن التكلفة الإجمالية للصرف', 'فصل السعر والهامش والرسوم وتكلفة الوسيط المقدرة.'],
      'cashflow-radar': ['رادار التدفق النقدي', 'متابعة التدفقات من مصادر يتحكم بها المستخدم.'],
      'duplicate-scan': ['كشف المعاملات المكررة', 'رصد الرسوم المكررة المحتملة في الكشوف المستوردة.'],
      'eudi-credential': ['محفظة السمات الانتقائية', 'مشاركة السمة اللازمة فقط بموافقة صريحة وأساس قانوني.'],
      'connector-resilience': ['شبكة موائمات مرنة', 'مراقبة حداثة البيانات والتحول الآمن إلى مصدر احتياطي.'],
      'multi-venue-router': ['توجيه ذكي بين المنصات', 'مقارنة السعر والسيولة والرسوم والانزلاق المتوقع.'],
      'slippage-budget': ['ميزانية انزلاق السعر', 'عرض نطاق التنفيذ والحد الأقصى للحجم قبل التأكيد.'],
      'price-alerts': ['تنبيهات سوق مشروطة', 'إطلاق تنبيه محلي للسعر دون إرسال أمر.'],
      reconciliation: ['تسوية سجلات المنصات', 'مقارنة السجلات الداخلية بكشوف المنصة.'],
      'custody-diversification': ['خريطة تركّز الحفظ', 'عرض تركّز اصطناعي حسب الطرف المقابل.'],
      'stablecoin-stress': ['لوحة ضغط العملات المستقرة', 'نمذجة انحراف السعر والسيولة وإمكانية الاسترداد.'],
      'bridge-risk': ['مختبر مخاطر الجسر بين الشبكات', 'التدرب على الانقطاع والتأخير ومخاطر العقود دون شبكة حية.'],
      'travel-rule': ['تدريب مراجعة قاعدة السفر', 'كشف حقول التحويل الناقصة وتوجيهها للمراجعة البشرية.'],
      'fee-tax-export': ['تصدير الرسوم والدفعات الضريبية', 'تصدير التكاليف والدفعات الاصطناعية لمراجعة مختص.'],
      'incident-room': ['غرفة الاستجابة للطوارئ', 'إيقاف موائمات العرض محلياً وتنبيه الفريق.']
    },
    features: {
      'consent-audit': ['تدقيق نطاقات الموافقة', 'عدّ أذونات القراءة النشطة والتحقق من عدم وجود كتابة.'],
      'aggregate-balances': ['تجميع الأرصدة التجريبية', 'جمع عينات EUR وUSD للموائمات المحلية المفعلة.'],
      'protection-map': ['عرض بطاقة الحماية', 'تمييز الوديعة والنقود الإلكترونية وخدمة الدفع.'],
      'beneficiary-check': ['فحص المستفيد التجريبي', 'تشغيل مثال محلي للاسم دون البحث عن حساب.'],
      'bank-route': ['مقارنة المسارات البنكية', 'ترتيب المسارات الوهمية حسب الرسوم والتأخير التوضيحي.'],
      'fx-cost': ['مقارنة تكلفة الصرف', 'فصل الهامش والرسوم عن سعر المرجع التجريبي.'],
      'cashflow-forecast': ['معاينة محلية للتدفق النقدي', 'حساب توقع بسيط من بيانات افتراضية.'],
      'duplicate-detect': ['فحص التكرار', 'تمييز تكرار مهيأ في سجل اصطناعي.'],
      'identity-minimization': ['مراجعة الحد الأدنى للسمات', 'عرض العمر والبلد كمثال دون استخدام هوية حقيقية.'],
      'connector-health': ['فحص حالة الموائمات', 'تمييز اللقطات القديمة واقتراح بديل محلي.'],
      'venue-best-price': ['مقارنة دفاتر أوامر تجريبية', 'مقارنة عروض BTC/EUR ثابتة وليست حية.'],
      slippage: ['معاينة انزلاق السعر', 'تقدير الأثر على دفتر أوامر اصطناعي محدود العمق.'],
      'limit-alert': ['إعداد تنبيه سعر محلي', 'حفظ حد محلي دون إشعار خارجي أو أمر.'],
      'venue-reconcile': ['تسوية أرصدة تجريبية', 'مقارنة سجلات وهمية وإظهار فرق مهيأ.'],
      'counterparty-exposure': ['رسم تعرض الأطراف المقابلة', 'عرض توزيع اصطناعي دون استنتاج الملاءة.'],
      'stablecoin-stress': ['تشغيل ضغط للعملة المستقرة', 'نمذجة انخفاض افتراضي لا يمثل توقعاً.'],
      'bridge-risk': ['تقييم مخاطر الجسر التجريبي', 'تقييم سيناريوهات انقطاع وتأخير ثابتة.'],
      'travel-rule': ['مراجعة حقول التحويل التجريبي', 'فحص الحقول الثابتة وإحالة المثال لمراجع بشري.'],
      'audit-export': ['تصدير سجل المختبر', 'تنزيل JSON موسوم يحتوي بيانات اصطناعية فقط.'],
      'kill-switch': ['مفتاح الإيقاف الطارئ', 'إيقاف موائمات المحاكاة المحلية أو استعادتها فقط.']
    }
  },
  sw: {
    ideas: {
      'consent-cockpit': ['Kituo cha idhini za data', 'Kagua, punguza na batilisha ruhusa za taarifa za benki.'],
      'all-bank-view': ['Muonekano wa fedha wa benki zote', 'Unganisha akaunti na miamala kutoka vyanzo vingi.'],
      'identity-fingerprint': ['Wasifu wa ulinzi wa akaunti', 'Onyesha taasisi ya mkataba na aina ya ulinzi wa fedha.'],
      'beneficiary-guard': ['Kinga ya kutolingana kwa mpokeaji', 'Onya kuhusu tofauti ya jina au muundo kabla ya agizo.'],
      'route-optimizer': ['Kiboreshaji njia za benki', 'Linganisha gharama, kasi, upatikanaji na hatari ya kushindwa.'],
      'fx-total-cost': ['Kilinganishi cha gharama kamili ya FX', 'Tenganisha kiwango, nyongeza, ada na gharama ya mpatanishi.'],
      'cashflow-radar': ['Rada ya mtiririko wa fedha', 'Fuatilia mapato na matumizi kutoka vyanzo vinavyodhibitiwa na mtumiaji.'],
      'duplicate-scan': ['Ugunduzi wa miamala inayojirudia', 'Tambua malipo yanayoweza kujirudia kwenye taarifa zilizoingizwa.'],
      'eudi-credential': ['Pochi ya sifa za kuchagua', 'Shiriki sifa inayohitajika pekee kwa idhini halali.'],
      'connector-resilience': ['Mtandao imara wa viunganishi', 'Fuatilia uchangamfu wa data na ubadilishe chanzo kwa usalama.'],
      'multi-venue-router': ['Uelekezaji mahiri wa masoko mengi', 'Linganisha bei, ukwasi, ada na mtelezo unaokadiriwa.'],
      'slippage-budget': ['Bajeti ya mtelezo wa bei', 'Onyesha masafa ya utekelezaji na kikomo cha oda mapema.'],
      'price-alerts': ['Tahadhari za soko zenye masharti', 'Toa tahadhari ya ndani bila kuwasilisha oda.'],
      reconciliation: ['Upatanisho wa masoko ya crypto', 'Linganisha rekodi za ndani na taarifa za jukwaa.'],
      'custody-diversification': ['Ramani ya mkusanyiko wa uhifadhi', 'Onyesha mkusanyiko bandia kwa kila mshirika.'],
      'stablecoin-stress': ['Ubao wa msongo wa stablecoin', 'Igiza mabadiliko ya bei, ukwasi na uwezo wa kukomboa.'],
      'bridge-risk': ['Maabara ya hatari ya daraja la minyororo', 'Fanya mazoezi ya hitilafu na ucheleweshaji bila mtandao hai.'],
      'travel-rule': ['Mazoezi ya mapitio ya Travel Rule', 'Tambua sehemu za uhamisho zinazokosekana kwa ukaguzi wa mtu.'],
      'fee-tax-export': ['Hamisha ada na loti za kodi', 'Hamisha gharama na loti bandia kwa ukaguzi wa mtaalamu.'],
      'incident-room': ['Chumba cha tukio la dharura', 'Sitisha viunganishi vya demo ndani na uitaarifu timu.']
    },
    features: {
      'consent-audit': ['Kagua wigo wa idhini', 'Hesabu ruhusa za kusoma pekee na uhakikishe hakuna za kuandika.'],
      'aggregate-balances': ['Jumlisha salio za mfano', 'Jumlisha sampuli za EUR/USD za viunganishi vya ndani vilivyowashwa.'],
      'protection-map': ['Onyesha wasifu wa ulinzi', 'Tofautisha amana, pesa za kielektroniki na huduma ya malipo.'],
      'beneficiary-check': ['Kagua mpokeaji (demo)', 'Endesha mfano wa jina bila kutafuta akaunti.'],
      'bank-route': ['Linganisha njia za benki', 'Panga njia za kubuni kwa ada na ucheleweshaji wa mfano.'],
      'fx-cost': ['Linganisha gharama ya FX', 'Tenganisha nyongeza na ada na kiwango cha rejea cha mfano.'],
      'cashflow-forecast': ['Onyesho la mtiririko wa fedha', 'Kokotoa makadirio rahisi kutoka data za kubuni.'],
      'duplicate-detect': ['Tafuta rekodi zinazojirudia', 'Weka alama kwa nakala iliyopandikizwa kwenye data bandia.'],
      'identity-minimization': ['Kagua sifa chache zaidi', 'Onyesha umri na nchi ya mfano bila kutumia utambulisho.'],
      'connector-health': ['Kagua afya ya viunganishi', 'Weka alama kwa picha za zamani na pendekeza mbadala.'],
      'venue-best-price': ['Linganisha vitabu vya oda vya demo', 'Linganisha ofa tuli za BTC/EUR; hakuna bei ya moja kwa moja.'],
      slippage: ['Onyesha mtelezo unaokadiriwa', 'Kadiria athari kwenye kitabu bandia chenye kina kidogo.'],
      'limit-alert': ['Weka tahadhari ya bei ya ndani', 'Hifadhi kikomo bila ujumbe wa nje au oda.'],
      'venue-reconcile': ['Patanisha salio za demo', 'Linganisha vitabu vya kubuni na onyesha tofauti.'],
      'counterparty-exposure': ['Ramani ya hatari ya mshirika', 'Onyesha mgawanyo bandia bila hitimisho la uwezo wa kulipa.'],
      'stablecoin-stress': ['Endesha jaribio la msongo', 'Igiza kushuka kwa stablecoin; si utabiri.'],
      'bridge-risk': ['Pima hatari ya daraja (demo)', 'Pima hali tuli za hitilafu na ucheleweshaji.'],
      'travel-rule': ['Kagua sehemu za uhamisho', 'Kagua sehemu maalum na elekeza mfano kwa mkaguzi.'],
      'audit-export': ['Hamisha kumbukumbu ya maabara', 'Pakua JSON yenye data bandia pekee.'],
      'kill-switch': ['Swichi ya dharura', 'Sitisha au rejesha viunganishi vya ndani pekee.']
    }
  },
  ja: {
    ideas: {
      'consent-cockpit': ['同意管理コックピット', '銀行データへの許可を一元確認・制限・撤回します。'],
      'all-bank-view': ['全銀行の金融ビュー', '複数の情報源から口座と取引を統一表示します。'],
      'identity-fingerprint': ['口座保護プロファイル', '契約先機関と資金保護の種類を口座ごとに表示します。'],
      'beneficiary-guard': ['受取人不一致ガード', '指示前に名前や形式の不一致を知らせます。'],
      'route-optimizer': ['銀行ルート最適化', '費用・速度・可用性・失敗リスクを比較します。'],
      'fx-total-cost': ['FX総コスト比較', '為替・上乗せ・手数料・仲介費用を分けて表示します。'],
      'cashflow-radar': ['キャッシュフロー・レーダー', '利用者が選んだ情報源の入出金を確認します。'],
      'duplicate-scan': ['取引重複スキャン', '取り込んだ明細から二重請求の可能性を探します。'],
      'eudi-credential': ['選択的属性ウォレット', '必要な本人属性だけを同意に基づいて共有します。'],
      'connector-resilience': ['コネクター耐障害性', 'データの鮮度を監視し安全に代替元へ切り替えます。'],
      'multi-venue-router': ['複数取引所のスマートルーティング', '価格・流動性・手数料・予想スリッページを比較します。'],
      'slippage-budget': ['スリッページ予算', '確認前に約定幅と注文上限を表示します。'],
      'price-alerts': ['条件付き市場アラート', '注文を送らずローカル価格アラートを作成します。'],
      reconciliation: ['取引所残高照合', '内部記録とプラットフォーム明細を比較します。'],
      'custody-diversification': ['カストディ集中マップ', '合成データで相手先への集中を可視化します。'],
      'stablecoin-stress': ['ステーブルコイン・ストレスボード', '価格乖離、流動性、償還可能性をモデル化します。'],
      'bridge-risk': ['クロスチェーン・ブリッジリスクラボ', '実ネットワークなしで停止・遅延・契約リスクを演習します。'],
      'travel-rule': ['トラベルルール確認演習', '不足項目を特定し、人手確認へエスカレーションします。'],
      'fee-tax-export': ['手数料・税務ロット出力', '合成コストと税務ロットを専門家確認用に出力します。'],
      'incident-room': ['緊急インシデントルーム', 'デモ接続をローカル停止しチームへ通知します。']
    },
    features: {
      'consent-audit': ['同意スコープを監査', '有効な読み取り権限を数え、書き込み権限なしを確認します。'],
      'aggregate-balances': ['デモ残高を集計', '有効なローカル接続のEUR/USDサンプルを合算します。'],
      'protection-map': ['保護プロファイルを表示', '預金・電子マネー・決済サービスを区別します。'],
      'beneficiary-check': ['受取人を確認（デモ）', '口座検索なしで名前の例を照合します。'],
      'bank-route': ['銀行ルートを比較', '架空ルートを参考手数料と遅延で並べます。'],
      'fx-cost': ['FX総コストを比較', 'サンプル基準レートと手数料・上乗せを分離します。'],
      'cashflow-forecast': ['ローカル資金繰り予測', '架空データで簡易予測を作成します。'],
      'duplicate-detect': ['重複取引を検出', '合成フィードの固定重複を表示します。'],
      'identity-minimization': ['最小限の属性を確認', '実際の本人情報なしで年齢・国の例を表示します。'],
      'connector-health': ['接続状態を確認', '古いローカルスナップショットを示し代替を提案します。'],
      'venue-best-price': ['デモ板を比較', '固定BTC/EUR価格を比較し、ライブ価格は使いません。'],
      slippage: ['スリッページを予測', '浅い合成注文板で価格影響を推定します。'],
      'limit-alert': ['ローカル価格アラート', '外部通知や注文なしでしきい値を保存します。'],
      'venue-reconcile': ['デモ残高を照合', '架空の帳簿を比較し差異を表示します。'],
      'counterparty-exposure': ['相手先リスクを可視化', '支払能力を判断せず合成割合を示します。'],
      'stablecoin-stress': ['ステーブルコインをストレス検証', '予測ではなく架空の下落をモデル化します。'],
      'bridge-risk': ['ブリッジリスクを評価（デモ）', '固定の停止・遅延シナリオを評価します。'],
      'travel-rule': ['送金項目を確認', '固定項目を確認し人手レビューへ案内します。'],
      'audit-export': ['ラボ履歴を出力', '合成データのみのブランド付きJSONを保存します。'],
      'kill-switch': ['緊急停止スイッチ', 'ローカルシミュレーション接続のみ停止・復元します。']
    }
  },
  zh: {
    ideas: {
      'consent-cockpit': ['统一授权管理台', '集中查看、限制和撤销银行数据授权。'],
      'all-bank-view': ['跨银行财务视图', '统一展示多个来源的账户和交易。'],
      'identity-fingerprint': ['账户保障信息卡', '按账户展示合同机构和资金保障类型。'],
      'beneficiary-guard': ['收款人差异防护', '在提交指令前提示姓名或格式差异。'],
      'route-optimizer': ['跨银行路由优化器', '比较成本、速度、可用性和失败风险。'],
      'fx-total-cost': ['外汇总成本比较', '分别展示汇率、加价、费用和估算中介成本。'],
      'cashflow-radar': ['现金流雷达', '跟踪用户控制数据源的流入与流出。'],
      'duplicate-scan': ['重复交易扫描', '识别导入账单中可能的重复扣款。'],
      'eudi-credential': ['选择性凭证钱包', '在有效授权下仅分享所需身份属性。'],
      'connector-resilience': ['连接器韧性网络', '监控数据新鲜度并安全切换到备用来源。'],
      'multi-venue-router': ['多平台智能订单路由', '比较价格、流动性、费用和预估滑点。'],
      'slippage-budget': ['滑点预算', '确认前预览成交区间和订单上限。'],
      'price-alerts': ['条件市场提醒', '触发本地价格提醒，不提交订单。'],
      reconciliation: ['交易平台对账', '比较内部记录与平台账单。'],
      'custody-diversification': ['托管集中度地图', '以合成数据展示交易对手集中度。'],
      'stablecoin-stress': ['稳定币压力面板', '模拟价格偏离、流动性和赎回能力。'],
      'bridge-risk': ['跨链桥风险实验室', '在无实时链的情况下演练中断和延迟风险。'],
      'travel-rule': ['转账规则审核演练', '发现缺失字段并安排人工升级处理。'],
      'fee-tax-export': ['费用与税务批次导出', '导出合成费用和税务批次供专业审核。'],
      'incident-room': ['应急事件室', '在本地暂停模拟连接器并通知团队。']
    },
    features: {
      'consent-audit': ['审核授权范围', '统计有效只读权限并确认没有写入权限。'],
      'aggregate-balances': ['汇总模拟余额', '合计已启用本地适配器的EUR/USD样例余额。'],
      'protection-map': ['显示保障信息卡', '区分银行存款、电子货币和支付服务。'],
      'beneficiary-check': ['检查收款人（演示）', '运行本地姓名示例，不查询账户。'],
      'bank-route': ['比较银行路由', '按示例费用和延迟排序虚构路线。'],
      'fx-cost': ['比较外汇总成本', '将样例参考汇率与费用、加价分开。'],
      'cashflow-forecast': ['本地现金流预览', '根据虚构数据生成简单预测。'],
      'duplicate-detect': ['扫描重复记录', '标记合成数据流中的预设重复项。'],
      'identity-minimization': ['检查最少身份属性', '不使用真实身份，仅展示年龄和国家示例。'],
      'connector-health': ['检查连接器健康状态', '标记过期快照并建议备用来源。'],
      'venue-best-price': ['比较模拟订单簿', '比较固定BTC/EUR样例，不使用实时价格。'],
      slippage: ['预览滑点', '根据浅层合成订单簿估算价格影响。'],
      'limit-alert': ['设置本地价格提醒', '保存阈值，不发送外部通知或订单。'],
      'venue-reconcile': ['核对模拟余额', '比较虚构账本并标记差异。'],
      'counterparty-exposure': ['绘制交易对手敞口', '展示合成分布，不判断偿付能力。'],
      'stablecoin-stress': ['运行稳定币压力场景', '模拟虚构跌价，不构成预测。'],
      'bridge-risk': ['评估跨链桥风险（演示）', '评估固定的中断和延迟场景。'],
      'travel-rule': ['审核转账样例字段', '检查固定字段并转交人工复核。'],
      'audit-export': ['导出实验室记录', '下载仅含合成数据的品牌JSON。'],
      'kill-switch': ['紧急停止开关', '仅暂停或恢复本地模拟适配器。']
    }
  }
};

const ADDITIONAL_IDEA_TRANSLATIONS = {
  de: {
    'scope-expiry-monitor': ['Ablaufmonitor für Einwilligungen', 'Zeigt bald ablaufende Beispielberechtigungen zur lokalen Prüfung.'],
    'revocation-impact': ['Vorschau der Widerrufsfolgen', 'Zeigt, welche Beispieldienste nach einem Widerruf enden würden.'],
    'statement-normalizer': ['Studio zur Kontoauszugs-Normalisierung', 'Ordnet feste Belegfelder einem gemeinsamen Format zu.'],
    'data-quality-gate': ['Prüfung der Datenqualität', 'Prüft Beispieldatensätze auf fehlende Beträge, Währungen und Datumsangaben.'],
    'transaction-categorizer': ['Arbeitsplatz zur Umsatzkategorisierung', 'Ordnet feste Beispieldatensätze zu und nennt jeweils den Grund.'],
    'recurring-patterns': ['Erkennung wiederkehrender Zahlungen', 'Findet Beispiel-Abonnements, ohne etwas zu kündigen.'],
    'cash-buffer-planner': ['Planer für Liquiditätspuffer', 'Vergleicht eine fiktive Reserve mit einem gewählten Mindestwert.'],
    'liquidity-ladder': ['Liquiditätsleiter', 'Ordnet feste Beispielzuflüsse und -abflüsse nach Zeiträumen.'],
    'fee-anomaly-scout': ['Erkennung auffälliger Gebühren', 'Markiert synthetische Gebühren außerhalb eines Beispielsbereichs.'],
    'cutoff-calendar': ['Lokaler Annahmeschluss-Kalender', 'Zeigt den festen Beispiel-Annahmeschluss des gewählten Demo-Systems.'],
    'batch-quality': ['Prüfung eines Empfänger-Stapels', 'Prüft einen synthetischen Stapel vor einem möglichen Export.'],
    'fx-stress-planner': ['Planer für FX-Stresstests', 'Vergleicht feste Währungsszenarien, ohne ein Hedge oder einen Auftrag zu setzen.'],
    'cross-border-cost': ['Aufschlüsselung grenzüberschreitender Kosten', 'Schlüsselt Beispielgebühren, Vermittlerkosten und Währungsumrechnung auf.'],
    'cash-concentration': ['Planer für Liquiditätsbündelung', 'Schlägt eine fiktive interne Verteilung ohne Zahlungsauftrag vor.'],
    'nostro-reconciliation': ['Nostro-Abstimmungsübung', 'Vergleicht einen synthetischen Bankeintrag mit einem festen Auszugsbeispiel.'],
    'protection-explainer': ['Erklärung zum Schutz von Guthaben', 'Unterscheidet Einlage, E-Geld und Zahlungsguthaben ohne Deckungszusage.'],
    'dispute-lifecycle': ['Studio für den Beschwerdeablauf', 'Führt einen fiktiven Fall durch lokale Aufnahme- und Prüfschritte.'],
    'chargeback-checklist': ['Checkliste für Chargeback-Nachweise', 'Prüft synthetische Nachweise ohne Kartennetzwerk.'],
    'fraud-tabletop': ['Planspiel zur Betrugsreaktion', 'Übt einen festen Vorfall und lokale Reaktionsschritte, keine echte Betrugserkennung.'],
    'aml-queue-priority': ['Priorisierung einer AML-Warteschlange', 'Ordnet nur fiktive Fälle; überwacht keine echten Transaktionen und entscheidet nicht.'],
    'sanctions-escalation': ['Planspiel zur Sanktionseskalation', 'Übt einen festen Eskalationspfad ohne Sanktionslistenabfrage.'],
    'pep-coaching': ['Leitfaden zur PEP-Prüfung', 'Zeigt eine synthetische Checkliste, ohne PEP-Screening.'],
    'maker-checker-map': ['Ablaufkarte für Vier-Augen-Prüfung', 'Visualisiert getrennte Rollen in einem festen Beispielprozess.'],
    'audit-evidence-pack': ['Paket mit Audit-Beispielen', 'Erstellt lokal ein Verzeichnis von Beispieldaten mit DEMO-Kennzeichnung.'],
    'portability-kit': ['Datenportabilitäts-Paket', 'Prüft einen Export fiktiver Daten ohne echte Kundendaten.'],
    'session-hygiene': ['Übung zur Sitzungshygiene', 'Prüft feste Demo-Sitzungen und zeigt einen lokalen Ablaufhinweis.'],
    'passkey-readiness': ['Checkliste zur Passkey-Bereitschaft', 'Zeigt eine lokale Checkliste, ohne Zugangsdaten zu erstellen oder auszulesen.'],
    'crypto-withdrawal-preflight': ['Vorprüfung einer Krypto-Auszahlung', 'Prüft nur das Format eines synthetischen Beispiels; nichts wird gesendet.'],
    'wallet-format-lab': ['Labor für Wallet-Adressformate', 'Prüft das Adressformat ohne Guthaben- oder Blockchain-Abfrage.'],
    'custody-allocation': ['Planer zur Verwahrungsaufteilung', 'Verteilt fiktive Beträge auf Beispiel-Verwahrstellen.']
  },
  fr: {
    'scope-expiry-monitor': ['Suivi de l’expiration des consentements', 'Signale les autorisations d’exemple qui expirent bientôt pour examen local.'],
    'revocation-impact': ['Aperçu des effets d’un retrait', 'Montre quels services fictifs s’arrêteraient après un retrait.'],
    'statement-normalizer': ['Atelier de normalisation des relevés', 'Convertit des champs d’exemple fixes vers un format commun.'],
    'data-quality-gate': ['Contrôle de qualité des données', 'Vérifie les montants, devises et dates manquants dans des lignes synthétiques.'],
    'transaction-categorizer': ['Atelier de catégorisation des opérations', 'Classe des exemples fixes et indique la règle appliquée.'],
    'recurring-patterns': ['Radar des paiements récurrents', 'Repère des abonnements fictifs sans rien résilier.'],
    'cash-buffer-planner': ['Planificateur de réserve de trésorerie', 'Compare une réserve fictive à un seuil minimal choisi.'],
    'liquidity-ladder': ['Échelle de liquidité', 'Classe des entrées et sorties fixes par horizon temporel.'],
    'fee-anomaly-scout': ['Détection des frais atypiques', 'Signale les frais synthétiques hors de la plage indicative.'],
    'cutoff-calendar': ['Calendrier local des heures limites', 'Affiche l’heure limite fixe du système de démonstration choisi.'],
    'batch-quality': ['Contrôle d’un lot de bénéficiaires', 'Valide un lot synthétique avant tout export éventuel.'],
    'fx-stress-planner': ['Planificateur de scénarios FX', 'Compare des chocs de change fixes sans créer de couverture ni d’ordre.'],
    'cross-border-cost': ['Détail des frais transfrontaliers', 'Ventile frais indicatifs, intermédiaire et conversion de devise.'],
    'cash-concentration': ['Planificateur de concentration de trésorerie', 'Propose une répartition fictive sans créer d’instruction.'],
    'nostro-reconciliation': ['Exercice de rapprochement nostro', 'Compare une écriture bancaire synthétique à un relevé fixe.'],
    'protection-explainer': ['Explication de la protection des fonds', 'Distingue dépôt, monnaie électronique et solde de paiement sans promesse de couverture.'],
    'dispute-lifecycle': ['Atelier du cycle de contestation', 'Parcourt les étapes locales d’ouverture et d’examen d’un litige fictif.'],
    'chargeback-checklist': ['Liste des preuves de contestation', 'Vérifie des pièces synthétiques sans réseau de cartes.'],
    'fraud-tabletop': ['Exercice de réponse à la fraude', 'Répète un incident fixe et les réponses locales, sans détecter une fraude réelle.'],
    'aml-queue-priority': ['Priorisation d’une file AML', 'Classe uniquement des cas fictifs, sans surveiller ni décider de cas réels.'],
    'sanctions-escalation': ['Exercice d’escalade sanctions', 'Répète une voie fixe sans consulter de liste de sanctions.'],
    'pep-coaching': ['Guide de revue PEP', 'Présente une liste de contrôle synthétique sans filtrage PEP.'],
    'maker-checker-map': ['Carte du circuit préparateur-vérificateur', 'Visualise la séparation des rôles dans un processus d’exemple.'],
    'audit-evidence-pack': ['Dossier de preuves d’audit fictives', 'Crée localement un index d’événements d’exemple marqué DEMO.'],
    'portability-kit': ['Kit de portabilité des données', 'Vérifie un export fictif sans données de vrais clients.'],
    'session-hygiene': ['Exercice d’hygiène des sessions', 'Examine des sessions démo fixes et affiche leur expiration locale.'],
    'passkey-readiness': ['Liste de préparation aux passkeys', 'Présente une liste locale sans créer ni lire d’identifiants.'],
    'crypto-withdrawal-preflight': ['Précontrôle d’un retrait crypto', 'Vérifie uniquement le format synthétique; aucune transaction n’est émise.'],
    'wallet-format-lab': ['Laboratoire de format d’adresse', 'Teste la forme d’une adresse sans consulter de solde ni de blockchain.'],
    'custody-allocation': ['Planificateur de répartition de conservation', 'Répartit des montants fictifs entre des conservateurs d’exemple.']
  },
  es: {
    'scope-expiry-monitor': ['Radar de vencimiento de consentimientos', 'Señala permisos de muestra próximos a vencer para revisión local.'],
    'revocation-impact': ['Vista previa del efecto de revocar', 'Muestra qué servicios de ejemplo se detendrían tras una revocación.'],
    'statement-normalizer': ['Taller de normalización de extractos', 'Transforma campos fijos de muestra a un formato común.'],
    'data-quality-gate': ['Control de calidad de datos', 'Busca importes, monedas y fechas ausentes en registros sintéticos.'],
    'transaction-categorizer': ['Taller de categorías de movimientos', 'Clasifica ejemplos fijos y muestra la regla aplicada.'],
    'recurring-patterns': ['Radar de pagos recurrentes', 'Detecta suscripciones de muestra sin cancelar nada.'],
    'cash-buffer-planner': ['Planificador de reserva de efectivo', 'Compara una reserva ficticia con un mínimo elegido.'],
    'liquidity-ladder': ['Escalera de liquidez', 'Agrupa entradas y salidas fijas por horizonte temporal.'],
    'fee-anomaly-scout': ['Detector de comisiones atípicas', 'Marca comisiones sintéticas fuera del rango ilustrativo.'],
    'cutoff-calendar': ['Calendario local de horas límite', 'Muestra la hora de corte fija del sistema demo seleccionado.'],
    'batch-quality': ['Control de lote de beneficiarios', 'Valida un lote sintético antes de cualquier posible exportación.'],
    'fx-stress-planner': ['Planificador de estrés de divisas', 'Compara cambios fijos sin crear cobertura ni orden.'],
    'cross-border-cost': ['Desglose de costes transfronterizos', 'Separa cargos de muestra, intermediación y conversión de moneda.'],
    'cash-concentration': ['Planificador de concentración de efectivo', 'Propone una distribución ficticia sin crear instrucciones.'],
    'nostro-reconciliation': ['Ensayo de conciliación nostro', 'Compara un registro bancario sintético con un extracto fijo.'],
    'protection-explainer': ['Guía de protección de fondos', 'Distingue depósito, dinero electrónico y saldo de pago sin prometer cobertura.'],
    'dispute-lifecycle': ['Taller del ciclo de disputa', 'Recorre pasos locales de recepción y revisión de un caso ficticio.'],
    'chargeback-checklist': ['Lista de pruebas de disputa', 'Revisa pruebas sintéticas sin una red de tarjetas.'],
    'fraud-tabletop': ['Simulacro de respuesta al fraude', 'Practica un incidente fijo; no detecta fraude real.'],
    'aml-queue-priority': ['Prioridad de cola AML', 'Ordena solo casos ficticios; no vigila ni decide casos reales.'],
    'sanctions-escalation': ['Ensayo de escalado de sanciones', 'Practica un recorrido fijo sin consultar listas de sanciones.'],
    'pep-coaching': ['Guía de revisión PEP', 'Muestra una lista sintética sin realizar consultas PEP.'],
    'maker-checker-map': ['Mapa del flujo preparador-revisor', 'Visualiza funciones separadas en un proceso fijo de muestra.'],
    'audit-evidence-pack': ['Paquete de evidencias de auditoría', 'Crea localmente un índice de eventos de muestra marcado DEMO.'],
    'portability-kit': ['Kit de portabilidad de datos', 'Valida una exportación ficticia sin datos de clientes reales.'],
    'session-hygiene': ['Práctica de higiene de sesiones', 'Revisa sesiones demo fijas y muestra su vencimiento local.'],
    'passkey-readiness': ['Lista de preparación para passkeys', 'Muestra una lista local sin crear ni leer credenciales.'],
    'crypto-withdrawal-preflight': ['Prevalidación de retirada cripto', 'Comprueba solo el formato sintético; no se transmite nada.'],
    'wallet-format-lab': ['Laboratorio de formato de dirección', 'Prueba la forma de una dirección sin consultar saldos ni blockchain.'],
    'custody-allocation': ['Planificador de asignación de custodia', 'Distribuye importes ficticios entre custodios de muestra.']
  },
  ar: {
    'scope-expiry-monitor': ['مراقبة انتهاء الموافقات', 'تعرض أذونات العينة التي تقترب من الانتهاء للمراجعة المحلية.'],
    'revocation-impact': ['معاينة أثر سحب الموافقة', 'توضح خدمات العينة التي ستتوقف بعد السحب.'],
    'statement-normalizer': ['استوديو توحيد كشوف الحساب', 'يحوّل حقول العينة الثابتة إلى تنسيق موحد.'],
    'data-quality-gate': ['بوابة جودة البيانات', 'تفحص السجلات الاصطناعية بحثاً عن مبالغ أو عملات أو تواريخ مفقودة.'],
    'transaction-categorizer': ['ورشة تصنيف المعاملات', 'تصنف أمثلة ثابتة وتعرض سبب التصنيف.'],
    'recurring-patterns': ['رادار المدفوعات المتكررة', 'يكشف أنماط اشتراك تجريبية دون إلغاء أي شيء.'],
    'cash-buffer-planner': ['مخطط احتياطي السيولة', 'يقارن احتياطياً خيالياً بحد أدنى يختاره المستخدم.'],
    'liquidity-ladder': ['سُلّم السيولة', 'يجمع التدفقات التجريبية الثابتة حسب المدى الزمني.'],
    'fee-anomaly-scout': ['كاشف الرسوم الشاذة', 'يحدد الرسوم الاصطناعية خارج النطاق التوضيحي.'],
    'cutoff-calendar': ['تقويم المواعيد المحلية', 'يعرض موعداً تجريبياً ثابتاً للنظام المحدد.'],
    'batch-quality': ['فحص دفعة المستفيدين', 'يتحقق من دفعة اصطناعية قبل أي تصدير محتمل.'],
    'fx-stress-planner': ['مخطط ضغط أسعار الصرف', 'يقارن صدمات ثابتة دون إنشاء تحوط أو أمر.'],
    'cross-border-cost': ['تفصيل تكلفة التحويل الدولي', 'يفصل الرسوم التجريبية والوسيط وتحويل العملة.'],
    'cash-concentration': ['مخطط تجميع السيولة', 'يقترح توزيعاً خيالياً دون إنشاء تعليمات تحويل.'],
    'nostro-reconciliation': ['تدريب مطابقة حساب نوسترو', 'يقارن قيداً بنكياً اصطناعياً بكشف عينة ثابت.'],
    'protection-explainer': ['شرح حماية الأموال', 'يميز الوديعة والنقود الإلكترونية ورصيد الدفع دون ادعاء تغطية.'],
    'dispute-lifecycle': ['استوديو دورة النزاع', 'يمرر نزاعاً خيالياً بخطوات الاستلام والمراجعة المحلية.'],
    'chargeback-checklist': ['قائمة أدلة الاعتراض', 'تفحص أدلة اصطناعية دون شبكة بطاقات.'],
    'fraud-tabletop': ['تمرين الاستجابة للاحتيال', 'يتدرب على حادث ثابت ولا يكشف احتيالاً حقيقياً.'],
    'aml-queue-priority': ['ترتيب قائمة AML', 'يرتب حالات خيالية فقط دون مراقبة معاملات أو اتخاذ قرار حقيقي.'],
    'sanctions-escalation': ['تدريب تصعيد العقوبات', 'يتدرب على مسار ثابت دون البحث في قوائم العقوبات.'],
    'pep-coaching': ['دليل مراجعة PEP', 'يعرض قائمة اصطناعية دون إجراء فحص للأشخاص.'],
    'maker-checker-map': ['خريطة سير المُعِدّ والمراجع', 'توضح فصل الأدوار في إجراء تجريبي ثابت.'],
    'audit-evidence-pack': ['حزمة أدلة تدقيق تجريبية', 'تنشئ محلياً فهرساً لأحداث عينة يحمل وسم DEMO.'],
    'portability-kit': ['حزمة نقل البيانات', 'تتحقق من تصدير خيالي دون بيانات عملاء حقيقيين.'],
    'session-hygiene': ['تدريب نظافة الجلسات', 'يراجع جلسات تجريبية ثابتة ويعرض انتهاءها المحلي.'],
    'passkey-readiness': ['قائمة جاهزية مفاتيح المرور', 'تعرض قائمة محلية دون إنشاء بيانات اعتماد أو قراءتها.'],
    'crypto-withdrawal-preflight': ['فحص أولي لسحب الأصول الرقمية', 'يتحقق من شكل مثال اصطناعي فقط؛ لا يتم بث شيء.'],
    'wallet-format-lab': ['مختبر تنسيق عنوان المحفظة', 'يفحص شكل العنوان دون الاستعلام عن رصيد أو بلوك تشين.'],
    'custody-allocation': ['مخطط توزيع الحفظ', 'يوزع مبالغ خيالية بين جهات حفظ تجريبية.']
  },
  sw: {
    'scope-expiry-monitor': ['Kichunguzi cha muda wa idhini', 'Huonyesha ruhusa za mfano zinazokaribia kuisha kwa ukaguzi wa ndani.'],
    'revocation-impact': ['Muhtasari wa athari ya kubatilisha', 'Huonyesha huduma za mfano zitakazosimama baada ya kubatilisha.'],
    'statement-normalizer': ['Studio ya kusawazisha taarifa', 'Hubadilisha sehemu zisizobadilika za sampuli kuwa muundo mmoja.'],
    'data-quality-gate': ['Kizuizi cha ubora wa data', 'Hukagua safu bandia kwa kiasi, sarafu au tarehe zinazokosekana.'],
    'transaction-categorizer': ['Eneo la kupanga miamala', 'Hupanga mifano isiyobadilika na kuonyesha sababu.'],
    'recurring-patterns': ['Rada ya malipo yanayojirudia', 'Hutambua usajili wa mfano bila kughairi chochote.'],
    'cash-buffer-planner': ['Mpangaji wa akiba ya fedha', 'Hulinganisha akiba ya kubuni na kiwango cha chini kilichochaguliwa.'],
    'liquidity-ladder': ['Ngazi ya ukwasi', 'Hupanga mapato na matumizi ya sampuli kwa vipindi.'],
    'fee-anomaly-scout': ['Kigunduzi cha ada isiyo ya kawaida', 'Huonyesha ada bandia zilizo nje ya masafa ya mfano.'],
    'cutoff-calendar': ['Kalenda ya muda wa mwisho wa ndani', 'Huonyesha muda wa mfano usiobadilika wa mfumo uliochaguliwa.'],
    'batch-quality': ['Ukaguzi wa kundi la wapokeaji', 'Huthibitisha kundi bandia kabla ya uwezekano wa kuhamisha faili.'],
    'fx-stress-planner': ['Mpangaji wa msongo wa FX', 'Hulinganisha mabadiliko ya sarafu yasiyobadilika bila kuweka oda.'],
    'cross-border-cost': ['Mgawanyo wa gharama za kuvuka mipaka', 'Hutenganisha ada ya mfano, mpatanishi na ubadilishaji wa sarafu.'],
    'cash-concentration': ['Mpangaji wa mkusanyiko wa fedha', 'Hupendekeza mgawanyo wa kubuni bila kuunda agizo.'],
    'nostro-reconciliation': ['Mazoezi ya kulinganisha Nostro', 'Hulinganisha rekodi bandia ya benki na taarifa tuli ya mfano.'],
    'protection-explainer': ['Maelezo ya ulinzi wa fedha', 'Hutofautisha amana, pesa za kielektroniki na salio la malipo bila dai la bima.'],
    'dispute-lifecycle': ['Studio ya hatua za malalamiko', 'Hupitisha mgogoro wa kubuni kwenye hatua za ndani za kupokea na kukagua.'],
    'chargeback-checklist': ['Orodha ya ushahidi wa pingamizi', 'Hukagua ushahidi bandia bila mtandao wa kadi.'],
    'fraud-tabletop': ['Mazoezi ya kukabiliana na udanganyifu', 'Hufanya mazoezi ya tukio tuli; haigundui udanganyifu halisi.'],
    'aml-queue-priority': ['Kipaumbele cha foleni ya AML', 'Hupanga mifano ya kubuni pekee; haifuatilii au kuamua kesi halisi.'],
    'sanctions-escalation': ['Mazoezi ya kupandisha suala la vikwazo', 'Hufuata njia tuli bila kutafuta orodha za vikwazo.'],
    'pep-coaching': ['Mwongozo wa mapitio ya PEP', 'Huonyesha orodha bandia bila kuchunguza watu.'],
    'maker-checker-map': ['Ramani ya mtiririko wa mtayarishaji-mkaguzi', 'Huonyesha mgawanyo wa majukumu katika utaratibu wa mfano.'],
    'audit-evidence-pack': ['Kifurushi cha ushahidi wa ukaguzi', 'Huunda faharasa ya matukio ya sampuli yenye lebo DEMO ndani ya kifaa.'],
    'portability-kit': ['Kifurushi cha uhamishaji wa data', 'Huthibitisha uhamishaji wa data bandia bila data ya mteja halisi.'],
    'session-hygiene': ['Mazoezi ya usafi wa vipindi', 'Hukagua vipindi tuli vya demo na kuonyesha muda wa mwisho wa ndani.'],
    'passkey-readiness': ['Orodha ya maandalizi ya passkey', 'Huonyesha orodha ya ndani bila kuunda au kusoma nywila.'],
    'crypto-withdrawal-preflight': ['Ukaguzi wa awali wa kutoa crypto', 'Hukagua umbo la mfano bandia pekee; hakuna kinachotangazwa.'],
    'wallet-format-lab': ['Maabara ya muundo wa anwani ya pochi', 'Hukagua umbo la anwani bila kutafuta salio au blockchain.'],
    'custody-allocation': ['Mpangaji wa ugawaji wa hifadhi', 'Hugawa kiasi cha kubuni kwa watoa hifadhi wa mfano.']
  },
  ja: {
    'scope-expiry-monitor': ['同意期限レーダー', '期限が近いサンプル権限をローカル確認用に表示します。'],
    'revocation-impact': ['同意取消の影響プレビュー', '取消後に停止するサンプル機能を表示します。'],
    'statement-normalizer': ['明細正規化スタジオ', '固定サンプルの項目を共通形式に変換します。'],
    'data-quality-gate': ['金融データ品質チェック', '合成レコードの金額・通貨・日付の欠落を検査します。'],
    'transaction-categorizer': ['取引カテゴリ作業台', '固定サンプルを分類し、その理由を表示します。'],
    'recurring-patterns': ['定期支払いパターンレーダー', 'サブスクリプション例を検出します。取消は行いません。'],
    'cash-buffer-planner': ['資金バッファ計画', '架空の準備金を選択した最低額と比較します。'],
    'liquidity-ladder': ['流動性ラダー', '固定サンプルの入出金を期間別に分類します。'],
    'fee-anomaly-scout': ['手数料異常検知', '例示範囲から外れる合成手数料を示します。'],
    'cutoff-calendar': ['ローカル締切カレンダー', '選択中のデモシステムの固定サンプル締切を表示します。'],
    'batch-quality': ['受取人一括データ検査', '合成受取人データを検証します。外部送信はしません。'],
    'fx-stress-planner': ['為替ストレス計画', '固定の為替変動を比較します。ヘッジや注文は作成しません。'],
    'cross-border-cost': ['越境コスト内訳', 'サンプル手数料、仲介費用、通貨換算を分けて表示します。'],
    'cash-concentration': ['資金集中プランナー', '架空の内部配分を提案します。送金指示は作成しません。'],
    'nostro-reconciliation': ['ノストロ照合リハーサル', '合成銀行記録を固定サンプル明細と比較します。'],
    'protection-explainer': ['資金保護の説明', '預金、電子マネー、決済残高を区別し、補償を断定しません。'],
    'dispute-lifecycle': ['異議申立てライフサイクル', '架空案件をローカル受付・確認段階で進めます。'],
    'chargeback-checklist': ['異議申立て証拠チェック', 'カードネットワークなしで合成証拠を確認します。'],
    'fraud-tabletop': ['不正対応机上演習', '固定シナリオを練習します。実際の不正検知ではありません。'],
    'aml-queue-priority': ['AMLキュー優先順位付け', '架空例のみを並べ替え、実取引の監視や判断はしません。'],
    'sanctions-escalation': ['制裁エスカレーション演習', '制裁リストを検索せず、固定の対応経路を練習します。'],
    'pep-coaching': ['PEP確認ガイド', 'PEP照合を行わず、合成チェックリストを表示します。'],
    'maker-checker-map': ['作成者・確認者フロー図', '固定サンプル手順における役割分担を可視化します。'],
    'audit-evidence-pack': ['監査サンプル証跡パック', 'DEMO表示付きのサンプルイベント索引をローカルで作成します。'],
    'portability-kit': ['データポータビリティキット', '実顧客データを含めず架空データの出力を検証します。'],
    'session-hygiene': ['セッション衛生演習', '固定デモセッションを確認し、ローカル失効を表示します。'],
    'passkey-readiness': ['パスキー準備チェックリスト', '資格情報を作成・読取せずにローカル確認項目を表示します。'],
    'crypto-withdrawal-preflight': ['暗号資産出庫の事前確認', '合成フォーマットのみを確認し、送信しません。'],
    'wallet-format-lab': ['ウォレット形式ラボ', '残高やブロックチェーンを照会せずアドレス形式を確認します。'],
    'custody-allocation': ['保管配分プランナー', '架空金額をサンプル保管先に配分します。']
  },
  zh: {
    'scope-expiry-monitor': ['授权到期提示', '列出即将到期的样例权限，供本地检查。'],
    'revocation-impact': ['撤销影响预览', '展示撤销后可能停止的样例服务。'],
    'statement-normalizer': ['账单标准化工作台', '将固定样例字段映射为统一格式。'],
    'data-quality-gate': ['金融数据质量检查', '检查合成记录中缺失的金额、币种和日期。'],
    'transaction-categorizer': ['交易分类工作台', '分类固定样例并展示采用的规则。'],
    'recurring-patterns': ['周期付款模式雷达', '发现样例订阅模式，不会取消任何项目。'],
    'cash-buffer-planner': ['现金缓冲规划器', '将虚构储备与所选最低线进行比较。'],
    'liquidity-ladder': ['流动性阶梯', '按期限归类固定样例流入与流出。'],
    'fee-anomaly-scout': ['费用异常侦测', '标记超出示例范围的合成费用。'],
    'cutoff-calendar': ['本地截止时间日历', '显示所选演示系统的固定示例截止时间。'],
    'batch-quality': ['收款人批次质量检查', '验证合成收款人批次，不会提交付款。'],
    'fx-stress-planner': ['汇率压力情景规划', '比较固定汇率冲击，不创建对冲或订单。'],
    'cross-border-cost': ['跨境费用明细', '拆分示例费用、中间行成本和货币兑换。'],
    'cash-concentration': ['资金集中规划器', '提出虚构的内部资金分配，不生成指令。'],
    'nostro-reconciliation': ['Nostro账户对账演练', '将合成银行记录与固定样例账单进行比较。'],
    'protection-explainer': ['资金保护说明', '区分存款、电子货币和支付余额，不承诺保障。'],
    'dispute-lifecycle': ['争议处理流程工作台', '让虚构案件经过本地受理和审核步骤。'],
    'chargeback-checklist': ['拒付证据清单', '在没有卡组织网络的情况下检查合成证据。'],
    'fraud-tabletop': ['欺诈响应桌面演练', '演练固定事件，不进行真实欺诈检测。'],
    'aml-queue-priority': ['AML队列优先级', '仅排列虚构案例，不监控真实交易或作出决定。'],
    'sanctions-escalation': ['制裁升级演练', '演练固定升级路径，不查询制裁名单。'],
    'pep-coaching': ['PEP审核指导', '显示合成清单，不进行PEP筛查。'],
    'maker-checker-map': ['经办与复核流程图', '展示固定样例流程中的职责分离。'],
    'audit-evidence-pack': ['审计样例证据包', '在本地建立带有DEMO标记的样例事件索引。'],
    'portability-kit': ['数据可携带工具包', '验证虚构数据导出，不包含真实客户信息。'],
    'session-hygiene': ['会话安全演练', '检查固定演示会话并预览本地过期状态。'],
    'passkey-readiness': ['通行密钥准备清单', '展示本地检查项，不创建或读取凭据。'],
    'crypto-withdrawal-preflight': ['加密资产提现预检', '仅检查合成格式，不会广播任何内容。'],
    'wallet-format-lab': ['钱包地址格式实验室', '检查地址格式，不查询余额或区块链。'],
    'custody-allocation': ['托管分配规划器', '将虚构金额分配到样例托管方。']
  }
};
const FEATURE_ACTION_PREFIX = { de: 'Ausführen: ', fr: 'Exécuter : ', es: 'Ejecutar: ', ar: 'تشغيل: ', sw: 'Endesha: ', ja: '実行：', zh: '运行：' };
for (const [language, translatedIdeas] of Object.entries(ADDITIONAL_IDEA_TRANSLATIONS)) {
  Object.assign(INTEROP_CONTENT_TRANSLATIONS[language].ideas, translatedIdeas);
  for (const feature of ADDITIONAL_FEATURES) {
    const ideaCopy = translatedIdeas[feature.idea];
    INTEROP_CONTENT_TRANSLATIONS[language].features[feature.id] = [`${FEATURE_ACTION_PREFIX[language]}${ideaCopy[0]}`, ideaCopy[1]];
  }
}

export function interopLocalizedText(item, language = 'en', type = 'idea', part = 'title') {
  const section = type === 'feature' ? 'features' : 'ideas';
  const translated = INTEROP_CONTENT_TRANSLATIONS[language]?.[section]?.[item.id];
  const index = part === 'description' ? 1 : 0;
  if (translated?.[index]) return translated[index];
  if (language === 'hr') return part === 'description' ? item.descriptionHr || item.detailHr : item.hr;
  return part === 'description' ? item.descriptionEn || item.detailEn : item.en;
}

const BANK_SEEDS = [
  { id: 'bank-hr-retail', systemId: 'croatia', name: 'Jadran Retail Sandbox', country: 'HR', protocol: 'PSD2-style mock', feeCents: 35, latencyMs: 220, status: 'connected_demo', permissions: ['balances', 'transactions'], balances: [{ currency: 'EUR', cents: 2_640_000 }, { currency: 'USD', cents: 185_000 }], sampleTransactions: ['TX-DEMO-001', 'TX-DEMO-002', 'TX-DEMO-003', 'TX-DEMO-003'] },
  { id: 'bank-hr-business', systemId: 'croatia', name: 'Blue Coast Business Sandbox', country: 'HR', protocol: 'FAPI-style mock', feeCents: 18, latencyMs: 410, status: 'connected_demo', permissions: ['balances'], balances: [{ currency: 'EUR', cents: 8_420_000 }], sampleTransactions: ['TX-DEMO-101', 'TX-DEMO-102'] },
  { id: 'bank-eu-lab', systemId: 'croatia', name: 'Union Payments Test Adapter', country: 'EU', protocol: 'AIS consent fixture', feeCents: 27, latencyMs: 330, status: 'paused_demo', permissions: [], balances: [{ currency: 'EUR', cents: 1_930_000 }], sampleTransactions: ['TX-DEMO-201'] },
  { id: 'bank-global-mock', systemId: 'croatia', name: 'Global Treasury Mock', country: 'MULTI', protocol: 'Statement-import fixture', feeCents: 42, latencyMs: 540, status: 'paused_demo', permissions: [], balances: [{ currency: 'EUR', cents: 6_150_000 }, { currency: 'GBP', cents: 730_000 }], sampleTransactions: ['TX-DEMO-301'] },
  { id: 'bank-sg-retail', systemId: 'singapore', name: 'Lion City Retail Sandbox', country: 'SG', protocol: 'PSD2-style mock', feeCents: 24, latencyMs: 285, status: 'connected_demo', permissions: ['balances', 'transactions'], balances: [{ currency: 'SGD', cents: 3_820_000 }, { currency: 'USD', cents: 470_000 }], sampleTransactions: ['TX-SG-DEMO-001', 'TX-SG-DEMO-002', 'TX-SG-DEMO-002'] },
  { id: 'bank-sg-business', systemId: 'singapore', name: 'Merlion Business Fixture', country: 'SG', protocol: 'FAPI-style mock', feeCents: 19, latencyMs: 350, status: 'connected_demo', permissions: ['balances'], balances: [{ currency: 'SGD', cents: 5_400_000 }], sampleTransactions: ['TX-SG-DEMO-101', 'TX-SG-DEMO-102'] },
  { id: 'bank-sg-statement', systemId: 'singapore', name: 'Orchard Statement Lab', country: 'SG', protocol: 'Statement-import fixture', feeCents: 31, latencyMs: 470, status: 'paused_demo', permissions: [], balances: [{ currency: 'SGD', cents: 980_000 }], sampleTransactions: ['TX-SG-DEMO-201'] },
  { id: 'bank-eg-retail', systemId: 'egypt', name: 'Nile Retail Sandbox', country: 'EG', protocol: 'AIS consent fixture', feeCents: 28, latencyMs: 390, status: 'connected_demo', permissions: ['balances', 'transactions'], balances: [{ currency: 'EGP', cents: 44_500_000 }, { currency: 'USD', cents: 210_000 }], sampleTransactions: ['TX-EG-DEMO-001', 'TX-EG-DEMO-002', 'TX-EG-DEMO-002'] },
  { id: 'bank-eg-business', systemId: 'egypt', name: 'Pyramid Business Fixture', country: 'EG', protocol: 'FAPI-style mock', feeCents: 21, latencyMs: 445, status: 'connected_demo', permissions: ['balances'], balances: [{ currency: 'EGP', cents: 73_200_000 }], sampleTransactions: ['TX-EG-DEMO-101', 'TX-EG-DEMO-102'] },
  { id: 'bank-eg-statement', systemId: 'egypt', name: 'Cairo Statement Lab', country: 'EG', protocol: 'Statement-import fixture', feeCents: 35, latencyMs: 515, status: 'paused_demo', permissions: [], balances: [{ currency: 'EGP', cents: 2_650_000 }], sampleTransactions: ['TX-EG-DEMO-201'] }
];

const VENUE_SEEDS = [
  { id: 'venue-northstar', systemId: 'croatia', name: 'Northstar Exchange Mock', region: 'EU fixture', status: 'connected_demo', feeBps: 12, latencyMs: 180, markets: { 'BTC/EUR': { bid: 61_940, ask: 62_080, depth: 0.42 }, 'ETH/EUR': { bid: 2_310, ask: 2_325, depth: 5.8 }, 'USDC/EUR': { bid: 0.919, ask: 0.923, depth: 120_000 } } },
  { id: 'venue-adriatic', systemId: 'croatia', name: 'Adriatic Digital Mock', region: 'HR fixture', status: 'connected_demo', feeBps: 18, latencyMs: 260, markets: { 'BTC/EUR': { bid: 62_010, ask: 62_120, depth: 0.19 }, 'ETH/EUR': { bid: 2_305, ask: 2_336, depth: 3.2 }, 'USDC/EUR': { bid: 0.917, ask: 0.925, depth: 48_000 } } },
  { id: 'venue-open-swap', systemId: 'croatia', name: 'OpenSwap Venue Lab', region: 'Protocol fixture', status: 'paused_demo', feeBps: 8, latencyMs: 620, markets: { 'BTC/EUR': { bid: 61_700, ask: 62_260, depth: 0.08 }, 'ETH/EUR': { bid: 2_285, ask: 2_362, depth: 1.4 }, 'USDC/EUR': { bid: 0.909, ask: 0.931, depth: 16_000 } } },
  { id: 'venue-sg-orbit', systemId: 'singapore', name: 'Straits Orbit Market Mock', region: 'SG fixture', status: 'connected_demo', feeBps: 14, latencyMs: 215, markets: { 'BTC/SGD': { bid: 83_610, ask: 83_850, depth: 0.38 }, 'ETH/SGD': { bid: 3_118, ask: 3_145, depth: 4.2 }, 'USDC/SGD': { bid: 1.347, ask: 1.354, depth: 82_000 } } },
  { id: 'venue-sg-merlion', systemId: 'singapore', name: 'Merlion Digital Lab', region: 'SG fixture', status: 'connected_demo', feeBps: 21, latencyMs: 295, markets: { 'BTC/SGD': { bid: 83_520, ask: 83_930, depth: 0.22 }, 'ETH/SGD': { bid: 3_105, ask: 3_159, depth: 2.7 }, 'USDC/SGD': { bid: 1.345, ask: 1.356, depth: 45_000 } } },
  { id: 'venue-eg-nile', systemId: 'egypt', name: 'Nile Digital Market Mock', region: 'EG fixture', status: 'connected_demo', feeBps: 17, latencyMs: 310, markets: { 'BTC/EGP': { bid: 2_990_000, ask: 3_008_000, depth: 0.31 }, 'ETH/EGP': { bid: 111_600, ask: 112_400, depth: 3.6 }, 'USDC/EGP': { bid: 48.0, ask: 48.5, depth: 64_000 } } },
  { id: 'venue-eg-pyramid', systemId: 'egypt', name: 'Pyramid Exchange Fixture', region: 'EG fixture', status: 'connected_demo', feeBps: 24, latencyMs: 375, markets: { 'BTC/EGP': { bid: 2_985_000, ask: 3_012_000, depth: 0.17 }, 'ETH/EGP': { bid: 111_300, ask: 112_650, depth: 2.1 }, 'USDC/EGP': { bid: 47.8, ask: 48.7, depth: 39_000 } } }
];

const nowMinus = minutes => new Date(Date.now() - minutes * 60_000).toISOString();
export function createInteropLabState() {
  return {
    activeSystemId: 'croatia',
    bankConnectors: BANK_SEEDS.map((item, index) => ({ ...item, balances: item.balances.map(balance => ({ ...balance })), sampleTransactions: [...item.sampleTransactions], permissions: [...item.permissions], lastSyncAt: item.status === 'connected_demo' ? nowMinus(index ? 22 : 4) : null, refreshCount: 0, demoOnly: DEMO, localFixtureOnly: true })),
    venues: VENUE_SEEDS.map(item => ({ ...item, markets: structuredClone(item.markets), demoOnly: DEMO, localFixtureOnly: true })),
    runs: [], alerts: [], disputes: [], demoSessions: [{ id: 'SESSION-DEMO-A', ageMinutes: 14, state: 'active_demo' }, { id: 'SESSION-DEMO-B', ageMinutes: 127, state: 'idle_demo' }, { id: 'SESSION-DEMO-C', ageMinutes: 245, state: 'expired_demo' }],
    lastResult: null, killSwitch: false, previousStatuses: null, nextRun: 1, demoOnly: DEMO
  };
}

export function activeInteropSystem(state) {
  const lab = ensureInteropLabState(state);
  return INTEROP_SYSTEMS.find(system => system.id === lab.activeSystemId) || INTEROP_SYSTEMS[0];
}

export function selectInteropSystem(state, systemId) {
  const lab = ensureInteropLabState(state);
  const system = INTEROP_SYSTEMS.find(item => item.id === systemId);
  if (!system) throw new Error('Unknown fictional demo system.');
  if (lab.activeSystemId === system.id) return system;
  lab.activeSystemId = system.id;
  const run = { id: `LAB-${String(lab.nextRun++).padStart(4, '0')}`, featureId: 'system-switch', featureName: system.name, systemId: system.id, at: new Date().toISOString(), summaryHr: `Prebačen je lokalni radni prostor na ${system.name}.`, summaryEn: `Local workspace switched to ${system.name}.`, evidence: { activeSystemId: system.id, fictionalSystem: true, externalConnections: false }, demoOnly: true, noExternalRequest: true };
  lab.runs.unshift(run);
  lab.runs.length = Math.min(lab.runs.length, 80);
  return system;
}

export function ensureInteropLabState(state) {
  state.interoperabilityLab ||= createInteropLabState();
  const lab = state.interoperabilityLab;
  if (!Array.isArray(lab.bankConnectors) || !Array.isArray(lab.venues)) Object.assign(lab, createInteropLabState());
  lab.runs = Array.isArray(lab.runs) ? lab.runs : [];
  lab.alerts = Array.isArray(lab.alerts) ? lab.alerts : [];
  lab.lastResult = lab.lastResult && typeof lab.lastResult === 'object' ? lab.lastResult : null;
  lab.disputes = Array.isArray(lab.disputes) ? lab.disputes : [];
  lab.demoSessions = Array.isArray(lab.demoSessions) ? lab.demoSessions : createInteropLabState().demoSessions;
  lab.activeSystemId = INTEROP_SYSTEMS.some(item => item.id === lab.activeSystemId) ? lab.activeSystemId : 'croatia';
  lab.nextRun = Number.isSafeInteger(lab.nextRun) && lab.nextRun > 0 ? lab.nextRun : lab.runs.length + 1;
  lab.killSwitch = Boolean(lab.killSwitch);
  lab.demoOnly = DEMO;
  for (const connector of lab.bankConnectors) connector.systemId ||= connector.id.startsWith('bank-sg-') ? 'singapore' : connector.id.startsWith('bank-eg-') ? 'egypt' : 'croatia';
  for (const connector of lab.venues) connector.systemId ||= connector.id.startsWith('venue-sg-') ? 'singapore' : connector.id.startsWith('venue-eg-') ? 'egypt' : 'croatia';
  const defaults = createInteropLabState();
  for (const seed of BANK_SEEDS) if (!lab.bankConnectors.some(item => item.id === seed.id)) lab.bankConnectors.push(defaults.bankConnectors.find(item => item.id === seed.id));
  for (const seed of VENUE_SEEDS) if (!lab.venues.some(item => item.id === seed.id)) lab.venues.push(defaults.venues.find(item => item.id === seed.id));
  for (const run of lab.runs) {
    run.systemId ||= 'croatia';
    run.systemName ||= INTEROP_SYSTEMS.find(item => item.id === run.systemId)?.name || INTEROP_SYSTEMS[0].name;
    run.demoOnly = true;
    run.noExternalRequest ??= true;
  }
  for (const alert of lab.alerts) { alert.systemId ||= 'croatia'; alert.demoOnly = true; }
  for (const dispute of lab.disputes) { dispute.systemId ||= 'croatia'; dispute.demoOnly = true; }
  if (lab.lastResult && !lab.lastResult.systemId) {
    lab.lastResult.systemId = 'croatia';
    lab.lastResult.systemName = INTEROP_SYSTEMS[0].name;
  }
  if (lab.killSwitch) {
    const previous = new Map(lab.previousStatuses || []);
    for (const connector of [...lab.bankConnectors, ...lab.venues]) {
      if (!previous.has(connector.id)) previous.set(connector.id, connector.status === 'connected_demo' ? 'connected_demo' : 'paused_demo');
      connector.status = 'paused_demo';
    }
    lab.previousStatuses = [...previous];
  }
  return lab;
}

function sumBalances(connectors) {
  const totals = {};
  for (const connector of connectors) for (const balance of connector.balances || []) totals[balance.currency] = (totals[balance.currency] || 0) + balance.cents;
  return totals;
}
function round(value, digits = 2) { return Number(Number(value).toFixed(digits)); }

export function toggleInteropConnector(state, connectorId) {
  const lab = ensureInteropLabState(state);
  if (lab.killSwitch) throw new Error('Emergency pause is on. Restore local adapters before changing demo status.');
  const connector = [...lab.bankConnectors, ...lab.venues].find(item => item.id === connectorId && item.systemId === lab.activeSystemId);
  if (!connector) throw new Error('Unknown connector in this fictional demo system.');
  connector.status = connector.status === 'connected_demo' ? 'paused_demo' : 'connected_demo';
  if (connector.status === 'connected_demo' && !connector.lastSyncAt && connector.balances) connector.lastSyncAt = nowMinus(1);
  lab.runs.unshift({ id: `LAB-${String(lab.nextRun++).padStart(4, '0')}`, featureId: 'connector-toggle', at: new Date().toISOString(), summaryHr: `${connector.name}: ${connector.status === 'connected_demo' ? 'uključen lokalni uzorak' : 'pauziran lokalni uzorak'}.`, summaryEn: `${connector.name}: local sample ${connector.status === 'connected_demo' ? 'enabled' : 'paused'}.`, evidence: { connectorId, systemId: lab.activeSystemId, status: connector.status }, demoOnly: true, noExternalRequest: true });
  lab.runs.length = Math.min(lab.runs.length, 80);
  return connector;
}

export function refreshInteropConnector(state, connectorId) {
  const lab = ensureInteropLabState(state);
  if (lab.killSwitch) throw new Error('Emergency pause is on; no sample refresh can run.');
  const connector = lab.bankConnectors.find(item => item.id === connectorId && item.systemId === lab.activeSystemId);
  if (!connector || connector.status !== 'connected_demo') throw new Error('Enable this local bank fixture before refreshing its sample.');
  connector.refreshCount += 1;
  connector.lastSyncAt = new Date().toISOString();
  connector.latencyMs = 170 + (connector.refreshCount * 73) % 510;
  lab.lastResult = { featureId: 'local-refresh', at: connector.lastSyncAt, summaryHr: `${connector.name}: lokalni ogledni zapis osvježen (${connector.refreshCount}).`, summaryEn: `${connector.name}: local fixture refreshed (${connector.refreshCount}).`, evidence: { connectorId, systemId: lab.activeSystemId, transactionsRead: connector.sampleTransactions.length, noNetworkRequest: true }, demoOnly: true, noExternalRequest: true };
  lab.runs.unshift({ id: `LAB-${String(lab.nextRun++).padStart(4, '0')}`, ...lab.lastResult });
  lab.runs.length = Math.min(lab.runs.length, 80);
  return connector;
}

export function runInteropFeature(state, featureId) {
  const lab = ensureInteropLabState(state);
  const system = INTEROP_SYSTEMS.find(item => item.id === lab.activeSystemId) || INTEROP_SYSTEMS[0];
  const feature = INTEROP_FEATURES.find(item => item.id === featureId);
  if (!feature) throw new Error('Unknown local feature rehearsal.');
  const connectedBanks = lab.bankConnectors.filter(item => item.systemId === system.id && item.status === 'connected_demo');
  const connectedVenues = lab.venues.filter(item => item.systemId === system.id && item.status === 'connected_demo');
  let evidence = {};
  let summaryHr = '';
  let summaryEn = '';

  switch (featureId) {
    case 'consent-audit': {
      const scopes = connectedBanks.flatMap(item => item.permissions || []);
      evidence = { activeMockAdapters: connectedBanks.length, readOnlyScopes: scopes.length, writeScopes: 0, revokeAvailable: true };
      summaryHr = `${connectedBanks.length} lokalna bankovna uzorka aktivna; ${scopes.length} dozvola samo za čitanje; nema dozvola za plaćanje.`;
      summaryEn = `${connectedBanks.length} local bank fixtures active; ${scopes.length} read-only grants; no payment-write permission.`;
      break;
    }
    case 'aggregate-balances': {
      const totals = sumBalances(connectedBanks);
      evidence = { connectorCount: connectedBanks.length, balancesCents: totals, accountIdsAreSynthetic: true };
      summaryHr = `${connectedBanks.length} fiktivnih adaptera agregirano; prikazana su samo sintetička salda.`;
      summaryEn = `${connectedBanks.length} fictional adapters aggregated; only synthetic balances are included.`;
      break;
    }
    case 'protection-map': {
      evidence = { categories: ['bank_deposit_demo', 'payment_balance_demo', 'e_money_demo'], noCoverageClaim: true };
      summaryHr = 'Tri vrste sredstava prikazane su odvojeno; ne tvrdi se da postoji stvarna zaštita ili račun.';
      summaryEn = 'Three funds categories remain distinct; no real protection or account is claimed.';
      break;
    }
    case 'beneficiary-check': {
      evidence = { submittedName: 'M. Novak', sampleName: 'Mira Novak', identifierShape: 'DEMO-HR-00000042', outcome: 'manual_review_demo', accountLookup: false };
      summaryHr = 'Razlika u imenu označena je za ljudski pregled; nije napravljena provjera računa.';
      summaryEn = 'A name difference is flagged for human review; no account lookup was performed.';
      break;
    }
    case 'bank-route': {
      const routes = connectedBanks.map(item => ({ id: item.id, name: item.name, feeCents: item.feeCents, latencyMs: item.latencyMs, score: item.feeCents + item.latencyMs / 100 })).sort((a, b) => a.score - b.score);
      evidence = { routes, winner: routes[0]?.id || null, transfersSent: 0 };
      summaryHr = routes.length ? `Najniži ogledni rezultat: ${routes[0].name}; ništa nije poslano.` : 'Nema uključenih oglednih banaka; ništa nije poslano.';
      summaryEn = routes.length ? `Lowest illustrative score: ${routes[0].name}; nothing was sent.` : 'No enabled bank fixtures; nothing was sent.';
      break;
    }
    case 'fx-cost': {
      const offers = connectedVenues.map(item => ({ venueId: item.id, venue: item.name, feeBps: item.feeBps, rate: round(system.fxRate * (1 + item.feeBps / 10000), 5), sampleOnly: true })).sort((a, b) => a.rate - b.rate);
      evidence = { systemId: system.id, pair: system.fxPair, localCurrency: system.currency, offers, source: 'fixed illustrative sample, not a public reference feed', executableQuote: false };
      summaryHr = `${offers.length} fiktivnih FX uzoraka uspoređeno odvojeno od dnevnih referentnih tečajeva.`;
      summaryEn = `${offers.length} fictional FX samples compared separately from daily reference rates.`;
      break;
    }
    case 'cashflow-forecast': {
      evidence = { systemId: system.id, currency: system.currency, horizonDays: 30, openingCents: system.reserveCents, expectedInflowCents: Math.round(system.cashOutCents * 0.56), expectedOutflowCents: system.cashOutCents, projectedCents: system.reserveCents + Math.round(system.cashOutCents * 0.56) - system.cashOutCents, dataSource: 'fixed fictional fixture' };
      summaryHr = 'Lokalna 30-dnevna prognoza iz fiksnog oglednog scenarija; nema bankovnih API poziva.';
      summaryEn = 'Local 30-day preview from a fixed sample scenario; no bank API was called.';
      break;
    }
    case 'duplicate-detect': {
      const ids = connectedBanks.flatMap(item => item.sampleTransactions || []);
      const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
      evidence = { sampledRows: ids.length, duplicates, paymentPrevented: false };
      summaryHr = duplicates.length ? `Pronađen sintetički duplikat: ${duplicates.join(', ')}; ništa nije blokirano.` : 'U fiksnom uzorku nije pronađen duplikat.';
      summaryEn = duplicates.length ? `Synthetic duplicate found: ${duplicates.join(', ')}; nothing was blocked.` : 'No duplicate found in the fixed fixture.';
      break;
    }
    case 'identity-minimization': {
      evidence = { sharedAttributes: ['age_over_18_demo', 'country_code_demo'], omitted: ['full_name', 'document_number', 'address'], credentialSubmitted: false };
      summaryHr = 'Prikazano je načelo minimizacije atributa; nije upotrijebljen identitet ni vjerodajnica.';
      summaryEn = 'Attribute-minimization is illustrated; no identity or credential was used.';
      break;
    }
    case 'connector-health': {
      const checks = lab.bankConnectors.filter(item => item.systemId === system.id).map(item => ({ id: item.id, enabled: item.status === 'connected_demo', freshnessMinutes: item.lastSyncAt ? Math.max(0, Math.floor((Date.now() - new Date(item.lastSyncAt).valueOf()) / 60000)) : null, fallbackAvailable: lab.bankConnectors.some(candidate => candidate.id !== item.id && candidate.status === 'connected_demo') }));
      evidence = { checks, liveHealthProbe: false };
      summaryHr = `${checks.filter(item => item.freshnessMinutes !== null && item.freshnessMinutes > 15).length} ogledna snimka zastarjela je više od 15 minuta; provjera je lokalna.`;
      summaryEn = `${checks.filter(item => item.freshnessMinutes !== null && item.freshnessMinutes > 15).length} sample snapshots are older than 15 minutes; this is a local check.`;
      break;
    }
    case 'venue-best-price': {
      const offers = connectedVenues.map(item => ({ venueId: item.id, venue: item.name, ...(item.markets[system.cryptoPair] || {}), feeBps: item.feeBps })).filter(item => Number.isFinite(item.ask)).sort((a, b) => a.ask * (1 + a.feeBps / 10000) - b.ask * (1 + b.feeBps / 10000));
      evidence = { systemId: system.id, market: system.cryptoPair, quoteCurrency: system.currency, offers, source: 'fixed sample order books', orderPlaced: false };
      summaryHr = offers.length ? `Najbolji fiksni ogledni ask s procijenjenom naknadom: ${offers[0].venue}; nema naloga.` : 'Nema uključenih oglednih mjenjačnica.';
      summaryEn = offers.length ? `Best fixed sample ask including illustrative fee: ${offers[0].venue}; no order was placed.` : 'No exchange fixtures are enabled.';
      break;
    }
    case 'slippage': {
      const sampleOrderBtc = 0.18;
      const best = connectedVenues.map(item => ({ item, book: item.markets[system.cryptoPair] })).filter(row => row.book).sort((a, b) => a.book.ask - b.book.ask)[0];
      const impactBps = best ? round((sampleOrderBtc / best.book.depth) * 4.8, 1) : null;
      evidence = { systemId: system.id, market: system.cryptoPair, sampleOrderBtc, venueId: best?.item.id || null, estimatedImpactBps: impactBps, model: 'teaching heuristic, not execution simulator' };
      summaryHr = best ? `Ogledna procjena utjecaja ${impactBps} bp na plitkoj fiksnoj knjizi; nije izvršni model.` : 'Nema aktivne ogledne knjige.';
      summaryEn = best ? `Illustrative ${impactBps} bp impact on a shallow fixed book; not an execution model.` : 'No active sample book.';
      break;
    }
    case 'limit-alert': {
      const sampleAsk = connectedVenues.map(venue => venue.markets[system.cryptoPair]?.ask).find(Number.isFinite) ?? 1000;
      const alert = { id: `ALT-${String(lab.alerts.length + 1).padStart(3, '0')}`, systemId: system.id, pair: system.cryptoPair, condition: 'below', threshold: round(sampleAsk * 0.95, 2), status: 'armed_demo', at: new Date().toISOString(), demoOnly: true, externalNotification: false };
      lab.alerts.unshift(alert);
      evidence = { alert, externalNotification: false, orderPlaced: false };
      summaryHr = 'Lokalno cjenovno upozorenje spremljeno; nema vanjske obavijesti ni naloga.';
      summaryEn = 'Local price alert saved; no external notification or order was sent.';
      break;
    }
    case 'venue-reconcile': {
      evidence = { venueId: connectedVenues[0]?.id || null, internalUnits: 0.825, statementUnits: 0.821, differenceUnits: 0.004, venueStatementFetched: false };
      summaryHr = 'Ogledno odstupanje od 0,004 jedinice označeno je za pregled; izvod nije preuzet.';
      summaryEn = 'A sample 0.004-unit difference is flagged for review; no venue statement was fetched.';
      break;
    }
    case 'counterparty-exposure': {
      const exposure = connectedVenues.map((item, index) => ({ venueId: item.id, venue: item.name, sharePct: [58, 27, 15][index] || 0 }));
      evidence = { exposure, proofOfReserves: false, solvencyConclusion: false };
      summaryHr = 'Prikazana je samo sintetička koncentracija; nema dokaza pričuve ni zaključka o solventnosti.';
      summaryEn = 'Only synthetic concentration is shown; there is no proof of reserves or solvency conclusion.';
      break;
    }
    case 'stablecoin-stress': {
      evidence = { systemId: system.id, asset: 'USDC', quoteCurrency: system.currency, sampleUnits: 10_000, referenceRate: system.fxRate, stressRate: round(system.fxRate * 0.935, 4), hypotheticalLossCents: Math.round(10_000 * system.fxRate * 0.065 * 100), redemptionAssessed: false };
      summaryHr = 'Fiktivni pad stablecoina modeliran je kao stresni scenarij, ne kao prognoza.';
      summaryEn = 'A fictional stablecoin drop is modeled as a stress case, not a forecast.';
      break;
    }
    case 'bridge-risk': {
      evidence = { route: 'Mock Chain A → Mock Chain B', risks: ['validator outage', 'delayed finality', 'contract exploit'], score: 7.4, scoreScale: 'illustrative 0–10', transactionBroadcast: false };
      summaryHr = 'Rizik mosta ocijenjen je prema fiksnim scenarijima; ništa nije poslano na blockchain.';
      summaryEn = 'Bridge risk is scored from fixed scenarios; nothing was broadcast to a blockchain.';
      break;
    }
    case 'travel-rule': {
      evidence = { fieldsPresent: 4, fieldsRequiredInFixture: 5, missing: ['originator_address_demo'], outcome: 'human_review_demo', screeningPerformed: false };
      summaryHr = 'Nedostaje jedno fiktivno polje; primjer je zadržan za ljudski pregled, bez provjera.';
      summaryEn = 'One fictional field is missing; the sample is held for human review, without screening.';
      break;
    }
    case 'audit-export': {
      evidence = { systemId: system.id, runCount: lab.runs.filter(run => run.systemId === system.id).length, connectorCount: [...lab.bankConnectors, ...lab.venues].filter(item => item.systemId === system.id).length, containsCustomerData: false, brand: 'DEMO DESKTOP ADRIA BANK' };
      summaryHr = 'Izvoz je spreman u sučelju; sadrži samo ogledne konektore i lokalne događaje.';
      summaryEn = 'Export is ready in the interface; it contains only mock connectors and local events.';
      break;
    }
    case 'scope-expiry': {
      const scopes = connectedBanks.flatMap(bank => (bank.permissions || []).map((scope, index) => ({ connectorId: bank.id, scope, expiresInDays: index ? 18 : 3, state: index ? 'active_demo' : 'expiring_demo' })));
      evidence = { systemId: system.id, scopes, expiringSoon: scopes.filter(scope => scope.expiresInDays <= 7).length, externalRevocation: false };
      summaryHr = `${scopes.filter(scope => scope.expiresInDays <= 7).length} oglednih privola istječe unutar 7 dana; ništa nije opozvano.`;
      summaryEn = `${scopes.filter(scope => scope.expiresInDays <= 7).length} sample grants expire within 7 days; none was revoked.`;
      break;
    }
    case 'revocation-preview': {
      const selected = connectedBanks[0];
      evidence = { systemId: system.id, connectorId: selected?.id || null, wouldStop: selected ? ['balance refresh', 'sample transaction view'] : [], wouldRemain: ['local reports', 'fictional customer workspace'], revocationSubmitted: false };
      summaryHr = 'Pregled utjecaja prikazan je za ogledni konektor; opoziv nije poslan.';
      summaryEn = 'Impact is previewed for a sample connector; no revocation was sent.';
      break;
    }
    case 'statement-normalizer': {
      const rows = [
        { bookingDate: '2026-09-02', amount: -2450, currency: system.currency, memo: 'DEMO-COFFEE-01' },
        { bookingDate: '2026-09-04', amount: 12500, currency: system.currency, memo: 'DEMO-SALARY-01' },
        { bookingDate: '2026-09-06', amount: -990, currency: system.currency, memo: 'DEMO-TRANSIT-02' }
      ].map((row, index) => ({ id: `NORM-${system.id.toUpperCase()}-${index + 1}`, bookedAt: row.bookingDate, amountMinor: row.amount, currency: row.currency, description: row.memo, source: 'fixed synthetic fixture' }));
      evidence = { systemId: system.id, canonicalSchema: ['id', 'bookedAt', 'amountMinor', 'currency', 'description'], normalizedRows: rows, sourceStatementDownloaded: false };
      summaryHr = `${rows.length} fiksnih redaka normalizirano je u kanonski format lokalno.`;
      summaryEn = `${rows.length} fixed rows were normalized to the canonical format locally.`;
      break;
    }
    case 'data-quality-gate': {
      const rows = [
        { id: 'ROW-DEMO-01', amount: 1200, currency: system.currency, date: '2026-09-01' },
        { id: 'ROW-DEMO-02', amount: -350, currency: system.currency, date: '2026-09-02' },
        { id: 'ROW-DEMO-03', amount: null, currency: system.currency, date: '2026-09-03' },
        { id: 'ROW-DEMO-04', amount: 700, currency: 'XXX', date: 'not-a-date' },
        { id: 'ROW-DEMO-05', amount: 480, currency: system.currency, date: '2026-09-05' }
      ];
      const issues = rows.flatMap(row => [!Number.isFinite(row.amount) ? { rowId: row.id, field: 'amount' } : null, !/^[A-Z]{3}$/.test(row.currency) || row.currency === 'XXX' ? { rowId: row.id, field: 'currency' } : null, !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ? { rowId: row.id, field: 'date' } : null].filter(Boolean));
      evidence = { systemId: system.id, rowsChecked: rows.length, validRows: rows.length - new Set(issues.map(issue => issue.rowId)).size, issues, importPerformed: false };
      summaryHr = `${rows.length} sintetičkih redaka provjereno; ${issues.length} nedostataka označeno, bez uvoza.`;
      summaryEn = `${rows.length} synthetic rows checked; ${issues.length} issues flagged, with no import.`;
      break;
    }
    case 'transaction-categorizer': {
      const entries = [
        ['DEMO-TRANS-01', 'CITY-TRANSIT', 'transport'], ['DEMO-TRANS-02', 'GROCERY-MARKET', 'groceries'],
        ['DEMO-TRANS-03', 'MONTHLY-STREAM', 'subscriptions'], ['DEMO-TRANS-04', 'SALARY-SAMPLE', 'income'],
        ['DEMO-TRANS-05', 'PHARMACY-DEMO', 'health']
      ].map(([id, label, category]) => ({ id, label, category, confidence: category === 'income' ? 0.94 : 0.88, rule: 'fixed demo merchant mapping' }));
      evidence = { systemId: system.id, entries, categories: [...new Set(entries.map(entry => entry.category))], userDataUsed: false };
      summaryHr = `${entries.length} sintetičkih stavki kategorizirano prema fiksnim oglednim pravilima.`;
      summaryEn = `${entries.length} synthetic entries categorized using fixed sample rules.`;
      break;
    }
    case 'recurring-patterns': {
      const patterns = [
        { label: 'DEMO-STREAMING', cadence: 'monthly', occurrences: 5, medianMinor: 1299 },
        { label: 'DEMO-CLOUD-PLAN', cadence: 'monthly', occurrences: 4, medianMinor: 890 },
        { label: 'DEMO-TRANSIT-PASS', cadence: 'monthly', occurrences: 6, medianMinor: 4500 }
      ];
      evidence = { systemId: system.id, currency: system.currency, patterns, cancellationRequested: false };
      summaryHr = `${patterns.length} ogledna ponavljajuća uzorka pronađena; nema otkazivanja ni naloga.`;
      summaryEn = `${patterns.length} sample recurring patterns found; nothing was cancelled or instructed.`;
      break;
    }
    case 'cash-buffer': {
      const minimumCents = Math.round(system.cashOutCents * 0.25);
      const bufferMonths = round(system.reserveCents / Math.max(system.cashOutCents, 1), 2);
      evidence = { systemId: system.id, currency: system.currency, reserveCents: system.reserveCents, sampleMonthlyOutflowCents: system.cashOutCents, minimumBufferCents: minimumCents, estimatedMonths: bufferMonths, illustrativeOnly: true };
      summaryHr = `Fiktivna pričuva pokriva približno ${bufferMonths} ogledna mjeseca; nije financijski savjet.`;
      summaryEn = `The fictional reserve covers about ${bufferMonths} sample months; this is not financial advice.`;
      break;
    }
    case 'liquidity-ladder': {
      const buckets = [
        { horizonDays: '0–7', inflowCents: Math.round(system.cashOutCents * 0.08), outflowCents: Math.round(system.cashOutCents * 0.21) },
        { horizonDays: '8–30', inflowCents: Math.round(system.cashOutCents * 0.31), outflowCents: Math.round(system.cashOutCents * 0.42) },
        { horizonDays: '31–90', inflowCents: Math.round(system.cashOutCents * 0.56), outflowCents: Math.round(system.cashOutCents * 0.25) }
      ];
      evidence = { systemId: system.id, currency: system.currency, buckets, source: 'fixed fictional schedule', forecastGuarantee: false };
      summaryHr = 'Ogledni priljevi i odljevi raspoređeni su u tri vremenska horizonta.';
      summaryEn = 'Sample inflows and outflows were grouped into three time horizons.';
      break;
    }
    case 'fee-anomaly': {
      const fees = [18, 24, 22, 19, 125, 21].map((feeCents, index) => ({ id: `FEE-DEMO-${index + 1}`, feeCents, outlier: feeCents > 60 }));
      evidence = { systemId: system.id, currency: system.currency, fees, thresholdCents: 60, flagged: fees.filter(fee => fee.outlier).map(fee => fee.id), feeWasCharged: false };
      summaryHr = `${fees.filter(fee => fee.outlier).length} sintetička naknada odskače od oglednog praga; nijedna nije naplaćena.`;
      summaryEn = `${fees.filter(fee => fee.outlier).length} synthetic fee is outside the sample threshold; none was charged.`;
      break;
    }
    case 'cutoff-calendar': {
      evidence = { systemId: system.id, city: system.city, timezone: system.timezone, cutoff: system.cutoffLocal, calendarSource: 'fixed demonstration setting', paymentRailQueried: false };
      summaryHr = `Prikazan je fiksni lokalni ogledni rok za ${system.city}; nema provjere platnog sustava.`;
      summaryEn = `A fixed local sample cut-off for ${system.city} is shown; no payment rail was queried.`;
      break;
    }
    case 'batch-quality': {
      const recipients = [
        { id: 'PAYEE-DEMO-01', iban: `DEMO-${system.id.toUpperCase()}-0000000001`, amountCents: 1200 },
        { id: 'PAYEE-DEMO-02', iban: `DEMO-${system.id.toUpperCase()}-0000000002`, amountCents: 8700 },
        { id: 'PAYEE-DEMO-03', iban: 'INVALID-DEMO-FORMAT', amountCents: 650 },
        { id: 'PAYEE-DEMO-04', iban: `DEMO-${system.id.toUpperCase()}-0000000004`, amountCents: -50 },
        { id: 'PAYEE-DEMO-05', iban: `DEMO-${system.id.toUpperCase()}-0000000005`, amountCents: 3000 }
      ];
      const issues = recipients.flatMap(row => [!/^DEMO-[A-Z]+-\d{10}$/.test(row.iban) ? { payeeId: row.id, field: 'identifier-shape' } : null, row.amountCents <= 0 ? { payeeId: row.id, field: 'amount' } : null].filter(Boolean));
      evidence = { systemId: system.id, rowsChecked: recipients.length, issues, batchExported: false, paymentSubmitted: false };
      summaryHr = `${recipients.length} sintetičkih primatelja provjereno; ${issues.length} formatnih nedostataka označeno.`;
      summaryEn = `${recipients.length} synthetic payees checked; ${issues.length} format issues flagged.`;
      break;
    }
    case 'fx-stress': {
      const amountMinor = 100_000;
      const baseMinor = Math.round(amountMinor * system.fxRate);
      const scenarios = [-0.1, 0, 0.1].map(move => ({ movePct: move * 100, sampleRate: round(system.fxRate * (1 + move), 5), outputMinor: Math.round(amountMinor * system.fxRate * (1 + move)) }));
      evidence = { systemId: system.id, pair: system.fxPair, amountMinor, quoteCurrency: system.currency, baseOutputMinor: baseMinor, scenarios, hedgeCreated: false, executableQuote: false };
      summaryHr = 'Tri fiksna valutna scenarija uspoređena su za učenje; zaštita nije postavljena.';
      summaryEn = 'Three fixed currency scenarios were compared for learning; no hedge was placed.';
      break;
    }
    case 'cross-border-cost': {
      const amountMinor = 50_000;
      const breakdown = { bankFeeMinor: 350, intermediaryIllustrationMinor: 220, conversionSpreadMinor: 175, totalIllustrativeCostMinor: 745 };
      evidence = { systemId: system.id, amountMinor, currency: system.currency, breakdown, totalPct: 1.49, paymentSent: false, quoteIsExecutable: false };
      summaryHr = 'Trošak fiksnog oglednog prekograničnog primjera razdvojen je; nalog nije izrađen.';
      summaryEn = 'The fixed sample cross-border cost is itemized; no instruction was created.';
      break;
    }
    case 'cash-concentration': {
      const balances = sumBalances(connectedBanks);
      const localTotalCents = balances[system.currency] || 0;
      evidence = { systemId: system.id, currency: system.currency, balancesByCurrencyCents: balances, localCurrencyTotalCents: localTotalCents, illustrativeTargetSplitPct: [{ bucket: 'daily_demo', share: 45 }, { bucket: 'reserve_demo', share: 35 }, { bucket: 'contingency_demo', share: 20 }], transferInstructionsCreated: 0 };
      summaryHr = 'Ogledna raspodjela 45/35/20 izračunata je iz lokalnih salda; nema prijenosa.';
      summaryEn = 'An illustrative 45/35/20 allocation was calculated from local balances; no transfer was made.';
      break;
    }
    case 'nostro-reconciliation': {
      const entries = [{ reference: 'NOSTRO-DEMO-01', ledgerMinor: 125000, statementMinor: 125000 }, { reference: 'NOSTRO-DEMO-02', ledgerMinor: 84000, statementMinor: 83850 }, { reference: 'NOSTRO-DEMO-03', ledgerMinor: 42100, statementMinor: 42100 }];
      const unmatched = entries.filter(entry => entry.ledgerMinor !== entry.statementMinor).map(entry => ({ reference: entry.reference, differenceMinor: entry.ledgerMinor - entry.statementMinor }));
      evidence = { systemId: system.id, currency: system.currency, entries, matchedCount: entries.length - unmatched.length, unmatched, statementImported: false };
      summaryHr = `${entries.length} fiksna ogledna zapisa uspoređena; ${unmatched.length} razlika označena.`;
      summaryEn = `${entries.length} fixed sample entries compared; ${unmatched.length} difference flagged.`;
      break;
    }
    case 'protection-explainer': {
      evidence = { systemId: system.id, categories: [{ type: 'bank_deposit_demo', status: 'institution_and_eligibility_not_verified' }, { type: 'e_money_demo', status: 'safeguarding_is_not_a_deposit_guarantee' }, { type: 'payment_balance_demo', status: 'provider_terms_not_assessed' }], eligibilityDetermined: false, coverageClaim: false };
      summaryHr = 'Edukativne kategorije razdvojene su; podobnost, licenca i pokriće nisu provjereni.';
      summaryEn = 'Educational categories are separated; eligibility, licensing and coverage were not verified.';
      break;
    }
    case 'dispute-lifecycle': {
      let dispute = lab.disputes.find(item => item.systemId === system.id && item.stageIndex < 3);
      if (!dispute) {
        dispute = { id: `DSP-DEMO-${String(lab.disputes.filter(item => item.systemId === system.id).length + 1).padStart(3, '0')}`, systemId: system.id, stageIndex: 0, stage: 'intake_demo', demoOnly: true };
        lab.disputes.push(dispute);
      } else {
        dispute.stageIndex += 1;
        dispute.stage = ['intake_demo', 'evidence_review_demo', 'training_complete_demo'][dispute.stageIndex];
      }
      evidence = { systemId: system.id, disputeId: dispute.id, stage: dispute.stage, stages: ['intake_demo', 'evidence_review_demo', 'training_complete_demo'], externalNetworkContacted: false, realCustomerCase: false };
      summaryHr = `Lokalni ogledni spor ${dispute.id} sada je u fazi ${dispute.stage}; nema kartične mreže.`;
      summaryEn = `Local sample dispute ${dispute.id} is now at ${dispute.stage}; no card network is involved.`;
      break;
    }
    case 'chargeback-checklist': {
      const checklist = [{ item: 'sample_receipt', present: true }, { item: 'sample_delivery_note', present: true }, { item: 'sample_customer_message', present: false }, { item: 'sample_refund_record', present: false }, { item: 'sample_case_timeline', present: true }];
      evidence = { systemId: system.id, checklist, complete: checklist.filter(item => item.present).length, required: checklist.length, representmentSubmitted: false };
      summaryHr = `Ogledni kontrolni popis: ${evidence.complete}/${evidence.required} stavki; ništa nije predano.`;
      summaryEn = `Sample checklist: ${evidence.complete}/${evidence.required} items; nothing was submitted.`;
      break;
    }
    case 'fraud-tabletop': {
      const steps = ['report_received_demo', 'card_freeze_discussed_demo', 'customer_contact_script_demo', 'incident_review_demo'];
      evidence = { systemId: system.id, scenario: 'fictional_lost_card', steps, realCardFrozen: false, externalAlertsSent: 0 };
      summaryHr = 'Odrađena je fiksna stolna vježba izgubljene demo-kartice; prava kartica nije blokirana.';
      summaryEn = 'A fixed lost-demo-card tabletop was rehearsed; no real card was frozen.';
      break;
    }
    case 'aml-priority': {
      const cases = [{ id: 'AML-DEMO-01', signalCount: 2, queueBand: 'routine_training' }, { id: 'AML-DEMO-02', signalCount: 4, queueBand: 'review_training' }, { id: 'AML-DEMO-03', signalCount: 1, queueBand: 'routine_training' }].sort((a, b) => b.signalCount - a.signalCount);
      evidence = { systemId: system.id, cases, realTransactionsMonitored: false, filingDecisionMade: false, complianceScreening: false };
      summaryHr = 'Tri fiktivna scenarija poredana su za obuku; nema praćenja ni odluke o prijavi.';
      summaryEn = 'Three fictional scenarios were ranked for training; no monitoring or filing decision occurred.';
      break;
    }
    case 'sanctions-rehearsal': {
      const path = ['synthetic_candidate_fixture', 'pause_for_human_review_demo', 'record_disposition_locally'];
      evidence = { systemId: system.id, path, listSearchPerformed: false, externalMatchClaim: false, paymentBlocked: false };
      summaryHr = 'Vježbana je fiksna eskalacijska putanja; sankcijske liste nisu pretražene.';
      summaryEn = 'A fixed escalation path was rehearsed; no sanctions lists were searched.';
      break;
    }
    case 'pep-coaching': {
      const checklist = ['identify_declared_public_role_demo', 'record_source_date_demo', 'route_for_manual_review_demo', 'apply_local_policy_demo'];
      evidence = { systemId: system.id, checklist, pepScreeningPerformed: false, riskRatingAssigned: false };
      summaryHr = 'Prikazana je edukativna PEP kontrolna lista; nema provjere osobe ni procjene rizika.';
      summaryEn = 'An educational PEP checklist is shown; no person was screened or rated.';
      break;
    }
    case 'maker-checker-map': {
      const workflow = [{ step: 'prepare_demo', role: 'maker_demo' }, { step: 'review_demo', role: 'checker_demo' }, { step: 'release_simulation', role: 'separate_checker_demo' }];
      evidence = { systemId: system.id, workflow, roleSeparationIllustrated: true, accessControlEnforced: false, instructionReleased: false };
      summaryHr = 'Prikazane su odvojene ogledne uloge; ovo nije kontrola pristupa ni odobrenje.';
      summaryEn = 'Separate sample roles are displayed; this is not access control or approval.';
      break;
    }
    case 'audit-evidence-pack': {
      const events = lab.runs.filter(run => run.systemId === system.id).slice(0, 12).map(run => ({ id: run.id, featureId: run.featureId, at: run.at, demoOnly: true }));
      evidence = { systemId: system.id, brand: 'DEMO DESKTOP ADRIA BANK', eventIndex: events, connectorCount: [...lab.bankConnectors, ...lab.venues].filter(item => item.systemId === system.id).length, customerDataIncluded: false, evidencePackCreated: true };
      summaryHr = `Lokalni indeks revizije sastavljen s ${events.length} oglednih događaja.`;
      summaryEn = `Local audit index assembled with ${events.length} sample events.`;
      break;
    }
    case 'portability-kit': {
      const localBanks = lab.bankConnectors.filter(item => item.systemId === system.id);
      const localVenues = lab.venues.filter(item => item.systemId === system.id);
      evidence = { systemId: system.id, exportableFixtures: localBanks.length + localVenues.length, records: localBanks.reduce((count, item) => count + item.sampleTransactions.length, 0), brand: 'DEMO DESKTOP ADRIA BANK', containsRealCustomerData: false, outsideDataAccess: false, localJsonReady: true };
      summaryHr = `Komplet izvoza spreman: ${evidence.exportableFixtures} fiktivnih adaptera; nema stvarnih klijenata.`;
      summaryEn = `Portability bundle is ready: ${evidence.exportableFixtures} fictional adapters; no real customers.`;
      break;
    }
    case 'session-hygiene': {
      const sessions = lab.demoSessions.map(session => ({ ...session, systemId: system.id, expiryAction: session.state === 'expired_demo' || session.ageMinutes > 120 ? 'expire_locally' : session.ageMinutes > 60 ? 'review_idle_demo' : 'keep_training_session' }));
      evidence = { systemId: system.id, sessions, expiredOrIdle: sessions.filter(session => session.expiryAction !== 'keep_training_session').length, authenticationSystemTouched: false };
      summaryHr = `${sessions.filter(session => session.expiryAction !== 'keep_training_session').length} fiksnih demo-sesija označeno za pregled/istek; prijava nije dirana.`;
      summaryEn = `${sessions.filter(session => session.expiryAction !== 'keep_training_session').length} fixed demo sessions flagged for review/expiry; no sign-in system was touched.`;
      break;
    }
    case 'passkey-readiness': {
      const checks = [{ id: 'local-platform-authenticator', ready: true }, { id: 'recovery-process-reviewed', ready: false }, { id: 'user-consent-explained', ready: true }, { id: 'credential-created', ready: false }];
      evidence = { systemId: system.id, checks, credentialCreated: false, credentialRead: false, deviceApiUsed: false };
      summaryHr = 'Kontrolna lista spremnosti je demonstrirana; vjerodajnica nije kreirana ni pročitana.';
      summaryEn = 'Readiness checklist demonstrated; no credential was created or read.';
      break;
    }
    case 'crypto-preflight': {
      const sample = { asset: 'BTC', selectedNetwork: 'Mock-Net-A', addressNetwork: 'Mock-Net-B', amount: 0.025 };
      evidence = { systemId: system.id, sample, checks: [{ id: 'network_match', passed: false }, { id: 'positive_amount', passed: true }, { id: 'synthetic_destination', passed: true }], outcome: 'manual_review_demo', broadcast: false, walletConnected: false };
      summaryHr = 'Neslaganje ogledne mreže zaustavlja vježbu; novčanik nije povezan i ništa nije emitirano.';
      summaryEn = 'A sample network mismatch pauses the rehearsal; no wallet was connected or transaction broadcast.';
      break;
    }
    case 'wallet-format': {
      const sampleAddress = `DEMO-${system.id.toUpperCase()}-BTC-${'0'.repeat(32)}`;
      const formatLooksSynthetic = /^DEMO-[A-Z]+-BTC-\d{32}$/.test(sampleAddress);
      evidence = { systemId: system.id, sampleAddress, formatLooksSynthetic, checksumVerified: false, blockchainLookup: false, reusableWalletAddress: false };
      summaryHr = 'Prepoznat je lokalni demo-format; nije provjeren checksum niti blockchain.';
      summaryEn = 'The local demo shape is recognized; no checksum or blockchain lookup was performed.';
      break;
    }
    case 'custody-allocation': {
      const allocation = [{ fixture: 'Northstar Custody Mock', sharePct: 50 }, { fixture: 'Adriatic Vault Lab', sharePct: 30 }, { fixture: 'Offline Training Wallet', sharePct: 20 }];
      evidence = { systemId: system.id, allocation, totalPct: allocation.reduce((sum, item) => sum + item.sharePct, 0), custodyProviderContacted: false, assetsMoved: false, proofOfReserves: false };
      summaryHr = 'Fiktivna raspodjela skrbništva iznosi 100%; sredstva nisu premještena.';
      summaryEn = 'Fictional custody allocation totals 100%; no assets were moved.';
      break;
    }
    case 'kill-switch': {
      if (!lab.killSwitch) {
        lab.previousStatuses = [...lab.bankConnectors, ...lab.venues].map(item => [item.id, item.status]);
        for (const connector of [...lab.bankConnectors, ...lab.venues]) connector.status = 'paused_demo';
        lab.killSwitch = true;
      } else {
        const previous = new Map(lab.previousStatuses || []);
        for (const connector of [...lab.bankConnectors, ...lab.venues]) connector.status = previous.get(connector.id) || 'paused_demo';
        lab.killSwitch = false;
        lab.previousStatuses = null;
      }
      evidence = { killSwitchActive: lab.killSwitch, pausedConnectors: [...lab.bankConnectors, ...lab.venues].filter(item => item.status !== 'connected_demo').length, scope: 'local demo only' };
      summaryHr = lab.killSwitch ? 'Svi simulacijski adapteri pauzirani lokalno.' : 'Prethodna stanja lokalnih adaptera vraćena.';
      summaryEn = lab.killSwitch ? 'All simulation adapters paused locally.' : 'Previous local adapter states restored.';
      break;
    }
    default: throw new Error('This feature is not available in the local workbench.');
  }

  const run = { id: `LAB-${String(lab.nextRun++).padStart(4, '0')}`, featureId, featureName: feature.en, systemId: system.id, systemName: system.name, at: new Date().toISOString(), summaryHr, summaryEn, evidence, demoOnly: true, noExternalRequest: true };
  lab.lastResult = run;
  lab.runs.unshift(run);
  lab.runs.length = Math.min(lab.runs.length, 80);
  return run;
}

export function resetInteropLab(state) {
  state.interoperabilityLab = createInteropLabState();
  return state.interoperabilityLab;
}
