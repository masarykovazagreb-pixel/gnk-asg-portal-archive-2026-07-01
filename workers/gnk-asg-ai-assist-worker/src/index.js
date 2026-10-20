const H={
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store",
  "access-control-allow-origin":"https://gnk-asg.hr",
  "access-control-allow-methods":"GET,POST,OPTIONS",
  "access-control-allow-headers":"content-type,authorization,x-gnk-asg-token"
};

const MODELS=[
  "@cf/zai-org/glm-4.7-flash",
  "@cf/google/gemma-4-26b-a4b-it",
  "@cf/moonshotai/kimi-k2.6"
];

function J(x,s=200){return new Response(JSON.stringify(x,null,2),{status:s,headers:H})}
function clean(x){return String(x||"").trim()}
function output(x){
  if(!x)return "";
  if(typeof x==="string")return x;
  if(x.response)return String(x.response);
  if(x.result&&typeof x.result==="string")return x.result;
  if(x.result&&x.result.response)return String(x.result.response);
  if(x.choices&&x.choices[0]&&x.choices[0].message&&x.choices[0].message.content)return String(x.choices[0].message.content);
  if(x.output_text)return String(x.output_text);
  return "";
}

function fallback(task,text,style,lang){
  if(task==="auto_reply"){
    return "Poštovani,\n\nhvala na Vašoj poruci. Potvrđujemo da je Vaš upit zaprimljen u sustavu GNK ASG. Nakon interne obrade, odgovor ćemo Vam dostaviti pisanim putem u najkraćem razumnom roku.\n\nSrdačan pozdrav,\nGNK ASG";
  }
  if(style==="legal"){
    return "Poštovani,\n\nvezano uz Vašu poruku, potvrđujemo primitak te ćemo navode razmotriti u okviru dostupne dokumentacije i nadležnosti GNK ASG d.o.o.\n\n"+clean(text)+"\n\nSva prava i pravni interesi GNK ASG d.o.o. ostaju pridržani.\n\nSrdačan pozdrav,\nGNK ASG";
  }
  if(style==="media"){
    return "Poštovani,\n\nhvala na medijskom upitu. Molimo da sva dodatna pitanja i rokove dostavite pisanim putem kako bismo mogli pripremiti cjelovit odgovor.\n\nSrdačan pozdrav,\nGNK ASG";
  }
  return "Poštovani,\n\nzahvaljujemo na Vašoj poruci te potvrđujemo da smo je uredno zaprimili.\n\n"+clean(text)+"\n\nSrdačan pozdrav,\nGNK ASG";
}

async function runAi(env,prompt,system){
  const errors=[];
  for(const model of MODELS){
    try{
      const r=await env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:prompt}]});
      const t=output(r).trim();
      if(t)return {ok:true,model,text:t,raw:r};
      errors.push({model,error:"empty_response"});
    }catch(e1){
      try{
        const r2=await env.AI.run(model,{prompt:system+"\n\n"+prompt});
        const t2=output(r2).trim();
        if(t2)return {ok:true,model,text:t2,raw:r2};
        errors.push({model,error:"empty_response_prompt"});
      }catch(e2){
        errors.push({model,error:e2.message||e1.message||String(e2)});
      }
    }
  }
  return {ok:false,errors};
}


/**
 * Public GNK ASG S+Chat endpoint; separate from the legacy Mail Studio
 * text-improvement workflow. No client-provided system instructions or credentials.
 * IMPORTANT: deployment requires the existing Cloudflare AI binding and rate limits.
 */
