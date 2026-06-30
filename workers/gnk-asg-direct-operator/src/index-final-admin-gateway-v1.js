// Canonical production entrypoint.
// Compatibility marker: GNK_ASG_FINAL_GATEWAY_IQ200_20260625_WITH_ADMIN_HUB_V31_20260629
// Compatibility dependency marker: import app from './index-admin-hub-v28-news-no-fallback.js'
// The implementation is permanently wrapped by the mandatory email-logo gateway.
// Media registration access codes are issued only after initial newsroom registration.
// Mail Studio remains routed through the clean stable V5 interface.
// Media projects, XLSX import, HTML/PDF preview and status export are added above that stable chain.
import app,{VERSION as BASE_VERSION} from './index-final-admin-gateway-projects-v1.js';
import {withEnglishGreetingGuard,VERSION as GUARD_VERSION} from './media-outreach-english-guard-v1.js';

export const VERSION=`${BASE_VERSION}_WITH_${GUARD_VERSION}`;
const guarded=env=>withEnglishGreetingGuard(env);

export default{
  fetch(request,env,ctx){return app.fetch(request,guarded(env),ctx);},
  scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,guarded(env),ctx);},
  email(message,env,ctx){if(typeof app.email==='function')return app.email(message,guarded(env),ctx);}
};
