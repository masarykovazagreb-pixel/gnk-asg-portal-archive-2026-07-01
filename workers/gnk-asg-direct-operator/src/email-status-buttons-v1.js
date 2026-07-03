export const VERSION='GNK_ASG_EMAIL_TOOLS_HUB_V4_20260703_CSP_SAFE';
const SCRIPT='/assets/email-tools-hub-v4.js?v=20260703-1';
const APPS=[
 {prefix:'/mail-studio-pro',source:'mail-studio',name:'Mail Studio Pro'},
 {prefix:'/mail-studio',source:'mail-studio',name:'Mail Studio'},
 {prefix:'/webmail',source:'mail-studio',name:'Webmail'},
 {prefix:'/campaign-mailer',source:'campaign-mailer',name:'Campaign Mailer'},
 {prefix:'/media-command-center',source:'media-center',name:'Media Command Center'},
 {prefix:'/media-registration-admin',source:'media-center',name:'Media Registration'},
 {prefix:'/admin-center',source:'',name:'Admin Center'},
 {prefix:'/operator-dashboard',source:'',name:'Operator Dashboard'},
 {prefix:'/operator-mobile',source:'',name:'Operator Mobile'},
 {prefix:'/auto-editor',source:'',name:'Auto Editor'},
 {prefix:'/news-admin',source:'',name:'News Admin'},
 {prefix:'/pdf-publisher',source:'',name:'PDF Publisher'},
 {prefix:'/social-share',source:'',name:'Social Share'},
 {prefix:'/wa-center',source:'',name:'WA Center'},
 {prefix:'/review',source:'',name:'Review'},
 {prefix:'/control',source:'',name:'Control'}
];
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const appFor=path=>APPS.find(app=>path===app.prefix||path.startsWith(`${app.prefix}/`));
const escapeAttribute=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const scriptTag=app=>`<script id="gnk-email-tools-hub-v4" src="${SCRIPT}" data-gnk-email-tools="1" data-source="${escapeAttribute(app.source)}" data-app="${escapeAttribute(app.name)}" defer></script>`;
export async function addEmailStatusButtons(request,response){
 if(!response||!['GET','HEAD'].includes(request.method))return response;
 const app=appFor(pathOf(request));
 const contentType=String(response.headers?.get?.('content-type')||'').toLowerCase();
 if(!app||!contentType.includes('text/html'))return response;
 let html=await response.text();
 if(!html.includes('gnk-email-tools-hub-v4'))html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,`${scriptTag(app)}</body>`):`${html}${scriptTag(app)}`;
 const headers=new Headers(response.headers);
 headers.delete('content-length');headers.delete('content-encoding');
 headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
 headers.set('x-gnk-asg-email-status-buttons',VERSION);
 return new Response(request.method==='HEAD'?null:html,{status:response.status,statusText:response.statusText,headers});
}
