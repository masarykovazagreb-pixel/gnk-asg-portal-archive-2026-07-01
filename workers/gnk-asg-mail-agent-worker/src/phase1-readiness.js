const REQUIRED_PUBLIC_ROUTES = [
  '/',
  '/objave/',
  '/publications/',
  '/vijesti/',
  '/news/',
  '/trzista/',
  '/markets/',
  '/contact/',
  '/operator/mobile/'
];

const REQUIRED_MAIL_CAPABILITIES = [
  'media_campaign_preview',
  'media_campaign_status',
  'media_campaign_pause_resume',
  'media_campaign_execute_window',
  'incoming_ai_reader',
  'sensitive_reply_hold'
];

const REQUIRED_VIDEO_CAPABILITIES = [
  'featured_4k_teaser',
  'popup_minimize_maximize_close',
  'hr_en_video_library',
  'video_object_for_uploaded_assets_only',
  'video_sitemap_for_uploaded_assets_only'
];

export function phase1Readiness(selfTest) {
  const checks = {
    publicRoutesDeclared: REQUIRED_PUBLIC_ROUTES.length === 9,
    mailCapabilitiesDeclared: REQUIRED_MAIL_CAPABILITIES.length === 6,
    videoCapabilitiesDeclared: REQUIRED_VIDEO_CAPABILITIES.length === 5,
    mailSelfTestPassing: Boolean(selfTest && selfTest.ok)
  };
  return {
    ok: Object.values(checks).every(Boolean),
    phase: 'phase1',
    checks,
    requiredPublicRoutes: REQUIRED_PUBLIC_ROUTES,
    requiredMailCapabilities: REQUIRED_MAIL_CAPABILITIES,
    requiredVideoCapabilities: REQUIRED_VIDEO_CAPABILITIES,
    blockedItems: []
  };
}
