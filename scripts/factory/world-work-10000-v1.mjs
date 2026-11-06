#!/usr/bin/env node
// Work register only: no generated task is evidence of implementation or deployment.
import {readFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const countryActions=[
 'Potvrditi stvarnu zemlju, glavni grad i oznake registra','Utvrditi glavne jezike i pisma lokalnog izdanja','Provjeriti dostupnost planirane adrese bez tvrdnje o vlasništvu','Provjeriti odgovornog izdavača i uredničku nadležnost','Usporediti status registra sa stvarnim javnim stanjem',
 'Pronaći kandidatske lokalne izvore vijesti','Provjeriti dopuštene oblike preuzimanja svakog izvora','Zabilježiti poveznice na uvjete i datum provjere prava','Provjeriti dostupnost i ograničenja feedova','Odbiti izvore bez potvrđenih uvjeta uporabe',
 'Pripremiti domicilni jezik naslovnice','Provjeriti domicilnu navigaciju i podnožje','Pripremiti engleski ulaz uz odgovarajući hreflang','Pripremiti hrvatsku poveznicu na matični portal','Osigurati pregled lokalnog jezika i pisma',
 'Definirati rubrike primjerene lokalnom izdanju','Pripremiti dnevni pregled iz dozvoljenih izvora','Povezati svaki osvrt s izvornim člankom','Odvojiti izvornu tvrdnju od uredničkog komentara','Označiti automatizaciju i odgovornu uredničku ulogu',
 'Provjeriti naslov stranice i opis','Provjeriti canonical i pravila indeksiranja','Provjeriti valjanost strukturiranih podataka','Provjeriti društvene kartice i atribuciju','Provjeriti sitemap i feed s istinitim datumima',
 'Provjeriti vlasništvo i prava na slike','Provjeriti čitljivost i dimenzije slika','Dodati opisne alternativne tekstove','Provjeriti favicon i pripadnost mreži','Testirati responzivni raspored na mobilnom uređaju',
 'Provjeriti fokus, tipkovničku navigaciju i preskok','Provjeriti kontrast i smislene naslove','Provjeriti obavijesti o pogreškama čitačem ekrana','Provjeriti poveznice bez ovisnosti o JavaScriptu','Izmjeriti osnovne performanse i veličinu prijenosa',
 'Uvesti pretragu vlastitih dostupnih zapisa','Omogućiti jasan izbor javne pretrage','Prikazati stanje kad nema rezultata','Testirati jezične znakove i više pisama u pretrazi','Provjeriti CSP i ponašanje pretrage u pregledniku',
 'Uskladiti broj zapisa s izvorom podataka','Provjeriti povratnu vezu na AKTUAL MEDIA','Provjeriti vezu prema matičnom GNK ASG portalu','Provjeriti odobrene oznake i pravila spominjanja','Provjeriti veze prema drugim relevantnim izdanjima',
 'Definirati provjeru svježine bez promjene datuma objava','Dodati provjeru izlaza prije objave','Pripremiti povratak na prethodnu verziju','Objaviti samo nakon svih produkcijskih odobrenja','Neovisno provjeriti javnu adresu i točan objavljeni SHA'
];
const areas=['jedinstvena arhitektura','razrješenje arhiva','pravni pregled izvora','uredničko odobravanje','cjevovod objave','sigurnost','besplatni hosting i kvote','dizajnski sustav','pristupačnost','tražilica i indeks','SEO i metapodaci','lokalizacija','slike i atribucija','ažurnost i izvori','brojke mreže','javni status','analitika dostupnosti','dnevni komentari','povezivanje izdanja','automatizirano testiranje','oporavak i povrat','performanse','registar projekata','operativna dokumentacija','provjera produkcije'];
const actions=['Popisati stanje i stvarne ovisnosti','Zabilježiti rizike, prava i odgovorne osobe','Definirati mjerljiv kriterij prihvaćanja','Pregledati postojeću implementaciju','Pripremiti najmanju sigurnu promjenu','Uvesti automatizirani test','Provesti negativni test i provjeru zaštita','Dokumentirati i otkloniti pronađene nedostatke','Provjeriti postupak povrata','Potvrditi rezultat na točnom objavljenom SHA'];
export function buildWork(countries){
 if(!Array.isArray(countries)||countries.length!==195||new Set(countries.map(c=>c.cca2)).size!==195||countries.some(c=>!c.cca2||!c.country))throw Error('Potreban je registar s 195 jedinstvenih država');
 let rows=[];for(const c of countries)for(let i=0;i<countryActions.length;i++)rows.push({id:`WORLD-${c.cca2}-${String(i+1).padStart(2,'0')}`,scope:c.cca2,country:c.country,task:countryActions[i],status:'open'});
 for(let i=0;i<areas.length;i++)for(let j=0;j<actions.length;j++)rows.push({id:`NETWORK-${String(i+1).padStart(2,'0')}-${String(j+1).padStart(2,'0')}`,scope:'network',area:areas[i],task:actions[j],status:'open'});
 if(rows.length!==10000)throw Error(`Očekuje se 10000 zadataka, dobiveno ${rows.length}`);return rows;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{let rows=buildWork(JSON.parse(readFileSync(join(ROOT,'config/world-countries-v1.json'),'utf8')).countries);console.log(JSON.stringify({version:'WORLD_WORK_10000_V1',note:'Plan: svi zadaci otvoreni. Nije dokaz izvedbe, licenci, ljudskog pregleda, objave ili dostupnosti.',tasks:rows},null,2))}catch(e){console.error(e.message);process.exitCode=1}
}
