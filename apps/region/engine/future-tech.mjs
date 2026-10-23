#!/usr/bin/env node
/**
 * TEHNOLOGIJA BUDUĆNOSTI — pet stvari koje su već stigle.
 *
 * Za razliku od dnevnog deska `/izdanja/tehnologija/`, ova stranica ne
 * prati vijesti. Ona stoji mirno i tvrdi samo ono što je izmjereno,
 * objavljeno i provjerljivo — i svaku tvrdnju veže na numerirani izvor
 * koji je stvarna, datirana publikacija.
 *
 *   /tehnologija-buducnosti/      ↔ /en/future-technology/
 *   apps/portal/data/future-tech-v1.json
 *   apps/portal/tehnologija-buducnosti/sitemap.xml
 *
 * Pet stupova: misao kao tipkovnica (BCI), personalizirano mRNA cjepivo,
 * AI tutor, bežični prijenos energije, kvantna korekcija pogrešaka.
 *
 * Pravilo generatora: nijedna brojka ne ulazi ako nema izvor. Zato se
 * populacija, datumi i postoci drže u PILLARS/SOURCES, a ne u HTML-u, i
 * zato `--check` pada ako stranica izgubi izvor ili stup.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc } from './lib.mjs';
import { CHANNELS } from './build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const ROOT = join(APP, '..', '..');
const PORTAL = join(ROOT, 'apps', 'portal');

const SITE = 'https://gnk-asg.hr';
const HR_PATH = '/tehnologija-buducnosti/';
const EN_PATH = '/en/future-technology/';
const VERSION = 'GNK_ASG_FUTURE_TECH_V1_20261021';
const TODAY = '2026-10-21';

const MARK_START = '<!-- FUTURE-TECH-BAND:START -->';
const MARK_END = '<!-- FUTURE-TECH-BAND:END -->';

/* ---------- izvori ----------
   Samo primarni izvori i publikacije koje izvještavaju o primarnom izvoru.
   Bez nakladnika, naslova, datuma i adrese izvor ne ulazi u popis. */
const SOURCES = [
  { id: 'caltech2023', publisher: 'Caltech', title: 'In a First, Caltech’s Space Solar Power Demonstrator Wirelessly Transmits Power in Space', date: '2023-06-01', url: 'https://www.caltech.edu/about/news/in-a-first-caltechs-space-solar-power-demonstrator-wirelessly-transmits-power-in-space' },
  { id: 'science2023', publisher: 'Science', title: 'Satellite beams solar power down to Earth, in first-of-a-kind demonstration', date: '2023-06-06', url: 'https://www.science.org/content/article/satellite-beams-solar-power-down-earth-first-kind-demonstration' },
  { id: 'natureqec2025', publisher: 'Nature', title: 'Quantum error correction below the surface code threshold', date: '2025-02-27', url: 'https://www.nature.com/articles/s41586-024-08449-y' },
  { id: 'googleqec2024', publisher: 'Google Research', title: 'Making quantum error correction work', date: '2024-12-09', url: 'https://research.google/blog/making-quantum-error-correction-work/' },
  { id: 'darpa2025', publisher: 'DARPA', title: 'DARPA program sets distance record for power beaming', date: '2025-05-16', url: 'https://www.darpa.mil/news/2025/darpa-program-distance-record-power-beaming' },
  { id: 'scirep2025', publisher: 'Scientific Reports', title: 'AI tutoring outperforms in-class active learning: an RCT introducing a novel research-based design in an authentic educational setting', date: '2025-06-03', url: 'https://www.nature.com/articles/s41598-025-97652-6' },
  { id: 'harvard2024', publisher: 'Harvard Gazette', title: 'Professor tailored AI tutor to physics course. Engagement doubled.', date: '2024-09-06', url: 'https://news.harvard.edu/gazette/story/2024/09/professor-tailored-ai-tutor-to-physics-course-engagement-doubled/' },
  { id: 'ieee2025', publisher: 'IEEE Spectrum', title: 'Wireless Power Milestone Achieved by DARPA', date: '2025-07-18', url: 'https://spectrum.ieee.org/darpa-optical-wireless-power' },
  { id: 'naturevoice2025', publisher: 'Nature', title: 'An instantaneous voice-synthesis neuroprosthesis', date: '2025-06-12', url: 'https://www.nature.com/articles/s41586-025-09127-3' },
  { id: 'naturenews2025', publisher: 'Nature (news)', title: 'Brain implant decodes neural activity to produce expressive speech', date: '2025-07-02', url: 'https://www.nature.com/articles/d41586-025-02042-7' },
  { id: 'cell2025', publisher: 'Cell', title: 'Inner speech in motor cortex and implications for speech neuroprostheses', date: '2025-08-14', url: 'https://www.cell.com/cell/fulltext/S0092-8674(25)00681-6' },
  { id: 'ninds2025', publisher: 'NIH / NINDS', title: 'Decoding inner speech from brain signals', date: '2025-09-09', url: 'https://www.nih.gov/news-events/nih-research-matters/decoding-inner-speech-brain-signals' },
  { id: 'natneuro2026', publisher: 'Nature Neuroscience', title: 'Restoring rapid natural bimanual typing with a neuroprosthesis after paralysis', date: '2026-03-16', url: 'https://www.nature.com/articles/s41593-026-02218-y' },
  { id: 'pvmagazine2026', publisher: 'pv magazine', title: 'China conducts first experiments for space-based solar power plants', date: '2026-05-20', url: 'https://www.pv-magazine.com/2026/05/20/china-conducts-first-experiments-for-space-based-solar-power-plants/' },
  { id: 'natmed2026', publisher: 'Nature Medicine', title: 'Long-term independent use of an intracortical brain–computer interface for speech and cursor control', date: '2026-06-15', url: 'https://www.nature.com/articles/s41591-026-04414-6' },
  { id: 'merck2026', publisher: 'Merck', title: 'Moderna and Merck Present 5-Year Data for Intismeran Autogene in Combination With KEYTRUDA at the 2026 ASCO Annual Meeting', date: '2026-06-01', url: 'https://www.merck.com/news/moderna-and-merck-present-5-year-data-for-intismeran-autogene-in-combination-with-keytruda-pembrolizumab-in-patients-with-high-risk-stage-iii-iv-melanoma-following-complete-resection-at-the-20/' },
  { id: 'ascopost2026', publisher: 'The ASCO Post', title: 'Vaccine Plus Pembrolizumab Reduces Risk of Recurrence in High-Risk, Resected Melanoma', date: '2026-06-03', url: 'https://ascopost.com/news/june-2026/vaccine-plus-pembrolizumab-reduces-risk-of-recurrence-in-high-risk-resected-melanoma/' },
  { id: 'businesswire2026', publisher: 'Business Wire / Merck & Moderna', title: 'Phase 3 INTerpath-001 Trial of Intismeran Autogene Plus KEYTRUDA Met Endpoints of RFS and DMFS', date: '2026-08-19', url: 'https://www.businesswire.com/news/home/20260819675697/en/Merck-and-Moderna-Announce-Phase-3-INTerpath-001-Trial-of-Intismeran-Autogene-Plus-KEYTRUDA-Met-Endpoints-of-Recurrence-Free-Survival-RFS-and-Distant-Metastasis-Free-Survival-DMFS-in-Patients-With-Completely-Resected-Stage-IIB-IV-Melanoma' },
  { id: 'ajmc2026', publisher: 'AJMC', title: 'Moderna, Merck mRNA Cancer Vaccine Succeeds in Late-Stage Trial', date: '2026-10-19', url: 'https://www.ajmc.com/view/moderna-merck-mrna-cancer-vaccine-succeeds-in-late-stage-trial' },
];

const srcIndex = new Map(SOURCES.map((source, index) => [source.id, index + 1]));
const src = (id) => SOURCES.find((item) => item.id === id);

/* ---------- vremenska crta (sve provjerljivo, s izvorom) ---------- */
const TIMELINE = [
  { date: '2023-05-22', hr: 'Caltechov MAPLE šalje mikrovalni snop iz orbite; prijemnik u Pasadeni ga bilježi.', en: 'Caltech’s MAPLE sends a microwave beam from orbit; a receiver in Pasadena detects it.', sources: ['caltech2023', 'science2023'] },
  { date: '2024-12-09', hr: 'Google objavljuje Willow: površinski kod ispod praga, pogreška pada kako čip raste.', en: 'Google announces Willow: a surface code below threshold, with error falling as the chip grows.', sources: ['googleqec2024', 'natureqec2025'] },
  { date: '2025-05-16', hr: 'DARPA POWER: više od 800 W laserom na 8,6 km tijekom 30 sekundi.', en: 'DARPA POWER: more than 800 W by laser across 8.6 km for 30 seconds.', sources: ['darpa2025', 'ieee2025'] },
  { date: '2025-06-03', hr: 'Harvardov randomizirani pokus: AI tutor daje više nego dvostruk napredak u manje vremena.', en: 'Harvard’s randomised trial: the AI tutor produces more than double the gain in less time.', sources: ['scirep2025'] },
  { date: '2025-07-02', hr: 'Brain-to-voice: 25 milisekundi od signala do glasa, s intonacijom i pjevanjem.', en: 'Brain-to-voice: 25 milliseconds from signal to voice, with intonation and singing.', sources: ['naturevoice2025', 'naturenews2025'] },
  { date: '2025-08-14', hr: 'Unutarnji govor dekodiran na zahtjev: do 74 % na rječniku od 125 000 riječi.', en: 'Inner speech decoded on demand: up to 74% on a 125,000-word vocabulary.', sources: ['cell2025', 'ninds2025'] },
  { date: '2026-03-16', hr: 'Pisanje mislima: 22 riječi u minuti, 95 % točnosti, uz 1,6 % pogrešnih riječi.', en: 'Typing by thought: 22 words per minute, 95% accuracy, 1.6% word error rate.', sources: ['natneuro2026'] },
  { date: '2026-05-20', hr: 'Kina: 1 180 W na 100 m uz 20,8 % iskoristivosti od istosmjerne do istosmjerne struje.', en: 'China: 1,180 W over 100 m at 20.8% DC-to-DC efficiency.', sources: ['pvmagazine2026'] },
  { date: '2026-06-01', hr: 'Pet godina KEYNOTE-942: 68,8 % bez povratka bolesti prema 49,1 %.', en: 'Five years of KEYNOTE-942: 68.8% recurrence-free versus 49.1%.', sources: ['merck2026', 'ascopost2026'] },
  { date: '2026-06-15', hr: 'Više od 3 800 sati kućne upotrebe BCI-ja i 1,96 milijuna komuniciranih riječi.', en: 'More than 3,800 hours of at-home BCI use and 1.96 million words communicated.', sources: ['natmed2026'] },
  { date: '2026-08-19', hr: 'Prva pozitivna faza 3 personalizirane mRNA terapije protiv raka (melanom).', en: 'First positive phase 3 for a personalised mRNA cancer therapy (melanoma).', sources: ['businesswire2026', 'ajmc2026'] },
];

