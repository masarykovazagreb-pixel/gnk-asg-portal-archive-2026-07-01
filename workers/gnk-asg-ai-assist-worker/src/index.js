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

export default{
  async fetch(request,env){
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:H});

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

      const system="Ti si IT – Osobni digitalni asistent za GNK ASG d.o.o. Piši profesionalno, jasno, poslovno i oprezno. Koristi hrvatski standardni jezik, latinicu i dijakritičke znakove. Ne izmišljaj činjenice. Ne predstavljaj pravni ili financijski savjet kao konačan savjet.";
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