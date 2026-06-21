import { strictCampaignLeaseReady } from './media-campaign-lease.js';
import { videoReadiness } from './video-readiness-contract.js';

const REQUIRED_PUBLIC_ROUTES = [
  '/',
  '/objave/',
  '/publications/',
  '/vijesti/',
  '/news/',
  '/trzista/',
  '/markets/',
  '/contact/',
  '/operator-mobile/'
];

const REQUIRED_MAIL_CAPABILITIES = [
  'media_campaign_preview',
  'media_campaign_status',
  'media_campaign_pause_resume',
  'media_campaign_execute_window',
  'incoming_ai_reader',
  'sensitive_reply_hold'
];

const REQUIRED_BACKEND_CAPABILITIES = [
  'operator_token_required',
  'kv_state_storage',
  'mailbox_audit_trail',
  'health_status_endpoint',
  'rollback_manifest',
  'regression_self_test',
  'strict_live_rate_limit_lease'
];

const REQUIRED_VIDEO_CAPABILITIES = [
  'featured_4k_teaser',
  'popup_minimize_maximize_close',
  'hr_en_video_library',
  'video_object_for_uploaded_assets_only',
  'video_sitemap_for_uploaded_assets_only'
];

export function phase1Readiness(selfTest, env = {}) {
  const video = videoReadiness();
  const bindings = {
    kv: Boolean(env.GNK_ASG_KV),
    ai: Boolean(env.AI),
    email: Boolean(env.EMAIL),
    d1RateLease: strictCampaignLeaseReady(env)
  };
  const featureGates = {
    routineAutoSend: env.MAIL_AUTOMATION_AUTO_SEND === 'true',
    mediaCampaignLiveSend: env.MEDIA_CAMPAIGN_LIVE_SEND === 'true'
  };
  const checks = {
    publicRoutesDeclared: REQUIRED_PUBLIC_ROUTES.length === 9 && REQUIRED_PUBLIC_ROUTES.includes('/operator-mobile/'),
    mailCapabilitiesDeclared: REQUIRED_MAIL_CAPABILITIES.length === 6,
    backendCapabilitiesDeclared: REQUIRED_BACKEND_CAPABILITIES.length === 7,
    videoCapabilitiesDeclared: REQUIRED_VIDEO_CAPABILITIES.length === 5,
    uploadedVideoAssetsOnly: video.seo.videoObject.includes('uploaded') && video.seo.sitemap.includes('uploaded') && video.seo.placeholdersAllowed === false,
    mailSelfTestPassing: Boolean(selfTest && selfTest.ok)
  };
  const codeReady = Object.values(checks).every(Boolean);
  const serviceBindingsReady = bindings.kv && bindings.ai && bindings.email;
  const liveCampaignReady = codeReady && serviceBindingsReady && bindings.d1RateLease && featureGates.mediaCampaignLiveSend;
  const routineAutoSendReady = codeReady && serviceBindingsReady && featureGates.routineAutoSend;
  const blockedItems = [];

  if (!bindings.kv) blockedItems.push('GNK_ASG_KV binding');
  if (!bindings.ai) blockedItems.push('AI binding');
  if (!bindings.email) blockedItems.push('EMAIL binding');
  if (!bindings.d1RateLease) blockedItems.push('GNK_ASG_D1 strict rate-limit binding');
  if (!featureGates.mediaCampaignLiveSend) blockedItems.push('MEDIA_CAMPAIGN_LIVE_SEND feature gate');
  if (!featureGates.routineAutoSend) blockedItems.push('MAIL_AUTOMATION_AUTO_SEND feature gate');

  return {
    ok: codeReady,
    codeReady,
    liveReady: liveCampaignReady,
    routineAutoSendReady,
    phase: 'phase1',
    checks,
    bindings,
    featureGates,
    requiredPublicRoutes: REQUIRED_PUBLIC_ROUTES,
    requiredMailCapabilities: REQUIRED_MAIL_CAPABILITIES,
    requiredBackendCapabilities: REQUIRED_BACKEND_CAPABILITIES,
    requiredVideoCapabilities: REQUIRED_VIDEO_CAPABILITIES,
    video,
    blockedItems
  };
}
