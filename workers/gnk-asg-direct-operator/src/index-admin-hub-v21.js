import app from './index-media-command-center-v20.js';

const VERSION='GNK_ASG_ADMIN_HUB_V21_20260626_R2';
const MODULES=new Map([
  ['/operator-dashboard','operator'],
  ['/operator-mobile','mobile'],
  ['/mail-studio','mail'],
  ['/mail-studio-pro','mail'],
  ['/auto-editor','editor'],
  ['/news-admin','news'],
  ['/pdf-publisher','pdf'],
  ['/social-share','social'],
  ['/wa-center','whatsapp'],
  ['/review','overview'],
  ['/media-command-center','media']
]);

function redirect(location){
  return new Response(null,{status:303,headers:{location,'cache-control':'no-store','x-gnk-asg-admin-hub':VERSION}});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname.replace(/\/+$/,'')||'/';
    const embedded=url.searchParams.get('embedded')==='1'||url.searchParams.get('standalone')==='1';
    if((path==='/admin'||path==='/operator/session/login')&&['GET','HEAD','POST'].includes(request.method))return redirect('/admin-center/');
    if(MODULES.has(path)&&['GET','HEAD'].includes(request.method)&&!embedded){
      return redirect(`/admin-center/?module=${encodeURIComponent(MODULES.get(path))}`);
    }
    const response=await app.fetch(request,env,ctx);
    const headers=new Headers(response.headers);
    headers.set('x-gnk-asg-admin-hub',VERSION);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};