/* ---------- pet stupova ---------- */
const PILLARS = [
  {
    id: 'misao',
    trl: 6,
    trlLabel: { hr: 'Klinička ispitivanja', en: 'Clinical trials' },
    kicker: { hr: 'Premisa misli', en: 'Thought as input' },
    title: { hr: 'Misao kao tipkovnica', en: 'Thought as a keyboard' },
    big: { hr: '74 %', en: '74%' },
    bigLabel: { hr: 'točnost čitanja unutarnjeg govora na rječniku od 125 000 riječi', en: 'accuracy reading inner speech on a 125,000-word vocabulary' },
    lead: {
      hr: '„Premisa misli“ znači jedno: da misao postane ulaz. Ne u smislu čitanja svega što netko pomisli, nego u smislu uskog, dogovorenog signala — rečenice koju osoba sama odluči izgovoriti u sebi. Godine 2025. pokazano je da se takav signal može dekodirati, i to kod ljudi koji su izgubili govor.',
      en: '“Thought as input” means one thing: that a thought becomes an input. Not in the sense of reading everything someone thinks, but a narrow, agreed signal — a sentence the person chooses to say inside their head. In 2025 it was shown that such a signal can be decoded, in people who have lost speech.',
    },
    facts: [
      {
        id: 'inner-speech',
        hr: 'U istraživanju objavljenom u Cellu 14. kolovoza 2025. sudjelovala su četiri sudionika s elektrodama u motoričkom korteksu (ALS ili moždani udar). Sustav je dekodirao zamišljene rečenice iz rječnika od 125 000 riječi s točnošću do 74 %. Stopa pogreške bila je 26–54 % za veliki rječnik i 14–33 % za rječnik od 50 riječi.',
        en: 'The study published in Cell on 14 August 2025 involved four participants with electrodes in the motor cortex (ALS or brainstem stroke). The system decoded imagined sentences from a 125,000-word vocabulary with up to 74% accuracy. Error rates were 26–54% for the large vocabulary and 14–33% for a 50-word vocabulary.',
        sources: ['cell2025', 'ninds2025'],
      },
      {
        id: 'password-lock',
        hr: 'Ista studija pokazala je kako se privatnost ne rješava obećanjem nego mehanizmom: dekodiranje se uključuje tek kad korisnik u sebi „izgovori“ unaprijed odabranu ključnu frazu. Sustav je prepoznao frazu s više od 98 % točnosti, a bez nje unutarnji govor nije izlazio.',
        en: 'The same study showed that privacy is solved not by a promise but by a mechanism: decoding starts only when the user “says” a chosen keyword inside their head. The system recognised the keyword with more than 98% accuracy, and without it inner speech did not come out.',
        sources: ['cell2025', 'ninds2025'],
      },
      {
        id: 'home-use',
        hr: 'Do lipnja 2026. objavljen je dugoročni rezultat: jedan sudionik s ALS-om koristio je sustav kod kuće više od 3 800 sati tijekom 19 mjeseci, komunicirao 183 060 rečenica (1 960 163 riječi) prosječno 56 riječi u minuti i zadržao puno radno vrijeme. U kontroliranim testovima točnost riječi prelazila je 99 % na rječniku od 125 000 riječi.',
        en: 'By June 2026 a long-term result was published: one participant with ALS used the system at home for more than 3,800 hours over 19 months, produced 183,060 sentences (1,960,163 words) at an average of 56 words per minute, and held full-time employment. In controlled tests word accuracy exceeded 99% on a 125,000-word vocabulary.',
        sources: ['natmed2026'],
      },
      {
        id: 'typing',
        hr: 'U ožujku 2026. druga skupina pokazala je pisanje mislima na virtualnoj tipkovnici. Sudionik s ozljedom kralježnične moždine tipkao je do 110 znakova, odnosno 22 riječi u minuti, uz 95 % točnosti i 1,6 % pogrešnih riječi — oko 81 % brzine kojom prosječna osoba njegove dobi tipka na mobitelu (27,3 riječi u minuti).',
        en: 'In March 2026 another team demonstrated typing by thought on a virtual keyboard. A participant with a spinal cord injury typed up to 110 characters, or 22 words per minute, at 95% accuracy and a 1.6% word error rate — about 81% of the speed at which an average person of his age texts on a phone (27.3 words per minute).',
        sources: ['natneuro2026'],
      },
      {
        id: 'voice',
        hr: 'Paralelno je pala i latencija: 2025. objavljen je sustav koji pretvara moždane signale u zvuk za 25 milisekundi, približno kašnjenju vlastitog glasa, i koji može mijenjati intonaciju i pjevati.',
        en: 'Latency fell at the same time: in 2025 a system was published that turns brain signals into sound in 25 milliseconds — about the delay of your own voice — and can vary intonation and sing.',
        sources: ['naturevoice2025', 'naturenews2025'],
      },
    ],
    honest: {
      hr: 'Ovo nije potrošački proizvod i neće to uskoro biti. Traži operaciju mozga, elektrode i timove koji ga kalibriraju; sudionika je malo, a svaki je vlastiti slučaj. Ono što je stvarno novo jest da je unutarnji govor dokazan kao čitljiv signal — a to je temelj na kojem se dalje gradi.',
      en: 'This is not a consumer product and will not be one soon. It requires brain surgery, electrodes and teams to calibrate it; participants are few and each case is its own. What is genuinely new is that inner speech has been shown to exist as a readable signal — the foundation everything else builds on.',
    },
    next: {
      hr: 'Bez žice kroz lubanju, bez svakodnevne kalibracije i s dokazom da signal ostaje stabilan godinama. Do tada: samo klinika.',
      en: 'No wire through the skull, no daily calibration, and proof that the signal stays stable for years. Until then: clinic only.',
    },
  },
  {
    id: 'medicina',
    trl: 8,
    trlLabel: { hr: 'Pred regulatornim tijelima', en: 'Before regulators' },
    kicker: { hr: 'Medicina', en: 'Medicine' },
    title: { hr: 'Cjepivo napisano za jednu osobu', en: 'A vaccine written for one person' },
    big: { hr: '−49 %', en: '−49%' },
    bigLabel: { hr: 'manji rizik povratka melanoma nakon pet godina (HR 0,51)', en: 'lower risk of melanoma recurrence at five years (HR 0.51)' },
    lead: {
      hr: 'Personalizirano mRNA cjepivo ne stoji na polici. Za svakog se bolesnika sekvencira vlastiti tumor, bira do 34 tumorska „potpisa“, i tek se onda proizvodi doza. Upravo je ta logistika bila pravi test — i 2026. je prošla treću fazu.',
      en: 'A personalised mRNA vaccine does not sit on a shelf. For each patient their own tumour is sequenced, up to 34 of its neoantigens are chosen, and only then is a dose manufactured. That logistics was the real test — and in 2026 it passed phase 3.',
    },
    facts: [
      {
        id: 'phase3',
        hr: '19. kolovoza 2026. Merck i Moderna objavili su da je faza 3 (INTerpath-001, 1 137 bolesnika s potpuno odstranjenim melanomom stadija IIB–IV) zadovoljila primarni cilj — vrijeme bez povratka bolesti — i ključni sekundarni cilj, vrijeme bez udaljenih metastaza. To je prvi pozitivan rezultat treće faze za personaliziranu mRNA terapiju protiv raka.',
        en: 'On 19 August 2026 Merck and Moderna reported that phase 3 (INTerpath-001, 1,137 patients with completely resected stage IIB–IV melanoma) met the primary endpoint — recurrence-free survival — and the key secondary endpoint, distant metastasis-free survival. It is the first positive phase 3 result for a personalised mRNA cancer therapy.',
        sources: ['businesswire2026', 'ajmc2026'],
      },
      {
        id: 'five-year',
        hr: 'Petogodišnji podaci iz faze 2b (KEYNOTE-942, 157 bolesnika) pokazali su 49 % manji rizik povratka ili smrti (HR 0,51; 95 % CI 0,294–0,887) i 59 % manji rizik udaljenih metastaza (HR 0,411; 95 % CI 0,200–0,843). Nakon pet godina bez znakova bolesti bilo je 68,8 % u kombiniranoj skupini i 49,1 % u skupini samo s imunoterapijom.',
        en: 'Five-year phase 2b data (KEYNOTE-942, 157 patients) showed a 49% lower risk of recurrence or death (HR 0.51; 95% CI 0.294–0.887) and a 59% lower risk of distant metastasis (HR 0.411; 95% CI 0.200–0.843). At five years, 68.8% of the combination arm and 49.1% of the immunotherapy-only arm were cancer-free.',
        sources: ['merck2026', 'ascopost2026'],
      },
      {
        id: 'not-approved',
        hr: 'Do 21. listopada 2026. terapija je još istraživačka: nema odobrenja regulatora i ne koristi se izvan kliničkih ispitivanja i programa proširenog pristupa.',
        en: 'As of 21 October 2026 the therapy is still investigational: it has no regulatory approval and is not used outside clinical trials and expanded-access programmes.',
        sources: ['ajmc2026'],
      },
    ],
    honest: {
      hr: '„Cjepivo protiv raka“ zvuči kao lijek, ali ovo je adjuvantno liječenje: daje se nakon operacije da se bolest ne vrati. Brojke su jake, ali mjerene na jednom tumoru (melanom) i još bez objavljenih punih podataka treće faze — priopćenje nije recenzirani rad.',
      en: '“Cancer vaccine” sounds like a cure, but this is adjuvant treatment: given after surgery so the disease does not return. The numbers are strong but measured in one tumour type (melanoma) and without full phase 3 data published yet — a press release is not a peer-reviewed paper.',
    },
    next: {
      hr: 'Tri stvari: puni podaci treće faze, odobrenje, i proizvodni lanac koji dozu isporuči u tjednima, a ne mjesecima. Bez trećega cjepivo ostaje dostupno malom broju ljudi.',
      en: 'Three things: full phase 3 data, approval, and a manufacturing chain that delivers a dose in weeks rather than months. Without the third, the vaccine stays available to very few people.',
    },
  },
  {
    id: 'ucenje',
    trl: 9,
    trlLabel: { hr: 'Dostupno danas', en: 'Available today' },
    kicker: { hr: 'Brzo učenje', en: 'Fast learning' },
    title: { hr: 'Brzo učenje nije čip. To je petlja.', en: 'Fast learning isn’t a chip. It’s a loop.' },
    big: { hr: '2×', en: '2×' },
    bigLabel: { hr: 'veći napredak uz AI tutora nego u dobro vođenoj učionici, u manje vremena', en: 'more learning gain with an AI tutor than in a well-run classroom, in less time' },
    lead: {
      hr: 'Najveći skok u učenju 2025. nije došao iz neurotehnologije nego iz pedagogije s alatom: tutora koji ne daje odgovor, nego postavlja sljedeće pitanje. Harvard je to izmjerio randomiziranim pokusom — protiv najbolje metode koju škola ima.',
      en: 'The biggest learning jump of 2025 came not from neurotechnology but from pedagogy with a tool: a tutor that does not give the answer but asks the next question. Harvard measured it in a randomised trial — against the best method a classroom has.',
    },
    facts: [
      {
        id: 'rct',
        hr: 'U randomiziranom crossover pokusu na 194 studenta fizike medijan rezultata nakon učenja bio je 4,5 uz AI tutora i 3,5 u učionici s aktivnim učenjem, uz zajedničku početnu vrijednost 2,75. Razlika je statistički značajna (p < 10⁻⁸), a dobitak je više nego dvostruk; procjena veličine učinka je 0,73–1,3 standardne devijacije.',
        en: 'In a randomised crossover trial with 194 physics students the median post-test score was 4.5 with the AI tutor and 3.5 in the active-learning classroom, against a shared baseline of 2.75. The difference is statistically significant (p < 10⁻⁸) and the gain is more than double; the estimated effect size is 0.73–1.3 standard deviations.',
        sources: ['scirep2025', 'harvard2024'],
      },
      {
        id: 'time',
        hr: 'Učenje je trajalo kraće: medijan 49 minuta uz tutora, dok je učionički sat predviđao 60 minuta rada na gradivu. Studenti su istodobno izjavili veću angažiranost (4,1 prema 3,6 na ljestvici 1–5) i motivaciju (3,4 prema 3,1).',
        en: 'Learning took less time: a median of 49 minutes with the tutor, against 60 minutes of lesson time in class. Students also reported higher engagement (4.1 vs 3.6 on a 1–5 scale) and motivation (3.4 vs 3.1).',
        sources: ['scirep2025'],
      },
      {
        id: 'why',
        hr: 'Ključ nije model nego dizajn: tutor je bio građen po istim pedagoškim pravilima kao i predavanje i nije smio preskočiti korak. Autori to sami naglašavaju — rezultat opisuje namjenski građen tutor, a ne bilo koji chatbot koji student otvori sam.',
        en: 'The key is not the model but the design: the tutor was built on the same pedagogical rules as the lesson and was not allowed to skip a step. The authors stress this themselves — the result describes a purpose-built tutor, not any chatbot a student opens alone.',
        sources: ['scirep2025'],
      },
    ],
    honest: {
      hr: 'Ovo je najmanje „znanstveno-fantastična“ i najviše upotrebljiva stvar na ovoj stranici. Nema implantata, nema tablete: postoji alat koji se može uključiti danas, ali samo ako je napravljen kao poduka, a ne kao razgovor.',
      en: 'This is the least science-fictional and most usable thing on this page. No implant, no pill: there is a tool you can switch on today, but only if it is built as instruction, not as conversation.',
    },
    next: {
      hr: 'Ne treba čekati tehnologiju. Treba čekati da škole prestanu mjeriti vrijeme na ekranu, a počnu mjeriti napredak po lekciji.',
      en: 'There is no technology to wait for. What is missing is schools measuring progress per lesson instead of time on screen.',
    },
  },
  {
    id: 'energija',
    trl: 6,
    trlLabel: { hr: 'Terenski pokusi', en: 'Field trials' },
    kicker: { hr: 'Bežična energija', en: 'Wireless power' },
    title: { hr: 'Struja bez žice, kroz zrak', en: 'Power without wire, through air' },
    big: { hr: '8,6 km', en: '8.6 km' },
    bigLabel: { hr: 'udaljenost na kojoj je 2025. laserom preneseno više od 800 W', en: 'distance over which more than 800 W was laser-beamed in 2025' },
    lead: {
      hr: 'Bežični prijenos energije nije „Wi-Fi za struju“. To je uski snop svjetla ili mikrovalova od točke do točke, s prijemnikom koji ga pretvara natrag u elektricitet. Zvuči kao znanstvena fantastika, a tri stvari su se stvarno dogodile: u orbiti, u pustinji i u Kini.',
      en: 'Wireless power transfer is not “Wi-Fi for electricity”. It is a narrow beam of light or microwaves from point to point, with a receiver that turns it back into electricity. It sounds like science fiction, yet three things actually happened: in orbit, in a desert, and in China.',
    },
    facts: [
      {
        id: 'maple',
        hr: '2023. Caltechov demonstrator MAPLE prenio je energiju bez žice u svemiru i usmjerio ju je prema Zemlji; prijemnik na krovu laboratorija u Pasadeni zabilježio je signal 22. svibnja 2023. Odašiljana snaga bila je samo 200 milivata — manje od svjetla kamere na mobitelu — a na Zemlju je stigao tek djelić toga.',
        en: 'In 2023 Caltech’s MAPLE demonstrator transferred power wirelessly in space and aimed it at Earth; a receiver on a laboratory roof in Pasadena detected the signal on 22 May 2023. The transmitted power was just 200 milliwatts — less than a phone camera light — and only a fraction of it reached Earth.',
        sources: ['caltech2023', 'science2023'],
      },
      {
        id: 'darpa',
        hr: 'U svibnju 2025. DARPA-in program POWER prenio je više od 800 W laserom na 8,6 km tijekom 30 sekundi, uz više od jednog megadžula ukupno i više od 20 % iskoristivosti na prijemniku. Test je rađen od točke do točke po tlu, kroz najdeblji sloj atmosfere — teži slučaj od usmjeravanja prema gore.',
        en: 'In May 2025 DARPA’s POWER programme delivered more than 800 W by laser across 8.6 km for 30 seconds, with more than one megajoule in total and over 20% receiver efficiency. The test ran point-to-point along the ground, through the thickest part of the atmosphere — a harder case than beaming upward.',
        sources: ['darpa2025', 'ieee2025'],
      },
      {
        id: 'china',
        hr: 'U svibnju 2026. kineski projekt „Sun Chasing“ izvijestio je o 20,8 % iskoristivosti od istosmjerne do istosmjerne struje na 100 metara, s 1 180 W predane snage, te o 88 % prikupljanja snopa. Isti sustav napajao je dron u letu: 143 W na 30 metara pri brzini od 30 km/h.',
        en: 'In May 2026 China’s “Sun Chasing” project reported 20.8% DC-to-DC efficiency over 100 metres with 1,180 W delivered, and 88% beam collection. The same system powered a drone in flight: 143 W at 30 metres while flying at 30 km/h.',
        sources: ['pvmagazine2026'],
      },
    ],
    honest: {
      hr: 'Snop mora vidjeti prijemnik: zid, brdo ili ptica u putu su problem, a sigurnosne zone nisu formalnost. Učinkovitost cijelog lanca još je daleko od bakrene žice. Ono što je stvarno: za mjesta gdje kabel ne može doći — otok, planinu, dron u letu, satelit — ovo prestaje biti ideja.',
      en: 'The beam must see the receiver: a wall, a hill or a bird in the path is a problem, and safety zones are not a formality. End-to-end efficiency is still far from a copper cable. What is real: for places a cable cannot reach — an island, a mountain, a drone in flight, a satellite — this stops being an idea.',
    },
    next: {
      hr: 'Treba nešto dosadno: sigurnosna pravila, certifikati i prvi komercijalni ugovor. Tehnologija je već pokazana; nedostaje infrastruktura povjerenja.',
      en: 'What is missing is boring: safety rules, certification and a first commercial contract. The technology has been shown; the infrastructure of trust has not.',
    },
  },
  {
    id: 'racunalo',
    trl: 5,
    trlLabel: { hr: 'Laboratorijski dokaz', en: 'Laboratory proof' },
    kicker: { hr: 'Računanje', en: 'Computing' },
    title: { hr: 'Računalo koje griješi sve manje', en: 'A computer that errs less as it grows' },
    big: { hr: '×2,14', en: '×2.14' },
    bigLabel: { hr: 'koliko padne pogreška logičkog qubita kad se kod poveća za dva koraka', en: 'drop in logical-qubit error when the code grows by two steps' },
    lead: {
      hr: 'Kvantno računalo nije brže zato što je „kvantno“, nego zato što određene probleme može rješavati drukčije. Kočnica su pogreške. Dvadeset i pet godina nakon što je teorija obećala da se one mogu ispravljati, 2024. je pokazano da stvarni čip to radi — i to sve bolje što je veći.',
      en: 'A quantum computer is not faster because it is “quantum”, but because it can approach certain problems differently. The brake is error. Twenty-five years after theory promised those errors could be corrected, 2024 showed a real chip doing it — and doing it better the larger it grew.',
    },
    facts: [
      {
        id: 'willow',
        hr: 'Na čipu Willow sa 105 fizičkih qubita Google je 2024. objavio (u Natureu 27. veljače 2025.) površinski kod koji radi ispod praga: kod udaljenosti 7 koristi 101 qubit i ima 0,143 % pogreške po ciklusu, a svaki korak povećanja koda smanjuje pogrešku oko 2,14 puta.',
        en: 'On the 105-qubit Willow chip Google reported in 2024 (in Nature on 27 February 2025) a surface code operating below threshold: the distance-7 code uses 101 qubits with 0.143% error per cycle, and each step up in code distance cuts the error by about 2.14 times.',
        sources: ['natureqec2025', 'googleqec2024'],
      },
      {
        id: 'breakeven',
        hr: 'Logički qubit živio je 2,4 puta dulje od najboljeg fizičkog qubita na čipu — granica „ispod koje se ne isplati“ prvi put je prijeđena u stvarnom hardveru. Dekodiranje je radilo u stvarnom vremenu, s prosječnom latencijom od 63 mikrosekunde.',
        en: 'The logical qubit lived 2.4 times longer than the best physical qubit on the chip — the “below breakeven” line, crossed in real hardware for the first time. Decoding ran in real time, with an average latency of 63 microseconds.',
        sources: ['natureqec2025', 'googleqec2024'],
      },
    ],
    honest: {
      hr: 'Ovo još nije korisno računalo. Znači jedno: prestala je najgora vrsta pogreške — ona koja raste s veličinom. Za praktičnu primjenu treba tisuće puta više qubita i mnogo manja pogreška po operaciji. Zato je ovo vijest desetljeća, a ne proizvod godine.',
      en: 'This is not yet a useful computer. It means one thing: the worst kind of error — the one that grows with size — has stopped growing. Practical use needs thousands of times more qubits and a much lower error per operation. That is why this is news of the decade, not product of the year.',
    },
    next: {
      hr: 'Sljedeći korak nije „kvantno“ nego inženjerski: više qubita, manje šuma i algoritam koji na tome stvarno zaradi. Do tada se priprema kriptografija, a računala još ne.',
      en: 'The next step is not “quantum” but engineering: more qubits, less noise, and an algorithm that actually earns on top of it. Until then cryptography is preparing, computers are not yet.',
    },
  },
];

