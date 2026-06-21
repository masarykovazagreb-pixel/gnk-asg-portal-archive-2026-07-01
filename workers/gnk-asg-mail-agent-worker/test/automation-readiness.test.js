import { automationReadiness } from '../src/automation-readiness.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const initial = automationReadiness({});
assert(initial.codeReady, 'Automation code declaration must be ready.');
assert(!initial.previewReady, 'Initial state must not claim preview readiness.');
assert(!initial.liveReady, 'Initial state must not claim enabled automation.');
assert(initial.modules.dataSync.mode === 'code_only', 'Initial Data Sync mode is incorrect.');
assert(initial.modules.autoEditor.mode === 'code_only', 'Initial Auto Editor mode is incorrect.');

const bound = automationReadiness({
  DATA_SYNC_PREVIEW_BOUND: 'true',
  AUTO_EDITOR_PREVIEW_BOUND: 'true'
});
assert(bound.previewReady, 'Confirmed preview bindings must be reported.');
assert(!bound.liveReady, 'Bound modules must remain locked until explicitly enabled.');
assert(bound.modules.dataSync.mode === 'preview_bound_locked', 'Bound Data Sync mode is incorrect.');
assert(bound.modules.autoEditor.mode === 'preview_bound_locked', 'Bound Auto Editor mode is incorrect.');

const enabled = automationReadiness({
  DATA_SYNC_PREVIEW_BOUND: 'true',
  DATA_SYNC_PREVIEW_WRITE: 'true',
  DATA_SYNC_DEPLOYMENT_APPROVED: 'true',
  AUTO_EDITOR_PREVIEW_BOUND: 'true',
  AUTO_EDITOR_PREVIEW_WRITE: 'true',
  AUTO_EDITOR_DEPLOYMENT_APPROVED: 'true'
});
assert(enabled.previewReady, 'Enabled modules must keep preview readiness.');
assert(enabled.liveReady, 'Explicitly enabled preview modules must be reported as ready.');
assert(enabled.modules.dataSync.mode === 'preview_enabled', 'Enabled Data Sync mode is incorrect.');
assert(enabled.modules.autoEditor.mode === 'preview_enabled', 'Enabled Auto Editor mode is incorrect.');

console.log('Automation readiness transitions passed.');
