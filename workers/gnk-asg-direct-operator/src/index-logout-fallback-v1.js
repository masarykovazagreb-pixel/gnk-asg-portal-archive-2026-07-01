import app from './index-private-ui-assets-v1.js';

const COOKIE='gnk_asg_admin_session';

function logout(){
  return new Response(null,{
    status:303,
    headers:{
      location:'/mail-studio/',
      'cache-control':'no-store',
      'set-cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
    }
  });
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname.replace(/\/+$/,'')||'/';
    if(path==='/mail-studio'&&url.searchParams.get('logout')==='1')return logout();
    return app.fetch(request,env,ctx);
  },
  scheduled:(event,env,ctx)=>app.scheduled?.(event,env,ctx),
  email:(message,env,ctx)=>app.email?.(message,env,ctx)
};