/* ---------- prijevodi okvira ---------- */
const T = {
  hr: {
    langLabel: 'English', langAttr: 'en', langHref: EN_PATH,
    title: 'Tehnologija budućnosti — pet stvari koje su već stigle | GNK ASG',
    h1: 'Pet stvari koje su <em>već stigle</em>',
    kicker: 'Tehnološki desk · provjereno 21. 10. 2026.',
    sub: 'Tehnologija budućnosti, ali bez obećanja: ono što je izmjereno, objavljeno i provjerljivo — od misli kao tipkovnice do struje kroz zrak. Svaka brojka ima izvor na dnu stranice.',
    meterTitle: 'Koliko je blizu',
    meterLead: 'Naša procjena zrelosti (TRL 1–9): 1 je ideja na papiru, 9 je stvar koja radi svaki dan. To je urednička procjena, ne tvrdnja izvora.',
    measured: 'Što je stvarno izmjereno',
    honest: 'Što nije',
    next: 'Što bi moralo biti istina',
    timelineTitle: 'Kako se to događalo',
    timelineLead: 'Kronologija bez najava: samo datumi i ono što je tog dana objavljeno.',
    sources: 'Izvori',
    sourcesLead: 'Svaka tvrdnja gore povezana je s barem jednim izvorom s ovog popisa. Bez izvora tvrdnje na ovoj stranici nema.',
    method: 'Kako je nastala ova stranica',
    methodBody: 'Tvrdnje su prepisane iz primarnih izvora — časopisa, agencija i priopćenja — i svaka nosi broj izvora. Brojke nisu zaokruživane naviše. Ono što je procjena (zrelost tehnologije) izričito je označeno kao procjena. Ako se izvor ispravi, stranica se ispravlja istog dana.',
    back: 'AKTUAL MEDIA', editions: 'Sva izdanja', desk: 'Dnevni desk tehnologije',
    dataDesk: 'Podatkovni desk', channels: 'Kanali', radio: 'Radio', agent: 'Pitaj asistenta',
    tags: 'Oznake', skip: 'Preskoči na sadržaj', trl: 'TRL',
    signal: 'Broj', more: 'Dalje', editorTitle: 'Urednik i direktor',
    nextLinks: [
      ['/aktual-media/nocna-smjena/', 'Noćna smjena', 'Što arhiva objavljuje noću'],
      ['/izdanja/tehnologija/', 'Desk tehnologija', 'Dnevni tehnološki pregled'],
      ['/izdanja/', 'Sva izdanja', `${CHANNELS.length} gradova, devet deskova`],
      ['/gnk-aktual/', 'AKTUAL MEDIA', 'Sve na jednom mjestu'],
      ['/kanal/', 'Kanali', `${CHANNELS.length} gradskih izdanja`],
      ['/nermin-sefic/', 'Nermin Sefić', 'Urednik i direktor'],
      ['/radio/', 'Radio', 'Diskretno, na svakoj stranici'],
    ],
  },
  en: {
    langLabel: 'Hrvatski', langAttr: 'hr', langHref: HR_PATH,
    title: 'Future technology — five things that have already arrived | GNK ASG',
    h1: 'Five things that have <em>already arrived</em>',
    kicker: 'Technology desk · verified 21 October 2026',
    sub: 'Technology of the future, without the promise: what is measured, published and verifiable — from thought as a keyboard to power through the air. Every figure has a source at the bottom of this page.',
    meterTitle: 'How close it is',
    meterLead: 'Our readiness assessment (TRL 1–9): 1 is an idea on paper, 9 is something that works every day. This is an editorial assessment, not a claim from the sources.',
    measured: 'What has actually been measured',
    honest: 'What it is not',
    next: 'What would have to be true',
    timelineTitle: 'How it happened',
    timelineLead: 'A chronology without announcements: only dates and what was published that day.',
    sources: 'Sources',
    sourcesLead: 'Every claim above is tied to at least one source in this list. Without a source there is no claim on this page.',
    method: 'How this page was made',
    methodBody: 'Claims are transcribed from primary sources — journals, agencies and announcements — and each carries a source number. Figures are not rounded up. Anything that is an assessment (technology readiness) is explicitly marked as such. If a source is corrected, this page is corrected the same day.',
    back: 'AKTUAL MEDIA', editions: 'All editions', desk: 'Daily technology desk',
    dataDesk: 'Data desk', channels: 'Channels', radio: 'Radio', agent: 'Ask the assistant',
    tags: 'Tags', skip: 'Skip to content', trl: 'TRL',
    signal: 'The number', more: 'Next', editorTitle: 'Editor and director',
    nextLinks: [
      ['/en/aktual-media/the-3am-edition/', 'The 3 a.m. edition', 'What the archive publishes at night'],
      ['/izdanja/tehnologija/', 'Technology desk', 'Daily technology coverage'],
      ['/izdanja/', 'All editions', 'Eight cities, nine desks'],
      ['/en/gnk-aktual/', 'AKTUAL MEDIA', 'Everything in one place'],
      ['/kanal/', 'Channels', 'Eight city editions'],
      ['/nermin-sefic/', 'Nermin Sefić', 'Editor and director'],
      ['/radio/', 'Radio', 'Discreet, on every page'],
    ],
  },
};

