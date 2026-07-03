export const VERSION='GNK_ASG_MANUAL_NO_INTERVAL_V1_20260703';

const clean=value=>String(value??'').trim();

export function withManualNoIntervalRequest(request){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  const isDirectManual=request.method==='POST'&&(path==='/api/admin-mail-send'||path==='/api/studio-message/send')&&!clean(request.headers.get('x-gnk-asg-scheduled-mail'));
  if(!isDirectManual)return request;
  const headers=new Headers(request.headers);
  headers.set('x-gnk-asg-direct-manual-no-interval','1');
  return new Request(request,{headers});
}
