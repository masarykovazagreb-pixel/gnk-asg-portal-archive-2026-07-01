// Canonical redirects: exact verified public paths, not a broad operator prefix.
// Preserve the pre-existing www host consolidation. Never redirect operator writes.
const PUBLIC_MEDIA_PATHS=new Set(["/gnk-aktual/","/gnk-aktual/mreza/","/gnk-aktual/izvori/","/gnk-aktual/tjedni/","/aktual-media/","/aktual-media/proizvodi/","/en/gnk-aktual/","/en/gnk-aktual/network/","/en/aktual-media/","/izdanja/","/kanal/"]);
export function canonicalHostRedirect(request){
 const url=new URL(request.url);
 const read=request.method==='GET'||request.method==='HEAD';
 const normalized=url.pathname.endsWith('/')?url.pathname:url.pathname+'/';
 const alias=normalized==='/prenos/'&&read&&['gnk-asg.hr','www.gnk-asg.hr','operator.gnk-asg.hr'].includes(url.hostname);
 if(alias)url.pathname='/gnk-aktual/';
 else if(url.hostname==='operator.gnk-asg.hr'){
  if(!read||!PUBLIC_MEDIA_PATHS.has(normalized))return null;
  url.pathname=normalized;
 }else if(url.hostname!=='www.gnk-asg.hr')return null;
 url.protocol='https:';url.hostname='gnk-asg.hr';url.port='';
 return new Response(null,{status:308,headers:{location:url.toString(),'cache-control':'public, max-age=300'}});
}
