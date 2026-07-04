import * as base from './mail-studio-extension-v3.js';
import {handleMailSyncCenter,VERSION as MAIL_SYNC_VERSION} from './mail-sync-center-v2.js';

export const VERSION=`GNK_ASG_MAIL_STUDIO_EXTENSION_V12_20260704_SYNC_UI_${MAIL_SYNC_VERSION}_${base.VERSION}`;
export const UI_VERSION=base.UI_VERSION;
export const PROFILES=base.PROFILES;
export const GLOBAL_CENTRES=base.GLOBAL_CENTRES;
export const normalizeMailStudioSignature=base.normalizeMailStudioSignature;

const PUBLIC_PREFIX='/api/mail-center/sync';
const INTERNAL_PREFIX='/api/mail-sync';
const UI_SCRIPT='/assets/mail-sync-center-ui-v1.js?v=20260704-1';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
function stamp(response){if(!response)return response;const headers=new Headers(response.headers);headers.set('x-gnk-asg-mail-studio-extension',VERSION);headers.set('x-gnk-asg-mail-sync',MAIL_SYNC_VERSION);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
function mappedRequest(request){const url=new URL(request.url);url.pathname=url.pathname.replace(PUBLIC_PREFIX,INTERNAL_PREFIX);return new Request(url,request);}
async function injectUi(request,response){const path=pathOf(request),type=String(response?.headers?.get('content-type')||'').toLowerCase();if(!(path==='/mail-studio'||path.startsWith('/mail-studio/')||path==='/mail-studio-pro'||path.startsWith('/mail-studio-pro/'))||!type.includes('text/html'))return response;let html=await response.text();const tag=`<script id="gnk-mail-sync-center-ui" defer src="${UI_SCRIPT}"></script>`;if(!html.includes('gnk-mail-sync-center-ui'))html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,`${tag}</body>`):`${html}${tag}`;const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');return new Response(html,{status:response.status,statusText:response.statusText,headers});}
export async function handleMailStudioExtension(request,env,ctx,app){if(pathOf(request).startsWith(PUBLIC_PREFIX))return stamp(await handleMailSyncCenter(mappedRequest(request),env));return stamp(await base.handleMailStudioExtension(request,env,ctx,app));}
export async function patchMailStudioResponse(request,response){return stamp(await injectUi(request,await base.patchMailStudioResponse(request,response)));}
export async function handleMailStudioInbound(message,env,ctx){return base.handleMailStudioInbound(message,env,ctx);}
export const __test={mappedRequest};
