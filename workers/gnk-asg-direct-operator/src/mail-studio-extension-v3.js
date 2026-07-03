import * as base from './mail-studio-extension-v2.js';

export const VERSION='GNK_ASG_MAIL_STUDIO_EXTENSION_V5_20260703_DIRECT_MANUAL_NO_INTERVAL';
export const UI_VERSION=base.UI_VERSION;
export const PROFILES=base.PROFILES;
export const GLOBAL_CENTRES=base.GLOBAL_CENTRES;
export const patchMailStudioResponse=base.patchMailStudioResponse;
export const handleMailStudioInbound=base.handleMailStudioInbound;

const clean=value=>String(value??'').trim();
const isDirectManual=request=>{
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  return request.method==='POST'&&(path==='/api/admin-mail-send'||path==='/api/studio-message/send')&&!clean(request.headers.get('x-gnk-asg-scheduled-mail'));
};

function withoutIntervalRow(env){
  const db=env?.GNK_ASG_D1;
  if(!db?.prepare)return env;
  const wrappedDb=new Proxy(db,{get(target,property,receiver){
    if(property!=='prepare')return Reflect.get(target,property,receiver);
    return sql=>{
      const statement=target.prepare(sql);
      if(!String(sql).includes('SELECT COUNT(*) AS used,MAX(sent_at) AS last_sent_at'))return statement;
      return new Proxy(statement,{get(stmt,member,stmtReceiver){
        if(member!=='first')return Reflect.get(stmt,member,stmtReceiver);
        return async(...args)=>{const row=await stmt.first(...args);return{...(row||{}),last_sent_at:''};};
      }});
    };
  }});
  return new Proxy(env,{get(target,property,receiver){if(property==='GNK_ASG_D1')return wrappedDb;return Reflect.get(target,property,receiver);}});
}

export function handleMailStudioExtension(request,env,ctx,app){
  return base.handleMailStudioExtension(request,isDirectManual(request)?withoutIntervalRow(env):env,ctx,app);
}
