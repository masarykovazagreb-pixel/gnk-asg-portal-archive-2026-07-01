// Canonical production entrypoint.
// Compatibility marker: GNK_ASG_FINAL_GATEWAY_IQ200_20260625_WITH_ADMIN_HUB_V31_20260629
// Compatibility dependency marker: import app from './index-admin-hub-v28-news-no-fallback.js'
// The implementation is permanently wrapped by the mandatory email-logo gateway.
// Media registration access codes are issued only after initial newsroom registration.
// Mail Studio remains routed through the clean stable V5 interface.
// Media projects, XLSX import, HTML/PDF preview and status export are added above that stable chain.
export {default,VERSION} from './index-final-admin-gateway-projects-v1.js';
