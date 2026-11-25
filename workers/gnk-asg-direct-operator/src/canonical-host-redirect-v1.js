// Consolidate only duplicate PUBLIC media pages; never redirect private controls or writes.
export function canonicalHostRedirect(request){
  const url=new URL(request.url);
  const publicRead=request.method==='GET'||request.method==='HEAD';
  if(url.hostname==='operator.gnk-asg.hr'){
    if(!publicRead || !/^\/(?:en\/)?(?:gnk-aktual|aktual-media|kanal)(?:\/|$)/.test(url.pathname))return null;
    // Protect nested operational routes even under a media prefix.
    if(/\/(?:admin(?:-center)?|control|api|editor|login|preview|drafts?)(?:\/|$)/i.test(url.pathname))return null;
  }else if(url.hostname!=='www.gnk-asg.hr')return null;
  url.protocol='https:';
  url.hostname='gnk-asg.hr';
  url.port='';
  return new Response(null,{status:308,headers:{location:url.toString(),'cache-control':'public, max-age=300'}});
}
