import app,{VERSION as BASE_VERSION} from './index-final-admin-gateway-projects-v1.js';
import {withEnglishGreetingGuard,VERSION as GREETING_VERSION} from './media-outreach-english-guard-v1.js';
import {withEnglishEmailMetadata,VERSION as METADATA_VERSION} from './email-english-metadata-guard-v1.js';

export const VERSION=`${BASE_VERSION}_${GREETING_VERSION}_${METADATA_VERSION}`;
const protectedEnv=env=>withEnglishEmailMetadata(withEnglishGreetingGuard(env));

export default{
  fetch(request,env,ctx){return app.fetch(request,protectedEnv(env),ctx);},
  scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,protectedEnv(env),ctx);},
  email(message,env,ctx){if(typeof app.email==='function')return app.email(message,protectedEnv(env),ctx);}
};
