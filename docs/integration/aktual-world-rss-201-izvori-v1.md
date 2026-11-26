# AKTUAL WORLD — RSS na 201 izdanju

## Izvedeno

- Dohvat za cijelu mrežu ili pojedinu zemlju (`--country hrvatska`) bira do 10 konfiguriranih RSS feedova po zemlji. Prednost imaju izravni izvori označeni konfiguriranim domicilnim jezikom, zatim agregatori; ponovljene feed adrese ne zauzimaju dodatna mjesta. Oznaka jezika nije dokaz jezika svakog članka.
- Izbor do 30 naslova po zemlji raspoređuje mjesta među izvorima, umjesto da jedan visokofrekventni izvor istisne ostale. Prikazuju se naslov, datum, navedeni izvor i poveznica; puni tekstovi izvora se ne preuzimaju. To nije neovisna provjera istinitosti ni prava.
- Deset gradskih Google News upita koriste konfiguraciju jezika i zemlje iz vlastite nacionalne postavke, a ne fiksni engleski/US. Odgovori, stvarni jezik i dostupnost nisu potvrđeni.
- Raspored predlaže ažuriranje svaka tri sata; ručno pokretanje može odabrati jednu zemlju. Dodatno ograničenje su najviše tri istodobna zahtjeva prema početnom hostu, vremenski limit i validacija preusmjerenja. Obrada nakon toga priprema PR; sam raspored nije dokaz objave.
- Pojedinačna obrada čuva druge zemlje, gradove i njihove izvorne vremenske oznake; 24-satna granica svježine provjerava se po zemlji/gradu pa obnova Hrvatske ne može pomladiti stari feed Srbije. Generiranje samo te zemlje dira samo njezin blok naslova i RSS, ne sitemap ni druge stranice. Masovna gradnja zadržava ostale slojeve postojećih stranica i odbija neočekivani predložak.

## Stvarno stanje izvora

Audit ispod čita konfiguraciju, **ne provjerava rad feeda, prava, neovisnost vlasništva ni stvarni jezik svake vijesti**. Agregator Google News nije 10 zasebnih izdavača. U registru je 438 stavki za 201 zemlju. Jedna zemlja ima najmanje 10 konfiguriranih izravnih RSS hostova na označenom jeziku, a 187 ih nema nijedan. Hrvatska ima 12 različitih izravnih hostova i dva Google feeda. Novi list, tportal i Nacional dodani su nakon što je web alat dohvatio njihove feedove s hrvatskim naslovima; to nije provjera dostupnosti iz GitHub runnera, trajne dostupnosti, neovisnog vlasništva ni prava korištenja. Uobičajeni dohvat uzima do deset, a po potrebi do dva dodatna konfigurirana feeda. Ne kopiraju se tijela članaka, a promjene idu kroz postojeći postupak. Po zemlji nedostaje sljedeći broj konfiguriranih hostova do cilja, ne broj provjerenih izvora:

