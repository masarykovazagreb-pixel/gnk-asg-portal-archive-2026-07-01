import app,{VERSION as BASE_VERSION} from './index-media-command-center-v22.js';
import {handleMediaProjects,VERSION as PROJECTS_VERSION} from './media-projects-v1.js';
export const VERSION=`GNK_ASG_MEDIA_COMMAND_CENTER_WRAPPER_V23_PROJECTS_TO_${BASE_VERSION}`;
const API='/api/media-command-center';
const MEDIA_UI='/media-command-center';
const PROJECT_ENDPOINTS=new Set([
 `${API}/projects`,`${API}/project`,`${API}/project-contacts`,`${API}/project-html`,`${API}/project-pdf`,
 `${API}/project-html-preview`,`${API}/project-pdf-preview`,`${API}/project-settings`,`${API}/project-preview`,`${API}/project-export`
]);
const PROJECT_JS='<script src="/assets/media-projects-ui-v1.js?v=20260630-1" defer></script>';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
function stamp(response){const headers=new Headers(response.headers);headers.set('x-gnk-asg-media-command-wrapper-v23',VERSION);headers.set('x-gnk-asg-media-projects',PROJECTS_VERSION);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
async function protectedProjectEndpoint(request,env,ctx){const authProbe=await app.fetch(request.clone(),env,ctx);if(authProbe.status===401||authProbe.status===403)return stamp(authProbe);const response=await handleMediaProjects(request,env,ctx);return response?stamp(response):stamp(authProbe);}
async function injectProjectUi(response,path){if(path!==MEDIA_UI||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');let html=await response.text();html=html.replace(/<script[^>]+media-projects-ui-v1\.js[^>]*><\/script>/gi,'');html=html.includes('</body>')?html.replace('</body>',`${PROJECT_JS}</body>`):html+PROJECT_JS;return new Response(html,{status:response.status,statusText:response.statusText,headers});}
export default{
 async fetch(request,env,ctx){const path=pathOf(request);if(PROJECT_ENDPOINTS.has(path))return protectedProjectEndpoint(request,env,ctx);let response=await app.fetch(request,env,ctx);response=await injectProjectUi(response,path);if(path==='/data/portal-version.json'&&response.ok&&String(response.headers.get('content-type')||'').includes('application/json')){try{const payload=await response.clone().json();const headers=new Headers(response.headers);return stamp(new Response(JSON.stringify({...payload,mediaCommandWrapperV23:VERSION,mediaProjects:PROJECTS_VERSION},null,2),{status:response.status,headers}));}catch{}}return stamp(response);},
 async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
 async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
