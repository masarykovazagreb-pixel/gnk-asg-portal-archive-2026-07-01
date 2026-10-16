import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const portalRoot = resolve('apps/portal');
const topics = readJson('apps/portal/data/world-topics-registry.json').items || [];
const editorialItems = readJson('apps/portal/data/editorial-registry.json').items || [];
const imageItems = readJson('apps/portal/data/editorial-image-manifest.json').items || [];
const editorialByRoute = new Map(editorialItems.map((item) => [item.path, item]));
const imageByRoute = new Map(imageItems.map((item) => [item.path, item]));
const asOfDate = process.env.WORLD_TOPICS_REVIEW_AS_OF || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate) || Number.isNaN(Date.parse(`${asOfDate}T00:00:00Z`))) {
  throw new Error('WORLD_TOPICS_REVIEW_AS_OF must use YYYY-MM-DD.');
}

const decode = (value) => String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attrs = (tag) => {
  const values = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) values[match[1].toLowerCase()] = decode(match[3]);
  return values;
};
const flattenSchemas = (value) => {
  if (Array.isArray(value)) return value.flatMap(flattenSchemas);
  if (!value || typeof value !== 'object') return [];
  const current = [value];
  if (Array.isArray(value['@graph'])) current.push(...value['@graph'].flatMap(flattenSchemas));
  return current;
};
const schemaTypeIncludes = (schema, candidate) => {
  const types = Array.isArray(schema?.['@type']) ? schema['@type'] : [schema?.['@type']];
  return types.includes(candidate);
};
const nameOf = (value) => Array.isArray(value) ? value.map(nameOf).filter(Boolean).join('; ') : typeof value === 'string' ? value : value?.name || '';
const typeOf = (value) => Array.isArray(value) ? value.map(typeOf).filter(Boolean).join('; ') : typeof value === 'string' ? '' : Array.isArray(value?.['@type']) ? value['@type'].join('; ') : value?.['@type'] || '';
const routeFile = (route) => {
  if (typeof route !== 'string' || !route.startsWith('/') || route.includes('..') || route.includes('\\')) throw new Error(`Unsafe editorial route: ${route}`);
  const candidate = resolve(portalRoot, `.${route}`, 'index.html');
  if (!candidate.startsWith(`${portalRoot}${sep}`)) throw new Error(`Route escaped the portal root: ${route}`);
  return candidate;
};
const routeDate = (item) => {
  const explicit = item.sourceReviewedAt || item.sourcesReviewedAt || item.lastSourceReviewAt || item.source_reviewed_at || null;
  if (!explicit || !/^\d{4}-\d{2}-\d{2}$/.test(String(explicit))) return null;
  return String(explicit);
};
const daysBetween = (from, to) => Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
const pathFromAssetUrl = (value) => {
  try {
    const url = value.startsWith('/') ? new URL(value, 'https://gnk-asg.hr') : new URL(value);
    return url.hostname === 'gnk-asg.hr' ? decodeURIComponent(url.pathname) : null;
  } catch {
    return null;
  }
};

