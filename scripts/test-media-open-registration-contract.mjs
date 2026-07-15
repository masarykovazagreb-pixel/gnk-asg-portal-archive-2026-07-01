import assert from 'node:assert/strict';
import fs from 'node:fs';

const backendPath='workers/gnk-asg-direct-operator/src/media-registration-v1.js';
const frontendPath='apps/portal/assets/media-registration-v1.js';
const backend=fs.readFileSync(backendPath,'utf8');
const frontend=fs.readFileSync(frontendPath,'utf8');

for(const marker of [
  'OPEN_USERPASS',
  'media_registration_accounts',
  'password_hash TEXT NOT NULL',
  'password_salt TEXT NOT NULL',
  "openRegistration:true",
  "loginMode:'username_password'",
  "legacyInvitationLogin:true",
  "p===`${PUBLIC_API}/register`",
  'async function register',
  'async function passwordHash',
  'crypto.getRandomValues(new Uint8Array(16))',
  "eventType:'open_registration_created'",
  "error:'account_exists'",
  "error:'weak_password'",
  "error:'invalid_username'",
  "error:'invalid_email'",
  "error:'outlet_required'",
  "const code=clean(b.mailCode).toUpperCase()",
  "eventType:'legacy_code_login'",
  'HttpOnly; Secure; SameSite=Strict'
]) assert.ok(backend.includes(marker),`backend missing media registration marker: ${marker}`);

for(const marker of [
  "api('/register'",
  'regUsername',
  'regPassword',
  'regEmail',
  'regOutlet',
  "api('/login'",
  "username:value('mailCode')",
  "password:value('pin')",
  'account_exists',
  'outlet_required'
]) assert.ok(frontend.includes(marker),`frontend missing media registration marker: ${marker}`);

assert.equal(backend.includes("MAIL_AUTO_REPLY_LIVE='true'"),false,'registration repair must not enable mail');
assert.equal(backend.includes('QUEUE_PERSONALIZED_INVITATIONS')&&backend.includes("paused:true"),true,'legacy invitation queue must remain paused by default');

console.log(JSON.stringify({
  ok:true,
  contract:'OPEN_REGISTRATION_USERNAME_PASSWORD_WITH_LEGACY_INVITATION_COMPATIBILITY',
  accountTable:true,
  saltedPasswordHash:true,
  sameOrigin:true,
  secureSessionCookie:true,
  legacyInvitationLogin:true,
  campaignQueueDefaultPaused:true,
  mailSent:false,
  productionDeploy:false
},null,2));
