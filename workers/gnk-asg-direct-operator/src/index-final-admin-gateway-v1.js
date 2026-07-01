import app,{VERSION as BASE_VERSION} from './index-final-admin-gateway-projects-v1.js';
import {withEnglishGreetingGuard,VERSION as GREETING_VERSION} from './media-outreach-english-guard-v1.js';
import {withEnglishEmailMetadata,VERSION as METADATA_VERSION} from './email-english-metadata-guard-v1.js';
import {isCampaignMailer,serveCampaignMailer,addCampaignMailerLink,VERSION as CAMPAIGN_VERSION} from './campaign-mailer-shell-v1.js';

export const VERSION=`${BASE_VERSION}_${GREETING_VERSION}_${METADATA_VERSION}_${CAMPAIGN_VERSION}`;
const protectedEnv=env=>withEnglishEmailMetadata(withEnglishGreetingGuard(env));
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';

export default{
  async fetch(request,env,ctx){
    const active=protectedEnv(env),path=pathOf(request);
    if(isCampaignMailer(path))return serveCampaignMailer(request,active,ctx,app);
    return addCampaignMailerLink(request,await app.fetch(request,active,ctx));
  },
  scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,protectedEnv(env),ctx);},
  email(message,env,ctx){if(typeof app.email==='function')return app.email(message,protectedEnv(env),ctx);}
};
