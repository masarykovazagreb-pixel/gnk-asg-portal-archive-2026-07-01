export const VERSION='GNK_ASG_DIGITAL_WORKFORCE_API_V1_20260715';

const PUBLIC_PACKAGE={
  publicationLane:[
    {title:'Napredak GNEW Portala',summary:'Pregled novih javnih modula, transparentnosti javnih podataka i jasnog odvajanja javnog od administrativnog sloja.'},
    {title:'Operativni pregled 45 entiteta',summary:'Model obuhvaća 2 imenovana društva i 43 operativna GNK slota. Objavljuju se samo odobreni operativni podaci.'},
    {title:'Projektni status',summary:'Devet projektnih područja sa statusom, zadnjim korakom, sljedećim korakom i datumom zadnjeg ažuriranja.'}
  ],
  comments:[
    {title:'Transparentnost nije marketing',text:'Sve više organizacija govori o transparentnosti, ali malo ih svakodnevno pokazuje što je stvarno napravljeno. Transparentnost nije slogan nego disciplina. Ako projekt nije napredovao, i to je informacija vrijedna objave.'},
    {title:'Digitalni sustavi moraju služiti ljudima',text:'Digitalizacija nije cilj sama sebi. Vrijednost nastaje tek kada sustav štedi vrijeme, povećava točnost i ostavlja jasan trag svake odluke.'},
    {title:'Investicije počinju organizacijom',text:'Kapital dolazi tamo gdje postoje red, odgovornost i mjerljivi rezultati. Najvažniji dio svake investicije nije prezentacija nego sposobnost svakodnevnog izvršavanja planiranih aktivnosti.'},
    {title:'Rezultat je važniji od obećanja',text:'Veliki planovi imaju smisla samo ako se svakoga dana može pokazati što je napravljeno. Mali pomaci koji se redovito ostvaruju dugoročno vrijede više od velikih najava bez provedbe.'},
    {title:'Umjetna inteligencija kao alat',text:'AI može ubrzati analizu, pripremu nacrta i obradu podataka, ali odgovornost za odluke ostaje na ljudima. Sustav mora pomagati upravljanju, a ne zamjenjivati upravljanje.'}
  ],
  sourceBrief:[
    {region:'Europa',text:'Raste fokus na europsku tehnološku autonomiju, digitalnu infrastrukturu i suradnju između europskih gospodarstava.'},
    {region:'Azija',text:'Fokus poslovnih i investicijskih foruma ostaje na AI-ju, kapitalu i digitalnim tržištima.'},
    {region:'AI',text:'Industrija se pomiče s eksperimentiranja prema upravljanju, sigurnosti, nadzoru i mjerljivim rezultatima AI sustava.'}
  ],
  meetings:[
    {area:'Finance',status:'in_progress',notes:['Finance cockpit pregledan.','Potrebno proširiti KPI dashboard.','Dodati trendove po razdobljima.']},
    {area:'Public Operations',status:'in_progress',notes:['Priprema registra 45 entiteta.','Standardizacija ID oznaka.','Priprema dnevnih rezultata.']},
    {area:'Editorial',status:'ready',notes:['Pripremljeno 5 komentara.','Objave čekaju urednički pregled.']},
    {area:'THE CODE',status:'in_progress',notes:['Provjeriti HR/EN usklađenost.','Pregled countdown sadržaja.']}
  ],
  decisions:[
    'Nastavlja se razvoj javnog operativnog dashboarda.',
    'Svaki worker mora imati mjerljiv dnevni rezultat.',
    'Svaki projekt mora imati javno prikazan status.',
    'Financijski prikazi ostaju odvojeni od službenih računovodstvenih izvještaja.'
  ],
  blockers:[
    'Registar svih 45 entiteta još nije potpuno povezan s javnim prikazom.',
    'Dashboard za investicijske projekte nije dovršen.',
    'Potrebno je proširiti automatsko prikazivanje KPI pokazatelja.',
    'Dio HR/EN sadržaja još zahtijeva provjeru usklađenosti.'
  ],
  entities:{namedCompanies:2,operationalSlots:43,total:45,publicRule:'Objavljuju se samo odobreni operativni podaci.'},
  projects:Array.from({length:9},(_,i)=>({id:`PRJ-${String(i+1).padStart(2,'0')}`,status:i===2?'ready':'in_progress',lastStep:'Operativni pregled i usklađivanje podataka',nextStep:'Potvrditi mjerljivi rezultat i javni status',updatedAt:'2026-07-15'})),
  updatedAt:'2026-07-15T22:00:00+02:00',editor:'Nermin Sefić'
};

