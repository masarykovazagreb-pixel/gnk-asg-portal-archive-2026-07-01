/**
 * IZBORI U SRBIJI — privremeno izdanje.
 *
 * Za razliku od ostalih pet stranica, ova nema fiksni sadržaj: brojke i
 * popisi grade se iz arhive gradskih izdanja (lib/elections.mjs). Ovdje su
 * samo izvori (mediji koje desk čita) i pojmovnik, da čitatelj zna tko
 * govori i što riječi znače.
 *
 * Pravilo: nijedan podatak o rezultatu, izlaznosti ili anketi ne dolazi iz
 * pamćenja. Ako izborno tijelo objavi brojku, prenosi se s izvorom; do tada
 * je nema.
 */
export default {
  sources: [
    { id: 'danas', name: 'Danas', url: 'https://www.danas.rs/', what: { hr: 'Dnevni list iz Beograda; izborne teme prati u rubrici politika.', en: 'A Belgrade daily; covers election topics in its politics section.' } },
    { id: 'n1rs', name: 'N1 Srbija', url: 'https://n1info.rs/', what: { hr: 'Televizija i portal; objavljuje najave, izjave i izborne analize.', en: 'Television and portal; publishes announcements, statements and election analysis.' } },
    { id: 'nova', name: 'Nova.rs', url: 'https://nova.rs/', what: { hr: 'Beogradski portal; prati kampanju, stranačke skupove i lokalne izbore.', en: 'Belgrade portal; follows the campaign, party rallies and local races.' } },
    { id: 'jutarnji', name: 'Jutarnji list', url: 'https://www.jutarnji.hr/', what: { hr: 'Zagrebački dnevnik; srpske izbore prati iz hrvatske perspektive.', en: 'Zagreb daily; covers the Serbian election from a Croatian perspective.' } },
    { id: 'index', name: 'Index.hr', url: 'https://www.index.hr/', what: { hr: 'Hrvatski portal; prenosi regionalne političke teme.', en: 'Croatian portal; carries regional political coverage.' } },
    { id: 'n1ba', name: 'N1 BiH', url: 'https://n1info.ba/', what: { hr: 'Sarajevska redakcija N1; prati veze izbora u Srbiji i BiH.', en: 'N1’s Sarajevo newsroom; follows the links between Serbia’s election and Bosnia.' } },
    { id: 'arhiva', name: 'AKTUAL MEDIA — arhiva gradskih izdanja', url: 'https://gnk-asg.hr/aktual-media/', what: { hr: 'Osam gradskih izdanja i njihova arhiva; jedini izvor brojki na ovom desku.', en: 'Eight city editions and their archive; the only source of the figures on this desk.' } },
  ],
  glossary: [
    { t: { hr: 'Birački spisak', en: 'Voter register' }, d: { hr: 'Popis osoba s pravom glasa. Broj upisanih nije isto što i broj izašlih — zato desk ne izvodi izlaznost iz spiska.', en: 'The list of people entitled to vote. Registered is not the same as turned out — which is why the desk does not derive turnout from the register.' } },
    { t: { hr: 'Izborna jedinica', en: 'Constituency' }, d: { hr: 'Područje na kojem se bira određeni broj mandata. Granice jedinica mijenjaju vrijednost glasa i zato su česta tema sporova.', en: 'The area that elects a set number of seats. Boundaries change the value of a vote and are therefore often disputed.' } },
    { t: { hr: 'Cenzus', en: 'Threshold' }, d: { hr: 'Najmanji udio glasova koji lista mora prijeći da bi ušla u skupštinu. Prag je zakonska kategorija i mijenjao se; ovdje se ne navodi brojka bez izvora.', en: 'The minimum share of the vote a list needs to enter parliament. The threshold is a legal category and has changed; no figure appears here without a source.' } },
    { t: { hr: 'Mandat', en: 'Seat' }, d: { hr: 'Jedno mjesto u skupštini. Mandati se dijele po redu na listi, pa je i redoslijed kandidata politička odluka.', en: 'One seat in parliament. Seats are allocated by list order, so the order of candidates is itself a political decision.' } },
    { t: { hr: 'Izborna tišina', en: 'Election silence' }, d: { hr: 'Razdoblje u kojem je zabranjeno objavljivanje kampanjskih sadržaja i anketa. Početak i kraj određuje zakon, ne redakcija.', en: 'The period in which campaign content and polls may not be published. Its start and end are set by law, not by the newsroom.' } },
    { t: { hr: 'Izlaznost', en: 'Turnout' }, d: { hr: 'Udio birača koji su glasovali. Dok je ne objave izborna tijela, svaka brojka je procjena — a procjene se ne prikazuju kao rezultat.', en: 'The share of voters who cast a ballot. Until electoral bodies publish it, any figure is an estimate — and estimates are not shown as results.' } },
    { t: { hr: 'Promatrači', en: 'Observers' }, d: { hr: 'Domaći i strani promatrači koji prate biračka mjesta. Njihova izvješća su izvor, ali nisu odluka izbornog tijela.', en: 'Domestic and international observers watching polling stations. Their reports are a source, but not a decision by the electoral body.' } },
    { t: { hr: 'Izborna prevara', en: 'Electoral fraud' }, d: { hr: 'Postupci kojima se krši izborni postupak. Tvrdnja o prevari traži dokaz; u ovom desku tvrdnja bez izvora ne ulazi.', en: 'Acts that breach electoral procedure. A fraud claim requires evidence; on this desk an unsourced claim does not enter.' } },
    { t: { hr: 'Koalicija', en: 'Coalition' }, d: { hr: 'Savez lista ili stranaka koje nastupaju zajedno. Glas za koaliciju dijeli se po dogovoru unutar nje, ne po volji birača.', en: 'An alliance of lists or parties running together. A coalition vote is divided by internal agreement, not by the voter’s preference.' } },
    { t: { hr: 'Nadzorni desk', en: 'Monitoring desk' }, d: { hr: 'Ovaj format: ne anketira, ne prognozira i ne uređuje vijest — bilježi što je objavljeno, gdje i kada, i povezuje na izvornik.', en: 'This format: it does not poll, forecast or rewrite the news — it records what was published, where and when, and links to the original.' } },
  ],
  pages: {},
};
