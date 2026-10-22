#!/usr/bin/env node
// Optional public-source Exa research + AI journalist draft. No auto-publication.
import fs from 'node:fs';
import path from 'node:path';

const out=path.resolve('artifacts/worker-agent-swarm/research');
fs.mkdirSync(out,{recursive:true});
const state=(status,more={})=>{
 const obj={status,generatedAt:new Date().toISOString(),humanApproved:false,publicLive:false,...more};
 fs.writeFileSync(path.join(out,'status.json'),JSON.stringify(obj,null,2)+'\n');
 console.log(JSON.stringify(obj));
};
const exaKey=process.env.EXA_API_KEY||'';
const aiKey=process.env.OPENAI_API_KEY||'';
const model=process.env.SWARM_LLM_MODEL||'';
if(!exaKey||!aiKey||!model){
 state('not-configured',{missing:['EXA_API_KEY','OPENAI_API_KEY','SWARM_LLM_MODEL'].filter(x=>!process.env[x])});
 process.exit(0);
}
const topics=[
 'European business investment finance and capital markets',
 'Croatia technology AI regulation and innovation',
 'European energy industry infrastructure and supply chains',
 'digital governance cybersecurity and enterprise resilience'
];
const topic=topics[Math.floor(Date.now()/86400000)%topics.length];
const day=new Date().toISOString().slice(0,10);
const req=async(url,body,headers)=>{
 const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('upstream HTTP '+response.status+' ('+new URL(url).hostname+')');
 return response.json();
};
try{
 const search=await req('https://api.exa.ai/search',{query:'Recent official sources and credible analysis about '+topic+' relevant on '+day,type:'auto',numResults:6,contents:{highlights:true}},{'x-api-key':exaKey});
 const sources=(search.results||[]).filter(s=>/^https:\/\//.test(s.url||'')&&s.title).slice(0,6).map(s=>({
  title:String(s.title).slice(0,180),url:s.url,publishedDate:s.publishedDate||null,highlights:(s.highlights||[]).slice(0,2).map(v=>String(v).slice(0,350))
 }));
 if(sources.length<2){state('source-insufficient',{topic,sourceCount:sources.length});process.exit(0);}
 fs.writeFileSync(path.join(out,'sources.json'),JSON.stringify({topic,sources,origin:'Exa search: source documents still require independent validation'},null,2)+'\n');
 const instructions=[
  'Write an ORIGINAL Croatian-language analytical DRAFT for AKTUAL MEDIA based only on the supplied PUBLIC search excerpts.',
  'Search snippets are not proof. Attribute nontrivial claims to URLs; separate verified facts from analysis and unknowns.',
  'Do not invent quotes, people, statistics, court outcomes, financial figures, interviews or substantive human review.',
  'Never copy full copyrighted source text or imply original reporting where none was done.',
  'Aim at 500 to 800 words only if source material supports that length, otherwise be shorter.',
  'Include sections: title, sourced claims, analytical interpretation, necessary verification, clickable sources.',
  'Start with the notice: AI-potpomognuti nacrt — nije urednički odobren. Do not publish.'
 ].join(' ');
 const ai=await req('https://api.openai.com/v1/responses',{model,instructions,input:JSON.stringify({topic,sources}),max_output_tokens:2300},{authorization:'Bearer '+aiKey});
 const body=(ai.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text'&&typeof x.text==='string').map(x=>x.text).join('\n').trim();
 if(body.length<150)throw new Error('Empty or insufficient model output');
 fs.writeFileSync(path.join(out,'candidate.md'),'# HOLD — AI editorial candidate, no human review\n\n'+body+'\n\n---\nSources: sources.json. Do not auto-publish.\n');
 state('candidate-created-hold',{topic,sourceCount:sources.length,model,artifact:'research/candidate.md',requires:['independent source review','substantive human editorial approval','AI disclosure review','copyright and legal checks']});
}catch(error){
 state('research-error',{error:String(error?.message||error).slice(0,350)});
 process.exitCode=1;
}
