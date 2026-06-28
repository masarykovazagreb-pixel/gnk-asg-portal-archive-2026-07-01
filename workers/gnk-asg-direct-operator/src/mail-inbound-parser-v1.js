import PostalMime from 'postal-mime';
import {INDEX_KEY,VERSION as INBOUND_VERSION} from './mail-inbound-service-v1.js';

export const VERSION='GNK_ASG_MAIL_INBOUND_PARSER_V1_POSTAL_MIME_20260628';
export const MAX_RAW_SIZE=25*1024*1024;
export const MAX_TEXT_LENGTH=100000;
export const MAX_PDF_COUNT=5;
export const MAX_PDF_SIZE=8*1024*1024;
export const MAX_PDF_TOTAL=16*1024*1024;

const clean=(value,max=MAX_TEXT_LENGTH)=>String(value??'').replace(/\u0000/g,'').trim().slice(0,max);
const kvStore=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const r2Store=env=>env.GNK_ASG_MEDIA_ASSETS||null;

async function readJson(kv,key,fallback){
  try{
    const raw=await kv.get(key);
    return raw?JSON.parse(raw):fallback;
  }catch{return fallback;}
}

async function writeJson(kv,key,value,options){
  if(!kv?.put)return;
  const body=JSON.stringify(value);
  if(options)await kv.put(key,body,options);
  else await kv.put(key,body);
}

function stripHtml(value){
  return clean(String(value||'')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/p\s*>/gi,'\n\n')
    .replace(/<\/div\s*>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n{4,}/g,'\n\n\n')
    .replace(/[ \t]{2,}/g,' '),MAX_TEXT_LENGTH);
}

function safeFilename(value,index){
  const base=clean(value||`attachment-${index+1}.pdf`,180)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Za-z0-9._-]+/g,'-')
    .replace(/^-+|-+$/g,'')||`attachment-${index+1}.pdf`;
  return base.toLowerCase().endsWith('.pdf')?base:`${base}.pdf`;
}

function bytesOf(content){
  if(content instanceof Uint8Array)return content;
  if(content instanceof ArrayBuffer)return new Uint8Array(content);
  if(ArrayBuffer.isView(content))return new Uint8Array(content.buffer,content.byteOffset,content.byteLength);
  return new TextEncoder().encode(String(content??''));
}

function addressName(address){
  if(!address)return'';
  if(Array.isArray(address.group))return clean(address.name,300);
  return clean(address.name,300);
}

function addressValue(address){
  if(!address)return'';
  if(Array.isArray(address.group))return address.group.map(item=>clean(item.address,320)).filter(Boolean).join(', ');
  return clean(address.address,320);
}

async function storePdfAttachments(parsed,record,env){
  const bucket=r2Store(env);
  const attachments=[];
  let total=0;
  for(const [index,attachment] of (Array.isArray(parsed.attachments)?parsed.attachments:[]).entries()){
    const filename=clean(attachment?.filename||'',180);
    const mimeType=clean(attachment?.mimeType||'',120).toLowerCase();
    const isPdf=mimeType==='application/pdf'||filename.toLowerCase().endsWith('.pdf');
    if(!isPdf)continue;
    if(attachments.length>=MAX_PDF_COUNT){
      attachments.push({filename:filename||`attachment-${index+1}.pdf`,mimeType,size:0,stored:false,reason:'pdf_count_limit'});
      continue;
    }
    const bytes=bytesOf(attachment.content);
    const size=bytes.byteLength;
    if(size>MAX_PDF_SIZE){
      attachments.push({filename:filename||`attachment-${index+1}.pdf`,mimeType,size,stored:false,reason:'pdf_too_large'});
      continue;
    }
    if(total+size>MAX_PDF_TOTAL){
      attachments.push({filename:filename||`attachment-${index+1}.pdf`,mimeType,size,stored:false,reason:'pdf_total_limit'});
      continue;
    }
    total+=size;
    const safe=safeFilename(filename,index);
    const key=`mail-inbound/${record.caseId}/${String(index+1).padStart(2,'0')}-${safe}`;
    if(!bucket?.put){
      attachments.push({filename:safe,mimeType:'application/pdf',size,stored:false,key:'',reason:'r2_binding_missing'});
      continue;
    }
    try{
      await bucket.put(key,bytes,{httpMetadata:{contentType:'application/pdf',contentDisposition:`attachment; filename="${safe}"`},customMetadata:{caseId:record.caseId,source:'direct-email-routing',parserVersion:VERSION}});
      attachments.push({filename:safe,mimeType:'application/pdf',size,stored:true,key,reason:''});
    }catch(error){
      attachments.push({filename:safe,mimeType:'application/pdf',size,stored:false,key:'',reason:`r2_error:${clean(error?.message||error,160)}`});
    }
  }
  return attachments;
}

