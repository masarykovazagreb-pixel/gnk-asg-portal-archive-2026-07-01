import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL(`../.github/workflows/${f}.yml`,import.meta.url),'utf8');
test('produkcijski kanali i samostalne stranice ne smiju objaviti zastarjelu radnu granu',()=>{
 for(const [file,job] of [['arhiva-deploy','deploy'],['dnevnik-deploy','deploy'],['kanal-deploy','cloudflare-pages'],['tjednik-deploy','deploy'],['region-deploy','deploy'],['sites-deploy','deploy'],['world-portals-deploy','deploy']]){
  const s=read(file),push=s.match(/\n  push:\n([\s\S]*?)(?=\n  [a-z_]+:|\npermissions:)/)?.[1]||'';
  assert.match(push,/branches: \[main\]/,`${file}: samo main za push`);assert.doesNotMatch(push,/arena\/\*\*/);
  const jobBlock=s.match(new RegExp(`\\n  ${job}:\\n([\\s\\S]*?)(?=\\n  [a-z_-]+:\\n|$)`))?.[1]||'';
  assert.match(jobBlock,/if: github\.ref == 'refs\/heads\/main'/,`${file}: deploy i ručno samo s maina`);
 }
 const d=read('region-daily');assert.match(d,/  push:\n    branches: \[main\]/);assert.match(d,/if: github\.ref == 'refs\/heads\/main' && vars\.GNK_ASG_RELEASE_FENCE/);
});
