export const VERSION='GNK_ASG_INTELLIGENCE_DESK_CHAT_V1_20260719_OPENAI_RATE_LIMITED';
export const CHAT_PATH='/api/intelligence-desk-chat';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const store=env=>env?.GNK_ASG_CONFIG_KV||env?.GNK_ASG_KV||null;

const RATE_LIMIT_MAX_PER_HOUR=12,RATE_LIMIT_WINDOW_SECONDS=3600;
async function rateLimited(env,ip){
 const kv=store(env);
 if(!kv)return false;
 const key=`deskchat:rate:${ip}`;
 let count=0;
 try{const raw=await kv.get(key);count=raw?Number(JSON.parse(raw).count)||0:0}catch{}
 if(count>=RATE_LIMIT_MAX_PER_HOUR)return true;
 try{await kv.put(key,JSON.stringify({count:count+1}),{expirationTtl:RATE_LIMIT_WINDOW_SECONDS})}catch{}
 return false;
}

const SYSTEM_PROMPT=`Ti si "GNK ASG Intelligence Desk", javni informativni AI asistent na korporativnom portalu gnk-asg.hr.
Odgovaraš KRATKO (2-4 rečenice), isključivo na temelju sljedećih javno objavljenih činjenica o GNK ASG d.o.o. i GNK DINAMO Ltd. grupi:
- GNK ASG d.o.o.: sjedište Zagreb (Zagrebačka cesta 130), OIB 75227917632, osnovano 12.5.2023., direktor i UBO Nermin Sefić, djelatnost NKD 93.19.0 (sportske aktivnosti).
- FY2025 (revidirano): ukupni prihodi EUR 504.00 milijuna, ukupna imovina EUR 46.40 milijuna, kapital i rezerve EUR 46.21 milijuna, kratkoročne obveze EUR 184.50 tisuća, dobit prije poreza EUR 21,584.16, dobit razdoblja EUR 16,076.47. Revizor: EKVILIBRIJ d.o.o.
- GNK DINAMO Ltd. (matično društvo grupe): sjedište Boulder, Colorado, SAD, ovlašteni predstavnik i UBO grupe Nermin Sefić, 33 povezana društva, 12 lokacija. Konsolidirani FY2025 podatci (upravljački potvrđeni, interno pregledani, podneseno za Colorado javnu evidenciju, NISU nezavisno revidirani GNK ASG podatci): prihod grupe EUR 4.7046 mlrd, neto dobit EUR 982.48 m, ukupna imovina EUR 3.4830 mlrd, kapital i rezerve EUR 3.4140 mlrd, obveze EUR 69.04 m, equity ratio 98.02%.
- Tehnološki fokus: umjetna inteligencija, softverske platforme, fintech/digitalna imovina, sportska tehnologija, kibernetička sigurnost, globalna inovacija.
- Dijelovi portala koje možeš spomenuti i uputiti korisnika na njih:
  - AKTUAL MEDIA (/gnk-aktual/) — pregled poslovnih i tehnoloških vijesti iz javnih izvora (Reuters, BBC, CNN, Guardian i dr.), osvježava se svaka 2 sata.
  - Puls Tržišta (/puls-trzista/) — informativni prikaz kripto imovine, 22 svjetska indeksa i 25 sirovina, isključivo informativno, nije investicijski savjet.
  - Digital Workforce (/digital-workforce/) — javna ilustrativna simulacija operativnog sustava digitalne radne snage; NIJE stvaran poslovni sustav niti stvarni podaci, isključivo edukativni/demonstracijski prikaz.
  - Trgovina (/trgovina/) — katalog usluga uz mogućnost zatražiti ponudu putem kontakt obrasca.
  - Objave, Analize i Komentari (/en/publications/, /en/analyses/, /en/commentary/) — autorski članci o financijama, tehnologiji i korporativnom upravljanju.
  - Projekti (/en/projects/) — devet razvojnih područja grupe (zdravstvo, sport, plaćanja, digitalna razmjena, zlatni digitalni instrument, sveučilište, hrana, industrija, energetska trgovina).
  - Group Network (/en/group-network/) — interaktivna karta 33 povezana društva i 12 lokacija.
- Kontakt: za konkretne upite korisnika uputi na kontakt obrazac na /contact/ (ili /en/contact/ za englesku verziju); nemoj sam navoditi privatne telefonske brojeve ili osobne e-mail adrese osim službenih odjelskih adresa ako se izravno pitaju (npr. office@gnk-asg.hr za opće upite).
Ako pitanje nije o GNK ASG-u, GNK DINAMO Ltd. grupi, Nerminu Sefiću ili gore navedenim temama i dijelovima portala, ljubazno reci da možeš pomoći samo s javnim korporativnim informacijama ovog portala. Nikad ne izmišljaj brojke, imena ili podatke koji nisu gore navedeni — ako ne znaš odgovor, uputi korisnika na kontakt obrazac. Jasno naznači kad je nešto ilustrativna simulacija (npr. Digital Workforce), a ne stvaran poslovni podatak. Odgovaraj na jeziku postavljenog pitanja (hrvatski ili engleski).`;

