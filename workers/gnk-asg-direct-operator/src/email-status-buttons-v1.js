export const VERSION='GNK_ASG_EMAIL_STATUS_BUTTONS_V1_20260703';

const APPS=[
  {prefix:'/mail-studio-pro',source:'mail-studio',name:'Mail Studio Pro'},
  {prefix:'/mail-studio',source:'mail-studio',name:'Mail Studio'},
  {prefix:'/webmail',source:'mail-studio',name:'Webmail'},
  {prefix:'/campaign-mailer',source:'campaign-mailer',name:'Campaign Mailer'},
  {prefix:'/media-command-center',source:'media-center',name:'Media Command Center'},
  {prefix:'/admin-center',source:'',name:'Admin Center'},
  {prefix:'/operator-dashboard',source:'',name:'Operator Dashboard'},
  {prefix:'/operator-mobile',source:'',name:'Operator Mobile'},
  {prefix:'/auto-editor',source:'',name:'Auto Editor'},
  {prefix:'/news-admin',source:'',name:'News Admin'},
  {prefix:'/pdf-publisher',source:'',name:'PDF Publisher'},
  {prefix:'/social-share',source:'',name:'Social Share'},
  {prefix:'/wa-center',source:'',name:'WA Center'},
  {prefix:'/review',source:'',name:'Review'},
  {prefix:'/control',source:'',name:'Control'},
  {prefix:'/automation-status',source:'',name:'Automation Status'}
];

const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const matchApp=path=>APPS.find(app=>path===app.prefix||path.startsWith(`${app.prefix}/`));

function scriptFor(app){
  const source=JSON.stringify(app.source||'');
  const name=JSON.stringify(app.name||'Aplikacija');
  return `<script id="gnk-email-status-buttons-v1">(()=>{if(document.querySelector('[data-gnk-email-status-buttons]'))return;const source=${source},appName=${name};const current=location.pathname+location.search;const box=document.createElement('nav');box.dataset.gnkEmailStatusButtons='1';box.setAttribute('aria-label','Status email poruka');box.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483000;display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end;max-width:min(92vw,620px);font-family:Arial,sans-serif';const link=(label,href,primary)=>{const a=document.createElement('a');a.href=href;a.textContent=label;a.title=primary?('Prikaži poruke poslane iz '+appName):'Prikaži poruke iz svih sustava';a.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:11px 15px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:.01em;box-shadow:0 10px 28px rgba(15,23,42,.28);border:1px solid '+(primary?'#d6b657':'rgba(255,255,255,.28)')+';background:'+(primary?'#d6b657':'#111827')+';color:'+(primary?'#07101d':'#fff')+';white-space:nowrap';return a};if(source){box.appendChild(link('Provjeri status ove aplikacije','/email-status?source='+encodeURIComponent(source)+'&from='+encodeURIComponent(current),true))}box.appendChild(link('Svi email statusi','/email-status?source=all&from='+encodeURIComponent(current),!source));document.body.appendChild(box)})();</script>`;
}

export async function addEmailStatusButtons(request,response){
  if(!response||!['GET','HEAD'].includes(request.method))return response;
  const app=matchApp(pathOf(request));
  const type=String(response.headers?.get?.('content-type')||'').toLowerCase();
  if(!app||!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('gnk-email-status-buttons-v1')){
    const script=scriptFor(app);
    html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,`${script}</body>`):`${html}${script}`;
  }
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-email-status-buttons',VERSION);
  return new Response(request.method==='HEAD'?null:html,{status:response.status,statusText:response.statusText,headers});
}