| Izdanje | Konfigurirani jezik | Izravni RSS hostovi | Nedostaje do 10 |
|---|---:|---:|---:|
| Slovenia (`slovenija`) | sl | 3 | 7 |
| Croatia (`hrvatska`) | hr | 12 | 0 |
| Bosnia & Herzegovina (`bih`) | bs | 3 | 7 |
| Serbia (`srbija`) | sr | 3 | 7 |
| Montenegro (`crna-gora`) | srp | 0 | 10 |
| North Macedonia (`makedonija`) | mk | 0 | 10 |
| Albania (`albanija`) | sq | 0 | 10 |
| Bulgaria (`bugarska`) | bg | 0 | 10 |
| Romania (`rumunjska`) | ro | 0 | 10 |
| Greece (`grcka`) | el | 0 | 10 |
| Turkey (`turska`) | tr | 0 | 10 |
| Kosovo (`kosovo`) | sq | 0 | 10 |
| Austria (`austrija`) | de | 1 | 9 |
| Hungary (`madjarska`) | hu | 0 | 10 |
| Czechia (`ceska`) | cs | 0 | 10 |
| Slovakia (`slovakia`) | sk | 0 | 10 |
| Poland (`poljska`) | pl | 0 | 10 |
| Germany (`njemacka`) | de | 2 | 8 |
| Switzerland (`svajcarska`) | de | 0 | 10 |
| Liechtenstein (`lihtenstajn`) | de | 0 | 10 |
| France (`francuska`) | fr | 0 | 10 |
| Italy (`italija`) | it | 0 | 10 |
| Spain (`spanjolska`) | es | 0 | 10 |
| Portugal (`portugal`) | pt | 0 | 10 |
| United Kingdom (`velika-britanija`) | en | 2 | 8 |
| Ireland (`irsla`) | en | 0 | 10 |
| Netherlands (`nizozemska`) | nl | 0 | 10 |
| Belgium (`belgija`) | nl | 0 | 10 |
| Denmark (`danska`) | da | 0 | 10 |
| Sweden (`svedska`) | sv | 0 | 10 |
| Norway (`norveska`) | no | 0 | 10 |
| Finland (`finska`) | fi | 0 | 10 |
| Iceland (`island`) | is | 0 | 10 |
| Estonia (`estonija`) | et | 0 | 10 |
| Latvia (`latvija`) | lv | 0 | 10 |
| Lithuania (`litva`) | lt | 0 | 10 |
| Russia (`rusija`) | ru | 0 | 10 |
| Ukraine (`ukrajina`) | uk | 0 | 10 |
| Belarus (`bjelorusija`) | be | 0 | 10 |
| Moldova (`moldavija`) | ro | 0 | 10 |
| Georgia (`gruzija`) | ka | 0 | 10 |
| Armenia (`armenija`) | hy | 0 | 10 |
| Azerbaijan (`azerbajdzan`) | az | 0 | 10 |
| United States (`sad`) | en | 2 | 8 |
| Canada (`kanada`) | en | 1 | 9 |
| Mexico (`meksiko`) | es | 1 | 9 |
| Guatemala (`gvatemala`) | es | 0 | 10 |
| Honduras (`honduras`) | es | 0 | 10 |
| El Salvador (`salvador`) | es | 0 | 10 |
| Nicaragua (`nikaragva`) | es | 0 | 10 |
| Costa Rica (`kosta-rika`) | es | 0 | 10 |
| Panama (`panama`) | es | 0 | 10 |
| Cuba (`kuba`) | es | 0 | 10 |
| Dominican Republic (`dominikanska`) | es | 0 | 10 |
| Jamaica (`jamajka`) | en | 0 | 10 |
| Venezuela (`venezuela`) | es | 0 | 10 |
| Colombia (`kolumbija`) | es | 0 | 10 |
| Ecuador (`ekvador`) | es | 0 | 10 |
| Peru (`peru`) | es | 0 | 10 |
| Brazil (`brazil`) | pt | 1 | 9 |
| Bolivia (`bolivija`) | es | 0 | 10 |
| Paraguay (`paragvaj`) | es | 0 | 10 |
| Uruguay (`urugvaj`) | es | 0 | 10 |
| Argentina (`argentina`) | es | 1 | 9 |
| Chile (`cile`) | es | 2 | 8 |
| China (`kina`) | zh | 0 | 10 |
| Japan (`japan`) | ja | 0 | 10 |
| South Korea (`juzna-koreja`) | ko | 0 | 10 |
| North Korea (`sjeverna-koreja`) | ko | 0 | 10 |
| Taiwan (`tajvan`) | zh | 0 | 10 |
| Mongolia (`mongolija`) | mn | 0 | 10 |
| Vietnam (`vijetnam`) | vi | 0 | 10 |
| Thailand (`tajland`) | th | 0 | 10 |
| Malaysia (`malezija`) | ms | 0 | 10 |
| Singapore (`singapur`) | en | 0 | 10 |
| Indonesia (`indonezija`) | id | 0 | 10 |
| Philippines (`filipini`) | en | 0 | 10 |
| Cambodia (`kambodza`) | km | 0 | 10 |
| Laos (`laos`) | lo | 0 | 10 |
| Myanmar (`myanmar`) | my | 0 | 10 |
| India (`indija`) | hi | 0 | 10 |
| Pakistan (`pakistan`) | ur | 0 | 10 |
| Bangladesh (`banglades`) | bn | 0 | 10 |
| Sri Lanka (`srilanka`) | si | 0 | 10 |
| Nepal (`nepal`) | ne | 0 | 10 |
| Afghanistan (`afganistan`) | fa | 0 | 10 |
| Kazakhstan (`kazahstan`) | kk | 0 | 10 |
| Uzbekistan (`uzbekistan`) | uz | 0 | 10 |
| Turkmenistan (`turkmenistan`) | tk | 0 | 10 |
| Kyrgyzstan (`kirgistan`) | ky | 0 | 10 |
| Tajikistan (`tadzikistan`) | tg | 0 | 10 |
| Iran (`iran`) | fa | 0 | 10 |
| Iraq (`irak`) | ar | 0 | 10 |
| Saudi Arabia (`saudijska`) | ar | 0 | 10 |
| United Arab Emirates (`uae`) | ar | 0 | 10 |
| Qatar (`katari`) | ar | 0 | 10 |
| Israel (`izrael`) | he | 0 | 10 |
| Jordan (`jordan`) | ar | 0 | 10 |
| Lebanon (`libanon`) | ar | 0 | 10 |
| Syria (`sirija`) | ar | 0 | 10 |
| Egypt (`egipat`) | ar | 0 | 10 |
| Morocco (`maroko`) | ar | 0 | 10 |
| Algeria (`alzir`) | ar | 0 | 10 |
| Tunisia (`tunis`) | ar | 0 | 10 |
| Libya (`libija`) | ar | 0 | 10 |
| Sudan (`sudan`) | ar | 0 | 10 |
| Nigeria (`nigerija`) | en | 0 | 10 |
| Ghana (`gvana`) | en | 0 | 10 |
| Senegal (`senegal`) | fr | 0 | 10 |
| Kenya (`kenija`) | en | 0 | 10 |
| Ethiopia (`etipija`) | am | 0 | 10 |
| Tanzania (`tanzanija`) | sw | 0 | 10 |
| South Africa (`juzna-afrika`) | en | 0 | 10 |
| Mozambique (`mozambik`) | pt | 0 | 10 |
| Australia (`australija`) | en | 1 | 9 |
| New Zealand (`novi-zeland`) | en | 0 | 10 |
| Papua New Guinea (`papua-novagvineja`) | en | 0 | 10 |
| Andorra (`andora`) | ca | 0 | 10 |
| Monaco (`monako`) | fr | 0 | 10 |
| San Marino (`san-marino`) | it | 0 | 10 |
| Vatican City (`vatikan`) | it | 0 | 10 |
| Malta (`malta`) | mt | 0 | 10 |
| Cyprus (`cipar`) | el | 0 | 10 |
| Greenland (`grenland`) | kl | 0 | 10 |
| Faroe Islands (`ferozki-otoci`) | fo | 0 | 10 |
| Cape Verde (`zelenortska`) | pt | 0 | 10 |
| São Tomé & Príncipe (`sao-tome`) | pt | 0 | 10 |
| Guinea-Bissau (`gvineja-bissau`) | pt | 0 | 10 |
| Equatorial Guinea (`ekvatorska-gvineja`) | es | 0 | 10 |
| Gambia (`gambija`) | en | 0 | 10 |
| Guinea (`gvineja`) | fr | 0 | 10 |
| Sierra Leone (`sijera-leone`) | en | 0 | 10 |
| Liberia (`liberija`) | en | 0 | 10 |
| Ivory Coast (`slone-coast`) | fr | 0 | 10 |
| Burkina Faso (`burkina-faso`) | fr | 0 | 10 |
| Togo (`togo`) | fr | 0 | 10 |
| Benin (`benin`) | fr | 0 | 10 |
| Niger (`niger`) | fr | 0 | 10 |
| Chad (`cad`) | fr | 0 | 10 |
| Cameroon (`kamerun`) | fr | 0 | 10 |
| Central African Republic (`srednjoafrika`) | fr | 0 | 10 |
| Congo (Brazzaville) (`kongo-b`) | fr | 0 | 10 |
| DR Congo (`kongo-k`) | fr | 0 | 10 |
| Gabon (`gabon`) | fr | 0 | 10 |
| Angola (`angola`) | pt | 0 | 10 |
| Djibouti (`djibuti`) | fr | 0 | 10 |
| Eritrea (`eritreja`) | ti | 0 | 10 |
| Somalia (`somalija`) | so | 0 | 10 |
| South Sudan (`juza-sudan`) | en | 0 | 10 |
| Uganda (`uganda`) | en | 0 | 10 |
| Rwanda (`ruanda`) | rw | 0 | 10 |
| Burundi (`burundi`) | fr | 0 | 10 |
| Malawi (`malavi`) | en | 0 | 10 |
| Zambia (`zambija`) | en | 0 | 10 |
| Zimbabwe (`zimbabve`) | en | 0 | 10 |
| Botswana (`botsvana`) | en | 0 | 10 |
| Namibia (`namibija`) | en | 0 | 10 |
| Lesotho (`lesoto`) | en | 0 | 10 |
| Eswatini (`svazilend`) | en | 0 | 10 |
| Madagascar (`madagaskar`) | mg | 0 | 10 |
| Mauritius (`mauricijus`) | fr | 0 | 10 |
| Comoros (`komori`) | fr | 0 | 10 |
| Seychelles (`sejceli`) | fr | 0 | 10 |
| Mauritania (`mauritanija`) | ar | 0 | 10 |
| Western Sahara (`zapadna-sahara`) | ar | 0 | 10 |
| Mali (`mali`) | fr | 0 | 10 |
| Yemen (`jemen`) | ar | 0 | 10 |
| Oman (`oman`) | ar | 0 | 10 |
| Bahrain (`bahrein`) | ar | 0 | 10 |
| Kuwait (`kuwait`) | ar | 0 | 10 |
| Bhutan (`butan`) | dz | 0 | 10 |
| Maldives (`maldivi`) | dv | 0 | 10 |
| Brunei (`brunej`) | ms | 0 | 10 |
| East Timor (`istocni-timor`) | pt | 0 | 10 |
| Bahamas (`bahami`) | en | 0 | 10 |
| Barbados (`barbados`) | en | 0 | 10 |
| Trinidad & Tobago (`trinidad`) | en | 0 | 10 |
| Haiti (`haiti`) | fr | 0 | 10 |
| Belize (`belize`) | en | 0 | 10 |
| Grenada (`grenada`) | en | 0 | 10 |
| Saint Lucia (`sveta-lucija`) | en | 0 | 10 |
| Antigua & Barbuda (`antigva`) | en | 0 | 10 |
| Dominica (`dominika-karibi`) | en | 0 | 10 |
| Saint Kitts & Nevis (`sveti-kitts`) | en | 0 | 10 |
| Saint Vincent & Grenadines (`sveti-vincent`) | en | 0 | 10 |
| Fiji (`fidzi`) | en | 0 | 10 |
| Solomon Islands (`salomonski-otoci`) | en | 0 | 10 |
| Vanuatu (`vanuatu`) | bi | 0 | 10 |
| Samoa (`samoa`) | sm | 0 | 10 |
| Tonga (`tonga`) | to | 0 | 10 |
| Kiribati (`kiribati`) | en | 0 | 10 |
| Micronesia (`mikronezija`) | en | 0 | 10 |
| Marshall Islands (`marsalovi`) | en | 0 | 10 |
| Palau (`palau`) | en | 0 | 10 |
| Nauru (`nauru`) | na | 0 | 10 |
| Tuvalu (`tuvalu`) | tvl | 0 | 10 |
| American Samoa (`americanska-samoa`) | en | 0 | 10 |
| New Caledonia (`novi-kaledonija`) | fr | 0 | 10 |
| French Polynesia (`francuska-polinezija`) | fr | 0 | 10 |
| Luxembourg (`luksemburg`) | fr | 0 | 10 |
| Guyana (`gvajana`) | en | 0 | 10 |

