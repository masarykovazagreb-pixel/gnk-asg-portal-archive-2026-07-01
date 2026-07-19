import assert from 'node:assert/strict';
import {isNewsroomServiceAuthenticated} from '../workers/gnk-asg-direct-operator/src/newsroom-service-auth-v1.js';

const env = {NEWSROOM_AUTOMATION_TOKEN: 'test-service-token-a1b2c3d4e5f6'};

// Case 1: no Authorization header at all -> rejected
{
  const request = new Request('https://gnk-asg.hr/api/news-auto-publication/enqueue', {method: 'POST'});
  const ok = await isNewsroomServiceAuthenticated(request, env);
  assert.equal(ok, false, 'missing authorization header must be rejected');
}

// Case 2: wrong/garbage token -> rejected
{
  const request = new Request('https://gnk-asg.hr/api/news-auto-publication/enqueue', {
    method: 'POST',
    headers: {authorization: 'Bearer not-the-right-token'}
  });
  const ok = await isNewsroomServiceAuthenticated(request, env);
  assert.equal(ok, false, 'wrong token must be rejected');
}

// Case 3: correct token but malformed header (missing "Bearer " prefix) -> rejected
{
  const request = new Request('https://gnk-asg.hr/api/news-auto-publication/enqueue', {
    method: 'POST',
    headers: {authorization: env.NEWSROOM_AUTOMATION_TOKEN}
  });
  const ok = await isNewsroomServiceAuthenticated(request, env);
  assert.equal(ok, false, 'token without Bearer scheme must be rejected');
}

// Case 4: token configured on env, but env var unset entirely (misconfiguration) -> always rejected, never silently open
{
  const request = new Request('https://gnk-asg.hr/api/news-auto-publication/enqueue', {
    method: 'POST',
    headers: {authorization: 'Bearer anything-at-all'}
  });
  const ok = await isNewsroomServiceAuthenticated(request, {});
  assert.equal(ok, false, 'unconfigured NEWSROOM_AUTOMATION_TOKEN must fail closed, not pass open');
}

// Case 5: valid service token -> accepted
{
  const request = new Request('https://gnk-asg.hr/api/news-auto-publication/enqueue', {
    method: 'POST',
    headers: {authorization: `Bearer ${env.NEWSROOM_AUTOMATION_TOKEN}`}
  });
  const ok = await isNewsroomServiceAuthenticated(request, env);
  assert.equal(ok, true, 'valid service token must be accepted');
}

// Case 6: valid token with incidental whitespace around it -> still accepted
{
  const request = new Request('https://gnk-asg.hr/api/news-auto-publication/enqueue', {
    method: 'POST',
    headers: {authorization: `Bearer   ${env.NEWSROOM_AUTOMATION_TOKEN}  `}
  });
  const ok = await isNewsroomServiceAuthenticated(request, env);
  assert.equal(ok, true, 'valid token with surrounding whitespace must still be accepted');
}

console.log(JSON.stringify({ok: true, contract: 'newsroom-enqueue-service-token-auth', cases: 6}, null, 2));
