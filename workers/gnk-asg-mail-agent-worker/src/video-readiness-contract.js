export const VIDEO_READINESS_CONTRACT = {
  phase: 'phase1-video',
  homepage: {
    featuredTeaser: '4k-uploaded-asset-only',
    playerControls: ['minimize', 'maximize', 'close'],
    autoplayPolicy: 'muted-inline-preview-only'
  },
  libraries: {
    hr: '/videoteka/',
    en: '/video-library/'
  },
  seo: {
    videoObject: 'emit-only-for-uploaded-video-assets',
    sitemap: 'include-only-uploaded-video-assets',
    placeholdersAllowed: false
  }
};

export function videoReadiness() {
  return {
    ok: true,
    ...VIDEO_READINESS_CONTRACT
  };
}
