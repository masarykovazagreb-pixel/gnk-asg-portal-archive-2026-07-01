export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/pdf-publications/status'){
      return new Response(JSON.stringify({ok:true,service:'GNK ASG PDF Publisher',mode:'preview',productionRouteConfigured:false,kv:Boolean(env.GNK_ASG_KV),r2:Boolean(env.GNK_ASG_MEDIA_ASSETS)}),{headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({ok:false,error:'not_found'}),{status:404,headers:{'content-type':'application/json'}});
  }
};