const CSS = `*{box-sizing:border-box}
:root{--bg:#04080f;--ink:#eef3f9;--soft:#a9bad0;--gold:#e8c56a;--line:rgba(232,197,106,.22)}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:radial-gradient(1200px 620px at 78% -12%,rgba(232,197,106,.12),transparent 62%),radial-gradient(900px 520px at 8% 6%,rgba(116,182,255,.10),transparent 60%),var(--bg);color:var(--ink);font:16px/1.66 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit;text-decoration:none}a:hover{text-decoration:underline}
.ft-wrap{max-width:1120px;margin:0 auto;padding:0 clamp(16px,4vw,44px)}
.ft-top{background:rgba(3,8,15,.86);border-bottom:1px solid #16304a;font:700 10.5px/1.4 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#8ba1b8;backdrop-filter:blur(6px)}
.ft-top .ft-wrap{display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:space-between;padding:11px 0}
.ft-top a{color:var(--gold)}
.ft-hero{padding:clamp(30px,6vw,70px) 0 26px;border-bottom:1px solid var(--line);position:relative;overflow:hidden}
.ft-hero:after{content:"";position:absolute;inset:auto -10% -55% 35%;height:520px;background:radial-gradient(circle,rgba(232,197,106,.14),transparent 62%);pointer-events:none}
.ft-kicker{font:800 11px/1.4 system-ui;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin:0 0 12px}
.ft-hero h1{font:800 clamp(34px,6.4vw,74px)/1.02 Georgia,"Times New Roman",serif;letter-spacing:-.025em;margin:0 0 16px;max-width:16ch}
.ft-hero h1 em{font-style:normal;color:var(--gold)}
.ft-sub{max-width:70ch;color:#c3d0e0;font-size:clamp(15px,1.5vw,18px);margin:0 0 22px}
.ft-signal{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:0;padding:0;list-style:none}
.ft-signal a{display:block;border:1px solid var(--line);border-radius:14px;padding:13px 14px;background:linear-gradient(180deg,rgba(12,26,44,.9),rgba(7,16,28,.7));transition:transform .15s,border-color .15s}
.ft-signal a:hover{border-color:var(--gold);text-decoration:none;transform:translateY(-2px)}
.ft-signal b{display:block;font:800 clamp(21px,3vw,31px)/1 Georgia,serif;color:var(--gold);letter-spacing:-.02em}
.ft-signal span{display:block;color:#93a7bf;font-size:11.5px;line-height:1.35;margin-top:6px}
.ft-tags{display:flex;flex-wrap:wrap;gap:6px;margin:20px 0 0;padding:0;list-style:none;font:700 10.5px/1 system-ui;letter-spacing:.07em;text-transform:uppercase}
.ft-tags a{border:1px solid #24425f;border-radius:999px;padding:6px 10px;color:#c9d6e5}
.ft-tags a:hover{border-color:var(--gold);color:var(--gold);text-decoration:none}
.ft-meter{padding:24px 0;border-bottom:1px solid #132840}
.ft-meter h2{font:700 clamp(18px,2.2vw,24px)/1.2 Georgia,serif;margin:0 0 6px}
.ft-meter p{color:var(--soft);font-size:13.5px;margin:0 0 16px;max-width:80ch}
.ft-meter ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.ft-meter li{display:grid;grid-template-columns:minmax(120px,190px) 1fr 62px;gap:12px;align-items:center;font-size:13.5px}
.ft-meter .bar{height:9px;border-radius:999px;background:#0e2134;position:relative;overflow:hidden}
.ft-meter .bar i{position:absolute;inset:0 auto 0 0;border-radius:999px;background:linear-gradient(90deg,#74b6ff,#e8c56a)}
.ft-meter .n{font:800 12px/1 system-ui;color:var(--gold);text-align:right;font-variant-numeric:tabular-nums}
.ft-pillar{padding:clamp(30px,5vw,58px) 0;border-bottom:1px solid #132840;scroll-margin-top:18px}
.ft-tagline{font:800 10.5px/1.4 system-ui;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin:0 0 10px}
.ft-pillar h2{font:800 clamp(26px,4.4vw,44px)/1.05 Georgia,serif;letter-spacing:-.02em;margin:0 0 12px}
.ft-lead{max-width:74ch;color:#c9d6e5;font-size:clamp(15px,1.5vw,17.5px);margin:0 0 20px}
.ft-big{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 16px;margin:0 0 22px;padding:16px 18px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(120deg,rgba(232,197,106,.10),rgba(9,20,34,.4))}
.ft-big b{font:800 clamp(32px,5vw,54px)/1 Georgia,serif;color:var(--gold);letter-spacing:-.03em}
.ft-big span{color:#b9c7d8;font-size:13.5px;max-width:46ch}
.ft-fact{background:rgba(9,20,34,.55);border:1px solid #17324c;border-radius:14px;padding:15px 17px;margin:0 0 12px}
.ft-fact p{margin:0;color:#d5e0ec;font-size:15px}
.ft-fact sup{font:700 10px/1 system-ui;color:var(--gold)}
.ft-fact sup a{margin-left:3px;border-bottom:1px solid rgba(232,197,106,.5)}
.ft-box{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0 0}
.ft-box > div{border-radius:14px;padding:14px 16px;font-size:14.5px}
.ft-not{background:rgba(140,47,47,.10);border:1px solid rgba(200,110,110,.32)}
.ft-next{background:rgba(116,182,255,.07);border:1px solid rgba(116,182,255,.28)}
.ft-box h3{margin:0 0 6px;font:800 10.5px/1.4 system-ui;letter-spacing:.16em;text-transform:uppercase;color:#e6edf6}
.ft-not h3{color:#f0b3b3}.ft-next h3{color:#a9d0ff}
.ft-box p{margin:0;color:#c3d0e0}
.ft-tl{padding:clamp(28px,4vw,48px) 0;border-bottom:1px solid #132840}
.ft-tl h2{font:700 clamp(22px,3vw,32px)/1.15 Georgia,serif;margin:0 0 6px}
.ft-tl > .ft-wrap > p{color:var(--soft);font-size:13.5px;margin:0 0 20px;max-width:80ch}
.ft-tl ol{list-style:none;margin:0;padding:0 0 0 18px;border-left:1px solid #1d3a57;display:grid;gap:14px}
.ft-tl li{position:relative;padding-left:6px}
.ft-tl li:before{content:"";position:absolute;left:-24px;top:7px;width:9px;height:9px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 4px rgba(232,197,106,.14)}
.ft-tl time{display:block;font:800 11px/1.4 system-ui;letter-spacing:.1em;text-transform:uppercase;color:var(--gold)}
.ft-tl span{color:#c9d6e5;font-size:14.5px}
.ft-tl sup a{margin-left:3px;font:700 10px/1 system-ui;color:var(--gold)}
.ft-src{padding:clamp(26px,4vw,44px) 0;border-bottom:1px solid #132840}
.ft-src h2{font:700 clamp(20px,2.6vw,28px)/1.2 Georgia,serif;margin:0 0 6px}
.ft-src > .ft-wrap > p{color:var(--soft);font-size:13.5px;margin:0 0 16px;max-width:80ch}
.ft-src ol{margin:0;padding:0;list-style:none;counter-reset:s;display:grid;gap:9px}
.ft-src li{counter-increment:s;display:grid;grid-template-columns:36px 1fr;gap:10px;font-size:14px;color:#c9d6e5}
.ft-src li:before{content:counter(s);font:800 11px/1.9 system-ui;color:var(--gold);text-align:center;border:1px solid var(--line);border-radius:8px;height:26px}
.ft-src a{color:#e9f1fa;border-bottom:1px solid rgba(232,197,106,.4)}
.ft-src small{display:block;color:#8ba1b8;font-size:11.5px;margin-top:2px}
.ft-method{background:rgba(4,10,18,.7);border:1px solid #17324c;border-radius:14px;padding:15px 17px;margin:22px 0 0;font-size:13.5px;color:#9fb2c8}
.ft-method strong{color:#e6edf6}
.ft-next-links{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;padding:clamp(24px,4vw,40px) 0;margin:0 auto;max-width:1120px}
.ft-next-links a{display:block;border:1px solid #17324c;border-radius:14px;padding:12px 14px;background:rgba(9,20,34,.6)}
.ft-next-links a:hover{border-color:var(--gold);text-decoration:none}
.ft-next-links b{display:block;font:700 15px/1.25 Georgia,serif;margin-bottom:3px}
.ft-next-links span{color:#8ba1b8;font-size:11.5px}
.ft-foot{border-top:1px solid #132840;padding:24px 0 46px;color:#8ba1b8;font-size:12.5px}
.ft-foot a{color:#c9d6e5}
main:focus{outline:none}
main:focus-visible{outline:3px solid var(--gold);outline-offset:5px}
a:focus-visible,button:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--gold);outline-offset:3px;border-radius:5px}
.ft-skip{position:absolute;left:-9999px;top:0;z-index:9999;background:var(--gold);color:#08131f;font:800 13px/1 system-ui;padding:12px 18px;border-radius:0 0 12px 0}
.ft-skip:focus{left:0}
@media(max-width:760px){.ft-box{grid-template-columns:1fr}.ft-meter li{grid-template-columns:1fr 62px}.ft-meter li .bar{grid-column:1/-1}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;

const route = (lang) => (lang === 'en' ? EN_PATH : HR_PATH);
const abs = (lang) => `${SITE}${route(lang)}`;

function jsonld(lang) {
  const canonical = abs(lang);
  const alternate = abs(lang === 'en' ? 'hr' : 'en');
  const t = T[lang];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'GNK ASG', url: `${SITE}/`, inLanguage: ['hr', 'en'], publisher: { '@id': `${SITE}/#gnk-asg` } },
      { '@type': 'Organization', '@id': `${SITE}/#gnk-asg`, name: 'GNK ASG d.o.o.', url: `${SITE}/` },
      { '@type': 'NewsMediaOrganization', '@id': `${SITE}/#aktual-media`, name: 'AKTUAL MEDIA d.o.o.', url: `${SITE}/gnk-aktual/`, parentOrganization: { '@id': `${SITE}/#gnk-asg` }, editor: { '@id': `${SITE}/#nermin-sefic` } },
      { '@type': 'Person', '@id': `${SITE}/#nermin-sefic`, name: 'Nermin Sefić', jobTitle: t.editorTitle, url: `${SITE}/nermin-sefic/`, worksFor: { '@id': `${SITE}/#aktual-media` } },
      {
        '@type': 'TechArticle',
        '@id': `${canonical}#article`,
        url: canonical,
        headline: lang === 'en' ? 'Five things that have already arrived' : 'Pet stvari koje su već stigle',
        name: t.title,
        description: t.sub,
        inLanguage: lang,
        datePublished: TODAY,
        dateModified: TODAY,
        author: { '@id': `${SITE}/#aktual-media` },
        editor: { '@id': `${SITE}/#nermin-sefic` },
        publisher: { '@id': `${SITE}/#aktual-media` },
        isPartOf: { '@id': `${SITE}/#website` },
        mainEntity: { '@id': `${canonical}#lista` },
        about: PILLARS.map((pillar) => ({ '@type': 'Thing', name: pillar.title[lang] })),
        citation: SOURCES.map((source) => ({ '@type': 'CreativeWork', name: source.title, url: source.url, datePublished: source.date, publisher: { '@type': 'Organization', name: source.publisher } })),
        isBasedOn: SOURCES.map((source) => source.url),
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.ft-hero h1', '.ft-sub'] },
      },
      {
        '@type': 'ItemList',
        '@id': `${canonical}#lista`,
        name: lang === 'en' ? 'Five technologies' : 'Pet tehnologija',
        numberOfItems: PILLARS.length,
        itemListElement: PILLARS.map((pillar, index) => ({ '@type': 'ListItem', position: index + 1, name: pillar.title[lang], url: `${canonical}#${pillar.id}` })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA', item: `${SITE}/gnk-aktual/` },
          { '@type': 'ListItem', position: 3, name: lang === 'en' ? 'Future technology' : 'Tehnologija budućnosti', item: canonical },
        ],
      },
    ],
  };
}