async function callOpenAI(env,message){
 const apiKey=env?.OPENAI_API_KEY;
 if(!apiKey)throw new Error('OPENAI_API_KEY not configured');
 const response=await fetch('https://api.openai.com/v1/chat/completions',{
  method:'POST',
  headers:{'content-type':'application/json',authorization:`Bearer ${apiKey}`},
  body:JSON.stringify({
   model:'gpt-4o-mini',
   max_tokens:220,
   temperature:0.3,
   messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:String(message).slice(0,600)}]
  })
 });
 if(!response.ok){const text=await response.text().catch(()=>'');throw new Error(`OpenAI ${response.status}: ${text.slice(0,200)}`)}
 const data=await response.json();
 const reply=data?.choices?.[0]?.message?.content?.trim();
 if(!reply)throw new Error('OpenAI empty reply');
 return reply;
}

export async function serveIntelligenceDeskChat(request,env){
 if(pathOf(request)===`${CHAT_PATH}/diagnostic`&&request.method==='GET'){
  const apiKey=env?.OPENAI_API_KEY;
  const diag={ok:true,version:VERSION,openaiKeyConfigured:Boolean(apiKey),kvConfigured:Boolean(store(env))};
  if(apiKey){
   try{
    const testReply=await callOpenAI(env,'test');
    diag.openaiCallSucceeded=true;
    diag.openaiTestReplyPreview=String(testReply).slice(0,80);
   }catch(error){
    diag.openaiCallSucceeded=false;
    diag.openaiError=String(error?.message||error).slice(0,300);
   }
  }
  return new Response(JSON.stringify(diag),{status:200,headers:{'content-type':'application/json','cache-control':'no-store'}});
 }
 if(pathOf(request)!==CHAT_PATH)return null;
 if(request.method!=='POST')return new Response(JSON.stringify({ok:false,error:'method_not_allowed'}),{status:405,headers:{'content-type':'application/json'}});
 let body;
 try{body=await request.json()}catch{return new Response(JSON.stringify({ok:false,error:'invalid_json'}),{status:400,headers:{'content-type':'application/json'}})}
 const message=String(body?.message||'').trim();
 if(!message)return new Response(JSON.stringify({ok:false,error:'empty_message'}),{status:400,headers:{'content-type':'application/json'}});
 const ip=request.headers.get('cf-connecting-ip')||'unknown';
 if(await rateLimited(env,ip)){
  return new Response(JSON.stringify({ok:false,error:'rate_limited',reply:null}),{status:429,headers:{'content-type':'application/json','x-gnk-desk-chat':VERSION}});
 }
 try{
  const reply=await callOpenAI(env,message);
  return new Response(JSON.stringify({ok:true,reply}),{status:200,headers:{'content-type':'application/json','x-gnk-desk-chat':VERSION}});
 }catch(error){
  return new Response(JSON.stringify({ok:false,error:'upstream_failed',reply:null,message:String(error?.message||error).slice(0,200)}),{status:502,headers:{'content-type':'application/json','x-gnk-desk-chat':VERSION}});
 }
}
