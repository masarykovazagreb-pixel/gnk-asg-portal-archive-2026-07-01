import app,{VERSION as BASE_VERSION} from './index-unified-auth-v19.js';
import {
  handleIncomingEmail,
  VERSION as MAIL_AUTOREPLY_ALL_VERSION
} from './mail-identity-autoreply-all-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V22_ALL_DOMAIN_AUTOREPLIES_${MAIL_AUTOREPLY_ALL_VERSION}_${BASE_VERSION}`;

export default {
  fetch(request,env,ctx){return app.fetch(request,env,ctx);},
  scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  email(message,env,ctx){return handleIncomingEmail(message,env,ctx,app);}
};
