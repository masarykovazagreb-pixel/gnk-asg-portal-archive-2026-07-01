import worker from '../workers/gnk-asg-operator-center/src/index.js';

const fail = msg => { console.error('FAIL:', msg); process.exitCode = 1; };

async function expect(url, status, location = null) {
  const response = await worker.fetch(new Request(url), {});
  if (response.status !== status) fail(`${url}: expected ${status}, got ${response.status}`);
  if (location !== null && response.headers.get('location') !== location) {
    fail(`${url}: expected Location ${location}, got ${response.headers.get('location')}`);
  }
}

await expect('https://operator.gnk-asg.hr/knowledge-center/', 308, 'https://gnk-asg.hr/knowledge-center/');
await expect('https://operator.gnk-asg.hr/en/knowledge-center/', 308, 'https://gnk-asg.hr/en/knowledge-center/');
await expect('https://operator.gnk-asg.hr/not-a-route', 404);
await expect('https://operator.gnk-asg.hr/operator-dashboard/', 503);

const methodResponse = await worker.fetch(new Request('https://operator.gnk-asg.hr/knowledge-center/', {method:'POST'}), {});
if (methodResponse.status !== 405) fail(`POST route must remain rejected; got ${methodResponse.status}`);

if (!process.exitCode) console.log('Operator Knowledge Center route truth contract: PASS');
