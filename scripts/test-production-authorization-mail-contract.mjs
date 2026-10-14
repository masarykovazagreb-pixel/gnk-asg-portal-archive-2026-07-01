import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync('.github/workflows/deploy-admin-auth-v6.yml','utf8');
const releaseVerifier=readFileSync('scripts/verify-production-release-v38.sh','utf8');
const objaveListing=readFileSync('apps/portal/objave/index.html','utf8');
const komentariListing=readFileSync('apps/portal/komentari/index.html','utf8');
const mail=readFileSync('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js','utf8');
const mime=readFileSync('workers/gnk-asg-direct-operator/src/email-autoreply-mime-v1.js','utf8');

assert.match(workflow,/jobs:\s*\n\s*authorize-production:/);
assert.match(workflow,/inputs\.confirm_production_deploy == 'DEPLOY_ADMIN_AUTH_V6'/);
assert.match(workflow,/notify_search_engines:\s*\n\s*description:[^\n]*\n\s*required: false\n\s*default: false\n\s*type: boolean/);
assert.match(workflow,/if: \$\{\{ needs\.deploy-production\.result == 'success' && inputs\.notify_search_engines == true \}\}/);
assert.ok(workflow.indexOf('notify_search_engines:') < workflow.indexOf('indexnow-notify:'));
assert.match(workflow,/name: Pošalji sve URL-ove na IndexNow/);
assert.match(workflow,/Ping Google i Bing sitemap/);
assert.match(workflow,/\[\[ "\$APPROVED_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
assert.match(workflow,/require_eq "\$GITHUB_SHA" "\$APPROVED_SHA"/);
assert.match(workflow,/require_eq "\$\(git rev-parse origin\/main\)" "\$APPROVED_SHA"/);
assert.match(workflow,/Reconfirm tracked release integrity before any production secret/);
assert.ok(workflow.indexOf('Reconfirm tracked release integrity before any production secret') < workflow.indexOf('Resolve token hash after integrity verification'));
assert.ok(workflow.indexOf('Resolve token hash after integrity verification') < workflow.indexOf('Deploy contact session bridge'));

assert.match(mail,/import \{EMAIL_LOGO_CID,loadEmailLogo,VERSION as BRAND_MIME_VERSION\} from '\.\/email-brand-mime-v1\.js'/);
assert.match(mail,/signatureData\(profile,`cid:\$\{EMAIL_LOGO_CID\}`\)/);
assert.match(mail,/buildAutoreplyRawEmail\(/);
assert.match(mail,/format:'mail-studio-compatible-multipart-related'/);
assert.match(mime,/multipart\/related/i);
assert.match(mime,/Content-ID:\s*<\$\{EMAIL_LOGO_CID\}>/);

const listingProofs=[
  {name:'objave',prefix:'/objave/',route:'/objave/kapitalna-disciplina-geopoliticki-energetski-sokovi/',file:'apps/portal/objave/index.html',html:objaveListing},
  {name:'komentari',prefix:'/komentari/',route:'/komentari/ai-ne-smije-pisati-konacnu-odluku/',file:'apps/portal/komentari/index.html',html:komentariListing},
];
for(const proof of listingProofs){
  const marker=`href="${proof.route}"`;
  assert.ok(proof.html.includes(marker),`${proof.file} must expose the stable article route in a visible link`);
  assert.ok(workflow.includes(`grep -Fq '${marker}' ${proof.file}`),`production package check must verify ${proof.route}`);
  const expectedLiveCall=`verify_release_marker ${proof.name} "\${base}${proof.prefix}" '${marker}'`;
  assert.ok(releaseVerifier.includes(expectedLiveCall),`live release check must verify ${proof.route}`);
}

console.log(JSON.stringify({ok:true,authorization:'exact-main-sha-before-secrets',mailLogo:'real-cid-multipart-contract',listingDiscoverability:'stable-article-routes'},null,2));