const refs = (ids, lang, withLabel = true) => ids
  .map((id) => `<sup><a href="#s-${id}"${withLabel ? ` aria-label="${lang === 'en' ? 'source' : 'izvor'} ${srcIndex.get(id)}"` : ''}>${srcIndex.get(id)}</a></sup>`)
  .join('');

function page(lang) {
  const t = T[lang];
  const canonical = abs(lang);
  const alternate = abs(lang === 'en' ? 'hr' : 'en');
  const tags = lang === 'en'
    ? [['#FutureTechnology', '/en/future-technology/'], ['#BCI', '/en/future-technology/#misao'], ['#mRNA', '/en/future-technology/#medicina'], ['#WirelessPower', '/en/future-technology/#energija'], ['#QuantumComputing', '/en/future-technology/#racunalo'], ['#AKTUALMEDIA', '/en/gnk-aktual/'], ['#GNKASG', '/kanal/']]
    : [['#TehnologijaBuducnosti', '/tehnologija-buducnosti/'], ['#BCI', '/tehnologija-buducnosti/#misao'], ['#mRNA', '/tehnologija-buducnosti/#medicina'], ['#BezicnaEnergija', '/tehnologija-buducnosti/#energija'], ['#KvantnoRacunanje', '/tehnologija-buducnosti/#racunalo'], ['#AKTUALMEDIA', '/gnk-aktual/'], ['#GNKASG', '/kanal/']];
  /* Oznake (#BCI, #mRNA …) ostaju vidljive kao linkovi i idu u article:tag,
     ali NIKAD u meta keywords: tražilica u popisu pojmova traži riječi, a `#`
     je tamo smeće. Zato su ovdje iste riječi bez oznake. */
  const keywords = lang === 'en'
    ? 'future technology, BCI, mRNA, wireless power, quantum computing, AKTUAL MEDIA, GNK ASG'
    : 'tehnologija budućnosti, BCI, mRNA, bežična energija, kvantno računanje, AKTUAL MEDIA, GNK ASG';

  const signal = PILLARS.map((pillar) => `<li><a href="#${pillar.id}"><b>${esc(pillar.big[lang])}</b><span>${esc(pillar.title[lang])} — ${esc(pillar.bigLabel[lang])}</span></a></li>`).join('');
  const meter = PILLARS.map((pillar) => `<li><span>${esc(pillar.title[lang])}</span><span class="bar"><i style="width:${Math.round((pillar.trl / 9) * 100)}%"></i></span><span class="n">${t.trl} ${pillar.trl}</span></li>`).join('');

  const pillars = PILLARS.map((pillar) => `<section class="ft-pillar" id="${esc(pillar.id)}">
    <p class="ft-tagline">${esc(pillar.kicker[lang])} · ${esc(pillar.trlLabel[lang])}</p>
    <h2>${esc(pillar.title[lang])}</h2>
    <p class="ft-lead">${esc(pillar.lead[lang])}</p>
    <div class="ft-big"><b>${esc(pillar.big[lang])}</b><span>${esc(pillar.bigLabel[lang])}</span></div>
    <h3 class="ft-tagline" style="margin-bottom:8px">${esc(t.measured)}</h3>
    ${pillar.facts.map((fact) => `<div class="ft-fact" id="${esc(fact.id)}"><p>${esc(fact[lang])} ${refs(fact.sources, lang)}</p></div>`).join('\n')}
    <div class="ft-box">
      <div class="ft-not"><h3>${esc(t.honest)}</h3><p>${esc(pillar.honest[lang])}</p></div>
      <div class="ft-next"><h3>${esc(t.next)}</h3><p>${esc(pillar.next[lang])}</p></div>
    </div>
  </section>`).join('\n');

  const timeline = TIMELINE.map((event) => `<li><time datetime="${event.date}">${event.date.slice(8, 10)}. ${event.date.slice(5, 7)}. ${event.date.slice(0, 4)}.</time><span>${esc(event[lang])}${refs(event.sources, lang, false)}</span></li>`).join('');

  const sources = SOURCES.map((source) => `<li id="s-${esc(source.id)}"><span><a href="${esc(source.url)}" rel="external noopener" target="_blank">${esc(source.title)}</a><small>${esc(source.publisher)} · ${esc(source.date)}</small></span></li>`).join('');

  const nextLinks = t.nextLinks.map(([href, label, sub]) => `<a href="${href}"${href.startsWith('/en/') && lang !== 'en' ? ' hreflang="en" lang="en"' : ''}><b>${esc(label)}</b><span>${esc(sub)}</span></a>`).join('');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.sub)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="keywords" content="${esc(keywords)}">
