// GNK ASG — semantic SEO/entity guard.
// Idempotent FIX-ONCE policy pass that removes Person/author/image signals from
// pages whose visible content does not actually discuss Nermin Sefić.
// Organization/WebSite signals remain global. No INDEXED claims are emitted.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT='apps/portal';
const PERSON='Nermin Sefić';
const PERSON_ID='https://gnk-asg.hr/nermin-sefic/#person';
const ORG_ID='https://gnk-asg.hr/#organization';
const PERSON_OG='https://gnk-asg.hr/assets/people/nermin-sefic/og/nermin-sefic-01-official-desk-portrait.jpg';
const ORG_OG='https://gnk-asg.hr/assets/logo-gnk-asg-email.png';
const SKIP=new Set(['admin','admin-center','control','automation-status','webmail','mail-studio','campaign-mailer','email-status','worker-ops','operator-dashboard','digital-headquarters','media-registration-admin','podijeli','api','assets','data','__preview']);
const stats={scanned:0,relevant:0,irrelevant:0,authorRemoved:0,aboutRewritten:0,ogImageRewritten:0,twitterImageRewritten:0,filesChanged:0};

const stripNonVisible=s=>String(s||'')
  .replace(/<script\b[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
  .replace(/<noscript\b[\s\S]*?<\/noscript>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;|&#160;/gi,' ')
  .replace(/\s+/g,' ')
  .trim();

const isPersonRelevant=html=>{
  const title=stripNonVisible(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
  const main=stripNonVisible((html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)||[])[1]||'');
  const visible=`${title} ${main}`;
  return /\bNermin\s+Sefi[ćc]\b/i.test(visible)||/\bSefi[ćc]\s+Nermin\b/i.test(visible);
};

const pages=[];
(function walk(dir){
  for(const n of readdirSync(dir)){
    const p=join(dir,n); let st; try{st=statSync(p)}catch{continue}
    if(st.isDirectory()){
      const parts=relative(ROOT,p).split('/');
      if(parts[0]&&SKIP.has(parts[0]))continue;
      if(parts[0]==='en'&&parts[1]&&SKIP.has(parts[1]))continue;
      walk(p);
    } else if(n==='index.html') pages.push(p);
  }
})(ROOT);

for(const file of pages){
  stats.scanned++;
  let html=readFileSync(file,'utf8');
  const original=html;
  if(isPersonRelevant(html)){stats.relevant++;continue}
  stats.irrelevant++;

  // Do not claim Nermin Sefić as author on pages that do not discuss him.
  html=html.replace(/\s*<meta\s+name=["']author["']\s+content=["']Nermin Sefi[ćc]["']\s*\/?\s*>/gi,()=>{stats.authorRemoved++;return''});

  // Keep a truthful global Organization signal instead of a false Person about signal.
  const personIdEsc=PERSON_ID.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const aboutRe=new RegExp(`(["']about["']\\s*:\\s*\\{\\s*["']@id["']\\s*:\\s*["'])${personIdEsc}(["'])`,'gi');
  html=html.replace(aboutRe,(_m,a,b)=>{stats.aboutRewritten++;return`${a}${ORG_ID}${b}`});

  // Generic Person portrait must not become the representative social image of
  // unrelated pages. Use the organization asset instead.
  const personOgEsc=PERSON_OG.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const ogRe=new RegExp(`(<meta\\s+property=["']og:image["']\\s+content=["'])${personOgEsc}(["'])`,'gi');
  html=html.replace(ogRe,(_m,a,b)=>{stats.ogImageRewritten++;return`${a}${ORG_OG}${b}`});
  const twRe=new RegExp(`(<meta\\s+name=["']twitter:image["']\\s+content=["'])${personOgEsc}(["'])`,'gi');
  html=html.replace(twRe,(_m,a,b)=>{stats.twitterImageRewritten++;return`${a}${ORG_OG}${b}`});

  if(html!==original){writeFileSync(file,html);stats.filesChanged++}
}

console.log(JSON.stringify({policy:'semantic-entity-signals-v1',person:PERSON,...stats},null,2));
