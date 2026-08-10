// GNK ASG — Telegraph mirror (4. kanal). Self-bootstrap račun; state na automation/blog-mirror-state.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const SITE='https://gnk-asg.hr';
const PER_RUN=parseInt(process.env.TELEGRAPH_PER_RUN||'12',10);
const PAUSE=parseInt(process.env.TELEGRAPH_PAUSE_MS||'4000',10);
const STATE='apps/portal/data/telegraph-content/published.json';
const ACCOUNT='apps/portal/data/telegraph-content/account.json';
const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const save=(p,o)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(o,null,2)+'\n')};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();

async function api(method, params){
  const r=await fetch(`https://api.telegra.ph/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)});
  const j=await r.json();
  if(!j.ok) throw new Error(`${method}: ${j.error}`);
  return j.result;
}

async function ensureAccount(){
  let acc=read(ACCOUNT,null);
  if(acc&&acc.access_token) return acc;
  acc=await api('createAccount',{short_name:'GNK ASG',author_name:'Nermin Sefić',author_url:`${SITE}/nermin-sefic/`});
  save(ACCOUNT,{access_token:acc.access_token,short_name:acc.short_name,createdAt:new Date().toISOString()});
  console.log('Telegraph account bootstrapped.');
  return read(ACCOUNT,null);
}

function toNodes(html, item){
  const bodyM=html.match(/<article[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/article>/i);
  const src=bodyM?bodyM[1]:html;
  const nodes=[];
  if(item.image) nodes.push({tag:'figure',children:[{tag:'img',attrs:{src:item.image}},{tag:'figcaption',children:['Nermin Sefić · GNK ASG']}]});
  nodes.push({tag:'p',children:[{tag:'strong',children:['Izvornik / Canonical: ']},{tag:'a',attrs:{href:item.url},children:[item.url]}]});
  const re=/<(h2|h3|h4|p|blockquote|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m,size=0;
  while((m=re.exec(src))){
    const text=strip(m[2]);
    if(!text||text.startsWith('#')&&text.split(' ').every(w=>w.startsWith('#'))) continue;
    const tag=m[1]==='h2'?'h3':(m[1]==='li'?'p':m[1]);
    size+=text.length; if(size>52000) break;
    nodes.push({tag,children:[text]});
  }
  const tags=(item.hashtags||[]).map(x=>'#'+x).join(' ');
  if(tags) nodes.push({tag:'p',children:[{tag:'em',children:[tags]}]});
  nodes.push({tag:'p',children:[{tag:'em',children:['Odobrio urednik: Nermin Sefić']}]});
  nodes.push({tag:'p',children:['Cijeli tekst: ',{tag:'a',attrs:{href:item.url},children:[item.url]}]});
  return nodes;
}

const registry=read('apps/portal/data/editorial-registry.json',{items:[]});
const state=read(STATE,{posted:{}});
const pending=(registry.items||[])
  .filter(x=>x&&x.path&&x.url&&!state.posted[x.path])
  .sort((a,b)=>new Date(a.publishedAt||0)-new Date(b.publishedAt||0))
  .slice(0,PER_RUN);
console.log(`Telegraph pending in this run: ${pending.length}`);
if(!pending.length){save(STATE,state);process.exit(0);}

const acc=await ensureAccount();
let ok=0,fail=0;
for(const item of pending){
  try{
    const file='apps/portal'+item.path.replace(/\/$/,'/index.html');
    const html=existsSync(file)?readFileSync(file,'utf8'):'';
    const page=await api('createPage',{
      access_token:acc.access_token,
      title:String(item.title||'GNK ASG').slice(0,250),
      author_name:'Nermin Sefić',
      author_url:`${SITE}/nermin-sefic/`,
      content:toNodes(html,item),
      return_content:false
    });
    state.posted[item.path]={url:page.url,at:new Date().toISOString()};
    ok++; console.log('OK', item.path, '->', page.url);
  }catch(e){ fail++; console.log('FAIL', item.path, String(e.message||e).slice(0,140)); }
  save(STATE,state);
  await sleep(PAUSE);
}
console.log(JSON.stringify({telegraph:{ok,fail,totalPosted:Object.keys(state.posted).length}}));
if(ok===0&&fail>0)process.exit(1);