<meta name="news_keywords" content="${esc(keywords)}">
<meta name="theme-color" content="#04080f">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${lang === 'en' ? 'hr' : 'en'}" href="${alternate}">
<link rel="alternate" hreflang="x-default" href="${SITE}${HR_PATH}">
<link rel="alternate" type="application/json" title="${lang === 'en' ? 'Sources' : 'Izvori'}" href="/data/future-tech-v1.json">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.sub)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'hr_HR'}">
<meta property="og:image" content="${SITE}/assets/izdanja/aktual-media-og.jpg">
<meta property="og:image:alt" content="${lang === 'en' ? 'AKTUAL MEDIA — future technology' : 'AKTUAL MEDIA — tehnologija budućnosti'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.sub)}">
<meta name="twitter:image" content="${SITE}/assets/izdanja/aktual-media-og.jpg">
<meta name="twitter:image:alt" content="${lang === 'en' ? 'AKTUAL MEDIA — future technology' : 'AKTUAL MEDIA — tehnologija budućnosti'}">
<script type="application/ld+json">${JSON.stringify(jsonld(lang))}</script>
<style>${CSS}</style>
</head>
<body>
<a class="ft-skip" href="#sadrzaj">${esc(t.skip)}</a>
<div class="ft-top"><div class="ft-wrap">
  <span>AKTUAL MEDIA · ${esc(t.kicker.split('·')[0].trim())}</span>
  <span><a href="/gnk-aktual/">${esc(t.back)}</a> · <a href="/izdanja/">${esc(t.editions)}</a> · <a href="/izdanja/tehnologija/">${esc(t.desk)}</a> · <a href="/aktual-media/">${esc(t.dataDesk)}</a> · <a href="${lang === 'en' ? '/s-chat/?ctx=%2Fen%2Ffuture-technology%2F' : '/s-chat/?ctx=%2Ftehnologija-buducnosti%2F'}">${esc(t.agent)}</a> · <a href="${alternate}" hreflang="${t.langAttr}" lang="${t.langAttr}">${esc(t.langLabel)}</a></span>
