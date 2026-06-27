import app from './index-admin-hub-v23-aktual.js';
import {patchIndexActivation} from './index-activation-wrapper-v1.js';
export default {async fetch(request,env,ctx){const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';return patchIndexActivation(await app.fetch(request,env,ctx),path,request,env);},async scheduled(event,env,ctx){if(app.scheduled)return app.scheduled(event,env,ctx);},async email(message,env,ctx){if(app.email)return app.email(message,env,ctx);}};
