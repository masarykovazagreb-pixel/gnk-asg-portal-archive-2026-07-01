export const VERSION='GNK_ASG_OPERATIONS_WRAPPER_V1_20260627';

class AdminHead {
  element(element){element.append('<link rel="stylesheet" href="/assets/admin-operations-v1.css?v=20260627">',{html:true});}
}
class AdminBody {
  element(element){element.append('<script defer src="/assets/admin-operations-v1.js?v=20260627"></script>',{html:true});}
}
class MediaHero {
  element(element){element.prepend('<a class="mcc-kit-link" href="/media-kit-2026/" target="_blank" rel="noopener">MEDIA KIT CENTER 2026</a>',{html:true});}
}

export function patchOperations(response,path){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  if(path==='/admin-center')return new HTMLRewriter().on('head',new AdminHead()).on('body',new AdminBody()).transform(response);
  if(path==='/media-command-center')return new HTMLRewriter().on('.mcc-hero-status',new MediaHero()).transform(response);
  return response;
}