</div></div>
<main id="sadrzaj" tabindex="-1">
  <header class="ft-hero"><div class="ft-wrap">
    <p class="ft-kicker">${esc(t.kicker)}</p>
    <h1>${t.h1}</h1>
    <p class="ft-sub">${esc(t.sub)}</p>
    <ul class="ft-signal">${signal}</ul>
    <ul class="ft-tags" aria-label="${esc(t.tags)}">${tags.map(([tag, href]) => `<li><a href="${href}">${esc(tag)}</a></li>`).join('')}</ul>
  </div></header>

  <section class="ft-meter"><div class="ft-wrap">
    <h2>${esc(t.meterTitle)}</h2>
    <p>${esc(t.meterLead)}</p>
    <ul>${meter}</ul>
  </div></section>

  <div class="ft-wrap">
    ${pillars}
  </div>

  <section class="ft-tl"><div class="ft-wrap">
    <h2>${esc(t.timelineTitle)}</h2>
    <p>${esc(t.timelineLead)}</p>
    <ol>${timeline}</ol>
  </div></section>

  <section class="ft-src"><div class="ft-wrap">
    <h2>${esc(t.sources)}</h2>
    <p>${esc(t.sourcesLead)}</p>
    <ol>${sources}</ol>
    <p class="ft-method"><strong>${esc(t.method)}</strong> ${esc(t.methodBody)}</p>
  </div></section>

  <nav class="ft-next-links" aria-label="${esc(t.more)}">${nextLinks}</nav>
</main>
<footer class="ft-foot"><div class="ft-wrap">
  <p>AKTUAL MEDIA d.o.o. · <a href="/gnk-aktual/">${esc(t.back)}</a> · <a href="/izdanja/">${esc(t.editions)}</a> · <a href="/kanal/">${esc(t.channels)}</a> · <a href="/radio/">${esc(t.radio)}</a> · <a href="/tehnologija-buducnosti/sitemap.xml">Sitemap</a></p>
  <p>${lang === 'en' ? 'Every claim carries a numbered source; every source is a real, dated publication.' : 'Svaka tvrdnja nosi broj izvora; svaki izvor je stvarna, datirana publikacija.'}</p>
</div></footer>
<script defer src="/assets/public-contrast-hardening-v1.js?v=20260713-readable"></script>
<script defer src="/assets/public-unified-menu-v6.js?v=20260713-full-navigation"></script>
</body>
</html>`;
}

/* ---------- sitemapi ---------- */

function writeSectionSitemap() {
  const links = `<xhtml:link rel="alternate" hreflang="hr" href="${SITE}${HR_PATH}"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}${EN_PATH}"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${HR_PATH}"/>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
<url><loc>${SITE}${HR_PATH}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority>${links}</url>
<url><loc>${SITE}${EN_PATH}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority>${links}</url>
</urlset>
`;
  const dir = join(PORTAL, 'tehnologija-buducnosti');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'sitemap.xml'), xml);
  return 2;
}

function upsertMainSitemap() {
  const file = join(PORTAL, 'sitemap.xml');
  if (!existsSync(file)) return 0;
  let xml = readFileSync(file, 'utf8');
  let changed = 0;
  for (const [loc, self, alt, lang] of [[`${SITE}${HR_PATH}`, HR_PATH, EN_PATH, 'hr'], [`${SITE}${EN_PATH}`, EN_PATH, HR_PATH, 'en']]) {
    const block = `  <url><loc>${loc}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority><xhtml:link rel="alternate" hreflang="${lang}" href="${SITE}${self}"/><xhtml:link rel="alternate" hreflang="${lang === 'hr' ? 'en' : 'hr'}" href="${SITE}${alt}"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${HR_PATH}"/></url>`;
    const existing = new RegExp(`  <url><loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>[\\s\\S]*?</url>`);
    if (existing.test(xml)) {
      const next = xml.replace(existing, block);
      if (next !== xml) { xml = next; changed += 1; }
    } else {
      xml = xml.replace('</urlset>', `${block}\n</urlset>`);
      changed += 1;
    }
  }
  if (changed) writeFileSync(file, xml);
  return changed;
}

/* ---------- traka na matičnim stranicama ---------- */

function band(lang) {
  const items = PILLARS.map((pillar) => `<li><a href="${route(lang)}#${pillar.id}"><b>${esc(pillar.big[lang])}</b><span>${esc(pillar.title[lang])}</span></a></li>`).join('');
  return `${MARK_START}
<section class="ft-band" aria-label="${lang === 'en' ? 'Future technology' : 'Tehnologija budućnosti'}">
  <style>
  .ft-band{margin:22px auto;max-width:1120px;padding:0 clamp(14px,4vw,44px)}
  .ft-band .ftb-in{border:1px solid rgba(232,197,106,.3);border-radius:16px;background:linear-gradient(135deg,rgba(232,197,106,.10),rgba(6,16,25,.7));padding:16px 18px}
  .ft-band h2{font:800 clamp(17px,2.2vw,23px)/1.15 Georgia,serif;margin:0 0 4px;color:#f2f6fb}
  .ft-band p{font-size:12.5px;color:#9fb2c8;margin:0 0 12px}
  .ft-band ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
  .ft-band a{display:block;border:1px solid #24425f;border-radius:11px;padding:9px 11px;text-decoration:none}
  .ft-band a:hover{border-color:#e8c56a;text-decoration:none}
  .ft-band b{display:block;font:800 17px/1 Georgia,serif;color:#e8c56a}
  .ft-band span{display:block;font-size:11px;color:#c9d6e5;margin-top:4px;line-height:1.3}
  .ft-band .ftb-go{display:inline-block;margin-top:11px;font:800 10.5px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#e8c56a}
  </style>
  <div class="ftb-in">
    <h2>${lang === 'en' ? 'Five technologies that have already arrived' : 'Pet tehnologija koje su već stigle'}</h2>
    <p>${lang === 'en' ? 'Measured, published, sourced — every figure carries a number.' : 'Izmjereno, objavljeno, s izvorom — svaka brojka nosi svoj broj.'}</p>
    <ul>${items}</ul>
    <a class="ftb-go" href="${route(lang)}">${lang === 'en' ? 'Open the technology page →' : 'Otvori stranicu tehnologije →'}</a>
  </div>
</section>
${MARK_END}`;
}

