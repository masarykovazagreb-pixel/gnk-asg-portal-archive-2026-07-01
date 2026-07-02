import app,{VERSION as BASE_VERSION} from './index-final-admin-gateway-projects-v1.js';
import {withEnglishGreetingGuard,VERSION as GREETING_VERSION} from './media-outreach-english-guard-v1.js';
import {withEnglishEmailMetadata,VERSION as METADATA_VERSION} from './email-english-metadata-guard-v1.js';
import {isCampaignMailer,serveCampaignMailer,authorizeCampaignMailer,addCampaignMailerLink,VERSION as SHELL_VERSION} from './campaign-mailer-shell-v2.js';
import {handleCampaignMailer,runQueue,recordInbound,VERSION as CAMPAIGN_VERSION} from './campaign-mailer-v2.js';
import {isCampaignMailerApi} from './campaign-mailer-v1.js';
import {isTransparentMediaLogo,serveTransparentMediaLogo,VERSION as LOGO_VERSION} from './media-email-logo-transparent-v1.js';
import {addBackendContactMenuLink,VERSION as CONTACT_MENU_VERSION} from './contact-menu-backend-v1.js';
import {handleMediaRegistrationPublic,VERSION as REGISTRATION_VERSION} from './media-registration-post-code-v2.js';
import {handleMediaBootstrapPdfForwardFix,VERSION as PDF_FORWARD_FIX_VERSION} from './media-bootstrap-pdf-forward-fix-v1.js';
import {handlePublicTheCodePdf,VERSION as PUBLIC_THE_CODE_PDF_VERSION} from './public-the-code-pdf-v1.js';
import {handleMailStudioExtension,patchMailStudioResponse,handleMailStudioInbound,VERSION as MAIL_STUDIO_VERSION} from './mail-studio-extension-v2.js';
const PUBLICATION_ROUTE_VERSION='GNK_ASG_STATIC_PUBLICATION_ROUTE_V1_20260702';
export const VERSION=`${BASE_VERSION}_${GREETING_VERSION}_${METADATA_VERSION}_${SHELL_VERSION}_${CAMPAIGN_VERSION}_${LOGO_VERSION}_${CONTACT_MENU_VERSION}_${REGISTRATION_VERSION}_${PDF_FORWARD_FIX_VERSION}_${PUBLIC_THE_CODE_PDF_VERSION}_${MAIL_STUDIO_VERSION}_${PUBLICATION_ROUTE_VERSION}`;
const protectedEnv=env=>withEnglishEmailMetadata(withEnglishGreetingGuard(env));
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const clean=value=>String(value??'').trim();
const inboundAddress=(message,name)=>{try{return clean(message?.headers?.get?.(name));}catch{return'';}};
const address=value=>{const raw=clean(value),match=raw.match(/<([^>]+)>/);return clean(match?.[1]||raw).toLowerCase();};
const isMediaInbound=message=>address(message?.to||inboundAddress(message,'to'))==='media@gnk-asg.hr';
const isPublicRegistration=path=>path==='/media-application'||path.startsWith('/media-application/')||path==='/api/media-registration'||path.startsWith('/api/media-registration/');
const isStaticPublication=path=>(path.startsWith('/objave/')&&path!=='/objave')||(path.startsWith('/publications/')&&path!=='/publications');
const denied=()=>new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const stampRegistration=response=>{const headers=new Headers(response.headers);headers.set('x-gnk-asg-media-registration',REGISTRATION_VERSION);headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});};
async function serveStaticPublication(request,env,path){
 if(!['GET','HEAD'].includes(request.method)||!env.ASSETS?.fetch||!isStaticPublication(path))return null;
 const target=new URL(request.url);target.pathname=`${path}/index.html`;target.search='';
 const response=await env.ASSETS.fetch(new Request(target,{method:request.method,headers:request.headers}));
 if(response.status===404)return null;
 const headers=new Headers(response.headers);headers.set('cache-control','public, max-age=300, stale-while-revalidate=3600');headers.set('x-gnk-asg-static-publication-route',PUBLICATION_ROUTE_VERSION);headers.set('x-content-type-options','nosniff');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export default{
 async fetch(request,env,ctx){
  const active=protectedEnv(env),path=pathOf(request);
  const publication=await serveStaticPublication(request,env,path);if(publication)return publication;
  const publicPdf=await handlePublicTheCodePdf(request,env);if(publicPdf)return publicPdf;
  if(isPublicRegistration(path)){const registration=await handleMediaRegistrationPublic(request,env);if(registration)return stampRegistration(registration)}
  if(isTransparentMediaLogo(path))return serveTransparentMediaLogo(request);
  if(isCampaignMailerApi(path)){if(!(await authorizeCampaignMailer(request,active,ctx,app)))return denied();return handleCampaignMailer(request,env,ctx)}
  if(isCampaignMailer(path))return serveCampaignMailer(request,active,ctx,app);
  const mailStudio=await handleMailStudioExtension(request,env,ctx,app);if(mailStudio)return mailStudio;
  const response=await app.fetch(request,active,ctx);
  const linked=await addCampaignMailerLink(request,response);
  const withContact=await addBackendContactMenuLink(request,linked);
  return patchMailStudioResponse(request,withContact);
 },
 scheduled(event,env,ctx){const active=protectedEnv(env),task=Promise.allSettled([runQueue(env),typeof app.scheduled==='function'?app.scheduled(event,active,ctx):Promise.resolve(null)]);if(ctx?.waitUntil){ctx.waitUntil(task);return}return task},
 async email(message,env,ctx){
  const active=protectedEnv(env);
  const fixed=await handleMediaBootstrapPdfForwardFix(message,active,ctx);if(fixed?.handled)return fixed;
  await recordInbound(message,env);
  const studio=await handleMailStudioInbound(message,env,ctx);if(studio?.handled)return studio;
  if(typeof app.email==='function')return app.email(message,isMediaInbound(message)?env:active,ctx);
 }
};