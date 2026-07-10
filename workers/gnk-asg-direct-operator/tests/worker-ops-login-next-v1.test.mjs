import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const authSource=await readFile(new URL('../src/index-unified-auth-v14.js',import.meta.url),'utf8');
const guardSource=await readFile(new URL('../src/index-unified-auth-v16.js',import.meta.url),'utf8');

assert.match(authSource,/['"]\/worker-ops['"]/,'The shared safeNext UI allowlist must include /worker-ops.');
assert.match(authSource,/function safeNext\(/,'The shared login layer must continue to sanitize next targets.');
assert.match(guardSource,/target\.searchParams\.set\(['"]next['"],['"]\/worker-ops\/['"]\)/,'The Worker Ops entry guard must request return to /worker-ops/.');
assert.match(guardSource,/isWorkerOpsPath/,'Direct Worker Ops routes must remain protected before static fallback.');

console.log('worker-ops-login-next-v1: ok');
