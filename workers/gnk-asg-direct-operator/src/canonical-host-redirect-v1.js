/**
 * Public canonical host policy.
 * - www host: preserve existing canonical redirect behavior.
 * - operator host: redirect ONLY public GET/HEAD pages; never mutate private
 *   dashboards, authenticated editors, API routes, POST actions or assets.
 */
export function canonicalHostRedirect(request){
  const url=new URL(request.url);
  if(url.hostname==='www.gnk-asg.hr'){
    url.protocol='https:';url.hostname='gnk-asg.hr';url.port='';
    return new Response(null,{status:308,headers:{location:url.toString(),'cache-control':'public, max-age=3600'}});
  }
  if(url.hostname!=='operator.gnk-asg.hr')return null;
  if(request.method!=='GET'&&request.method!=='HEAD')return null;
  const path=url.pathname;
  const publicContent=path==='/gnk-aktual'||path.startsWith('/gnk-aktual/')||
    path==='/aktual-media'||path.startsWith('/aktual-media/')||
    path==='/nermin-sefic'||path.startsWith('/nermin-sefic/')||
    path==='/kanal'||path.startsWith('/kanal/');
  const restricted=/(^|\/)(admin|editor|urednik|operator|dashboard|control|auth|api)(\/|$)/i.test(path);
  if(!publicContent||restricted)return null;
  url.protocol='https:';url.hostname='gnk-asg.hr';url.port='';
  return new Response(null,{status:308,headers:{location:url.toString(),'cache-control':'public, max-age=3600'}});
}
