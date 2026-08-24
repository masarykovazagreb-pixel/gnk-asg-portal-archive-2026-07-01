export function publicationInstant(item) {
  const raw = item?.publishedAt || item?.datePublished || null;
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

function forcedPublicationCutoff() {
  const raw = process.env.FORCE_PUBLISH_THROUGH || '';
  if (!raw) return null;
  const value = new Date(`${raw}T23:59:59.999+02:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function publicationState(item, now = new Date()) {
  const explicit = String(item?.status || '').toLowerCase();
  if (['draft', 'held', 'hold', 'blocked', 'cancelled'].includes(explicit)) return explicit;
  const instant = publicationInstant(item);
  const cutoff = forcedPublicationCutoff();

  // Future-dated content stays scheduled by default. A forced cutoff is an
  // explicit operator-controlled exception, never an implicit production default.
  if (instant && instant.getTime() > now.getTime()) {
    if (cutoff && instant.getTime() <= cutoff.getTime()) return 'published';
    return 'scheduled';
  }

  if (explicit === 'scheduled') return instant && instant.getTime() <= now.getTime() ? 'published' : 'scheduled';
  return 'published';
}

export function isPublished(item, now = new Date()) {
  return Boolean(item?.path) && publicationState(item, now) === 'published';
}

export function publishedItems(registry, now = new Date()) {
  return (Array.isArray(registry?.items) ? registry.items : []).filter((item) => isPublished(item, now));
}

export function canonicalUrl(item, origin = 'https://gnk-asg.hr') {
  return `${origin}${item.path}`;
}
