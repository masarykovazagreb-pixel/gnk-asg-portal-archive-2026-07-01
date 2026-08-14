export function canonicalHostRedirect(request){
  const url=new URL(request.url);
  if(url.hostname!=='www.gnk-asg.hr')return null;
  url.protocol='https:';
  url.hostname='gnk-asg.hr';
  url.port='';
  return new Response(null,{status:308,headers:{location:url.toString(),'cache-control':'public, max-age=3600'}});
}
