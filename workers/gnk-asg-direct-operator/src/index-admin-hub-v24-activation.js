import app from './index-admin-hub-v23-aktual.js';
import {patchIndexActivation} from './index-activation-wrapper-v1.js';

const MAP_FILM_STYLE='<link rel="stylesheet" href="/assets/index-map-film-v1.css?v=20260627-v1">';
const END_STATE_SCRIPT='<script id="gnk-activation-end-state">(()=>{const target=Date.parse("2026-10-07T15:30:00Z");const run=()=>{if(Date.now()<target)return;const status=document.querySelector("[data-activation-status]");if(status)status.textContent=document.documentElement.lang==="en"?"CODE ACTIVATED · NEW YORK · OCTOBER 7, 2026 · 11:30 AM ET":"KOD AKTIVIRAN · NEW YORK · 7.10.2026. · 11:30 ET"};run();setInterval(run,1000)})();</script>';

function normalize(path){return path.replace(/\/+$/,'')||'/';}
function mapBlock(english){return english
  ?'<div class="gnk-activation__map"><iframe title="GNK DINAMO Ltd. Group Global Network" src="/global-network-map-v1.html?lang=en" loading="eager" scrolling="no"></iframe><span class="gnk-activation__map-label">GLOBAL NETWORK · 33 EXISTING + 12 PLANNED</span></div>'
  :'<div class="gnk-activation__map"><iframe title="GNK DINAMO Ltd. Group Globalna mreža" src="/global-network-map-v1.html?lang=hr" loading="eager" scrolling="no"></iframe><span class="gnk-activation__map-label">GLOBALNA MREŽA · 33 POSTOJEĆE + 12 PLANIRANIH</span></div>';}
function filmBlock(english){return english
  ?'<section class="gnk-activation__film" aria-label="Reserved 60-second film area"><div class="gnk-activation__film-copy"><small>FILM · 60 SECONDS</small><h2>The next chapter of the story.</h2><p>The production area is ready for the final film based on the approved script, with Croatian and English narration, subtitles, music and visuals. Until publication, the space remains fully designed without leaving an empty gap.</p></div><div class="gnk-activation__film-screen"><span>SCRIPT · NARRATION · VISUALS · HR / EN</span></div></section>'
  :'<section class="gnk-activation__film" aria-label="Prostor za film od 60 sekundi"><div class="gnk-activation__film-copy"><small>FILM · 60 SEKUNDI</small><h2>Sljedeće poglavlje priče.</h2><p>Produkcijski prostor pripremljen je za završni film prema odobrenom tekstu, s hrvatskom i engleskom naracijom, titlovima, glazbom i vizualima. Do objave filma prostor ostaje potpuno oblikovan bez praznine na stranici.</p></div><div class="gnk-activation__film-screen"><span>SCENARIJ · NARACIJA · VIZUALI · HR / EN</span></div></section>';}

async function patchMapFilm(response,path,request){
  if(request.method!=='GET'||!['/','/en'].includes(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('x-gnk-asg-index-map-film','GNK_ASG_INDEX_MAP_FILM_V4_20260627');
  let body=await response.text();
  const english=path==='/en';
  if(!body.includes('index-map-film-v1.css'))body=body.replace('</head>',`${MAP_FILM_STYLE}</head>`);
  if(!body.includes('gnk-activation__map'))body=body.replace('<div class="gnk-activation__stage">',`${mapBlock(english)}<div class="gnk-activation__stage">`);
  if(!body.includes('gnk-activation__film'))body=body.replace('<div class="gnk-activation__status">',`${filmBlock(english)}<div class="gnk-activation__status">`);
  body=body
    .replace(/<link[^>]+index-mobile-code-launch-v1\.css[^>]*>/gi,'')
    .replace(/<a class="gnk-activation__code-open"[\s\S]*?<\/a>/gi,'')
    .replace(/<span class="gnk-activation__label">THE CODE<\/span>/gi,'');
  if(!body.includes('gnk-activation-end-state'))body=body.replace('</body>',`${END_STATE_SCRIPT}</body>`);
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){const path=normalize(new URL(request.url).pathname);let response=await app.fetch(request,env,ctx);response=await patchIndexActivation(response,path,request,env);return patchMapFilm(response,path,request);},
  async scheduled(event,env,ctx){if(app.scheduled)return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(app.email)return app.email(message,env,ctx);}
};
