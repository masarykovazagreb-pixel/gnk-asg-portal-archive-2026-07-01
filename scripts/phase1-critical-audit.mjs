import fs from 'node:fs/promises';
import path from 'node:path';

const config = JSON.parse(await fs.readFile('config/phase1-critical-checks.json','utf8'));
const bases = { preview:config.previewBase, live:config.liveBase, publish:config.publishBase };
const out = path.resolve('reports/phase1-critical-audit');
await fs.mkdir(out,{recursive:true});

function compact(value,limit=260){return String(value||'').replace(/\s+/g,' ').trim().slice(0,limit)}

async function inspect(check){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),12000);
  const url = new URL(check.path,bases[check.base]).href;
  const startedAt = Date.now();
  try{
    const response = await fetch(url,{redirect:'follow',cache:'no-store',signal:controller.signal,headers:{'user-agent':'GNK-ASG-Phase1-Audit/1.0','accept':'application/json,text/html;q=0.9,*/*;q=0.8'}});
    const text = await response.text();
    let parsed = null; try{parsed=JSON.parse(text)}catch{}
    const type = response.headers.get('content-type')||'';
    const html = type.includes('html')||/<!doctype html|<html/i.test(text);
    const json = Boolean(parsed)||type.includes('json');
    const statusOk = check.expected.includes(response.status);
    const contentOk = check.kind==='html'?html:check.kind==='json'?json:check.kind==='protected'?statusOk:true;
    return {...check,url,status:response.status,ok:statusOk&&contentOk,durationMs:Date.now()-startedAt,contentType:type,snippet:compact(text)};
  }catch(error){
    return {...check,url,status:0,ok:false,durationMs:Date.now()-startedAt,error:error?.name==='AbortError'?'timeout':String(error?.message||error)};
  }finally{clearTimeout(timer)}
}

const results=[];
for(const check of config.checks){const result=await inspect(check);results.push(result);console.log(`${result.ok?'OK':'FAIL'} ${result.status||'-'} ${result.name}`)}
const report={generatedAt:new Date().toISOString(),readOnly:true,productionWrites:false,total:results.length,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results};
await fs.writeFile(path.join(out,'phase1-critical-audit.json'),JSON.stringify(report,null,2));
const rows=results.map(x=>`| ${x.ok?'OK':'FAIL'} | ${x.status||'-'} | ${x.name} | ${x.durationMs} ms | ${x.error||x.contentType||''} |`).join('\n');
const markdown=`# GNK ASG Phase 1 Critical Audit\n\n- Read-only: YES\n- Production writes: NO\n- Total: ${report.total}\n- Passed: ${report.passed}\n- Failed: ${report.failed}\n\n| Result | HTTP | Check | Time | Detail |\n|---|---:|---|---:|---|\n${rows}\n`;
await fs.writeFile(path.join(out,'phase1-critical-audit.md'),markdown);
if(report.failed)process.exitCode=1;
