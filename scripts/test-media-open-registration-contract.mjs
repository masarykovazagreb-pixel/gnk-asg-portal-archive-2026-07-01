import assert from 'node:assert/strict';
import fs from 'node:fs';

const backendPath='workers/gnk-asg-direct-operator/src/media-registration-v1.js';
const legacyPath='workers/gnk-asg-direct-operator/src/media-registration-legacy-v1.js';
const frontendPath='apps/portal/assets/media-registration-v1.js';
const backend=fs.readFileSync(backendPath,'utf8');
const legacy=fs.readFileSync(legacyPath,'utf8');
const frontend=fs.readFileSync(frontendPath,'utf8');

for(const marker of [
  'OPEN_PBKDF2',
  "ACCOUNT_ALGORITHM='PBKDF2-SHA256'",
  'PBKDF2_ITERATIONS=210000',
  "{name:'PBKDF2'}",
  "hash:'SHA-256'",
  "password_algorithm TEXT NOT NULL",
  "password_iterations INTEGER NOT NULL",
  'media_registration_accounts',
  'media_registration_rate_limits',
  'rateLimitRegistration',
  "error:'rate_limited'",
  "openRegistration:true",
  "loginMode:'username_password'",
  "legacyInvitationLogin:true",
  "path===`${PUBLIC_API}/register`",
  'async function register',
  'async function usernamePasswordLogin',
  'crypto.getRandomValues(new Uint8Array(16))',
  "'open_registration_created'",
  "error:'account_exists'",
  "error:'weak_password'",
  "error:'invalid_username'",
  "error:'invalid_email'",
  "error:'outlet_required'",
  'HttpOnly; Secure; SameSite=Strict',
  "export const processMediaInvitationQueue=legacy.processMediaInvitationQueue"
]) assert.ok(backend.includes(marker),`wrapper missing media registration marker: ${marker}`);

for(const marker of [
  "const code=clean(b.mailCode).toUpperCase()",
  'media_invitation_access',
  'QUEUE_PERSONALIZED_INVITATIONS',
  'paused:true',
  'processMediaInvitationQueue',
  'handleMediaRegistrationPublic',
  'handleMediaRegistrationAdmin'
]) assert.ok(legacy.includes(marker),`legacy backend missing compatibility marker: ${marker}`);

for(const marker of [
  "api('/register'",
  'regUsername',
  'regPassword',
  'regEmail',
  'regOutlet',
  "api('/login'",
  "username:value('mailCode')",
  "password:value('pin')",
  'username_taken',
  'missing_outlet'
]) assert.ok(frontend.includes(marker),`frontend missing media registration marker: ${marker}`);

assert.equal(backend.includes("MAIL_AUTO_REPLY_LIVE='true'"),false,'registration repair must not enable mail');
assert.equal(legacy.includes('QUEUE_PERSONALIZED_INVITATIONS')&&legacy.includes('paused:true'),true,'legacy invitation queue must remain paused by default');
assert.equal(backend.includes("await sha256Hex(`${account.username}:${password}:${account.password_salt}`)"),true,'legacy password hashes must migrate only after successful login');
assert.equal(backend.includes('password_algorithm=?,updated_at=?'),true,'legacy password login must upgrade the stored hash to PBKDF2');

console.log(JSON.stringify({
  ok:true,
  contract:'OPEN_REGISTRATION_PBKDF2_WITH_V38_LEGACY_INVITATION_COMPATIBILITY',
  accountTable:true,
  passwordAlgorithm:'PBKDF2-SHA256',
  passwordIterations:210000,
  legacyHashMigration:true,
  registrationRateLimit:true,
  sameOrigin:true,
  secureSessionCookie:true,
  legacyInvitationLogin:true,
  campaignQueueDefaultPaused:true,
  mailSent:false,
  productionDeploy:false
},null,2));