function assertTaxonomy(taxonomy) {
  if (!taxonomy || typeof taxonomy !== 'object') throw new TypeError('Event taxonomy is required.');
  if (taxonomy.mode !== 'OFFLINE') throw new Error('Event taxonomy mode must remain OFFLINE.');
  if (!Array.isArray(taxonomy.canonicalTypes) || taxonomy.canonicalTypes.length === 0) {
    throw new Error('Event taxonomy must define canonicalTypes.');
  }
  if (taxonomy.rules?.productionWritesEnabled !== false || taxonomy.rules?.publicPublishingEnabled !== false) {
    throw new Error('Event taxonomy production and public controls must remain disabled.');
  }
}

export function normalizeEventType(type, taxonomy) {
  assertTaxonomy(taxonomy);
  if (typeof type !== 'string' || !type.trim()) throw new TypeError('Event type is required.');
  const aliases = taxonomy.aliases ?? {};
  const canonicalType = aliases[type] ?? type;
  const known = new Set(taxonomy.canonicalTypes);
  return {
    originalType: type,
    canonicalType,
    known: known.has(canonicalType),
    aliased: canonicalType !== type
  };
}

export function applyEventTaxonomy(cycle, taxonomy) {
  assertTaxonomy(taxonomy);
  const events = (cycle.events ?? []).map((event) => {
    const normalized = normalizeEventType(event.type, taxonomy);
    return {
      ...event,
      originalType: taxonomy.rules?.preserveOriginalType === false ? undefined : normalized.originalType,
      canonicalType: normalized.canonicalType,
      taxonomyKnown: normalized.known,
      taxonomyAliased: normalized.aliased
    };
  });

  return {
    ...cycle,
    events,
    controls: {
      ...(cycle.controls ?? {}),
      eventTaxonomyApplied: true,
      allEventTypesKnown: events.every((event) => event.taxonomyKnown === true)
    }
  };
}

export function validateEventTaxonomy(cycle, taxonomy) {
  assertTaxonomy(taxonomy);
  const errors = [];
  if (cycle.controls?.eventTaxonomyApplied !== true) errors.push('Event taxonomy must be applied.');
  for (const event of cycle.events ?? []) {
    const normalized = normalizeEventType(event.type, taxonomy);
    if (!normalized.known) errors.push(`Unknown event type: ${event.type}`);
    if (event.canonicalType !== normalized.canonicalType) {
      errors.push(`Canonical event type mismatch for ${event.id ?? event.type}.`);
    }
  }
  if (cycle.controls?.allEventTypesKnown !== true) errors.push('All event types must be known.');
  return { ok: errors.length === 0, errors };
}
