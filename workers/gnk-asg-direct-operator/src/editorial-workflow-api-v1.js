import {saveEditorialSlot,getEditorialSlot,queueEditorialSlotForRelease,listEditorialReleaseQueue,VERSION as WORKFLOW_VERSION} from './editorial-workflow-v1.js';
import {validatePublicationReadiness,publicationAttribution} from './publication-readiness-v1.js';
import {renderPublicationDocument,VERSION as DOCUMENT_VERSION} from './publication-document-v1.js';

export const VERSION=`GNK_DINAMO_EDITORIAL_WORKFLOW_API_V1_20260704_${WORKFLOW_VERSION}_${DOCUMENT_VERSION}`;
export const API_PREFIX='/api/editorial-operations';

const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-editorial-workflow':VERSION}});
const html=body=>new Response(body,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex,nofollow,noarchive','x-gnk-editorial-workflow':VERSION}});
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';

function errorResponse(error){
  const message=String(error?.message||error);
  const status=message==='publication_not_ready'?422:message.includes('not_found')?404:message.includes('required')||message.includes('invalid')?400:503;
  return json({ok:false,error:message,readiness:error?.readiness||null,version:VERSION},status);
}

export async function handleEditorialWorkflowApi(request,env){
  const path=pathOf(request);
  try{
    if(request.method==='POST'&&path===`${API_PREFIX}/slot/save`){
      const body=await request.json().catch(()=>({}));
      return json(await saveEditorialSlot(env,body));
    }
    if(request.method==='POST'&&path===`${API_PREFIX}/slot/preview`){
      const body=await request.json().catch(()=>({}));
      const slot=await getEditorialSlot(env,body),readiness=validatePublicationReadiness(slot);
      if(!readiness.ok)return json({ok:false,readiness,attribution:publicationAttribution(slot)},422);
      return html(renderPublicationDocument(slot));
    }
    if(request.method==='POST'&&path===`${API_PREFIX}/slot/queue`){
      const body=await request.json().catch(()=>({}));
      return json(await queueEditorialSlotForRelease(env,body));
    }
    if(request.method==='GET'&&path===`${API_PREFIX}/publication/queue`){
      return json(await listEditorialReleaseQueue(env));
    }
    return null;
  }catch(error){return errorResponse(error)}
}
