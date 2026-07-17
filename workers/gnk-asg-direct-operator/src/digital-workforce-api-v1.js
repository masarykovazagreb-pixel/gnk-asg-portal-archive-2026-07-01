export const VERSION='GNK_ASG_DIGITAL_WORKFORCE_API_V3_20260717';

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

const MAX_ADMIN_BODY_BYTES=262144;
const PUBLIC_METHODS=new Set(['GET','HEAD']);
const ADMIN_METHODS=new Set(['GET','POST','PUT']);

const json=(request,data,status=200,extraHeaders={})=>new Response(request.method==='HEAD'?null:JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-digital-workforce':VERSION,...extraHeaders}});
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const methodNotAllowed=(request,allow)=>json(request,{ok:false,error:'method_not_allowed'},405,{allow:allow.join(', ')});

async function auth(request,env,ctx,app){
  try{
    const target=new URL('/api/operator-auth-check',request.url);
    const response=await app.fetch(new Request(target,{method:'GET',headers:request.headers,redirect:'manual'}),env,ctx);
    if(!response.ok)return false;
    const data=await response.clone().json().catch(()=>null);
    return data?.authenticated===true;
  }catch{return false;}
}

function sameOrigin(request){
  const origin=String(request.headers.get('origin')||'').trim();
  if(!origin)return false;
  try{return new URL(origin).origin===new URL(request.url).origin;}catch{return false;}
}

async function readAdminJson(request){
  const type=String(request.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('application/json'))return{error:json(request,{ok:false,error:'unsupported_media_type'},415)};
  const declared=Number(request.headers.get('content-length')||0);
  if(Number.isFinite(declared)&&declared>MAX_ADMIN_BODY_BYTES)return{error:json(request,{ok:false,error:'payload_too_large'},413)};
  let text;
  try{text=await request.text();}catch{return{error:json(request,{ok:false,error:'invalid_body'},400)}}
  if(new TextEncoder().encode(text).byteLength>MAX_ADMIN_BODY_BYTES)return{error:json(request,{ok:false,error:'payload_too_large'},413)};
  let body;
  try{body=JSON.parse(text);}catch{return{error:json(request,{ok:false,error:'invalid_json'},400)}}
  if(!body||typeof body!=='object'||Array.isArray(body))return{error:json(request,{ok:false,error:'invalid_json'},400)};
  return{body};
}

async function ensureTable(env){
  if(!env.GNK_ASG_D1)return false;
  await env.GNK_ASG_D1.prepare(`CREATE TABLE IF NOT EXISTS editor_desk_packages(id INTEGER PRIMARY KEY AUTOINCREMENT, package_date TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'draft', public_json TEXT NOT NULL, sensitive_json TEXT NOT NULL, updated_at TEXT NOT NULL)`).run();
  return true;
}

async function latest(env){
  if(!env.GNK_ASG_D1)return null;
  return env.GNK_ASG_D1.prepare('SELECT * FROM editor_desk_packages ORDER BY package_date DESC,id DESC LIMIT 1').first();
}

export async function handleDigitalWorkforce(request,env,ctx,app){
  const path=pathOf(request);

  if(path==='/api/public/digital-workforce/health'){
    if(!PUBLIC_METHODS.has(request.method))return methodNotAllowed(request,['GET','HEAD']);
    const d1=Boolean(env.GNK_ASG_D1);
    let stored=false;
    if(d1){try{stored=Boolean(await latest(env));}catch{}}
    return json(request,{ok:true,status:d1?'ready':'degraded',checks:{worker:true,assets:Boolean(env.ASSETS),d1,storedPackage:stored},version:VERSION,updatedAt:PUBLIC_PACKAGE.updatedAt},d1?200:503);
  }

  if(path==='/api/public/editor-desk'){
    if(!PUBLIC_METHODS.has(request.method))return methodNotAllowed(request,['GET','HEAD']);
    let row=null;
    try{row=await latest(env);}catch{}
    let payload=PUBLIC_PACKAGE;
    if(row){
      try{payload=JSON.parse(row.public_json);}catch{return json(request,{ok:false,error:'stored_package_invalid'},503);}
    }
    return json(request,{ok:true,status:row?.status||'approved',package:payload,source:row?'d1':'embedded-safe-default'});
  }

  if(path==='/api/admin/editor-desk'){
    if(!ADMIN_METHODS.has(request.method))return methodNotAllowed(request,['GET','POST','PUT']);
    if(!await auth(request,env,ctx,app))return json(request,{ok:false,error:'unauthorized'},401);

    if(request.method==='GET'){
      try{
        const row=await latest(env);
        if(!row)return json(request,{ok:true,package:{package_date:'2026-07-15',status:'approved',public_json:PUBLIC_PACKAGE,sensitive_json:SENSITIVE_HOLD},source:'embedded-safe-default'});
        return json(request,{ok:true,package:{...row,public_json:JSON.parse(row.public_json),sensitive_json:JSON.parse(row.sensitive_json)},source:'d1'});
      }catch{return json(request,{ok:true,package:{package_date:'2026-07-15',status:'approved',public_json:PUBLIC_PACKAGE,sensitive_json:SENSITIVE_HOLD},source:'embedded-safe-default'});}
    }

    if(!sameOrigin(request))return json(request,{ok:false,error:'invalid_origin'},403);
    const parsed=await readAdminJson(request);
    if(parsed.error)return parsed.error;
    if(!await ensureTable(env))return json(request,{ok:false,error:'d1_unavailable'},503);

    const body=parsed.body;
    const date=String(body.package_date||new Date().toISOString().slice(0,10));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json(request,{ok:false,error:'invalid_package_date'},400);
    const status=['draft','review','approved','published'].includes(body.status)?body.status:'draft';
    const pub=body.public_json&&typeof body.public_json==='object'&&!Array.isArray(body.public_json)?body.public_json:PUBLIC_PACKAGE;
    const sensitive=Array.isArray(body.sensitive_json)?body.sensitive_json:SENSITIVE_HOLD;

    try{
      await env.GNK_ASG_D1.prepare(`INSERT INTO editor_desk_packages(package_date,status,public_json,sensitive_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(package_date) DO UPDATE SET status=excluded.status,public_json=excluded.public_json,sensitive_json=excluded.sensitive_json,updated_at=excluded.updated_at`).bind(date,status,JSON.stringify(pub),JSON.stringify(sensitive),new Date().toISOString()).run();
    }catch{return json(request,{ok:false,error:'storage_unavailable'},503);}
    return json(request,{ok:true,saved:true,package_date:date,status});
  }

  return null;
}