function injectBand(file, anchor) {
  if (!existsSync(file)) return false;
  let html = readFileSync(file, 'utf8');
  const lang = file.includes('/en/') ? 'en' : 'hr';
  const block = band(lang);
  const marker = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`, 'm');
  if (marker.test(html)) {
    html = html.replace(marker, () => block);
  } else {
    let at = -1;
    if (anchor === 'sectionnav') {
      const open = html.indexOf('<nav class="am-sectionnav"');
      const close = open >= 0 ? html.indexOf('</nav>', open) : -1;
      if (close > 0) at = close + '</nav>'.length;
    } else if (anchor === 'iz-desk') {
      /* Traku želimo iznad podatkovnog deska, ne ispod njega. */
      const desk = html.indexOf('<section class="iz-band iz-data-desk"');
      if (desk > 0) at = desk;
    } else if (anchor === 'iz-nav') {
      const nav = html.indexOf('<nav class="iz-nav"');
      const close = nav >= 0 ? html.indexOf('</header>', nav) : -1;
      if (close > 0) at = close + '</header>'.length;
    } else if (anchor === 'kx-top') {
      const close = html.indexOf('</div>', html.indexOf('<div class="kx-top">'));
      if (close > 0) at = close + '</div>'.length;
    } else if (anchor === 'us-top') {
      const close = html.indexOf('</div>', html.indexOf('<div class="us-top">'));
      if (close > 0) at = close + '</div>'.length;
    }
    if (at > 0) html = `${html.slice(0, at)}\n${block}\n${html.slice(at)}`;
    else html = html.replace('</main>', `${block}\n</main>`);
  }
  writeFileSync(file, html);
  return true;
}

/* ---------- baza znanja ---------- */

function kbGroup() {
  return {
    naslov: 'Tehnologija budućnosti',
    pitanja: [
      { p: 'Što je na stranici Tehnologija budućnosti?', o: 'Pet tehnologija koje su već stigle, svaka s brojkom i izvorom: misao kao tipkovnica, personalizirano mRNA cjepivo, AI tutor, bežični prijenos energije i kvantna korekcija pogrešaka. Hrvatska stranica: gnk-asg.hr/tehnologija-buducnosti/ Engleska: gnk-asg.hr/en/future-technology/' },
      { p: 'Koliko točno može biti čitanje unutarnjeg govora?', o: 'Do 74 % točnosti na rječniku od 125 000 riječi, uz stopu pogreške 26–54 % za veliki rječnik i 14–33 % za rječnik od 50 riječi. Istraživanje je objavljeno u Cellu 14. kolovoza 2025. na četiri sudionika. Stranica: gnk-asg.hr/tehnologija-buducnosti/' },
      { p: 'Koliko dugo netko koristi brain-computer interface kod kuće?', o: 'Jedan sudionik s ALS-om koristio je sustav kod kuće više od 3 800 sati tijekom 19 mjeseci, komunicirao 183 060 rečenica (1 960 163 riječi) prosječno 56 riječi u minuti i zadržao puno radno vrijeme. Podaci su objavljeni u Nature Medicine 15. lipnja 2026. Stranica: gnk-asg.hr/tehnologija-buducnosti/' },
      { p: 'Koliko brzo se može tipkati mislima?', o: 'Do 110 znakova, odnosno 22 riječi u minuti, uz 95 % točnosti i 1,6 % pogrešnih riječi — oko 81 % brzine prosječnog tipkanja na mobitelu. Rezultat je objavljen u Nature Neuroscience 16. ožujka 2026. Stranica: gnk-asg.hr/tehnologija-buducnosti/' },
      { p: 'Je li personalizirano mRNA cjepivo protiv melanoma odobreno?', o: 'Nije. Do 21. listopada 2026. terapija je istraživačka. Faza 3 (INTerpath-001, 1 137 bolesnika) zadovoljila je primarni i ključni sekundarni cilj, a petogodišnji podaci faze 2b pokazuju 49 % manji rizik povratka (HR 0,51) i 59 % manji rizik udaljenih metastaza. Stranica: gnk-asg.hr/tehnologija-buducnosti/' },
      { p: 'Koliko bolje radi AI tutor od klasične nastave?', o: 'U randomiziranom pokusu na 194 studenta fizike medijan rezultata bio je 4,5 uz AI tutora i 3,5 u učionici s aktivnim učenjem, uz početnu vrijednost 2,75. Napredak je više nego dvostruk, uz medijan 49 minuta učenja. Studija je objavljena u Scientific Reports 3. lipnja 2025. Stranica: gnk-asg.hr/tehnologija-buducnosti/' },
      { p: 'Koliko daleko se može prenijeti energija bez žice?', o: 'DARPA-in program POWER prenio je više od 800 W laserom na 8,6 km tijekom 30 sekundi, uz više od 20 % iskoristivosti prijemnika (2025.). Caltechov MAPLE 2023. prenio je energiju u svemiru i usmjerio ju prema Zemlji, s odašiljanih 200 milivata. Kineski projekt 2026. izvijestio je o 20,8 % iskoristivosti na 100 metara uz 1 180 W. Stranica: gnk-asg.hr/tehnologija-buducnosti/' },
      { p: 'Koliko je napredovala kvantna korekcija pogrešaka?', o: 'Na čipu Willow sa 105 qubita kod udaljenosti 7 koristi 101 qubit i ima 0,143 % pogreške po ciklusu; povećanje koda smanjuje pogrešku oko 2,14 puta, a logički qubit živi 2,4 puta dulje od najboljeg fizičkog. Objavljeno u Natureu 27. veljače 2025. Stranica: gnk-asg.hr/tehnologija-buducnosti/' },
      { p: 'What is on the Future technology page?', o: 'Five technologies that have already arrived, each with a number and a source: thought as a keyboard, a personalised mRNA vaccine, an AI tutor, wireless power transfer and quantum error correction. English page: gnk-asg.hr/en/future-technology/ Croatian: gnk-asg.hr/tehnologija-buducnosti/' },
      { p: 'How accurate is inner-speech decoding?', o: 'Up to 74% accuracy on a 125,000-word vocabulary, with error rates of 26–54% for the large vocabulary and 14–33% for a 50-word vocabulary, across four participants. Published in Cell on 14 August 2025. Page: gnk-asg.hr/en/future-technology/' },
      { p: 'How far can power be beamed wirelessly?', o: 'DARPA’s POWER programme delivered more than 800 W by laser across 8.6 km for 30 seconds, with over 20% receiver efficiency (2025). Caltech’s MAPLE transferred power in space and aimed it at Earth in 2023, from 200 milliwatts transmitted. A Chinese project reported 20.8% DC-to-DC efficiency over 100 m with 1,180 W in 2026. Page: gnk-asg.hr/en/future-technology/' },
    ],
  };
}

function syncKnowledgeBase() {
  const file = join(PORTAL, 'data', 'knowledge-base.json');
  if (!existsSync(file)) return 0;
  const kb = JSON.parse(readFileSync(file, 'utf8'));
  const group = kbGroup();
  const index = kb.skupine.findIndex((item) => String(item.naslov || '').trim() === group.naslov);
  if (index >= 0) kb.skupine[index] = group;
  else kb.skupine.push(group);
  kb.ukupnoPitanja = kb.skupine.reduce((n, item) => n + (item.pitanja || []).length, 0);
  kb.verzija = TODAY;
  writeFileSync(file, `${JSON.stringify(kb, null, 2)}\n`);
  return group.pitanja.length;
}

/* ---------- podaci ---------- */

function dataFile() {
  return {
    version: VERSION,
    updated: TODAY,
    sourceCount: SOURCES.length,
    pillarCount: PILLARS.length,
    timelineCount: TIMELINE.length,
    readinessBasis: 'editorial assessment (TRL 1–9), not a claim from the sources',
    sources: SOURCES,
    pillars: PILLARS.map((pillar) => ({
      id: pillar.id,
      trl: pillar.trl,
      trlLabel: pillar.trlLabel,
      title: pillar.title,
      big: pillar.big,
      factIds: pillar.facts.map((fact) => fact.id),
      sourceIds: [...new Set(pillar.facts.flatMap((fact) => fact.sources))],
    })),
    timeline: TIMELINE,
  };
}

/* ---------- ulaz ---------- */

/* Sadržaj se provjerava prije pisanja: svaka tvrdnja mora imati izvor,
   a svaki izvor mora biti stvarna https adresa s ISO datumom. */
export function validateContent() {
  const problems = [];
  for (const pillar of PILLARS) {
    for (const fact of pillar.facts) {
      if (!fact.sources.length) problems.push(`${pillar.id}/${fact.id}: tvrdnja bez izvora`);
      for (const id of fact.sources) if (!src(id)) problems.push(`${pillar.id}/${fact.id}: nepoznat izvor ${id}`);
    }
  }
  for (const event of TIMELINE) {
    if (!event.sources.length) problems.push(`${event.date}: događaj bez izvora`);
    for (const id of event.sources) if (!src(id)) problems.push(`${event.date}: nepoznat izvor ${id}`);
  }
  for (const source of SOURCES) {
    if (!/^https:\/\//.test(source.url)) problems.push(`${source.id}: adresa nije https`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.date)) problems.push(`${source.id}: datum nije ISO`);
    if (!source.publisher || !source.title) problems.push(`${source.id}: nedostaje nakladnik ili naslov`);
  }
  return problems;
}

export function checkFutureTech() {
  const problems = validateContent();
  for (const [file, lang] of [[join(PORTAL, HR_PATH.slice(1), 'index.html'), 'hr'], [join(PORTAL, EN_PATH.slice(1), 'index.html'), 'en']]) {
    if (!existsSync(file)) { problems.push(`${file}: ne postoji`); continue; }
    const html = readFileSync(file, 'utf8');
    if (!html.includes(`<html lang="${lang}"`)) problems.push(`${file}: pogrešan lang`);
    for (const pillar of PILLARS) if (!html.includes(`id="${pillar.id}"`)) problems.push(`${file}: nema stup ${pillar.id}`);
    for (const source of SOURCES) if (!html.includes(source.url)) problems.push(`${file}: nema izvor ${source.id}`);
    if (!html.includes('hreflang="x-default"')) problems.push(`${file}: nema x-default`);
  }
  if (!existsSync(join(PORTAL, 'data', 'future-tech-v1.json'))) problems.push('nema data/future-tech-v1.json');
  return problems;
}

/* Traka se ubacuje i nakon što hub napiše /kanal/ i /usa/, jer se te dvije
   stranice pišu izvan buildHub() i pregazile bi ranije ubacenu traku. */
export function injectFutureTechBands() {
  return [
    injectBand(join(PORTAL, 'gnk-aktual', 'index.html'), 'sectionnav'),
    injectBand(join(PORTAL, 'en', 'gnk-aktual', 'index.html'), 'sectionnav'),
    injectBand(join(PORTAL, 'izdanja', 'index.html'), 'iz-desk'),
    injectBand(join(PORTAL, 'izdanja', 'tehnologija', 'index.html'), 'iz-nav'),
    injectBand(join(PORTAL, 'kanal', 'index.html'), 'kx-top'),
    injectBand(join(PORTAL, 'usa', 'index.html'), 'us-top'),
  ].filter(Boolean).length;
}

export function buildFutureTech({ quiet = false } = {}) {
  const problems = validateContent();
  if (problems.length) throw new Error(`Future tech: ${problems.join('; ')}`);

  let written = 0;
  for (const lang of ['hr', 'en']) {
    const target = join(PORTAL, route(lang).slice(1), 'index.html');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, page(lang));
    written += 1;
  }

  const dataPath = join(PORTAL, 'data', 'future-tech-v1.json');
  mkdirSync(dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, `${JSON.stringify(dataFile(), null, 2)}\n`);

  const kb = syncKnowledgeBase();
  const sitemapUrls = writeSectionSitemap();
  const sitemapChanges = upsertMainSitemap();

  const bands = injectFutureTechBands();

  const report = { version: VERSION, pages: written, pillars: PILLARS.length, sources: SOURCES.length, timeline: TIMELINE.length, bands, sitemapUrls, sitemapChanges, kb };

  if (!quiet) console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && process.argv[1].endsWith('future-tech.mjs')) {
  const check = process.argv.includes('--check');
  if (check) {
    const problems = checkFutureTech();
    console.log(JSON.stringify({ ok: problems.length === 0, mode: 'check', problems }, null, 2));
    if (problems.length) process.exit(1);
  } else {
    buildFutureTech();
  }
}
