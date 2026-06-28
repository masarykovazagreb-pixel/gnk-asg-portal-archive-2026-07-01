export const VERSION='GNK_ASG_MEDIA_REGISTRATION_FINAL_CONFIG_V1_20260629';
const CONFIG_KEY='media-registration:config:v1';
const CAMPAIGN_KEY='media-command-center:campaign:v1';
const DEADLINE='2026-07-10T21:59:59.000Z';
const PDF_KEY='media-registration/final/GNK_ASG_THE_CODE_KONACNI_PREGLED_HR_2026.pdf';
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const bucketOf=env=>env.GNK_ASG_MEDIA_ASSETS||null;
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
function response(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-final-config':VERSION}});}
async function read(kv,key,fallback={}){try{const value=await kv.get(key);return value?JSON.parse(value):fallback}catch{return fallback}}
async function getStatus(env){const kv=kvOf(env);if(!kv)return{ok:false,error:'KV_binding_missing'};const config=await read(kv,CONFIG_KEY,{}),campaign=await read(kv,CAMPAIGN_KEY,{});let pdfAvailable=false,pdfSizeBytes=0;const bucket=bucketOf(env),pdfKey=campaign.pdfR2Key||PDF_KEY;if(bucket?.head){const head=await bucket.head(pdfKey);pdfAvailable=Boolean(head);pdfSizeBytes=Number(head?.size||0)}return{ok:true,version:VERSION,config,campaign,pdfAvailable,pdfKey,pdfSizeBytes};}
async function apply(env){const kv=kvOf(env);if(!kv)return response({ok:false,error:'KV_binding_missing'},503);const current=await read(kv,CONFIG_KEY,{});const next={...current,deadline:DEADLINE,applicationUrl:'https://gnk-asg.hr/media-application/',applicationEmail:'media@gnk-asg.hr',fromName:'GNK ASG Media Relations | London, UK',fromLocation:'London, United Kingdom',requirePdf:true,hotelStandard:'5-star',hotelPackage:'all-inclusive',participationFee:'0.00 EUR',applicationFee:'0.00 EUR',accreditationFee:'0.00 EUR',invitedNewsrooms:'150+',operationalMediaCount:239,countriesAndMarkets:60,newsAgencyCount:12,aiSupportInformationalOnly:true,updatedAt:new Date().toISOString()};await kv.put(CONFIG_KEY,JSON.stringify(next,null,2));return response({ok:true,config:next});}
export async function handleFinalMediaConfig(request,env){const path=pathOf(request);if(request.method==='GET'&&path==='/api/media-registration-admin/final-status')return response(await getStatus(env));if(request.method==='POST'&&path==='/api/media-registration-admin/final-config')return apply(env);return null;}
