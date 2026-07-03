import * as base from './mail-studio-extension-v2.js';

export const VERSION = `GNK_ASG_MAIL_STUDIO_PROFILE_PARITY_V1_20260703_${base.VERSION}`;
export const UI_VERSION = base.UI_VERSION;

Object.assign(base.PROFILES, {
  info: {id: 'info', name: 'GNK ASG Information Desk', email: 'info@gnk-asg.hr', unit: 'General Information'},
  privacy: {id: 'privacy', name: 'GNK ASG Privacy Office', email: 'privacy@gnk-asg.hr', unit: 'Privacy & Data Protection'},
  contact: {id: 'contact', name: 'GNK ASG Contact Centre', email: 'contact@gnk-asg.hr', unit: 'General Contact'}
});

export const PROFILES = base.PROFILES;
export const GLOBAL_CENTRES = base.GLOBAL_CENTRES;
export const handleMailStudioExtension = base.handleMailStudioExtension;
export const patchMailStudioResponse = base.patchMailStudioResponse;
export const handleMailStudioInbound = base.handleMailStudioInbound;
