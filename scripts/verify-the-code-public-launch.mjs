import fs from 'node:fs';
const root='apps/portal/the-code/media-invitation';
const wrapper=fs.readFileSync(`${root}/index.html`,'utf8');
const parts=['content-01.part','content-02.part','content-03.part'].map(name=>fs.readFileSync(`${root}/${name}`,'utf8'));
const html=parts.join('');
const required=[
  '/media-application/?lang=en',
  '/the-code/',
  '/api/media-registration/memorandum.pdf'
];
for(const link of required){
  if(!html.includes(`href="${link}"`)) throw new Error(`Missing public link: ${link}`);
  if(!wrapper.includes(link) && !wrapper.includes('content-01.part')) throw new Error(`Missing fallback or loader for: ${link}`);
}
if(!wrapper.includes('og:title')||!wrapper.includes('og:description')||!wrapper.includes('og:image')) throw new Error('Missing social preview metadata');
if(!html.startsWith('<!doctype html>')||!html.endsWith('</html>\n')) throw new Error('Assembled HTML is incomplete');
const shell=fs.readFileSync('apps/portal/assets/gallery-brand-safety.js','utf8');
if(!shell.includes('/the-code/media-invitation/')||!shell.includes('GNK_THE_CODE_HOME_FEATURE_20260702')) throw new Error('Homepage feature is missing');
console.log(`THE CODE public launch verified: ${html.length} characters, ${required.length} primary links.`);