async function splusChat(request,env){
  if(request.method==="GET")return J({ok:true,service:"GNK ASG S+Chat",aiReady:!!(env.AI&&typeof env.AI.run==="function"),endpoint:"/api/ai-assist/chat",methods:["GET","POST"]});
  if(request.method!=="POST")return J({ok:false,error:"method_not_allowed"},405);
  const origin=request.headers.get("origin");
  if(origin&&origin!=="https://gnk-asg.hr")return J({ok:false,error:"origin_not_allowed"},403);
  if(!/^application\/json\b/i.test(request.headers.get("content-type")||""))return J({ok:false,error:"json_required"},415);
  if(Number(request.headers.get("content-length")||0)>20000)return J({ok:false,error:"payload_too_large"},413);
  if(!env.AI||typeof env.AI.run!=="function")return J({ok:false,ai:false,error:"ai_service_unavailable"},503);
  let body;
  try{body=await request.json()}catch{return J({ok:false,error:"invalid_json"},400)}
  const input=body?.messages;
  if(!Array.isArray(input)||!input.length||input.length>12)return J({ok:false,error:"invalid_messages"},400);
  if(input.some(m=>!m||(m.role!=="user"&&m.role!=="assistant")||typeof m.content!=="string"||!m.content.trim()||m.content.length>5000))return J({ok:false,error:"invalid_message"},400);
  if(input.at(-1).role!=="user"||input.reduce((n,m)=>n+m.content.length,0)>12000)return J({ok:false,error:"invalid_conversation"},400);
  const language={auto:"Odgovori na jeziku zadnje korisnikove poruke.",hr:"Odgovaraj hrvatskim standardnim jezikom.",en:"Answer in English."}[body?.language]||"Odgovori na jeziku zadnje korisnikove poruke.";
  const style={short:"Odgovaraj sažeto.",balanced:"Prilagodi duljinu upitu.",detailed:"Odgovori detaljno, strukturirano i jasno."}[body?.style]||"Prilagodi duljinu upitu.";
  const system="Ti si GNK ASG S+Chat, AI asistent javnog portala GNK ASG d.o.o. Ovaj razgovor generira AI, bez predstavljanja kao ljudska osoba ili osobni stav Nermina Sefića. Ne izmišljaj izvore niti pristup internim podacima, e-pošti, alatima ili dokumentima. Nemoj tvrditi da si izvršio radnje, objavu, plaćanje ili poslao poruku. Za visoko rizična pravna, financijska i zdravstvena pitanja jasno naznači ograničenja. Ako nema provjerenih aktualnih podataka reci da nisu potvrđeni. "+language+" "+style;
  const messages=[{role:"system",content:system},...input.map(m=>({role:m.role,content:m.content.trim()}))];
  const models=MODELS.slice(0,2),errors=[];
  for(const model of models){
    try{
      const result=await env.AI.run(model,{messages,max_tokens:1024});
      const answer=output(result).trim();
      if(answer)return J({ok:true,ai:true,model,text:answer,disclosure:"AI-generated response"});
      errors.push(model+":empty");
    }catch(error){errors.push(model+":unavailable")}
  }
  return J({ok:false,ai:false,error:"ai_model_unavailable",retryable:true},503);
}

export default{
  async fetch(request,env){
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:H});
    if(new URL(request.url).pathname==="/api/ai-assist/chat")return splusChat(request,env);

    if(request.method==="GET"){
      return J({
        ok:true,
        service:"GNK ASG AI Assist",
        endpoint:"/api/ai-assist",
        method:"POST",
        aiBinding:!!env.AI,
        models:MODELS,
        freeMode:"Cloudflare Workers AI",
        fallback:true,
        time:new Date().toISOString()
      });
    }

    if(request.method!=="POST")return J({ok:false,error:"method_not_allowed"},405);

    try{
      const b=await request.json();
      const task=clean(b.task||"improve_email");
      const style=clean(b.style||"corporate");
      const lang=clean(b.lang||"hr");
      const subject=clean(b.subject||"");
      const text=clean(b.text||b.body||"");
      const context=clean(b.context||"GNK ASG Mail Studio");

      const langNames={hr:"hrvatski standardni jezik, latinicu i dijakritičke znakove",en:"English",de:"Deutsch",zh:"简体中文"};
      const langName=langNames[lang]||langNames.en;
      const system="Ti si IT – Osobni digitalni asistent za GNK ASG d.o.o. Piši profesionalno, jasno, poslovno i oprezno. Odgovori isključivo na sljedećem jeziku: "+langName+". Ne izmišljaj činjenice. Ne predstavljaj pravni ili financijski savjet kao konačan savjet.";
      const prompt=[
        "Zadatak: "+task,
        "Stil: "+style,
        "Predmet: "+subject,
        "Kontekst: "+context,
        "",
        "Tekst korisnika:",
        text,
        "",
        "Vrati samo gotov tekst koji se može zalijepiti u e-mail. Bez objašnjenja."
      ].join("\n");

      if(env.AI&&typeof env.AI.run==="function"){
        const ai=await runAi(env,prompt,system);
        if(ai.ok)return J({ok:true,ai:true,provider:"cloudflare-workers-ai",model:ai.model,text:ai.text});
        return J({ok:true,ai:false,fallback:true,text:fallback(task,text,style,lang),errors:ai.errors});
      }

      return J({ok:true,ai:false,fallback:true,text:fallback(task,text,style,lang),error:"AI binding missing"});
    }catch(e){
      return J({ok:false,error:e.message||String(e)},500);
    }
  }
};