export const VERSION='GNK_ASG_PUBLIC_THE_CODE_PDF_V3_20260701_EXACT_UPLOAD';

export const PUBLIC_THE_CODE_PDF_PATH='/documents/THE_CODE_Official_Media_Invitation_and_Complete_Memorandum_EN.pdf';
const PUBLISH_PATH='/api/internal/publish-the-code-pdf-5c33f1de';
const R2_KEY='public/documents/the-code/THE_CODE_Official_Media_Invitation_and_Complete_Memorandum_EN.pdf';
const FILE_NAME='THE_CODE_Official_Media_Invitation_and_Complete_Memorandum_EN.pdf';
const EXPECTED_SHA256='5c33f1dea158ff8938122c024e857997eb2f156a039c4b76c0cca133f1e0aa95';
const EXPECTED_SIZE=208207;
const bucketOf=env=>env.GNK_ASG_MEDIA_ASSETS||null;
const normalize=path=>String(path||'').replace(/\/+$/,'')||'/';
const hex=buffer=>[...new Uint8Array(buffer)].map(value=>value.toString(16).padStart(2,'0')).join('');
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-asg-public-the-code-pdf':VERSION}});

async function publish(request,env){
  const bucket=bucketOf(env);
  if(!bucket?.put)return json({ok:false,error:'r2_binding_missing'},500);
  const contentType=String(request.headers.get('content-type')||'').toLowerCase();
  if(!contentType.includes('application/pdf'))return json({ok:false,error:'pdf_required'},415);
  const bytes=new Uint8Array(await request.arrayBuffer());
  if(bytes.length!==EXPECTED_SIZE)return json({ok:false,error:'size_mismatch',expected:EXPECTED_SIZE,received:bytes.length},400);
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return json({ok:false,error:'invalid_pdf'},400);
  const digest=hex(await crypto.subtle.digest('SHA-256',bytes));
  if(digest!==EXPECTED_SHA256)return json({ok:false,error:'sha256_mismatch',expected:EXPECTED_SHA256,received:digest},400);
  const uploadedAt=new Date().toISOString();
  await bucket.put(R2_KEY,bytes,{httpMetadata:{contentType:'application/pdf',contentDisposition:`inline; filename="${FILE_NAME}"`},customMetadata:{sha256:digest,filename:FILE_NAME,uploadedAt,version:VERSION}});
  return json({ok:true,url:`https://www.gnk-asg.hr${PUBLIC_THE_CODE_PDF_PATH}`,sha256:digest,sizeBytes:bytes.length,uploadedAt},201);
}

async function serve(request,env){
  const bucket=bucketOf(env);
  if(!bucket?.get)return json({ok:false,error:'r2_binding_missing'},500);
  const object=await bucket.get(R2_KEY);
  if(!object)return json({ok:false,error:'pdf_not_published'},404);
  const headers=new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set('content-type','application/pdf');
  headers.set('content-disposition',`inline; filename="${FILE_NAME}"`);
  headers.set('cache-control','public, max-age=300, s-maxage=3600');
  headers.set('x-content-type-options','nosniff');
  headers.set('x-gnk-asg-public-the-code-pdf',VERSION);
  headers.set('x-gnk-asg-public-the-code-pdf-sha256',String(object.customMetadata?.sha256||''));
  if(object.httpEtag)headers.set('etag',object.httpEtag);
  return new Response(request.method==='HEAD'?null:object.body,{status:200,headers});
}

export async function handlePublicTheCodePdf(request,env){
  const path=normalize(new URL(request.url).pathname);
  if(path===normalize(PUBLIC_THE_CODE_PDF_PATH)&&['GET','HEAD'].includes(request.method))return serve(request,env);
  if(path===PUBLISH_PATH&&request.method==='POST')return publish(request,env);
  return null;
}
