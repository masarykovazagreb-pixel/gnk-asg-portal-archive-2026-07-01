import {
  PROFILES,
  handleIncomingEmail as handleProfiledIncomingEmail,
  VERSION as BASE_VERSION
} from './mail-identity-autoreply-v2.js';
import {
  createCatchAllProfile,
  extractGnkAddresses,
  VERSION as PROFILE_FACTORY_VERSION
} from './mail-autoreply-profile-factory-v1.js';

export const VERSION=`GNK_ASG_MAIL_AUTOREPLY_ALL_V2_20260713_${PROFILE_FACTORY_VERSION}_${BASE_VERSION}`;

function ensureCatchAllProfiles(message){
  for(const address of extractGnkAddresses(message)){
    if(PROFILES[address])continue;
    const profile=createCatchAllProfile(address);
    if(profile)PROFILES[address]=profile;
  }
}

export async function handleIncomingEmail(message,env,ctx,core){
  ensureCatchAllProfiles(message);
  return handleProfiledIncomingEmail(message,env,ctx,core);
}

export {PROFILES};
