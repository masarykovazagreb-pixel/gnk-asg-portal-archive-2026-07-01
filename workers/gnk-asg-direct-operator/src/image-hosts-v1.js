// GNK ASG — dopušteni hostovi slika za regionalna izdanja.
//
// Zašto zaseban popis: matična stranica (AKTUAL MEDIA svijet) ima svoj popis
// u image-proxy-v1.js, a gradska izdanja i devet deskova služe slike iz
// medija koje taj popis nikad nije sadržavao. Bez ovog popisa svaka je
// minijatura na /izdanja/* vraćala 403 i stranica je izgledala prazno.
//
// Popis nije "sve što postoji": to su točno hostovi koji se pojavljuju u
// apps/region/data/*.json, jedan po jednom, s medijem uz koji pripadaju.
// Novi izvor slika ne prolazi sam od sebe — tests/test-image-proxy-coverage-v1.mjs
// pada čim se u podacima pojavi host kojeg ovdje nema, pa se odluka o
// proširenju donosi svjesno, u pregledu.
//
// Pravila posrednika ostaju ista za sve: samo https, bez portova, bez "..",
// bez SVG-a, najviše 8 MB, sadržaj mora biti slika.

/* Format: [host, medij, zemlja] — medij i zemlja su ovdje da se iz popisa
   može pročitati zašto je host dopušten, bez traženja po feedovima. */
export const REGION_IMAGE_HOSTS = [
  // Hrvatska
  ['media.jutarnji.hr', 'Jutarnji list', 'HR'],
  ['bucket.index.hr', 'Index.hr', 'HR'],
  ['n1info.hr', 'N1 Hrvatska', 'HR'],
  ['www.telegram.hr', 'Telegram.hr', 'HR'],
  ['www.tportal.hr', 'tportal', 'HR'],
  ['www.poslovni.hr', 'Poslovni dnevnik', 'HR'],
  ['i2.res.24o.it', '24sata / RCS', 'HR'],
  // Srbija
  ['www.danas.rs', 'Danas', 'RS'],
  ['nova.rs', 'Nova.rs', 'RS'],
  ['n1info.rs', 'N1 Srbija', 'RS'],
  ['www.politika.rs', 'Politika', 'RS'],
  // Bosna i Hercegovina
  ['static.klix.ba', 'Klix.ba', 'BA'],
  ['n1info.ba', 'N1 BiH', 'BA'],
  ['storage.radiosarajevo.ba', 'Radio Sarajevo', 'BA'],
  ['gale-s3-bucket.s3.eu-central-1.amazonaws.com', 'N1 BiH (S3)', 'BA'],
  // Slovenija
  ['images.24ur.com', '24ur.com', 'SI'],
  ['n1info.si', 'N1 Slovenija', 'SI'],
  ['slovenskenovice.delo.si', 'Slovenske novice', 'SI'],
  ['www.delo.si', 'Delo', 'SI'],
  ['iasstorage.vecer.com', 'Večer', 'SI'],
  // Mađarska
  ['img.hvg.hu', 'HVG', 'HU'],
  ['s.24.hu', '24.hu', 'HU'],
  ['pcdn.hu', 'Pesti Hírlap / pcdn', 'HU'],
  ['assets.4cdn.hu', '4cdn.hu', 'HU'],
  ['assets.telex.hu', 'Telex', 'HU'],
  // Italija
  ['www.gedistatic.it', 'La Stampa / GEDI', 'IT'],
  // Bugarska
  ['img.dnevnik.bg', 'Dnevnik.bg', 'BG'],
  ['www.segabg.com', 'Sega.bg', 'BG'],
  ['cdn.actualno.eu', 'Actualno.com', 'BG'],
  // Rumunjska
  ['www.g4media.ro', 'G4Media', 'RO'],
  ['s.iw.ro', 'Impact / iw.ro', 'RO'],
  ['storage0.dms.mpinteractiv.ro', 'HotNews / MP Interactiv', 'RO'],
  ['i0.1616.ro', '1616.ro', 'RO'],
  // Afrika
  ['nation.africa', 'Daily Nation', 'KE'],
  ['capitalfm.africa', 'Capital FM', 'KE'],
  ['www.kbc.co.ke', 'KBC', 'KE'],
  ['www.madamasr.com', 'Mada Masr', 'EG'],
  ['images.dailynewsegypt.com', 'Daily News Egypt', 'EG'],
  // Azija i Pacifik
  ['img.antaranews.com', 'ANTARA', 'ID'],
  ['static.republika.co.id', 'Republika', 'ID'],
  ['dam.mediacorp.sg', 'CNA / Mediacorp', 'SG'],
  ['images.skynewsarabia.com', 'Sky News Arabia', 'AE'],
  ['media.skynewsarabia.com', 'Sky News Arabia', 'AE'],
  ['cdn.i-scmp.com', 'South China Morning Post', 'HK'],
  ['image5.sixthtone.com', 'Sixth Tone', 'CN'],
  ['www.japantimes.co.jp', 'The Japan Times', 'JP'],
  // Amerika
  ['static01.nyt.com', 'The New York Times', 'US'],
  ['s.abcnews.com', 'ABC News', 'US'],
  ['platform.theverge.com', 'The Verge', 'US'],
  ['npr.brightspotcdn.com', 'NPR', 'US'],
  ['media.npr.org', 'NPR', 'US'],
  ['www.propublica.org', 'ProPublica', 'US'],
  ['conteudo.imguol.com.br', 'UOL', 'BR'],
  ['f.i.uol.com.br', 'UOL (Folha)', 'BR'],
  ['s2-g1.glbimg.com', 'G1 / Globo', 'BR'],
  ['veja.abril.com.br', 'Veja', 'BR'],
  ['agenciabrasil.ebc.com.br', 'Agência Brasil', 'BR'],
  // Ujedinjeno Kraljevstvo
  ['i.guim.co.uk', 'The Guardian', 'GB'],
  ['ichef.bbci.co.uk', 'BBC', 'GB'],
];

export const REGION_IMAGE_HOST_LIST = REGION_IMAGE_HOSTS.map(([host]) => host);