const reportItems = [];
let protectedSkipped = 0;
for (const topic of topics) {
  if (isProtectedEditorialRoute(topic.path)) {
    protectedSkipped += 1;
    continue;
  }
  const file = routeFile(topic.path);
  if (!existsSync(file)) {
    reportItems.push({
      path: topic.path,
      title: topic.title,
      readiness: 'blocked',
      blockers: ['Published HTML route is missing.'],
      reviewDate: null,
      sourceLinkCount: 0,
      imageRights: 'unknown',
      attribution: 'unknown',
    });
    continue;
  }

  const html = readFileSync(file, 'utf8');
  const body = html.match(/<article\b[^>]*class=["'][^"']*\barticle-body\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/i)?.[1] || '';
  const editorial = editorialByRoute.get(topic.path) || {};
  const imageRecord = imageByRoute.get(topic.path) || null;
  const publishedAt = topic.publishedAt || editorial.publishedAt || editorial.published_at || null;
  const sourceReviewedAt = routeDate({ ...topic, ...editorial });
  const publicationAgeDays = publishedAt ? daysBetween(publishedAt.slice(0, 10), asOfDate) : null;
  const sourceAgeDays = sourceReviewedAt ? daysBetween(sourceReviewedAt, asOfDate) : null;

  const externalSourceLinks = [];
  for (const match of body.matchAll(/<a\b[^>]*>/gi)) {
    const anchor = attrs(match[0]);
    if (!anchor.href) continue;
    try {
      const url = new URL(anchor.href, 'https://gnk-asg.hr');
      if (url.protocol !== 'https:' || url.hostname === 'gnk-asg.hr') continue;
      if (/^(?:www\.)?(?:facebook|instagram|linkedin|twitter)\./i.test(url.hostname) || /(?:^|\.)whatsapp\.com$/i.test(url.hostname) || /^(?:www\.)?(?:x|wa)\./i.test(url.hostname) || url.hostname === 'wa.me') continue;
      externalSourceLinks.push({ url: url.href, host: url.hostname });
    } catch {
      // Invalid links are not counted as source citations.
    }
  }

  const bodyImages = [...body.matchAll(/<img\b[^>]*>/gi)].map((match) => attrs(match[0]));
  const missingAltCount = bodyImages.filter((image) => !Object.hasOwn(image, 'alt') || image.alt.trim() === '').length;
  const unmappedImages = bodyImages
    .filter((image) => image.src)
    .map((image) => pathFromAssetUrl(image.src))
    .filter(Boolean)
    .filter((assetPath) => !imageRecord || pathFromAssetUrl(imageRecord.image) !== assetPath);
  const imageRightsStatus = !imageRecord || !imageRecord.creator || !imageRecord.license
    ? 'cover-rights-record-missing'
    : unmappedImages.length > 0
      ? 'additional-visuals-need-rights-confirmation'
      : 'cover-rights-recorded';

  const authorMeta = html.match(/<meta\b(?=[^>]*\bname=["']author["'])[^>]*>/i)?.[0];
  const authorMetaName = authorMeta ? attrs(authorMeta).content || '' : '';
  const schemas = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { schemas.push(...flattenSchemas(JSON.parse(match[1]))); } catch { /* JSON-LD parsing errors are reviewed as missing data below. */ }
  }
  const articleSchema = schemas.find((schema) => ['Article', 'NewsArticle', 'BlogPosting', 'Report'].some((type) => schemaTypeIncludes(schema, type)));
  const schemaAuthor = articleSchema?.author;
  const schemaEditor = articleSchema?.editor;
  const schemaPublisher = articleSchema?.publisher;
  const expectedAuthor = editorial.author || topic.author || '';
  const authorName = nameOf(schemaAuthor);
  const editorName = nameOf(schemaEditor);
  const publisherName = nameOf(schemaPublisher);
  const metaMatches = expectedAuthor && authorMetaName.toLowerCase() === expectedAuthor.toLowerCase();
  const schemaMatches = expectedAuthor && authorName.toLowerCase() === expectedAuthor.toLowerCase();
  const roleSeparation = Boolean(metaMatches && schemaMatches && editorName && publisherName && editorName !== publisherName);
  const attributionStatus = roleSeparation ? 'author-editor-publisher-distinguished' : 'human-attribution-confirmation-required';

  const blockers = [];
  if (!sourceReviewedAt) blockers.push('No explicit source-review date is recorded; publication date is not treated as a review date.');
  else if (sourceAgeDays > 30) blockers.push(`Source review is ${sourceAgeDays} days old; confirm primary sources before reuse or republication.`);
  if (externalSourceLinks.length === 0) blockers.push('No external source links were found within the article body; add and verify citations before reuse or republication.');
  if (imageRightsStatus !== 'cover-rights-recorded') blockers.push(`Visual rights need a human check (${imageRightsStatus}; ${unmappedImages.length} additional image(s) lack a route-specific rights record).`);
  if (missingAltCount > 0) blockers.push(`${missingAltCount} article image(s) have missing or empty alt text.`);
  if (attributionStatus !== 'author-editor-publisher-distinguished') blockers.push('Author, editor and publisher roles do not all match the page metadata/structured data.');

  reportItems.push({
    path: topic.path,
    title: topic.title,
    language: topic.language || editorial.language || null,
    publishedAt,
    publicationAgeDays,
    sourceReviewDate: sourceReviewedAt,
    sourceReviewAgeDays: sourceAgeDays,
    sourceReviewStatus: !sourceReviewedAt ? 'review-date-not-recorded' : sourceAgeDays > 30 ? 'human-review-due' : 'recent-date-recorded',
    freshnessBasis: 'age since an explicitly recorded source-review date; publication date alone is not source verification',
    sourceLinks: externalSourceLinks,
    primarySourceConfirmation: externalSourceLinks.length ? 'manual-confirmation-required' : 'missing',
    visualRights: {
      status: imageRightsStatus,
      coverCreator: imageRecord?.creator || null,
      coverLicense: imageRecord?.license || null,
      articleImageCount: bodyImages.length,
      additionalImagesNeedingRightsRecord: unmappedImages,
      missingAltCount,
    },
    attribution: {
      status: attributionStatus,
      author: { registry: expectedAuthor || null, meta: authorMetaName || null, schema: authorName || null, schemaType: typeOf(schemaAuthor) || null },
      editor: editorName || null,
      publisher: publisherName || null,
      registryAuthorSchemaVerified: editorial.authorSchemaVerified === true,
    },
    readiness: blockers.length ? 'human-review-required' : 'ready-for-editorial-decision',
    blockers,
  });
}

const report = {
  schemaVersion: '1.0',
  reportType: 'read-only-world-topics-editorial-readiness',
  asOfDate,
  facts: {
    automaticNetworkCalls: 0,
    repositoryFilesWritten: 0,
    automaticPublishing: false,
    sourceReviewThresholdDays: 30,
    freshnessDisclaimer: 'Elapsed time indicates review age only. It does not prove that a primary source was accessed or that any fact is currently true.',
  },
  summary: {
    topicsScanned: reportItems.length,
    protectedRoutesSkipped: protectedSkipped,
    humanReviewRequired: reportItems.filter((item) => item.readiness === 'human-review-required' || item.readiness === 'blocked').length,
    missingSourceReviewDates: reportItems.filter((item) => !item.sourceReviewDate).length,
    topicsWithoutExternalSourceLinks: reportItems.filter((item) => !item.sourceLinks?.length).length,
    topicsNeedingVisualRightsCheck: reportItems.filter((item) => item.visualRights?.status !== 'cover-rights-recorded').length,
    attributionChecksNeedingReview: reportItems.filter((item) => item.attribution?.status !== 'author-editor-publisher-distinguished').length,
  },
  items: reportItems,
};

const output = `${JSON.stringify(report, null, 2)}\n`;
process.stdout.write(output);
if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = [
    '## World Topics — read-only editorial readiness',
    '',
    `As of ${asOfDate}: ${report.summary.topicsScanned} routes scanned; ${report.summary.humanReviewRequired} require human review.`,
    '',
    `- Missing explicit source-review dates: ${report.summary.missingSourceReviewDates}`,
    `- No external article-body source links: ${report.summary.topicsWithoutExternalSourceLinks}`,
    `- Visual-rights review needed: ${report.summary.topicsNeedingVisualRightsCheck}`,
    `- Attribution checks needing review: ${report.summary.attributionChecksNeedingReview}`,
    '- The age basis is a recorded source-review date; publication date is not treated as verification.',
    '- This report does not write repository files, call external services or publish content.',
    '',
    'The complete per-route JSON is available as the `world-topics-review-readiness` workflow artifact.',
    '',
  ].join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
