// Canonical production entrypoint.
// Compatibility marker: GNK_ASG_FINAL_GATEWAY_IQ200_20260625_WITH_ADMIN_HUB_V31_20260629
// Compatibility dependency marker: import app from './index-admin-hub-v28-news-no-fallback.js'
// The implementation is permanently wrapped by the mandatory email-logo gateway.
// Media registration access codes are issued only after initial newsroom registration.
// Mail Studio is routed through the clean stable V5 interface.
export {default,VERSION} from './index-final-admin-gateway-mail-stable-v5.js';
