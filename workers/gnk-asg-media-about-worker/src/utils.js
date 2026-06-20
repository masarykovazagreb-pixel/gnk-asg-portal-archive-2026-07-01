export function json(request,data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...cors(request)}})}
export function cors(request){const origin=String(request.headers.get('origin')||'');const allowed=/^https:\/\/([a-z0-9-]+\.)?gnk-asg\.hr$/i.test(origin)||/^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(origin)?origin:'https://gnk-asg.hr';return{'access-control-allow-origin':allowed,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization,x-operator-token',vary:'Origin'}}
export function token(request){const bearer=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();return String(request.headers.get('x-operator-token')||bearer).trim()}
export function authorized(request,env){const expected=String(env.OPERATOR_TOKEN||env.GNK_ASG_OPERATOR_TOKEN||'').trim();return Boolean(expected&&token(request)===expected)}
export function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/https?:\/\/www\./g,'https://').replace(/[^a-z0-9]+/g,' ').trim()}
export function decodeXml(value){return String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
export function cleanText(value){return decodeXml(value).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
export async function fingerprint(value){const data=new TextEncoder().encode(normalize(value));const digest=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('').slice(0,24)}
export function safeUrl(value){try{const url=new URL(String(value||''));return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}}
export function nowIso(){return new Date().toISOString()}
