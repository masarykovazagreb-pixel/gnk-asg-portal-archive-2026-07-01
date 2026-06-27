import app from './index-admin-hub-v26-public-v10-base.js';

export const VERSION='GNK_ASG_PUBLIC_V14_CONTENT_MEDIA_APPLICATION_20260627';
const MARKET_PATHS=new Set(['/trzista','/markets']);
const EDITORIAL_PATHS=new Set(['/vijesti','/news','/objave']);
const MARKET_STYLE='<link rel="stylesheet" href="/assets/markets-v11.css?v=20260627-v11">';
const MARKET_SCRIPT='<script defer src="/assets/markets-v11.js?v=20260627-v11"></script>';
const EDITORIAL_STYLE='<link rel="stylesheet" href="/assets/editorial-v12.css?v=20260627-v12">';
const EDITORIAL_SCRIPT='<script defer src="/assets/editorial-v12.js?v=20260627-v12"></script>';
const CONTACT_STYLE='<link rel="stylesheet" href="/assets/contact-v13.css?v=20260627-v13">';
const CONTACT_SCRIPT='<script defer src="/assets/contact-v13.js?v=20260627-v13"></script>';
const MEDIA_STYLE='<link rel="stylesheet" href="/assets/media-kit-v13.css?v=20260627-v13">';
const MEDIA_SCRIPT='<script defer src="/assets/media-kit-v13.js?v=20260627-v13"></script>';
const APPLICATION_STYLE='<link rel="stylesheet" href="/assets/media-application-v14.css?v=20260627-v14">';
const APPLICATION_SCRIPT='<script defer src="/assets/media-application-v14.js?v=20260627-v14"></script>';
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function isEditorial(path){return EDITORIAL_PATHS.has(path)||path.startsWith('/vijesti/')||path.startsWith('/news/')||path.startsWith('/objave/')}
function patchHeaders(response){const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');return headers}
async function patch(response,path,request){
  const htmlResponse=request.method==='GET'&&response.ok&&String(response.headers.get('content-type')||'').includes('text/html');
  if(!htmlResponse)return response;
  const market=MARKET_PATHS.has(path),editorial=isEditorial(path),contact=path==='/contact',media=path==='/media-kit',application=path==='/media-application';
  if(!market&&!editorial&&!contact&&!media&&!application)return response;
  let html=await response.text();const headers=patchHeaders(response);
  if(market){if(!html.includes('markets-v11.css'))html=html.replace('</head>',MARKET_STYLE+'</head>');if(!html.includes('markets-v11.js'))html=html.replace('</body>',MARKET_SCRIPT+'</body>');headers.set('x-gnk-asg-markets-layout','UNIFIED_MARKETS_V11')}
  if(editorial){if(!html.includes('editorial-v12.css'))html=html.replace('</head>',EDITORIAL_STYLE+'</head>');if(!html.includes('editorial-v12.js'))html=html.replace('</body>',EDITORIAL_SCRIPT+'</body>');headers.set('x-gnk-asg-editorial-layout','UNIFIED_EDITORIAL_V12')}
  if(contact){if(!html.includes('contact-v13.css'))html=html.replace('</head>',CONTACT_STYLE+'</head>');if(!html.includes('contact-v13.js'))html=html.replace('</body>',CONTACT_SCRIPT+'</body>');headers.set('x-gnk-asg-contact-layout','UNIFIED_CONTACT_V13')}
  if(media){if(!html.includes('media-kit-v13.css'))html=html.replace('</head>',MEDIA_STYLE+'</head>');if(!html.includes('media-kit-v13.js'))html=html.replace('</body>',MEDIA_SCRIPT+'</body>');headers.set('x-gnk-asg-media-kit-layout','UNIFIED_MEDIA_KIT_V13')}
  if(application){if(!html.includes('media-application-v14.css'))html=html.replace('</head>',APPLICATION_STYLE+'</head>');if(!html.includes('media-application-v14.js'))html=html.replace('</body>',APPLICATION_SCRIPT+'</body>');headers.set('x-gnk-asg-media-application-layout','UNIFIED_MEDIA_APPLICATION_V14')}
  headers.set('x-gnk-asg-public-release',VERSION);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
export default{
  async fetch(request,env,ctx){return patch(await app.fetch(request,env,ctx),pathOf(request),request)},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
