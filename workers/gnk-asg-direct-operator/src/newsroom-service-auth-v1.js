export const VERSION='GNK_ASG_NEWSROOM_SERVICE_AUTH_V1_20260719';

export async function timingSafeStringEqual(a,b){
  const enc=new TextEncoder(),bufA=enc.encode(String(a||'')),bufB=enc.encode(String(b||''));
  if(!bufA.length||!bufB.length)return false;
  const key=await crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256'},false,['sign']);
  const [macA,macB]=await Promise.all([
    crypto.subtle.sign('HMAC',key,bufA),
    crypto.subtle.sign('HMAC',key,bufB)
  ]);
  const viewA=new Uint8Array(macA),viewB=new Uint8Array(macB);
  if(viewA.length!==viewB.length)return false;
  let diff=0;for(let i=0;i<viewA.length;i++)diff|=viewA[i]^viewB[i];
  return diff===0;
}

export async function isNewsroomServiceAuthenticated(request,env){
  const configured=String(env?.NEWSROOM_AUTOMATION_TOKEN||'').trim();
  if(!configured)return false;
  const header=request.headers.get('authorization')||'';
  const match=/^Bearer\s+(.+)$/i.exec(header.trim());
  if(!match)return false;
  return timingSafeStringEqual(match[1].trim(),configured);
}
