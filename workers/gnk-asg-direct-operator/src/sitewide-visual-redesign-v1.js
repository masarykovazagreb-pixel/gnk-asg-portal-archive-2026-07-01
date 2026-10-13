const SITE_DESIGN_CSS = '/assets/portal-colorful-redesign-v1.css?v=20261012-topic-media-v1';
const AKTUAL_POLISH_CSS = '/assets/aktual-media-polish-v1.css?v=20261012';
const PUBLISHING_CSS = '/assets/publishing-desk-refresh-v1.css?v=20261012';

const PRIVATE_SEGMENTS = new Set([
  'admin',
  'admin-center',
  'admin-login',
  'api',
  'auto-editor',
  'campaign-mailer',
  'design-review',
  'deployment',
  'email-status',
  'enterprise',
  'entities',
  'editorial-operations',
  'language-review',
  'mail-studio',
  'mail-studio-pro',
  'media-application',
  'media-command-center',
  'media-registration-admin',
  'mission-control',
  'mobile-admin',
  'news-admin',
  'operator',
  'operator-dashboard',
  'operator-mobile',
  'pdf-publisher',
  'registry-center',
  'review',
  'seo',
  'social-share',
  'strategy-performance',
  'wa-center',
  'webmail',
  'kontrola-azuriranja'
]);

const PUBLISHING_ROUTES = new Set([
  '/admin-center/editorial-approval',
  '/admin-center/news-publication'
]);

const BANK_ARTICLE_ROUTES = new Set([
  '/aktual/adria-bank-project-update',
  '/en/publications/managing-exporter-bank-guarantees'
]);

function normalizePath(input) {
  const raw = typeof input === 'string' ? input : String(input?.url || '/');
  try {
    const pathname = new URL(raw, 'https://gnk-asg.hr').pathname;
    let decoded = pathname;
    try { decoded = decodeURIComponent(pathname); } catch { /* Keep the encoded path. */ }
    return decoded.toLowerCase().replace(/\/+$/u, '') || '/';
  } catch {
    return '/';
  }
}

function segmentsOf(path) {
  return path.split('/').filter(Boolean);
}

function isSptPath(path) {
  // SPT content also exists as a publication slug outside /spt/; protect both forms.
  return segmentsOf(path).some(segment => segment === 'spt' || /^spt(?:-|$)/.test(segment));
}

export function portalTopicArt(input) {
  const path = normalizePath(input);
  const has = pattern => pattern.test(path);
  if (/world-table|restaurants?|trgovina|prehrana|recipes?/.test(path)) return 'culinary';
  if (/cibona|sports?|basketball|football|stadium|match-day/.test(path)) return 'sports';
  if (/market|trzist|puls-trzista|finance|financije|crypto|stablecoin|bitcoin|equity|capital|inflation|treasury/.test(path)) return 'markets';
  if (/analiz|analysis|research|insights|commentary|komentar|world-monitor|visual-index|teme/.test(path)) return 'research';
  if (/technology|tehnolog|digital-workforce|digital-solutions|intelligence-desk|knowledge-center|synapse|cyber|software|artificial-intelligence|(?:^|\/)ai(?:\/|-|$)|the-code/.test(path)) return 'technology';
  if (/projects|projek|infrastructure|energy|sustainab|mobility|nilus-bio|innovation/.test(path)) return 'projects';
  if (/newsroom|publication|objave|vijest|news|press|media|editorial/.test(path)) return 'newsroom';
  return 'corporate';
}

function isBankPath(path) {
  return BANK_ARTICLE_ROUTES.has(path) || segmentsOf(path).some(segment =>
    segment === 'bank' || segment === 'adria-bank-project'
  );
}

function isAktualMediaPath(path) {
  return segmentsOf(path).some(segment => segment === 'aktual' || segment === 'gnk-aktual');
}

function isPrivatePath(path) {
  return segmentsOf(path).some(segment => PRIVATE_SEGMENTS.has(segment));
}

function isNonPageAssetPath(path) {
  return segmentsOf(path).includes('assets') || /^\/google[a-f0-9]{12,}\.html$/i.test(path);
}

function addHtmlMarker(html, attribute, value) {
  return html.replace(/<html\b([^>]*)>/i, (tag, attributes) => {
    const marker = new RegExp(`\\b${attribute}\\s*=`, 'i');
    if (marker.test(attributes)) return tag;
    return `<html${attributes} ${attribute}="${value}">`;
  });
}

function addStylesheet(html, href, marker) {
  const alreadyLoaded = html.includes(href.split('?')[0]);
  if (alreadyLoaded || !/<\/head\s*>/i.test(html)) return html;
  const link = `<link rel="stylesheet" href="${href}" data-gnk-visual-layer="${marker}">`;
  return html.replace(/<\/head\s*>/i, `${link}</head>`);
}

/**
 * Gives public pages a visual layer without changing page content, scripts, forms,
 * API calls, route ownership, or state. Explicit carve-outs are kept here so that
 * protected applications, SPT, banking pages, and AKTUAL MEDIA cannot inherit the
 * general portal redesign by accident.
 */
export function portalVisualMode(input) {
  const path = normalizePath(input);
  if (isNonPageAssetPath(path)) return 'static-asset-untouched';
  if (isSptPath(path)) return 'untouched-spt';
  if (isBankPath(path)) return 'untouched-bank';
  if (isAktualMediaPath(path)) return 'aktual-media-polish';
  if (PUBLISHING_ROUTES.has(path)) return 'publishing-desk-polish';
  if (isPrivatePath(path)) return 'protected-untouched';
  return 'full-redesign';
}

export function applyPortalVisualRedesign(html, input) {
  if (typeof html !== 'string') return html;
  const mode = portalVisualMode(input);

  if (mode === 'full-redesign') {
    const scopedHtml = addHtmlMarker(
      addHtmlMarker(html, 'data-gnk-site-design', 'colorful-v1'),
      'data-gnk-topic-art',
      portalTopicArt(input)
    );
    return addStylesheet(scopedHtml, SITE_DESIGN_CSS, 'portal-colorful-v1');
  }

  if (mode === 'aktual-media-polish') {
    return addStylesheet(
      addHtmlMarker(html, 'data-gnk-aktual-polish', 'v1'),
      AKTUAL_POLISH_CSS,
      'aktual-media-polish-v1'
    );
  }

  if (mode === 'publishing-desk-polish') {
    return addStylesheet(
      addHtmlMarker(html, 'data-gnk-publishing-design', 'v1'),
      PUBLISHING_CSS,
      'publishing-desk-v1'
    );
  }

  return html;
}

export const VERSION = 'GNK_ASG_SITEWIDE_VISUAL_REDESIGN_V1_20261012_ROUTE_ISOLATED_TOPIC_MEDIA';
