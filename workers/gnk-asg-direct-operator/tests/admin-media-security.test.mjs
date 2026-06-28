import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {webcrypto} from 'node:crypto';

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const root=path.resolve(import.meta.dirname,'../../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const exists=relative=>fs.existsSync(path.join(root,relative));
const enc=new TextEncoder();

async function sessionCookie(secret,expires){
  const digest=await crypto.subtle.digest('SHA-256',enc.encode(secret));
  const hash=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
  const key=await crypto.subtle.importKey('raw',enc.encode(hash),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signed=await crypto.subtle.sign('HMAC',key,enc.encode(`gnk-asg-admin:${expires}`));
  let binary='';for(const value of new Uint8Array(signed))binary+=String.fromCharCode(value);
  const signature=btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
  return `gnk_asg_admin_session=${encodeURIComponent(`${expires}.${signature}`)}`;
}

const authModule=await import('../src/admin-session-auth-v1.js');

test('admin token authentication remains supported',async()=>{
  const request=new Request('https://gnk-asg.hr/api/media-access/admin/list',{headers:{authorization:'Bearer test-secret'}});
  const state=await authModule.adminAccess(request,{OPERATOR_TOKEN:'test-secret'});
  assert.equal(state.ok,true);
  assert.equal(state.mode,'token');
});

test('valid HttpOnly admin session cookie is accepted',async()=>{
  const expires=Math.floor(Date.now()/1000)+3600;
  const cookie=await sessionCookie('test-secret',expires);
  const request=new Request('https://gnk-asg.hr/api/media-access/admin/list',{headers:{cookie}});
  const state=await authModule.adminAccess(request,{OPERATOR_TOKEN:'test-secret'});
  assert.equal(state.ok,true);
  assert.equal(state.mode,'session');
});

test('expired and modified admin cookies are rejected',async()=>{
  const expired=await sessionCookie('test-secret',Math.floor(Date.now()/1000)-10);
  const expiredState=await authModule.adminAccess(new Request('https://gnk-asg.hr/',{headers:{cookie:expired}}),{OPERATOR_TOKEN:'test-secret'});
  assert.equal(expiredState.ok,false);
  const valid=await sessionCookie('test-secret',Math.floor(Date.now()/1000)+3600);
  const changed=valid.slice(0,-2)+'xx';
  const changedState=await authModule.adminAccess(new Request('https://gnk-asg.hr/',{headers:{cookie:changed}}),{OPERATOR_TOKEN:'test-secret'});
  assert.equal(changedState.ok,false);
});

test('Media Access source enforces confirmation, immediate lock and atomic use',()=>{
  const source=read('workers/gnk-asg-direct-operator/src/media-access-service-v1.js');
  assert.match(source,/ISSUE_APPROVED_MEDIA_ACCESS/);
  assert.match(source,/attempts>=MAX_ATTEMPTS/);
  assert.match(source,/status='LOCKED'/);
  assert.match(source,/WHERE id=\? AND status='ACTIVE' AND attempts<\? AND expires_at>\?/);
  assert.match(source,/code_already_used_or_changed/);
  assert.match(source,/HttpOnly; Secure; SameSite=Lax/);
  assert.doesNotMatch(source,/code_hash\s*=\s*code/);
});

test('Admin Center assets and declared modules exist',()=>{
  const files=[
    'apps/portal/admin-center/index.html',
    'apps/portal/mail-studio/index.html',
    'apps/portal/operator-dashboard/index.html',
    'apps/portal/media-command-center/index.html',
    'apps/portal/auto-editor/index.html',
    'apps/portal/news-admin/index.html',
    'apps/portal/pdf-publisher/index.html',
    'apps/portal/social-share/index.html',
    'apps/portal/wa-center/index.html',
    'apps/portal/review/index.html',
    'apps/portal/memorandum-studio/index.html',
    'apps/portal/media-access/index.html'
  ];
  for(const file of files)assert.equal(exists(file),true,file);
  const admin=read('apps/portal/admin-center/index.html');
  assert.match(admin,/admin-frame-bridge-v1\.js/);
  assert.match(admin,/admin-media-applications-v1\.js\?v=20260628-v2/);
});

test('News and publication language pairs expose canonical and hreflang',()=>{
  const pairs=[
    ['apps/portal/vijesti/index.html','https://gnk-asg.hr/vijesti/','https://gnk-asg.hr/news/'],
    ['apps/portal/news/index.html','https://gnk-asg.hr/news/','https://gnk-asg.hr/vijesti/'],
    ['apps/portal/objave/index.html','https://gnk-asg.hr/objave/','https://gnk-asg.hr/publications/'],
    ['apps/portal/publications/index.html','https://gnk-asg.hr/publications/','https://gnk-asg.hr/objave/']
  ];
  for(const [file,canonical,alternate] of pairs){
    const html=read(file);
    assert.ok(html.includes(`rel="canonical" href="${canonical}"`),file);
    assert.ok(html.includes(alternate),file);
    assert.match(html,/name="robots" content="index,follow/i);
  }
});

test('dynamic publication sitemaps use approved publication source',()=>{
  const source=read('workers/gnk-asg-direct-operator/src/index-publication-seo-v3.js');
  assert.match(source,/path==='\/sitemap-objave\.xml'/);
  assert.match(source,/path==='\/image-sitemap-objave\.xml'/);
  assert.match(source,/read\(env,'publish:approved'/);
  assert.match(source,/hreflang="x-default"/);
});

test('market sitemap agrees with the canonical public menu',()=>{
  const sitemap=read('apps/portal/sitemap.xml');
  const menu=read('apps/portal/assets/public-menu-v10.js');
  assert.match(menu,/\?\'\/markets\/\':\'\/trzista\/\'/);
  assert.ok(sitemap.includes('<loc>https://gnk-asg.hr/markets/</loc>'));
  assert.equal(sitemap.includes('<loc>https://gnk-asg.hr/en/markets/</loc>'),false);
});
