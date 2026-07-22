import app from './index-unified-auth-v23.js';

export const VERSION='GNK_DINAMO_WORKFORCE_STAGING_GATE_V1';
const encoder=new TextEncoder();

function unauthorized(){
  return new Response('Privatni staging — potrebna je autorizacija.',{
    status:401,
    headers:{
      'content-type':'text/plain; charset=utf-8',
      'cache-control':'no-store, private',
      'www-authenticate':'Bearer realm="GNK DINAMO Ltd grupa staging"',
      'x-robots-tag':'noindex, nofollow, noarchive, nosnippet'
    }
  });
}

async function sha256(value){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function authorized(request,env){
  const expected=String(env.STAGING_TOKEN_SHA256||'').trim().toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(expected))return false;
  const header=String(request.headers.get('authorization')||'');
  const match=header.match(/^Bearer\s+(.+)$/i);
  if(!match)return false;
  return (await sha256(match[1].trim()))===expected;
}

function secure(response){
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, private');
  headers.set('x-robots-tag','noindex, nofollow, noarchive, nosnippet');
  headers.set('x-gnk-environment','private-workforce-staging');
  headers.set('x-gnk-staging-gate',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    if(!(await authorized(request,env)))return unauthorized();
    if(!['GET','HEAD','OPTIONS'].includes(request.method)){
      return secure(new Response(JSON.stringify({ok:false,error:'STAGING_WRITE_BLOCKED',mode:'SHADOW_READ_ONLY'}),{
        status:405,
        headers:{'content-type':'application/json; charset=utf-8','allow':'GET, HEAD, OPTIONS'}
      }));
    }
    return secure(await app.fetch(request,env,ctx));
  }
};
