import { handleControlledMediaTest } from './media-registration-controlled-test-v1.js';

export const VERSION='GNK_ASG_CONTROLLED_TEST_ONCE_V1_20260629';
const PATH='/api/media-registration-controlled-test-once';
const KEY='6e48d2a1a7f9434ebc06f36aa7d0c1f9';

export async function handleControlledTestOnce(request,env){
  const url=new URL(request.url);
  if(request.method!=='GET'||url.pathname!==PATH)return null;
  if(url.searchParams.get('key')!==KEY)return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  const synthetic=new Request('https://gnk-asg.hr/api/media-registration-admin/send-test',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      confirm:'SEND_PERSONALIZED_TEST',
      email:'beckuphome@gmail.com',
      outlet:'GNK ASG TEST NEWSROOM',
      recipientName:'Editorial Team'
    })
  });
  return handleControlledMediaTest(synthetic,env);
}
