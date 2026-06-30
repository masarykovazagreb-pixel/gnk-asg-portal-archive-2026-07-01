// Canonical production entrypoint.
// Media outreach email output is guarded before delivery.
import app,{VERSION as BASE_VERSION} from './index-final-admin-gateway-projects-v1.js';
import {withEnglishGreetingGuard,VERSION as GUARD_VERSION} from './media-outreach-english-guard-v1.js';

export const VERSION=`${BASE_VERSION}_WITH_${GUARD_VERSION}`;
const guarded=env=>withEnglishGreetingGuard(env);

export default{
  fetch(request,env,ctx){return app.fetch(request,guarded(env),ctx);},
  scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,guarded(env),ctx);},
  email(message,env,ctx){if(typeof app.email==='function')return app.email(message,guarded(env),ctx);}
};