## Što je još potrebno

1. Za svaku zemlju istražiti izdavače i njihova službena RSS odredišta, jezik, dostupnost, vlasništvo i uvjete uporabe; zasebno odobriti i unijeti one koji stvarno postoje. Nije sigurno izmisliti oko 2.000 feedova niti brojati rubrike jednog agregatora kao izdavače.
2. Izvorni tekstovi o glavnim temama moraju biti napisani iz stvarno provjerenih podataka i točno atribuirani, s uredničkim pregledom; dopuštenje korisnika za vlastite tekstove ne potvrđuje prava na preuzimanje tuđih punih članaka. Naslovi iz RSS-a sami nisu dovoljna činjenična podloga za autonomno objavljivanje punog članka.
3. Zadnji pregledani GitHub workflow za osvježavanje uspio je u dohvaćanju i gradnji, ali završni korak otvaranja PR-a je pao; sam uzrok nije utvrđen jer zapisnik nije bio dostupan. Potrebno je pregledati ovlasti i zapisnik sljedećeg izvršavanja. Izmjena rasporeda ne dokazuje da je raspored uspješno izvršen ili da je sadržaj javno objavljen.
4. Automatski PR i produkcijski deploy ostaju pod kontrolama postojećeg repozitorija; ova promjena ne zaobilazi zaštite ni ne tvrdi da je cijela mreža uživo osvježena. Automatski RSS proces nije testiran uživo prema izdavačima iz ove radne okoline: njegovi mrežni testovi koriste mockove. Provjera pojedinog kandidata zasebnim web alatom nije dokaz da će feed raditi u produkciji.

Provjera lokalne konfiguracije: `node scripts/audit-world-rss-coverage-v1.mjs`. Testovi: `node --test tests/test-world-rss-expansion-v1.mjs tests/test-world-source-checks-v1.mjs tests/test-world-preservation-v1.mjs tests/test-world201-rss-redirect-v1.mjs`.
