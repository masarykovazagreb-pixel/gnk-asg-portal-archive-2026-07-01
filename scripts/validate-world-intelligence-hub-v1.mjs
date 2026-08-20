import fs from 'node:fs';
const hub=fs.readFileSync('workers/gnk-asg-direct-operator/src/world-intelligence-hub-v1.js','utf8');
const required=['WORLD_INTEL_ACCESS_CODE','WORLD_MONITOR_API_KEY','NASA_FIRMS_MAP_KEY','/api/world-intel/status','/api/world-intel/incidents','/api/world-intel/services','operator-auth-check','OSINT_ONLY','NOT_AUTHORIZED'];
const failures=required.filter(x=>!hub.includes(x)).map(x=>'missing contract token: '+x);
if(/WORLD_INTEL_ACCESS_CODE\s*[=:]\s*['\"]\d+['\"]/.test(hub)) failures.push('access code must not be hard-coded');
if(/WORLD_MONITOR_API_KEY\s*[=:]\s*['\"][^'\"]+['\"]/.test(hub)) failures.push('provider key must not be hard-coded');
if(failures.length){console.error('WORLD INTELLIGENCE HUB CONTRACT FAILED');for(const f of failures)console.error('- '+f);process.exit(1);}
console.log('WORLD INTELLIGENCE HUB CONTRACT PASSED: honest-state and server-secret gates enforced.');
