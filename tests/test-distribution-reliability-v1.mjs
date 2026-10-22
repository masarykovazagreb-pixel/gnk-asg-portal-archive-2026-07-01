import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {readDistributionState,waitForMedia} from '../scripts/distribution-safety-v1.mjs';

const root=process.cwd(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'distribution-reliability-'));
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);};
const run=(cmd,args,options={})=>spawnSync(cmd,args,{encoding:'utf8',...options});
try {
  const stateFile=path.join(tmp,'state.json');
  assert.throws(()=>readDistributionState(stateFile),/unavailable/);
  assert.deepEqual(readDistributionState(stateFile,{allowMissing:true}).posted,{});
  write(stateFile,'{broken');assert.throws(()=>readDistributionState(stateFile,{allowMissing:true}),/invalid/);
  write(stateFile,'{"posted":[]}');assert.throws(()=>readDistributionState(stateFile),/Invalid/);
  let polls=0;
  const ready=await waitForMedia({site:'https://social.example.test',headers:{},upload:{id:'7'},pause:async()=>{},
    request:async()=>{polls++;return new Response(JSON.stringify({id:'7',url:polls===2?'https://social.example.test/image.png':null}));}});
  assert.equal(ready.id,'7');assert.equal(polls,2);
  await assert.rejects(waitForMedia({site:'https://social.example.test',headers:{},upload:{id:'7'},attempts:2,pause:async()=>{},
    request:async()=>new Response('{"id":"7","url":null}')}),/not ready/);

  const fixture=path.join(tmp,'fixture');fs.mkdirSync(fixture);
  const canonical='https://gnk-asg.hr/objave/distribution-fixture/';
  write(path.join(fixture,'ops/aktual-global-distribution-v1.json'),fs.readFileSync('ops/aktual-global-distribution-v1.json'));
  write(path.join(fixture,'apps/portal/objave/distribution-fixture/index.html'),
    '<html lang="hr"><head><title>Provjera distribucije</title><meta name="robots" content="index,follow">'+
    '<meta name="description" content="Dovoljno dug opis za provjeru distribucije bez izmišljenog autora.">'+
    '<meta property="og:image" content="https://gnk-asg.hr/assets/editorial/generated/fixture.png">'+
    '<link rel="canonical" href="'+canonical+'"><script type="application/ld+json">'+
    JSON.stringify({'@type':'Article',inLanguage:'hr',publisher:{name:'AKTUAL MEDIA'}})+'</script></head></html>');
  const preview=path.join(tmp,'preview.json');
  let r=run(process.execPath,[path.join(root,'scripts/aktual-global-distribution-v1.mjs'),
    '--article','/objave/distribution-fixture/','--platforms','wordpress','--out',preview],{cwd:fixture});
  assert.equal(r.status,0,r.stderr);
  assert.equal(JSON.parse(fs.readFileSync(preview)).entries[0].author,'','no invented desk byline');

  write(path.join(fixture,'apps/portal/data/editorial-featured.json'),JSON.stringify({items:[{
    title:'Provjera distribucije',path:'/objave/distribution-fixture/',publishedAt:'2026-10-21T08:00:00Z',
    language:'hr',image:'https://gnk-asg.hr/assets/editorial/generated/fixture.png'}]}));
  const durable=path.join(fixture,'apps/portal/data/global-distribution/published.json');
  write(durable,'{"version":1,"posted":{}}');
  const mock=path.join(tmp,'mock.mjs'),calls=path.join(tmp,'calls.log');
  write(mock,`import fs from 'node:fs';
    globalThis.fetch=async(input,options={})=>{
      const u=new URL(input),method=options.method||'GET';
      fs.appendFileSync(process.env.CALLS,method+' '+u.pathname+'\\n');
      const answer=(body,status=200,type='application/json')=>new Response(body,{status,headers:{'content-type':type}});
      if(u.hostname==='gnk-asg.hr'){
        if(u.pathname.startsWith('/assets/'))return answer('image',200,'image/png');
        const r=answer('<html>fixture</html>',200,'text/html');Object.defineProperty(r,'url',{value:u.href});return r;
      }
      if(u.pathname==='/api/v2/media')return answer('{"id":"7","url":null}',202);
      if(u.pathname==='/api/v1/media/7')return answer('{"id":"7","url":"https://social.example.test/image.png"}');
      if(u.pathname==='/api/v1/statuses'&&method==='POST')return answer('{"id":"77","url":"https://social.example.test/@aktual/77","visibility":"public"}');
      if(u.pathname==='/api/v1/statuses/77')throw new Error('Read-back timeout after accepted publication');
      throw new Error('Unexpected network request '+u.pathname);
    };`);
  const env={PATH:process.env.PATH,HOME:process.env.HOME,CALLS:calls,GLOBAL_LANGS:'source',GLOBAL_PER_PLATFORM:'1',
    GNK_ASG_EXTERNAL_DISTRIBUTION:'true',CONFIRM_EXTERNAL_PUBLISH:'AKTUAL_MEDIA_APPROVED_20261022',
    GITHUB_RUN_ID:'offline-regression',MASTODON_INSTANCE_URL:'https://social.example.test',MASTODON_ACCESS_TOKEN:'fixture'};
  const cli=[ '--import',mock,path.join(root,'scripts/global-free-distribution-v1.mjs'),'--live'];
  r=run(process.execPath,cli,{cwd:fixture,env});assert.equal(r.status,1,r.stdout+r.stderr);
  const receipt=Object.values(JSON.parse(fs.readFileSync(durable)).posted)[0];
  assert.equal(receipt.id,'77');assert.equal(receipt.status,'pending_verification');
  const order=fs.readFileSync(calls,'utf8');
  assert(order.indexOf('GET /api/v1/media/7')<order.indexOf('POST /api/v1/statuses'),'image must finish processing first');
  run(process.execPath,cli,{cwd:fixture,env});
  assert.equal(fs.readFileSync(calls,'utf8').split('POST /api/v1/statuses\n').length-1,1,'timeout retry must not duplicate accepted status');

  // Exercise receipt recovery against a real local Git remote, including an
  // absent branch, existing receipts, corrupt state, and a transport failure.
  const gitDir=path.join(tmp,'git'),remote=path.join(tmp,'remote.git');fs.mkdirSync(gitDir);
  const git=(...args)=>{const p=run('git',args,{cwd:gitDir});assert.equal(p.status,0,p.stderr);return p.stdout.trim();};
  git('init','--initial-branch=main');git('config','user.name','Fixture');git('config','user.email','fixture@example.test');
  write(path.join(gitDir,'scripts/distribution-safety-v1.mjs'),fs.readFileSync('scripts/distribution-safety-v1.mjs'));
  git('add','.');git('commit','-m','initial');const reviewed=git('rev-parse','HEAD');
  assert.equal(run('git',['init','--bare',remote]).status,0);git('remote','add','origin',remote);git('push','origin','main');
  const branch='automation/receipts',file='state.json',output=path.join(tmp,'github-output');
  const recover=()=>run('bash',[path.join(root,'scripts/restore-distribution-state-v1.sh'),branch,file,reviewed],
    {cwd:gitDir,env:{...process.env,GITHUB_OUTPUT:output}});
  assert.notEqual(recover().status,0,'missing branch must stop live publishing');
  git('switch','-c',branch);write(path.join(gitDir,file),'{"posted":{"previous":{"status":"verified","id":"old"}}}');
  git('add',file);git('commit','-m','receipt');git('push','origin',branch);git('switch','main');
  r=recover();assert.equal(r.status,0,r.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(gitDir,file))).posted.previous.id,'old');
  assert(fs.readFileSync(output,'utf8').includes('ready=true'));
  write(path.join(gitDir,file),'{broken');git('add',file);git('commit','-m','corrupt receipt');git('push','--force','origin',branch);git('switch','main');
  fs.rmSync(output);assert.notEqual(recover().status,0,'corrupt remote receipts must abort');assert(!fs.existsSync(output));
  git('remote','set-url','origin',path.join(tmp,'unavailable.git'));
  assert.notEqual(recover().status,0,'transport errors must abort');
  console.log('PASS distribution reliability: no fabricated author; asynchronous media; durable timeout receipt; no duplicate retry; missing/corrupt/offline state fail closed');
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
