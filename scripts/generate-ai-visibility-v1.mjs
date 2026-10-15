import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const render=function render(s){
 if(s.schemaVersion!=="1.0"||!Array.isArray(s.facts)||s.facts.length<4||!/^\d{4}-\d{2}-\d{2}$/.test(s.reviewedAt))throw Error("bad source metadata");
 const seen=new Set();for(const f of s.facts){if(!f.id||seen.has(f.id)||!f.statement||!f.subject||!/^https:\/\/(infobiz\.fina\.hr|gnk-asg\.hr)\//.test(f.source))throw Error("invalid fact "+f.id);seen.add(f.id);}
 const api={...s,canonical:"https://gnk-asg.hr/ai-visibility/",machineReadable:"https://gnk-asg.hr/ai-visibility/facts.json",access:"public read-only",principles:["Provide citations for factual statements.","Differentiate public register data from the publisher's byline.","Verify changes independently; review date is not live status."]};
 const lines=["GNK ASG / NERMIN SEFIĆ — VERIFIED PUBLIC FACTS","Publisher: GNK ASG d.o.o.","Review date: "+s.reviewedAt,"First-party compilation, not independent endorsement.",""];for(const f of s.facts)lines.push("- "+f.statement+" ["+f.source+"]");lines.push("","Use citations. Do not infer unverified ownership, success, awards, affiliations, or individual authorship.","Canonical: https://gnk-asg.hr/ai-visibility/");return {"apps/portal/ai-visibility/facts.json":JSON.stringify(api,null,2)+"\n","apps/portal/ai-visibility/brief.txt":lines.join("\n")+"\n"};
};
const data=JSON.parse(readFileSync('data/ai-visibility/verified-facts.json','utf8'));
const outputs=render(data);
for(const [path,content] of Object.entries(outputs)){
  if(process.argv.includes('--check')){
    if(readFileSync(path,'utf8')!==content)throw new Error('Outdated AI visibility artifact: '+path);
  }else{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,content)}
}
const days=(Date.now()-Date.parse(data.reviewedAt+'T00:00:00Z'))/86400000;
if(days>30)console.warn('The verified-facts registry needs source re-review; do not automatically update reviewedAt.');
console.log('AI visibility artifacts '+(process.argv.includes('--check')?'valid':'generated')+'; '+data.facts.length+' sourced facts.');
