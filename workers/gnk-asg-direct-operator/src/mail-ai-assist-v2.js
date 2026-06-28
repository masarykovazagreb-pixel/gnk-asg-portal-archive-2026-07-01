export const VERSION='GNK_ASG_MAIL_AI_ASSIST_V2_MEDIA_20260628';
export const AI_PATH='/api/ai-assist';
export const DEFAULT_MODEL='@cf/meta/llama-3.1-8b-instruct-fast';

const clean=(value,max=12000)=>String(value??'').replace(/\u0000/g,'').trim().slice(0,max);
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
  'x-gnk-asg-mail-ai':VERSION
}});

function mediaRequest(data){
  const source=[data.task,data.style,data.tone,data.relation,data.context,data.subject].map(value=>clean(value,3000).toLowerCase()).join(' ');
  return /medij|media|press|novinar|journalist|redakc|interview|izjav|priopćen|press release/.test(source);
}

function systemPrompt(isMedia){
  const common=`Ti si interni GNK ASG asistent za pripremu poslovnih e-mailova. Piši standardnim hrvatskim jezikom, latinicom i pravilnim dijakritičkim znakovima. Vrati samo gotov tekst e-maila bez objašnjenja, naslova analize, markdown oznaka i potpisa. Potpis se dodaje zasebno u Mail Studiju. Ne izmišljaj činjenice, datume, brojke, izjave, ovlasti, pravne stavove ni obećanja. Ne navodi da je digitalni centar fizički ured; ako se centar spominje, nazovi ga digitalnim centrom zaprimanja. Ne priznaji odgovornost, dug, povredu ili obvezu ako to nije izričito dano u kontekstu. Jasno odvoji potvrđene činjenice od onoga što tek treba provjeriti. Zadrži profesionalan, ljudski i precizan ton.`;
  if(!isMedia)return `${common} Odgovor mora biti personaliziran prema primatelju, cilju i dostavljenom kontekstu. Izbjegavaj generičke fraze i prazna obećanja.`;
  return `${common} Ovo je medijski odgovor. Odgovori izravno i urednički čisto. Ako su u kontekstu navedena pitanja, odgovori na svako redom. Prva rečenica mora potvrditi primitak i, kada postoji, rok novinara. Zatim navedi provjerene činjenice kratkim odlomcima. Ne koristi promotivne superlative bez dokaza. Ne navodi povjerljive, osobne ili neodobrene informacije. Ako odgovor još nije konačan, precizno reci što se provjerava i kada se može očekivati potvrđena informacija, ali nemoj izmišljati rok. Završetak mora biti prikladan za objavu ili citiranje.`;
}

function userPrompt(data,isMedia){
  const task=clean(data.task,300);
  const subject=clean(data.subject,500);
  const text=clean(data.text,10000);
  const context=clean(data.context,12000);
  const recipient=clean(data.recipientName,300);
  const relation=clean(data.relation,500);
  const goal=clean(data.goal,1000);
  const tone=clean(data.tone||data.style,300);
  return [
    `Vrsta zadatka: ${task||'personalizirani odgovor'}`,
    `Vrsta komunikacije: ${isMedia?'medijski upit':'poslovni e-mail'}`,
    `Primatelj: ${recipient||'nije naveden'}`,
    `Odnos/predmet: ${relation||'nije naveden'}`,
    `Predmet e-maila: ${subject||'nije naveden'}`,
    `Cilj: ${goal||'pripremiti točan profesionalan odgovor'}`,
    `Ton: ${tone||'profesionalno i jasno'}`,
    `Postojeći tekst za doradu:\n${text||'(nema)'}`,
    `Kontekst i zaprimljena poruka:\n${context||'(nema)'}`,
    `Uputa: sastavi konačan tekst odgovora. Ne dodaj potpis.`
  ].join('\n\n');
}

function extractText(result){
  if(typeof result==='string')return clean(result);
  for(const candidate of [result?.response,result?.result?.response,result?.text,result?.output_text,result?.result?.text]){
    if(typeof candidate==='string'&&candidate.trim())return clean(candidate);
  }
  if(Array.isArray(result?.result)){
    const joined=result.result.map(item=>item?.text||item?.content||'').filter(Boolean).join('\n');
    if(joined.trim())return clean(joined);
  }
  return'';
}

function fallback(data,isMedia){
  const recipient=clean(data.recipientName,180);
  const greeting=recipient?`Poštovani/Poštovana ${recipient},`:'Poštovani,';
  const context=clean(data.context||data.text,1800);
  if(isMedia){
    return `${greeting}\n\nHvala na medijskom upitu. Potvrđujemo da je poruka zaprimljena i evidentirana za provjeru.\n\n${context?'Dostavljena pitanja i navedene činjenice provjerit ćemo prema raspoloživoj dokumentaciji. U odgovoru ćemo jasno odvojiti potvrđene informacije od podataka koji još nisu verificirani.\n\n':''}Molimo da se za objavu koristi isključivo pisani odgovor koji bude označen kao potvrđen od GNK ASG-a.\n\nSrdačan pozdrav,`;
  }
  return `${greeting}\n\nHvala na poruci. Potvrđujemo da je uredno zaprimljena i evidentirana.\n\n${context?'Dostavljeni kontekst razmotrit ćemo prema raspoloživoj dokumentaciji i odgovoriti na potvrđene činjenice bez pretpostavki.\n\n':''}Ako su za cjelovit odgovor potrebni dodatni podaci, zatražit ćemo ih pisanim putem.\n\nSrdačan pozdrav,`;
}

export async function handleMailAiAssist(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path!==AI_PATH)return null;
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  let data={};
  try{data=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const isMedia=mediaRequest(data);
  const model=clean(env.MAIL_AI_MODEL||env.AUTO_EDITOR_MODEL||DEFAULT_MODEL,300)||DEFAULT_MODEL;
  const prompt={
    messages:[
      {role:'system',content:systemPrompt(isMedia)},
      {role:'user',content:userPrompt(data,isMedia)}
    ],
    temperature:isMedia?0.18:0.28,
    max_tokens:isMedia?1400:1100
  };
  if(env.AI&&typeof env.AI.run==='function'){
    try{
      const result=await env.AI.run(model,prompt);
      const text=extractText(result);
      if(text)return json({ok:true,ai:true,model,text,mode:isMedia?'media':'business',version:VERSION});
    }catch(error){
      return json({ok:true,ai:false,model,text:fallback(data,isMedia),mode:isMedia?'media-fallback':'business-fallback',warning:clean(error?.message||error,500),version:VERSION});
    }
  }
  return json({ok:true,ai:false,model:'safe-fallback',text:fallback(data,isMedia),mode:isMedia?'media-fallback':'business-fallback',warning:'AI binding is not available.',version:VERSION});
}
