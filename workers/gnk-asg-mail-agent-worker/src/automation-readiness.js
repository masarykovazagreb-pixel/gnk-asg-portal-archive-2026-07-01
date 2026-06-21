const DATA_SYNC_CAPABILITIES = Object.freeze([
  'news_at_09_00_and_16_00_europe_zagreb',
  'market_every_15_minutes',
  'last_good_snapshot',
  'honest_live_delayed_snapshot_fallback_statuses',
  'route_free_preview_configuration',
  'write_lock_by_default'
]);

const AUTO_EDITOR_CAPABILITIES = Object.freeze([
  'three_daily_slots_europe_zagreb',
  'minimum_500_words_hr_en',
  'shared_source_hr_en',
  'source_image_seo_validation',
  'draft_first_review',
  'route_free_preview_configuration',
  'write_lock_by_default'
]);

export function automationReadiness(env = {}) {
  const dataSync = moduleReadiness({
    name: 'data-sync-v2',
    capabilities: DATA_SYNC_CAPABILITIES,
    previewBound: flag(env.DATA_SYNC_PREVIEW_BOUND),
    writeEnabled: flag(env.DATA_SYNC_PREVIEW_WRITE),
    deploymentApproved: flag(env.DATA_SYNC_DEPLOYMENT_APPROVED),
    productionRouteConfigured: flag(env.DATA_SYNC_PRODUCTION_ROUTE_CONFIGURED)
  });

  const autoEditor = moduleReadiness({
    name: 'auto-editor-v2',
    capabilities: AUTO_EDITOR_CAPABILITIES,
    previewBound: flag(env.AUTO_EDITOR_PREVIEW_BOUND),
    writeEnabled: flag(env.AUTO_EDITOR_PREVIEW_WRITE),
    deploymentApproved: flag(env.AUTO_EDITOR_DEPLOYMENT_APPROVED),
    productionRouteConfigured: flag(env.AUTO_EDITOR_PRODUCTION_ROUTE_CONFIGURED)
  });

  return {
    ok: dataSync.codeReady && autoEditor.codeReady,
    codeReady: dataSync.codeReady && autoEditor.codeReady,
    previewReady: dataSync.previewReady && autoEditor.previewReady,
    liveReady: dataSync.liveReady && autoEditor.liveReady,
    productionTouched: dataSync.productionRouteConfigured || autoEditor.productionRouteConfigured,
    modules: {
      dataSync,
      autoEditor
    },
    blockedItems: [
      ...dataSync.blockedItems.map(item => `Data Sync V2: ${item}`),
      ...autoEditor.blockedItems.map(item => `Auto Editor V2: ${item}`)
    ]
  };
}

function moduleReadiness({
  name,
  capabilities,
  previewBound,
  writeEnabled,
  deploymentApproved,
  productionRouteConfigured
}) {
  const codeReady = capabilities.length >= 6;
  const previewReady = codeReady && previewBound;
  const liveReady = previewReady && writeEnabled && deploymentApproved && !productionRouteConfigured;
  const blockedItems = [];

  if (!previewBound) blockedItems.push('preview binding nije potvrđen');
  if (!writeEnabled) blockedItems.push('write gate je zaključan');
  if (!deploymentApproved) blockedItems.push('deployment nije odobren');
  if (productionRouteConfigured) blockedItems.push('neočekivana produkcijska ruta je označena kao aktivna');

  return {
    name,
    codeReady,
    previewBound,
    previewReady,
    writeEnabled,
    deploymentApproved,
    productionRouteConfigured,
    productionTouched: productionRouteConfigured,
    liveReady,
    mode: liveReady ? 'preview_enabled' : previewReady ? 'preview_bound_locked' : 'code_only',
    capabilities,
    blockedItems
  };
}

function flag(value) {
  return String(value || '').toLowerCase() === 'true';
}

export const AUTOMATION_CAPABILITIES = Object.freeze({
  dataSync: DATA_SYNC_CAPABILITIES,
  autoEditor: AUTO_EDITOR_CAPABILITIES
});