const SENSITIVE_HOLD=['interni administrativni podaci','vjerodajnice, tokeni i sigurnosne postavke','bankovni podaci i nejavni financijski detalji','nacrti ugovora i neobjavljeni pravni dokumenti','interni planovi akvizicija i pregovora','osobni podaci','neodobrene financijske tvrdnje ili projekcije','sadržaji koji čekaju izvršni ili pravni pregled'];

const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-digital-workforce':VERSION}});
const pathOf=r=>new URL(r.url).pathname.replace(/\/+$/,'')||'/';

async function auth(request,env,ctx,app){
  const target=new URL('/api/operator-auth-check',request.url);
  const response=await app.fetch(new Request(target,{method:'GET',headers:request.headers,redirect:'manual'}),env,ctx);
  return response.ok;
}

async function ensureTable(env){
  if(!env.GNK_ASG_D1)return false;
  await env.GNK_ASG_D1.prepare(`CREATE TABLE IF NOT EXISTS editor_desk_packages(id INTEGER PRIMARY KEY AUTOINCREMENT, package_date TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'draft', public_json TEXT NOT NULL, sensitive_json TEXT NOT NULL, updated_at TEXT NOT NULL)`).run();
  return true;
}

async function latest(env){
  if(!await ensureTable(env))return null;
  return env.GNK_ASG_D1.prepare('SELECT * FROM editor_desk_packages ORDER BY package_date DESC,id DESC LIMIT 1').first();
}

export async function handleDigitalWorkforce(request,env,ctx,app){
  const path=pathOf(request);
  if(path==='/api/public/digital-workforce/health'){
    let d1=false,stored=false;
    try{d1=Boolean(await ensureTable(env));stored=Boolean(await latest(env));}catch{}
    return json({ok:true,status:d1?'ready':'degraded',checks:{worker:true,assets:Boolean(env.ASSETS),d1,storedPackage:stored},version:VERSION,updatedAt:PUBLIC_PACKAGE.updatedAt},d1?200:503);
  }
  if(path==='/api/public/editor-desk'){
    let row=null;try{row=await latest(env);}catch{}
    const payload=row?JSON.parse(row.public_json):PUBLIC_PACKAGE;
    return json({ok:true,status:row?.status||'approved',package:payload,source:row?'d1':'embedded-safe-default'});
  }
  if(path==='/api/admin/editor-desk'){
    if(!await auth(request,env,ctx,app))return json({ok:false,error:'unauthorized'},401);
    if(request.method==='GET'){
      const row=await latest(env);
      return json({ok:true,package:row?{...row,public_json:JSON.parse(row.public_json),sensitive_json:JSON.parse(row.sensitive_json)}:{package_date:'2026-07-15',status:'approved',public_json:PUBLIC_PACKAGE,sensitive_json:SENSITIVE_HOLD}});
    }
    if(request.method==='PUT'||request.method==='POST'){
      if(!await ensureTable(env))return json({ok:false,error:'d1_unavailable'},503);
      const body=await request.json().catch(()=>null);if(!body||typeof body!=='object')return json({ok:false,error:'invalid_json'},400);
      const date=String(body.package_date||new Date().toISOString().slice(0,10));
      const status=['draft','review','approved','published'].includes(body.status)?body.status:'draft';
      const pub=body.public_json&&typeof body.public_json==='object'?body.public_json:PUBLIC_PACKAGE;
      const sensitive=Array.isArray(body.sensitive_json)?body.sensitive_json:SENSITIVE_HOLD;
      await env.GNK_ASG_D1.prepare(`INSERT INTO editor_desk_packages(package_date,status,public_json,sensitive_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(package_date) DO UPDATE SET status=excluded.status,public_json=excluded.public_json,sensitive_json=excluded.sensitive_json,updated_at=excluded.updated_at`).bind(date,status,JSON.stringify(pub),JSON.stringify(sensitive),new Date().toISOString()).run();
      return json({ok:true,saved:true,package_date:date,status});
    }
    return json({ok:false,error:'method_not_allowed'},405);
  }
  return null;
}
