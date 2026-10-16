import { isProtectedEditorialRoute } from './editorial-route-protection-v1.mjs';

export const SITE = 'https://gnk-asg.hr';
export const PERSON_URL = `${SITE}/nermin-sefic/`;
export const PERSON_ID = `${SITE}/#nermin-sefic`;
export const ORGANIZATION_ID = `${SITE}/#gnk-asg`;
export const INTELLIGENCE_DESK_ID = `${SITE}/#intelligence-desk`;
export const WEBSITE_ID = `${SITE}/#website`;
export const LINKEDIN_CANONICAL = 'https://www.linkedin.com/in/nermin-sefic-18573196';

export const NERMIN_EDITOR = Object.freeze({
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Nermin Sefić',
  url: PERSON_URL,
});

export const GNK_ASG_PUBLISHER = Object.freeze({
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'GNK ASG d.o.o.',
  url: `${SITE}/`,
});

const LEGACY_NERMIN_IDS = new Set([
  PERSON_ID,
  `${SITE}/nermin-sefic/#person`,
  `${SITE}/nermin-sefic/#nermin-sefic`,
]);

export function isVerifiedNerminAuthor(item) {
  return item?.author === 'Nermin Sefić' && item?.authorSchemaVerified === true;
}

export function articleAuthorFor(item) {
  if (isVerifiedNerminAuthor(item)) {
    return { ...NERMIN_EDITOR };
  }
  if (item?.author === 'GNK ASG Intelligence Desk') {
    return {
      '@type': 'Organization',
      '@id': INTELLIGENCE_DESK_ID,
      name: 'GNK ASG Intelligence Desk',
      url: `${SITE}/gnk-aktual/`,
    };
  }
  return null;
}

export function isProtectedEditorialItem(item) {
  const route = String(item?.path || '');
  if (isProtectedEditorialRoute(route)) return true;

  const keywords = Array.isArray(item?.keywords) ? item.keywords : [];
  const topicText = [item?.slug, item?.title, item?.section, ...keywords]
    .filter(Boolean)
    .join(' ');
  return /\bSPT\b|Sports Performance Tracking/i.test(topicText);
}

export function isNerminPersonReference(value) {
  if (Array.isArray(value)) return value.some(isNerminPersonReference);
  if (typeof value === 'string') {
    return /nermin\s+sefi[cć]/i.test(value) || LEGACY_NERMIN_IDS.has(value.trim());
  }
  if (!value || typeof value !== 'object') return false;

  const typeList = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  const nameMatches = /nermin\s+sefi[cć]/i.test(String(value.name || ''));
  const idMatches = LEGACY_NERMIN_IDS.has(String(value['@id'] || ''));
  return (nameMatches || idMatches) && (!typeList.filter(Boolean).length || typeList.includes('Person'));
}