async function persistParsedRecord(record,parsed,attachments,env,status='received-parsed'){
  const kv=kvStore(env);
  if(!kv?.put)return record;
  const text=clean(parsed.text||stripHtml(parsed.html||''),MAX_TEXT_LENGTH);
  const updated={
    ...record,
    status,
    subject:clean(parsed.subject||record.subject||'(bez predmeta)',1000),
    fromName:addressName(parsed.from),
    parsedFrom:addressValue(parsed.from),
    replyTo:(Array.isArray(parsed.replyTo)?parsed.replyTo:[]).map(addressValue).filter(Boolean),
    message:text,
    snippet:text.slice(0,500),
    contentParsed:true,
    parsedAt:new Date().toISOString(),
    parserVersion:VERSION,
    htmlAvailable:Boolean(parsed.html),
    textAvailable:Boolean(parsed.text),
    attachments,
    attachmentCount:attachments.length,
    storedAttachmentCount:attachments.filter(item=>item.stored).length
  };
  await writeJson(kv,`mail:inbound:${record.caseId}`,updated,{expirationTtl:60*60*24*365});
  const current=await readJson(kv,INDEX_KEY,[]);
  if(Array.isArray(current)){
    const index=current.map(item=>item?.caseId===record.caseId?{
      ...item,
      status:updated.status,
      subject:updated.subject,
      fromName:updated.fromName,
      snippet:updated.snippet,
      contentParsed:true,
      attachmentCount:updated.attachmentCount,
      storedAttachmentCount:updated.storedAttachmentCount
    }:item);
    await writeJson(kv,INDEX_KEY,index);
  }
  return updated;
}

async function persistParseFailure(record,env,error){
  const kv=kvStore(env);
  const updated={...record,status:'received-parse-failed',contentParsed:false,parseError:clean(error?.message||error,500),parserVersion:VERSION,parsedAt:new Date().toISOString()};
  if(kv?.put)await writeJson(kv,`mail:inbound:${record.caseId}`,updated,{expirationTtl:60*60*24*365});
  return updated;
}

export async function parseAndStoreInboundContent(message,env,record){
  if(!record?.caseId)return{ok:false,parsed:false,reason:'record_missing',record:null};
  if(Number(message?.rawSize||0)>MAX_RAW_SIZE){
    const updated=await persistParseFailure(record,env,new Error('raw_message_too_large'));
    return{ok:false,parsed:false,reason:'raw_message_too_large',record:updated};
  }
  if(!message?.raw){
    const updated=await persistParseFailure(record,env,new Error('raw_message_missing'));
    return{ok:false,parsed:false,reason:'raw_message_missing',record:updated};
  }
  try{
    const parsed=await PostalMime.parse(message.raw,{attachmentEncoding:'arraybuffer',maxNestingDepth:30,maxHeadersSize:1024*1024});
    const attachments=await storePdfAttachments(parsed,record,env);
    const updated=await persistParsedRecord(record,parsed,attachments,env);
    return{ok:true,parsed:true,record:updated,attachmentCount:attachments.length,storedAttachmentCount:attachments.filter(item=>item.stored).length};
  }catch(error){
    const updated=await persistParseFailure(record,env,error);
    return{ok:false,parsed:false,reason:'parse_failed',error:clean(error?.message||error,500),record:updated};
  }
}
