export const VERSION='GNK_ASG_PUBLIC_THE_CODE_PDF_V4_20260701_CHUNKED_EXACT_UPLOAD';

export const PUBLIC_THE_CODE_PDF_PATH='/documents/THE_CODE_Official_Media_Invitation_and_Complete_Memorandum_EN.pdf';
const PUBLISH_PATH='/api/internal/publish-the-code-pdf-5c33f1de';
const R2_KEY='public/documents/the-code/THE_CODE_Official_Media_Invitation_and_Complete_Memorandum_EN.pdf';
const TEMP_PREFIX='private/publish/the-code-5c33f1de/';
const FILE_NAME='THE_CODE_Official_Media_Invitation_and_Complete_Memorandum_EN.pdf';
const EXPECTED_SHA256='5c33f1dea158ff8938122c024e857997eb2f156a039c4b76c0cca133f1e0aa95';
const EXPECTED_SIZE=208207;
const EXPECTED_GZIP_SHA256='aaa7fc0b054ef6ca4b9692833452842f6f6bee42dc8810e3ff6c94eefced362e';
const EXPECTED_GZIP_SIZE=163659;
const EXPECTED_CHUNKS=41;
const MAX_CHUNK_SIZE=4000;
const bucketOf=env=>env.GNK_ASG_MEDIA_ASSETS||null;
const normalize=path=>String(path||'').replace(/\/+$/,'')||'/';
const hex=buffer=>[...new Uint8Array(buffer)].map(value=>value.toString(16).padStart(2,'0')).join('');
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-asg-public-the-code-pdf':VERSION}});
const chunkKey=index=>`${TEMP_PREFIX}chunk-${String(index).padStart(3,'0')}`;
const decodeBase64Url=value=>{
  const clean=String(value||'');
  if(!/^[A-Za-z0-9_-]+$/.test(clean))throw new Error('invalid_base64url');
  const padded=clean.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-clean.length%4)%4);
  const binary=atob(padded),bytes=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
  return bytes;
};
const concat=parts=>{const size=parts.reduce((sum,part)=>sum+part.length,0),all=new Uint8Array(size);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length}return all;};
async function gunzip(bytes){const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer());}

async function storeVerifiedPdf(bytes,bucket){
  if(bytes.length!==EXPECTED_SIZE)return json({ok:false,error:'size_mismatch',expected:EXPECTED_SIZE,received:bytes.length},400);
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return json({ok:false,error:'invalid_pdf'},400);
  const digest=hex(await crypto.subtle.digest('SHA-256',bytes));
  if(digest!==EXPECTED_SHA256)return json({ok:false,error:'sha256_mismatch',expected:EXPECTED_SHA256,received:digest},400);
  const uploadedAt=new Date().toISOString();
  await bucket.put(R2_KEY,bytes,{httpMetadata:{contentType:'application/pdf',contentDisposition:`inline; filename="${FILE_NAME}"`},customMetadata:{sha256:digest,filename:FILE_NAME,uploadedAt,version:VERSION}});
  return json({ok:true,url:`https://gnk-asg.hr${PUBLIC_THE_CODE_PDF_PATH}`,sha256:digest,sizeBytes:bytes.length,uploadedAt},201);
}

async function publishDirect(request,env){
  const bucket=bucketOf(env);
  if(!bucket?.put)return json({ok:false,error:'r2_binding_missing'},500);
  const contentType=String(request.headers.get('content-type')||'').toLowerCase();
  if(!contentType.includes('application/pdf'))return json({ok:false,error:'pdf_required'},415);
  return storeVerifiedPdf(new Uint8Array(await request.arrayBuffer()),bucket);
}

async function publishByQuery(request,env){
  const bucket=bucketOf(env);
  if(!bucket?.put||!bucket?.get||!bucket?.head)return json({ok:false,error:'r2_binding_missing'},500);
  const url=new URL(request.url),op=url.searchParams.get('op')||'status';
  if(op==='status'){
    const published=await bucket.head(R2_KEY);
    let received=0;
    for(let index=0;index<EXPECTED_CHUNKS;index++)if(await bucket.head(chunkKey(index)))received++;
    return json({ok:true,version:VERSION,published:Boolean(published),publishedSha256:String(published?.customMetadata?.sha256||''),received,expected:EXPECTED_CHUNKS,url:`https://gnk-asg.hr${PUBLIC_THE_CODE_PDF_PATH}`});
  }
  if(op==='chunk'){
    const index=Number(url.searchParams.get('i')),total=Number(url.searchParams.get('n'));
    if(!Number.isInteger(index)||index<0||index>=EXPECTED_CHUNKS||total!==EXPECTED_CHUNKS)return json({ok:false,error:'invalid_chunk_index'},400);
    let bytes;
    try{bytes=decodeBase64Url(url.searchParams.get('d'));}catch(error){return json({ok:false,error:error.message},400);}
    if(!bytes.length||bytes.length>MAX_CHUNK_SIZE)return json({ok:false,error:'invalid_chunk_size',received:bytes.length},400);
    await bucket.put(chunkKey(index),bytes,{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{index:String(index),total:String(total),version:VERSION}});
    return json({ok:true,stored:index,sizeBytes:bytes.length});
  }
  if(op==='finalize'){
    const parts=[];
    for(let index=0;index<EXPECTED_CHUNKS;index++){
      const object=await bucket.get(chunkKey(index));
      if(!object)return json({ok:false,error:'missing_chunk',index},409);
      parts.push(new Uint8Array(await object.arrayBuffer()));
    }
    const compressed=concat(parts);
    if(compressed.length!==EXPECTED_GZIP_SIZE)return json({ok:false,error:'gzip_size_mismatch',expected:EXPECTED_GZIP_SIZE,received:compressed.length},400);
    const compressedDigest=hex(await crypto.subtle.digest('SHA-256',compressed));
    if(compressedDigest!==EXPECTED_GZIP_SHA256)return json({ok:false,error:'gzip_sha256_mismatch',expected:EXPECTED_GZIP_SHA256,received:compressedDigest},400);
    let pdf;
    try{pdf=await gunzip(compressed);}catch{return json({ok:false,error:'gzip_decompression_failed'},400);}
    return storeVerifiedPdf(pdf,bucket);
  }
  return json({ok:false,error:'invalid_operation'},400);
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
  if(path===PUBLISH_PATH&&request.method==='POST')return publishDirect(request,env);
  if(path===PUBLISH_PATH&&request.method==='GET')return publishByQuery(request,env);
  return null;
}
