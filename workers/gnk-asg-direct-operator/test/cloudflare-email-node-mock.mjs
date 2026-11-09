// Node-only test shim for Cloudflare's virtual module. Never sends email.
// Run with: node --import ./workers/gnk-asg-direct-operator/test/cloudflare-email-node-mock.mjs --test <test files>
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'cloudflare:email') return { url: 'test:cloudflare-email', shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'test:cloudflare-email') {
      return {
        format: 'module',
        source: 'export class EmailMessage { constructor() { throw new Error("Email transport forbidden in Node tests"); } }',
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});
