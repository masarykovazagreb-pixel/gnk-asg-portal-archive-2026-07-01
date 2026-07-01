import app,{VERSION as BASE_VERSION} from './index-final-admin-gateway-projects-v1.js';
import {withEnglishGreetingGuard,VERSION as GREETING_VERSION} from './media-outreach-english-guard-v1.js';
import {withEnglishEmailMetadata,VERSION as METADATA_VERSION} from './email-english-metadata-guard-v1.js';
import {isCampaignMailer,serveCampaignMailer,authorizeCampaignMailer,addCampaignMailerLink,VERSION as SHELL_VERSION} from './campaign-mailer-shell-v2.js';
import {handleCampaignMailer,runQueue,recordInbound,VERSION as CAMPAIGN_VERSION} from './campaign-mailer-v2.js';
import {isCampaignMailerApi} from './campaign-mailer-v1.js';
import {isTransparentMediaLogo,serveTransparentMediaLogo,VERSION as LOGO_VERSION} from './media-email-logo-transparent-v1.js';
import {addBackendContactMenuLink,VERSION as CONTACT_MENU_VERSION} from './contact-menu-backend-v1.js';
export const VERSION=`${BASE_VERSION}_${GREETING_VERSION}_${METADATA_VERSION}_${SHELL_VERSION}_${CAMPAIGN_VERSION}_${LOGO_VERSION}_${CONTACT_MENU_VERSION}`;
const protectedEnv=env=>withEnglishEmailMetadata(withEnglishGreetingGuard(env));
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const denied=()=>new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export default{
 async fetch(request,env,ctx){const active=protectedEnv(env),path=pathOf(request);if(isTransparentMediaLogo(path))return serveTransparentMediaLogo(request);if(isCampaignMailerApi(path)){if(!(await authorizeCampaignMailer(request,active,ctx,app)))return denied();return handleCampaignMailer(request,env,ctx)}if(isCampaignMailer(path))return serveCampaignMailer(request,active,ctx,app);const response=await addCampaignMailerLink(request,await app.fetch(request,active,ctx));return addBackendContactMenuLink(request,response)},
 scheduled(event,env,ctx){const active=protectedEnv(env),task=Promise.allSettled([runQueue(env),typeof app.scheduled==='function'?app.scheduled(event,active,ctx):Promise.resolve(null)]);if(ctx?.waitUntil){ctx.waitUntil(task);return}return task},
 async email(message,env,ctx){const active=protectedEnv(env);await recordInbound(message,env);if(typeof app.email==='function')return app.email(message,active,ctx)}
};
